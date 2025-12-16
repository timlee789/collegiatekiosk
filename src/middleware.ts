// src/middleware.ts
import { type NextRequest } from 'next/server';
import { updateSession } from '@/utils/supabase/server-client';

export async function middleware(request: NextRequest) {
    // Supabase 세션 체크 및 쿠키 갱신
    return await updateSession(request);
}



export const config = {
    matcher: [
        /*
         * 아래 경로들에 대해서만 미들웨어를 실행합니다:
         * 1. /admin 으로 시작하는 모든 경로
         * 2. /login (로그인한 사용자가 또 로그인하려 할 때 리다이렉트 위해)
         */
        '/admin/:path*',
        '/login',
    ],
};