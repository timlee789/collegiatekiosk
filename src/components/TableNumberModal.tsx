'use client';

import { useState } from 'react';

interface Props {
  onConfirm: (num: string) => void;
  onCancel: () => void;
}

export default function TableNumberModal({ onConfirm, onCancel }: Props) {
  const [value, setValue] = useState('');

  const handleKeyPad = (num: string) => {
    if (value.length < 3) setValue(prev => prev + num);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
      <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-[700px] text-center shadow-2xl relative overflow-hidden">
        
        {/* 상단 파란색 바 포인트 */}
        <div className="absolute top-0 left-0 w-full h-3 bg-blue-600"></div>

        <h2 className="text-5xl font-extrabold text-gray-900 mb-8 mt-4">Table Service</h2>
        
        {/* 👇 [수정됨] 안내 문구 박스 - 아이콘/헤더 삭제, 글씨 확대 👇 */}
        <div className="bg-gray-50 p-8 rounded-3xl mb-10 border border-gray-200 shadow-sm flex items-center justify-center">
            <p className="text-4xl font-bold text-gray-800 leading-tight">
              Please grab a <span className="font-extrabold text-blue-700">Number Stand</span> next to the kiosk and enter the number below.
            </p>
        </div>
        {/* 👆 [수정됨] 끝 👆 */}

        {/* 입력된 번호 표시 - placeholder # 삭제 */}
        <div className="mb-10 flex justify-center">
            <div className={`text-9xl font-black h-36 w-64 flex items-center justify-center rounded-3xl bg-gray-50 border-4 ${value ? 'border-blue-500 text-blue-600' : 'border-gray-200'}`}>
                {value}
            </div>
        </div>

        {/* 키패드 (기존 동일) */}
        <div className="grid grid-cols-3 gap-5 mb-10 w-full max-w-[500px] mx-auto">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button key={num} onClick={() => handleKeyPad(num.toString())}
              className="h-24 w-full text-5xl font-bold bg-white border-2 border-gray-200 text-gray-800 rounded-3xl hover:bg-gray-50 hover:border-blue-300 active:scale-95 transition-all shadow-sm">
              {num}
            </button>
          ))}
          <button onClick={() => setValue('')} 
            className="h-24 w-full text-3xl font-bold text-red-500 bg-red-50 border-2 border-red-100 rounded-3xl hover:bg-red-100 transition-all active:scale-95">
            Clear
          </button>
          <button onClick={() => handleKeyPad('0')} 
            className="h-24 w-full text-5xl font-bold bg-white border-2 border-gray-200 text-gray-800 rounded-3xl hover:bg-gray-50 hover:border-blue-300 active:scale-95 transition-all shadow-sm">
            0
          </button>
          <button onClick={() => setValue(value.slice(0, -1))} 
            className="h-24 w-full flex items-center justify-center text-gray-500 bg-gray-50 border-2 border-gray-200 rounded-3xl hover:bg-gray-100 transition-all active:scale-95">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-10 h-10">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9.75L14.25 12m0 0l2.25 2.25M14.25 12l2.25-2.25M14.25 12L12 14.25m-2.58 4.92l-6.375-6.375a1.125 1.125 0 010-1.59L9.42 4.83c.211-.211.498-.33.796-.33H19.5a2.25 2.25 0 012.25 2.25v10.5a2.25 2.25 0 01-2.25 2.25h-9.284c-.298 0-.585-.119-.796-.33z" />
            </svg>
          </button>
        </div>

        {/* 버튼 (기존 동일) */}
        <div className="flex gap-5">
            <button onClick={onCancel} className="flex-1 py-7 text-3xl font-bold text-gray-600 bg-gray-100 rounded-3xl hover:bg-gray-200 transition-colors">
                Cancel
            </button>
            <button onClick={() => value && onConfirm(value)} disabled={!value}
              className="flex-[2] py-7 text-3xl font-bold text-white bg-blue-600 rounded-3xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-xl transition-all active:scale-95">
              Confirm
            </button>
        </div>
      </div>
    </div>
  );
}