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
      className="bg-white rounded-3xl shadow-sm overflow-hidden cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all border border-gray-100 flex flex-col h-full"
    >
      {/* [수정됨] aspect-[4/3] -> aspect-square 
        1800x1800 이미지가 잘리지 않고 꽉 차게 나옵니다.
      */}
      <div className="aspect-square bg-gray-100 relative overflow-hidden shrink-0">
        {item.image && !imageError ? (
          <img 
            src={item.image} 
            alt={item.name} 
            className="object-cover w-full h-full" 
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-100">
            <span className="text-4xl mb-2 grayscale opacity-50">🍔</span>
          </div>
        )}
      </div>

      {/* 텍스트 정보 영역 */}
      <div className="p-4 flex flex-col flex-1 justify-between">
        <div>
          <h3 className="font-extrabold text-xl text-gray-800 mb-2 tracking-tight leading-tight">
            {item.name}
          </h3>
          
          {item.description && (
            <p className="text-base text-gray-500 font-medium leading-snug line-clamp-2">
              {item.description}
            </p>
          )}
        </div>

        <div className="pt-3 mt-auto text-right border-t border-gray-50">
          <span className="font-black text-2xl text-red-600">
            ${item.price.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}