import { useState } from 'react';
import { motion } from 'framer-motion';

interface Props {
  onConfirm: (tableNum: string) => void;
  onCancel: () => void;
}

export default function TableNumberModal({ onConfirm, onCancel }: Props) {
  const [tableNum, setTableNum] = useState('');

  const handleNumClick = (num: string) => {
    if (tableNum.length < 3) {
      setTableNum(prev => prev + num);
    }
  };

  const handleDelete = () => {
    setTableNum(prev => prev.slice(0, -1));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        // ✨ [사이즈 수정]
        // 1. 너비 확대: w-[480px] -> w-[600px] (옆으로 넓혀서 시원하게)
        // 2. 패딩 확대: p-5 -> p-8
        // 3. 둥글기 확대: rounded-3xl
      // ✨ [수정] 너비: w-[600px] -> w-[90%] (화면 넘어감 방지)
        className="bg-white w-[90%] p-6 rounded-[2rem] shadow-2xl flex flex-col items-center relative"
      >
        {/* ✨ 제목 확대: text-2xl -> text-4xl */}
        <h2 className="text-4xl font-black text-gray-900 mb-4">Table Service</h2>
        
        {/* ✨ 안내 문구 박스 */}
        <div className="bg-yellow-50 border-2 border-yellow-100 rounded-2xl p-4 mb-6 w-full text-center">
            {/* 글씨 크기 확대: text-lg -> text-2xl */}
            <p className="text-gray-800 font-bold text-2xl leading-tight">
               Please grab a <span className="text-red-600">Number Stand</span>
            </p>
            {/* 부가 설명 확대: text-sm -> text-lg */}
            <p className="text-gray-600 text-lg mt-2 font-medium">
               on the table and enter the number below.
            </p>
        </div>

        {/* ✨ 입력창 확대: 높이 h-14 -> h-20, 글씨 text-3xl -> text-5xl */}
        <div className="w-full h-20 bg-gray-100 rounded-2xl flex items-center justify-center mb-6 border-2 border-gray-200">
          <span className="text-5xl font-black text-gray-800 tracking-widest">
            {tableNum || "- -"}
          </span>
        </div>

        {/* ✨ 키패드 영역 */}
        <div className="grid grid-cols-3 gap-3 w-full mb-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleNumClick(num.toString())}
              // ✨ 버튼 확대: h-13 -> h-20, 글씨 text-2xl -> text-4xl
              className="h-20 rounded-xl bg-white border-2 border-gray-200 text-4xl font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-400 active:bg-gray-100 transition-all shadow-sm"
            >
              {num}
            </button>
          ))}
          
          <div /> 
          
          <button
            onClick={() => handleNumClick('0')}
            className="h-20 rounded-xl bg-white border-2 border-gray-200 text-4xl font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-400 active:bg-gray-100 transition-all shadow-sm"
          >
            0
          </button>

          <button
            onClick={handleDelete}
            className="h-20 rounded-xl bg-red-50 border-2 border-red-100 text-red-500 flex items-center justify-center hover:bg-red-100 hover:border-red-200 active:bg-red-200 transition-all"
          >
            {/* 아이콘 크기 확대 */}
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-10 h-10">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9.75L14.25 12m0 0l2.25 2.25M14.25 12l2.25-2.25M14.25 12L12 14.25m-2.58 4.92l-6.375-6.375a1.125 1.125 0 010-1.59L9.42 4.83c.211-.211.498-.33.796-.33H19.5a2.25 2.25 0 012.25 2.25v10.5a2.25 2.25 0 01-2.25 2.25h-9.284c-.298 0-.585-.119-.796-.33z" />
            </svg>
          </button>
        </div>

        {/* ✨ 하단 버튼 확대: 높이 h-12 -> h-20 */}
        <div className="flex gap-4 w-full">
          <button
            onClick={onCancel}
            // 글씨 text-lg -> text-2xl
            className="flex-1 h-20 bg-gray-200 text-gray-700 text-2xl font-bold rounded-2xl hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => tableNum && onConfirm(tableNum)}
            disabled={!tableNum}
            // 글씨 text-lg -> text-2xl
            className="flex-[2] h-20 bg-red-600 text-white text-2xl font-bold rounded-2xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-all active:scale-95"
          >
            Confirm
          </button>
        </div>
      </motion.div>
    </div>
  );
}