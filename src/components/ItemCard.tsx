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
      className="group bg-white rounded-3xl shadow-sm overflow-hidden cursor-pointer hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border border-gray-200 flex flex-col h-full"
    >
      {/* 1. 이미지 영역 (1:1 비율) */}
      <div className="aspect-square bg-gray-100 relative overflow-hidden shrink-0">
        {item.image && !imageError ? (
          <img 
            src={item.image} 
            alt={item.name} 
            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500" 
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-100">
            <span className="text-4xl mb-2 grayscale opacity-50">🍔</span>
          </div>
        )}
        
        {/* (옵션) 품절일 때 덮개 */}
        {!item.is_available && (
             <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
                 <span className="text-white font-bold text-xl border-2 border-white px-4 py-1 rounded-lg uppercase tracking-widest transform -rotate-12">
                     Sold Out
                 </span>
             </div>
        )}
      </div>

      {/* 2. 텍스트 정보 영역 (흰색 배경) */}
      <div className="p-5 flex flex-col flex-1 bg-white">
        {/* 이름 */}
        <h3 className="font-extrabold text-xl text-gray-900 mb-2 leading-tight">
          {item.name}
        </h3>
        
        {/* 설명 */}
        {item.description && (
          <p className="text-base text-gray-500 font-medium leading-relaxed line-clamp-2">
            {item.description}
          </p>
        )}
      </div>

      {/* 3. 가격 영역 (구분된 배경색) */}
      <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center group-hover:bg-red-50 transition-colors">
        <span className="text-sm font-bold text-gray-400 uppercase tracking-wider group-hover:text-red-400">
            Order
        </span>
        <span className="font-black text-2xl text-gray-800 group-hover:text-red-600 transition-colors">
          ${item.price.toFixed(2)}
        </span>
      </div>
    </div>
  );
}