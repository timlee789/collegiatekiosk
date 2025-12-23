import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const READER_ID = process.env.STRIPE_TERMINAL_READER_ID;

export async function POST(request: Request) {
  try {
    const { amount } = await request.json();

    if (!READER_ID) {
      throw new Error("Reader ID is not configured in .env.local");
    }

    console.log(`💳 Initiating Payment: $${amount}`);

    // 1. PaymentIntent 생성 (결제 의도 만들기)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // 달러 -> 센트
      currency: 'usd',
      payment_method_types: ['card_present'],
      capture_method: 'automatic', // 카드 긁자마자 바로 승인
    });

    // 2. 단말기(Reader)에 결제 요청 전송
    // (여기서 단말기 화면이 켜지지만, 결제 결과는 아직 모름)
    await stripe.terminal.readers.processPaymentIntent(READER_ID, {
      payment_intent: paymentIntent.id,
    });

    console.log("📡 Reader Activated. Waiting for card input...");

    // -------------------------------------------------------------
    // 3. ★ 핵심 수정: 결제가 진짜 끝날 때까지 기다리기 (Polling)
    // -------------------------------------------------------------
    // 1초마다 Stripe에 "돈 들어왔니?" 라고 물어봅니다. (최대 120초 대기)
    let checks = 0;
    const maxChecks = 120; // 2분 제한

    while (checks < maxChecks) {
      // 1초 대기
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Stripe에 현재 상태 조회
      const updatedIntent = await stripe.paymentIntents.retrieve(paymentIntent.id);

      // (A) 결제 성공! (돈 들어옴) -> 이제야 진짜 Success를 보냄
      if (updatedIntent.status === 'succeeded') {
        console.log("✅ Payment Succeeded!");
        return NextResponse.json({ 
          success: true, 
          paymentIntentId: paymentIntent.id 
        });
      }

      // (B) 결제 실패/취소됨
      if (updatedIntent.status === 'canceled' || updatedIntent.status === 'requires_payment_method') {
         // requires_payment_method는 처음에 뜨지만, 실패 후 다시 뜨기도 함.
         // 하지만 여기서는 단말기 프로세스가 살아있는 동안은 상태가 유지되므로
         // 만약 단말기에서 에러가 나면 canceled가 되거나 프로세스 실패가 뜹니다.
         // (단순 대기를 위해 여기서는 succeeded만 기다립니다.)
      }

      // 만약 reader 쪽에 문제가 생겨서 process가 실패했는지 확인하려면 reader 상태도 봐야하지만,
      // 보통 Intent 상태만 봐도 충분합니다.
      
      checks++;
    }

    // 4. 시간이 너무 오래 걸리면 타임아웃 처리
    // (강제로 취소시키고 에러 리턴)
    console.error("⏰ Payment Timeout");
    await stripe.paymentIntents.cancel(paymentIntent.id); // 의도 취소
    throw new Error("Payment timed out. Please try again.");

  } catch (error: any) {
    console.error("❌ Stripe Process Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}