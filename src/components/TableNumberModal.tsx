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
        // ✨ 사이즈 최적화: 
        // 1. 너비 w-[480px] (기존 500)
        // 2. 패딩 p-5 (기존 p-6)
        // 3. 모서리 rounded-2xl (기존 3xl)
        className="bg-white w-[480px] p-5 rounded-2xl shadow-2xl flex flex-col items-center relative"
      >
        {/* 제목 크기 축소: text-3xl -> text-2xl */}
        <h2 className="text-2xl font-black text-gray-900 mb-2">Table Service</h2>
        
        {/* ✨ [수정된 문구] & 여백 축소 */}
        <div className="bg-yellow-50 border-2 border-yellow-100 rounded-xl p-2 mb-3 w-full text-center">
            <p className="text-gray-800 font-bold text-lg leading-tight">
               Please grab a <span className="text-red-600">Number Stand</span>
            </p>
            <p className="text-gray-600 text-sm mt-1 font-medium">
               on the table and enter the number below.
            </p>
        </div>

        {/* 입력창 높이 축소: h-16 -> h-14 */}
        <div className="w-full h-14 bg-gray-100 rounded-xl flex items-center justify-center mb-3 border-2 border-gray-200">
          <span className="text-3xl font-black text-gray-800 tracking-widest">
            {tableNum || "- -"}
          </span>
        </div>

        {/* ✨ 키패드 다이어트:
           1. gap-3 -> gap-2 (버튼 사이 간격 좁힘)
           2. 버튼 높이 h-16 -> h-13 (높이를 더 줄임)
           3. mb-6 -> mb-4 (하단 여백 줄임)
        */}
        <div className="grid grid-cols-3 gap-2 w-full mb-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleNumClick(num.toString())}
              className="h-13 py-3 rounded-lg bg-white border-2 border-gray-200 text-2xl font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-400 active:bg-gray-100 transition-all shadow-sm"
            >
              {num}
            </button>
          ))}
          
          <div /> 
          
          <button
            onClick={() => handleNumClick('0')}
            className="h-13 py-3 rounded-lg bg-white border-2 border-gray-200 text-2xl font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-400 active:bg-gray-100 transition-all shadow-sm"
          >
            0
          </button>

          <button
            onClick={handleDelete}
            className="h-13 py-3 rounded-lg bg-red-50 border-2 border-red-100 text-red-500 flex items-center justify-center hover:bg-red-100 hover:border-red-200 active:bg-red-200 transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9.75L14.25 12m0 0l2.25 2.25M14.25 12l2.25-2.25M14.25 12L12 14.25m-2.58 4.92l-6.375-6.375a1.125 1.125 0 010-1.59L9.42 4.83c.211-.211.498-.33.796-.33H19.5a2.25 2.25 0 012.25 2.25v10.5a2.25 2.25 0 01-2.25 2.25h-9.284c-.298 0-.585-.119-.796-.33z" />
            </svg>
          </button>
        </div>

        {/* 하단 버튼 높이 축소: h-14 -> h-12 */}
        <div className="flex gap-3 w-full">
          <button
            onClick={onCancel}
            className="flex-1 h-12 bg-gray-200 text-gray-700 text-lg font-bold rounded-xl hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => tableNum && onConfirm(tableNum)}
            disabled={!tableNum}
            className="flex-[2] h-12 bg-red-600 text-white text-lg font-bold rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-all active:scale-95"
          >
            Confirm
          </button>
        </div>
      </motion.div>
    </div>
  );
}