import { NextResponse } from 'next/server';
import axios from 'axios';

// 환경 변수 로드
const CLOVER_URL = process.env.CLOVER_API_URL;
const MID = process.env.CLOVER_MERCHANT_ID;
const TOKEN = process.env.CLOVER_API_TOKEN;
const TENDER_ID = process.env.CLOVER_TENDER_ID;

const ORDER_TYPE_DINE_IN = process.env.CLOVER_ORDER_TYPE_DINE_IN;
const ORDER_TYPE_TO_GO = process.env.CLOVER_ORDER_TYPE_TO_GO;

const headers = {
  'Authorization': `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { items, totalAmount, tableNumber, orderType } = body;

    // 1. 주문 유형(Order Type) 결정
    let selectedOrderTypeId = ORDER_TYPE_DINE_IN; 
    if (orderType === 'to_go') {
        selectedOrderTypeId = ORDER_TYPE_TO_GO;
    }

    console.log(`🚀 Clover Order Sync: Table ${tableNumber} | Type: ${orderType}`);

    // [Step 1] 주문(Order) 생성
    const orderRes = await axios.post<any>(`${CLOVER_URL}/v3/merchants/${MID}/orders`, {
      state: 'open',
      title: tableNumber ? `Table #${tableNumber}` : 'Kiosk Order',
      total: Math.round(totalAmount * 100),
      manualTransaction: false,
      orderType: selectedOrderTypeId ? { id: selectedOrderTypeId } : undefined
    }, { headers });
    
    const orderId = orderRes.data.id;

    // [Step 2] 아이템 추가 (ID 기반으로 심플하게)
    const lineItemPromises = items.map((item: any) => {
      let payload: any = {
        unitQty: item.quantity || 1, 
      };

      // DB에 정확한 Clover ID가 있으므로 ID만 보내면 됩니다.
      if (item.clover_id) {
        payload.item = { id: item.clover_id };
      } else {
        // ID가 없는 경우에만 이름 사용 (예외 처리)
        payload.name = item.name;
        payload.price = Math.round(item.price * 100);
      }

      return axios.post(`${CLOVER_URL}/v3/merchants/${MID}/orders/${orderId}/line_items`, 
        payload, 
        { headers }
      );
    });

    await Promise.all(lineItemPromises);

    // [Step 3] 결제(Payment) 기록
    await axios.post(`${CLOVER_URL}/v3/merchants/${MID}/orders/${orderId}/payments`, {
      tender: { id: TENDER_ID },
      amount: Math.round(totalAmount * 100),
      result: "SUCCESS",
      tipAmount: 0,
      externalPaymentId: `KIOSK-${Date.now()}`
    }, { headers });

    // [Step 4] 주문 완료 처리 (Locked) - 매출 확정용
    await axios.post(`${CLOVER_URL}/v3/merchants/${MID}/orders/${orderId}`, 
        { state: 'locked' }, 
        { headers }
    );

    console.log(`✅ Clover Sync Complete (ID: ${orderId})`);
    
    // 성공 시 Clover Order ID를 반환 (프린터에 찍기 위해)
    return NextResponse.json({ success: true, orderId });

  } catch (error: any) {
    console.error('❌ Clover Sync Failed:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}