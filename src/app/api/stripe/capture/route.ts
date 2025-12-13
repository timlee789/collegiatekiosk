// src/app/api/stripe/capture/route.ts
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  try {
    const { paymentIntentId } = await request.json();

    // 결제 상태 조회
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    console.log(`🔍 Payment Status: ${paymentIntent.status}`);

    if (paymentIntent.status === 'succeeded') {
      return NextResponse.json({ status: 'succeeded' });
    } else {
      return NextResponse.json({ status: 'pending' });
    }

  } catch (error: any) {
    console.error("Capture Error:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}