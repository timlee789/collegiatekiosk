// src/components/DayWarningModal.tsx
import { motion } from 'framer-motion';

interface Props {
  targetDay: string;
  onClose: () => void;
}

export default function DayWarningModal({ targetDay, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        // ✨ 부드러운 파란색 테마 적용
        className="bg-white w-[500px] p-8 rounded-3xl shadow-2xl flex flex-col items-center text-center relative border border-blue-100"
      >
        {/* 아이콘 (파란색 정보 아이콘) */}
        <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-12 h-12 text-blue-500">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
        </div>

        <h2 className="text-3xl font-black text-gray-800 mb-3">
          Available on {targetDay}
        </h2>
        
        <p className="text-gray-600 text-xl leading-relaxed mb-8">
          This special menu is served only on<br/>
          <span className="text-blue-600 font-bold text-2xl">{targetDay}</span>.
          <br/><span className="text-sm text-gray-400 mt-2 block">Please check back then! 😊</span>
        </p>

        <button
          onClick={onClose}
          className="w-full h-16 bg-blue-600 text-white text-xl font-bold rounded-2xl hover:bg-blue-700 shadow-lg active:scale-95 transition-all"
        >
          Got it
        </button>
      </motion.div>
    </div>
  );
}