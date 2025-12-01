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
    const { items, totalAmount, tableNumber } = body; // 키오스크에서 보낸 데이터

    // 1. 주문(Order) 생성
    // title에 테이블 번호를 넣으면 주방에서 보기 편합니다.
    const orderRes = await axios.post(`${CLOVER_URL}/v3/merchants/${MID}/orders`, {
      state: 'OPEN',
      title: tableNumber ? `Table #${tableNumber}` : 'Kiosk Order',
      total: Math.round(totalAmount * 100), // 센트 단위 변환
      manualTransaction: true // 외부 결제임을 명시
    }, { headers });

    const orderId = orderRes.data.id;
    console.log(`✅ Clover Order Created: ${orderId}`);

    // 2. 아이템(Line Items) 추가
    // Clover는 아이템을 하나씩 추가해야 합니다 (Promise.all로 병렬 처리)
    const lineItemPromises = items.map((item: any) => {
      return axios.post(`${CLOVER_URL}/v3/merchants/${MID}/orders/${orderId}/line_items`, {
        name: item.name,
        price: Math.round(item.price * 100),
        quantity: item.quantity
        // 만약 Clover Inventory의 item id를 안다면 { item: { id: "CLOVER_ITEM_ID" } } 로 보내야 재고 연동됨
        // 여기서는 "Custom Item"으로 이름만 기록합니다.
      }, { headers });
    });

    await Promise.all(lineItemPromises);

    // 3. 옵션(Modifiers) 추가 (심화 단계 - 일단 생략 가능, 필요시 로직 추가)
    // (옵션까지 완벽히 넣으려면 코드가 길어지므로, 일단 메뉴 이름에 옵션을 붙여서 보내는 꼼수를 추천합니다. 예: "Burger (No Onion)")

    // 4. 결제 기록 (External Payment) - 매출 잡기
    await axios.post(`${CLOVER_URL}/v3/merchants/${MID}/orders/${orderId}/payments`, {
      tender: { label: "Stripe Kiosk" }, // 나중에 리포트에서 'Stripe Kiosk'로 매출 구분됨
      amount: Math.round(totalAmount * 100),
      result: "SUCCESS"
    }, { headers });

    // 5. [중요] 프린트 요청 (Fire Print Event)
    // Clover 기기에게 "이 주문 출력해!"라고 명령
    await axios.post(`${CLOVER_URL}/v3/merchants/${MID}/orders/${orderId}/prints`, {}, { headers });

    return NextResponse.json({ success: true, orderId });

  } catch (error: any) {
    console.error('Clover API Error:', error.response?.data || error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}