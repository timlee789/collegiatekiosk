// src/app/api/stripe/process/route.ts
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

    // 1. PaymentIntent 생성 (결제 의도)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // 달러 -> 센트 변환
      currency: 'usd',
      payment_method_types: ['card_present'],
      capture_method: 'automatic',
    });

    console.log("💳 PaymentIntent Created:", paymentIntent.id);

    // 2. 단말기에 명령 전송 (화면 켜기)
    const reader = await stripe.terminal.readers.processPaymentIntent(READER_ID, {
      payment_intent: paymentIntent.id,
    });

    console.log("📡 Sent command to Reader:", reader.id);

    return NextResponse.json({ 
      success: true, 
      paymentIntentId: paymentIntent.id 
    });

  } catch (error: any) {
    console.error("❌ Stripe Process Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}