'use client';

import { motion } from 'framer-motion';

interface Props {
  onSelect: (type: 'dine_in' | 'to_go') => void;
  onCancel: () => void;
}

export default function OrderTypeModal({ onSelect, onCancel }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-3xl shadow-2xl p-8 w-[600px] text-center"
      >
        <h2 className="text-4xl font-extrabold text-gray-800 mb-2">
          식사 장소를 선택해주세요
        </h2>
        <p className="text-xl text-gray-500 mb-8">Where would you like to eat?</p>

        <div className="grid grid-cols-2 gap-6 mb-8">
          {/* 매장 식사 버튼 */}
          <button
            onClick={() => onSelect('dine_in')}
            className="h-48 flex flex-col items-center justify-center rounded-2xl border-4 border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white hover:border-blue-600 hover:shadow-xl transition-all duration-200 group"
          >
            <span className="text-6xl mb-4 group-hover:scale-110 transition-transform">🍽️</span>
            <span className="text-3xl font-bold">매장 식사</span>
            <span className="text-lg opacity-80">Dine In</span>
          </button>

          {/* 포장 하기 버튼 */}
          <button
            onClick={() => onSelect('to_go')}
            className="h-48 flex flex-col items-center justify-center rounded-2xl border-4 border-orange-100 bg-orange-50 text-orange-700 hover:bg-orange-600 hover:text-white hover:border-orange-600 hover:shadow-xl transition-all duration-200 group"
          >
            <span className="text-6xl mb-4 group-hover:scale-110 transition-transform">🛍️</span>
            <span className="text-3xl font-bold">포장 하기</span>
            <span className="text-lg opacity-80">To Go</span>
          </button>
        </div>

        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600 font-semibold text-lg underline decoration-2 underline-offset-4"
        >
          Close (취소)
        </button>
      </motion.div>
    </div>
  );
}