// src/app/api/clover/tenders/route.ts
import { NextResponse } from 'next/server';
import axios from 'axios';

const CLOVER_URL = process.env.CLOVER_API_URL;
const MID = process.env.CLOVER_MERCHANT_ID;
const TOKEN = process.env.CLOVER_API_TOKEN;

export async function GET() {
  try {
    // 내 가게의 모든 결제 수단(Tender) 가져오기
    const res = await axios.get(`${CLOVER_URL}/v3/merchants/${MID}/tenders`, {
      headers: { 'Authorization': `Bearer ${TOKEN}` }
    });

    console.log("====== [ MY CLOVER TENDERS ] ======");
    res.data.elements.forEach((t: any) => {
      console.log(`Label: ${t.label} | ID: ${t.id}`);
    });
    console.log("===================================");

    return NextResponse.json(res.data);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message });
  }
}