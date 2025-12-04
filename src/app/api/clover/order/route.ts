import { NextResponse } from 'next/server';
import axios from 'axios';

const CLOVER_URL = process.env.CLOVER_API_URL;
const MID = process.env.CLOVER_MERCHANT_ID;
const TOKEN = process.env.CLOVER_API_TOKEN;

const headers = {
  'Authorization': `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { items, totalAmount, tableNumber } = body;

    // 1. URL 유효성 검사 로그
    if (!CLOVER_URL || !MID || !TOKEN) {
      console.error("Missing Clover Env Variables");
      throw new Error("Missing Clover configuration");
    }

    // 2. 주문(Order) 생성
    // state: 'OPEN'으로 설정하여 POS의 Open Orders 탭에 뜨게 함
    const orderRes = await axios.post(`${CLOVER_URL}/v3/merchants/${MID}/orders`, {
      state: 'OPEN',
      title: tableNumber ? `Table #${tableNumber} (Kiosk)` : 'Kiosk Order',
      total: Math.round(totalAmount * 100),
      manualTransaction: false
    }, { headers });

    const orderId = orderRes.data.id;
    console.log(`✅ Clover Order Created: ${orderId}`);

    // 3. 아이템(Line Items) 추가
    const lineItemPromises = items.map((item: any) => {
      return axios.post(`${CLOVER_URL}/v3/merchants/${MID}/orders/${orderId}/line_items`, {
        name: item.name,
        price: Math.round(item.price * 100),
        quantity: item.quantity
      }, { headers });
    });

    await Promise.all(lineItemPromises);
    console.log(`✅ Items added to Clover Order`);

    // [수정됨] 프린트 강제 요청 코드 삭제 (405 에러 원인 제거)
    // Clover Cloud API 특성상 주문이 'Open' 상태로 들어가면, 
    // POS 기기에서 직원이 해당 주문을 클릭하거나 'Fire'를 눌렀을 때 주방 프린터가 작동합니다.

    return NextResponse.json({ success: true, orderId });

  } catch (error: any) {
    console.error('❌ Clover API Error Details:');
    if (error.response) {
        console.error(`- Status: ${error.response.status}`);
        console.error(`- Data: ${JSON.stringify(error.response.data)}`);
    } else {
        console.error(`- Message: ${error.message}`);
    }
    
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}