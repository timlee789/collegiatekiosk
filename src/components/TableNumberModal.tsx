// src/components/TableNumberModal.tsx
"use client";
import { useState } from 'react';

interface Props {
    onConfirm: (num: string) => void;
    onCancel: () => void;
}

export default function TableNumberModal({ onConfirm, onCancel }: Props) {
    const [input, setInput] = useState('');

    const handleNumClick = (num: string) => {
        if (input.length < 3) { // 최대 3자리까지만 입력 가능 (예: 999)
            setInput(prev => prev + num);
        }
    };

    const handleBackspace = () => {
        setInput(prev => prev.slice(0, -1));
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden p-6 text-center">

                <h2 className="text-2xl font-extrabold text-gray-800 mb-2">Table Service</h2>
                <p className="text-gray-500 mb-6 text-lg">
                    Please grab a <span className="text-red-600 font-bold">Number Stand</span> next to the kiosk and enter the number below.
                </p>

                {/* 입력된 숫자 표시 창 */}
                <div className="bg-gray-100 rounded-xl h-20 flex items-center justify-center mb-6 border-2 border-gray-200">
                    <span className="text-5xl font-extrabold text-gray-800 tracking-widest">
                        {input || <span className="text-gray-300 opacity-50">#</span>}
                    </span>
                </div>

                {/* 키패드 그리드 */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                        <button
                            key={num}
                            onClick={() => handleNumClick(num.toString())}
                            className="h-16 bg-white border border-gray-200 rounded-xl text-2xl font-bold text-gray-700 hover:bg-gray-50 active:scale-95 transition-all shadow-sm"
                        >
                            {num}
                        </button>
                    ))}
                    <button
                        onClick={() => setInput('')} // Clear
                        className="h-16 bg-gray-100 rounded-xl text-lg font-bold text-red-500 hover:bg-gray-200"
                    >
                        C
                    </button>
                    <button
                        onClick={() => handleNumClick('0')}
                        className="h-16 bg-white border border-gray-200 rounded-xl text-2xl font-bold text-gray-700 hover:bg-gray-50 active:scale-95 shadow-sm"
                    >
                        0
                    </button>
                    <button
                        onClick={handleBackspace} // Backspace
                        className="h-16 bg-gray-100 rounded-xl flex items-center justify-center hover:bg-gray-200"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8 text-gray-600">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9.75L14.25 12m0 0l2.25 2.25M14.25 12l2.25-2.25M14.25 12L12 14.25m-2.58 4.92l-6.375-6.375a1.125 1.125 0 010-1.59L9.42 4.83c.211-.211.498-.33.796-.33H19.5a2.25 2.25 0 012.25 2.25v10.5a2.25 2.25 0 01-2.25 2.25h-9.284c-.298 0-.585-.119-.796-.33z" />
                        </svg>
                    </button>
                </div>

                {/* 하단 버튼 */}
                <div className="flex gap-4">
                    <button
                        onClick={onCancel}
                        className="flex-1 bg-gray-200 h-14 rounded-xl font-bold text-gray-600 text-lg hover:bg-gray-300"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onConfirm(input)}
                        disabled={input.length === 0} // 입력 없으면 비활성
                        className="flex-[2] bg-red-600 h-14 rounded-xl font-bold text-white text-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-200"
                    >
                        Confirm & Pay
                    </button>
                </div>

            </div>
        </div>
    );
}