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
          Where would you like to eat?
        </h2>
        <p className="text-xl text-gray-500 mb-8">Please select an option below</p>

        <div className="grid grid-cols-2 gap-6 mb-8">
          {/* Dine In Button */}
          <button
            onClick={() => onSelect('dine_in')}
            className="h-48 flex flex-col items-center justify-center rounded-2xl border-4 border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white hover:border-blue-600 hover:shadow-xl transition-all duration-200 group"
          >
            <span className="text-7xl mb-4 group-hover:scale-110 transition-transform">🍽️</span>
            <span className="text-4xl font-bold">Dine In</span>
          </button>

          {/* To Go Button */}
          <button
            onClick={() => onSelect('to_go')}
            className="h-48 flex flex-col items-center justify-center rounded-2xl border-4 border-orange-100 bg-orange-50 text-orange-700 hover:bg-orange-600 hover:text-white hover:border-orange-600 hover:shadow-xl transition-all duration-200 group"
          >
            <span className="text-7xl mb-4 group-hover:scale-110 transition-transform">🛍️</span>
            <span className="text-4xl font-bold">To Go</span>
          </button>
        </div>

        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600 font-semibold text-xl underline decoration-2 underline-offset-4"
        >
          Cancel
        </button>
      </motion.div>
    </div>
  );
}