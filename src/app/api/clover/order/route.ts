// src/app/api/clover/order/route.ts
import { NextResponse } from 'next/server';
import axios from 'axios';

// 환경 변수 로드
const CLOVER_URL = process.env.CLOVER_API_URL;
const MID = process.env.CLOVER_MERCHANT_ID;
const TOKEN = process.env.CLOVER_API_TOKEN;
const TENDER_ID = process.env.CLOVER_TENDER_ID; // Clover 관리자 페이지에서 만든 'External/Stripe' 결제수단 ID
const ORDER_TYPE_DINE_IN = process.env.CLOVER_ORDER_TYPE_DINE_IN;
const ORDER_TYPE_TO_GO = process.env.CLOVER_ORDER_TYPE_TO_GO;

const headers = {
  'Authorization': `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
};

// ⏳ 딜레이 함수: Clover 서버가 숨 쉴 틈을 줍니다 (0.1초)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { items, totalAmount, tableNumber, orderType, tipAmount } = body;

    // 1. 주문 유형 (Dine In / To Go)
    let selectedOrderTypeId = ORDER_TYPE_DINE_IN; 
    if (orderType === 'to_go') {
        selectedOrderTypeId = ORDER_TYPE_TO_GO;
    }

    console.log(`🚀 Clover Sync Start: Table ${tableNumber} | Total $${totalAmount}`);

    // [Step 1] 빈 주문서(Order) 생성
    const orderRes = await axios.post<any>(`${CLOVER_URL}/v3/merchants/${MID}/orders`, {
      state: 'open',
      title: tableNumber ? `Table #${tableNumber}` : 'Kiosk Order',
      total: Math.round(totalAmount * 100),
      manualTransaction: false, // 중요: 사람이 직접 찍은 게 아님을 표시
      orderType: selectedOrderTypeId ? { id: selectedOrderTypeId } : undefined
    }, { headers });
    
    const orderId = orderRes.data.id;
    console.log(`   - Order Created: ${orderId}`);

    // [Step 2] 메뉴 아이템 하나씩 입력 (순차 처리 + 딜레이)
    // ⚠️ Promise.all을 쓰면 동시 접속 과다로 에러가 발생하므로 for문 사용 필수
    for (const item of items) {
      const unitPriceCents = Math.round((item.totalPrice || item.price) * 100);
      
      const payload = {
        name: item.name,
        price: unitPriceCents,
        unitQty: item.quantity || 1,
        userData: null 
      };

      try {
        await axios.post(`${CLOVER_URL}/v3/merchants/${MID}/orders/${orderId}/line_items`, 
            payload, 
            { headers }
        );
        // ✨ 마법의 코드: 0.1초 대기 (이게 있어야 Too Many Requests 에러가 안 납니다)
        await delay(100); 
      } catch (err) {
        console.error(`   ! Item failed (${item.name}):`, err);
        // 하나 실패해도 멈추지 않고 다음 것 기록
      }
    }

    // [Step 2.5] 팁이 있다면 항목으로 추가
    if (tipAmount && tipAmount > 0) {
        try {
            await axios.post(`${CLOVER_URL}/v3/merchants/${MID}/orders/${orderId}/line_items`, {
                name: "Tip / Gratuity",
                price: Math.round(tipAmount * 100),
                unitQty: 1
            }, { headers });
            await delay(100);
        } catch (e) { console.error("   ! Tip add failed"); }
    }

    // [Step 3] 결제 "완료 처리" (돈은 Stripe가 받았고, 장부에만 '받았다'고 기록)
    // 실제 카드를 긁는 과정이 아니라, '이미 받음' 도장을 찍는 과정입니다.
    await axios.post(`${CLOVER_URL}/v3/merchants/${MID}/orders/${orderId}/payments`, {
      tender: { id: TENDER_ID }, // 'Stripe' 또는 'External'로 설정된 Tender ID
      amount: Math.round(totalAmount * 100),
      result: "SUCCESS",
      tipAmount: 0,
      externalPaymentId: `STRIPE-${Date.now()}` // 나중에 대조하기 쉽게 ID 남김
    }, { headers });

    // [Step 4] 주문 잠금 (수정 불가 상태로 변경)
    await axios.post(`${CLOVER_URL}/v3/merchants/${MID}/orders/${orderId}`, 
        { state: 'locked' }, 
        { headers }
    );

    console.log(`✅ Clover Sync Complete (ID: ${orderId})`);
    return NextResponse.json({ success: true, orderId });

  } catch (error: any) {
    const status = error.response?.status;
    const msg = error.response?.data?.message || error.message;
    console.error(`❌ Clover Sync Failed [${status}]:`, msg);
    
    // 에러가 나더라도 키오스크는 멈추지 않도록 처리
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}