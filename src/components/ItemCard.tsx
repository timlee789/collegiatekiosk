"use client";
import { useState } from 'react';
import { MenuItem } from '@/lib/types';

interface ItemCardProps {
  item: MenuItem;
  onClick: () => void;
}

export default function ItemCard({ item, onClick }: ItemCardProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <div 
      onClick={onClick}
      // ✨ 둥글기를 [2.5rem]으로 키우고, hover 시 위로 더 많이(-translate-y-2) 떠오르게 수정
      className="group bg-white rounded-[2.5rem] shadow-md overflow-hidden cursor-pointer hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 border border-gray-200 flex flex-col h-full"
    >
      {/* 1. 이미지 영역 (1:1 비율) */}
      <div className="aspect-square bg-gray-100 relative overflow-hidden shrink-0">
        {item.image && !imageError ? (
          <img 
            src={item.image} 
            alt={item.name} 
            className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500" 
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 bg-gray-50">
            {/* ✨ 아이콘 사이즈 대폭 확대 */}
            <span className="text-7xl mb-4 grayscale opacity-30">🍔</span>
          </div>
        )}
        
        {/* (옵션) 품절일 때 덮개 */}
        {!item.is_available && (
             <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
                 <span className="text-white font-black text-3xl border-4 border-white px-6 py-2 rounded-xl uppercase tracking-widest transform -rotate-12 shadow-lg">
                     Sold Out
                 </span>
             </div>
        )}
      </div>

      {/* 2. 텍스트 정보 영역 (흰색 배경) */}
      {/* ✨ 패딩을 p-5 -> p-7 로 확대 */}
      <div className="p-7 flex flex-col flex-1 bg-white">
        {/* ✨ 제목: text-xl -> text-3xl (아주 크게) */}
        <h3 className="font-extrabold text-3xl text-gray-900 mb-3 leading-tight tracking-tight">
          {item.name}
        </h3>
        
        {/* ✨ 설명: text-base -> text-lg (잘 보이게) */}
        {item.description && (
          <p className="text-lg text-gray-500 font-medium leading-relaxed line-clamp-3">
            {item.description}
          </p>
        )}
      </div>

      {/* 3. 가격 영역 (구분된 배경색) */}
      {/* ✨ 패딩 확대 및 배경색 진하게 조정 */}
      <div className="px-7 py-6 bg-gray-50 border-t border-gray-100 flex justify-between items-center group-hover:bg-red-50 transition-colors">
        {/* ✨ 라벨 크기 확대 */}
        <span className="text-base font-bold text-gray-400 uppercase tracking-wider group-hover:text-red-400">
            Select
        </span>
        {/* ✨ 가격: text-2xl -> text-4xl (매우 강조) */}
        <span className="font-black text-4xl text-gray-800 group-hover:text-red-600 transition-colors">
          ${item.price.toFixed(2)}
        </span>
      </div>
    </div>
  );
}