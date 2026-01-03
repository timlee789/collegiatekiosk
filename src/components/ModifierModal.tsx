"use client";
import { useState } from 'react';
import { MenuItem, ModifierGroup, ModifierOption } from '@/lib/types';

interface Props {
    item: MenuItem;
    modifiersObj: { [key: string]: ModifierGroup };
    onClose: () => void;
    onConfirm: (item: MenuItem, selectedOptions: ModifierOption[]) => void;
}

export default function ModifierModal({ item, modifiersObj, onClose, onConfirm }: Props) {
    const [selectedOptions, setSelectedOptions] = useState<ModifierOption[]>([]);

    // 옵션 선택 로직
    const toggleOption = (option: ModifierOption, groupName: string) => {
        const lowerItemName = item.name.toLowerCase();
        const lowerGroupName = groupName.toLowerCase();
        
        // 🥤 밀크쉐이크 로직 (단일 선택)
        const isMilkshake = lowerItemName.includes('milkshake');
        const isSingleSelectGroup = isMilkshake && (lowerGroupName.includes('size') || lowerGroupName.includes('flavor'));

        if (isSingleSelectGroup) {
            setSelectedOptions(prev => {
                // 현재 그룹에 속한 옵션 이름들 추출
                const currentGroupOptions = modifiersObj[groupName]?.options.map(o => o.name) || [];
                
                // 기존 선택에서 현재 그룹 옵션 제거
                const others = prev.filter(o => !currentGroupOptions.includes(o.name));
                
                // 새 옵션 추가
                return [...others, option];
            });
        } else {
            // ✅ 일반 로직 (다중 선택/토글)
            setSelectedOptions(prev => {
                const exists = prev.find(o => o.name === option.name);
                if (exists) {
                    return prev.filter(o => o.name !== option.name);
                } else {
                    return [...prev, option];
                }
            });
        }
    };

    // 장바구니 담기 전 유효성 검사
    const handleAddToCart = () => {
        const itemName = item.name.toLowerCase();

        // 🥤 밀크쉐이크 필수 선택 검사
        if (itemName.includes('milkshake')) {
            let hasSize = false;
            let hasFlavor = false;

            item.modifierGroups.forEach(groupName => {
                const group = modifiersObj[groupName];
                if (!group) return;

                const lowerGroupName = groupName.toLowerCase();
                
                const isSelectedInGroup = group.options.some(opt => 
                    selectedOptions.some(selected => selected.name === opt.name)
                );

                if (lowerGroupName.includes('size') && isSelectedInGroup) hasSize = true;
                if (lowerGroupName.includes('flavor') && isSelectedInGroup) hasFlavor = true;
            });

            if (!hasSize) {
                alert("⚠️ Please select a Size.\n(사이즈를 선택해주세요.)");
                return;
            }
            if (!hasFlavor) {
                alert("⚠️ Please select a Flavor.\n(맛을 선택해주세요.)");
                return;
            }
        }

        onConfirm(item, selectedOptions);
    };

    // 총 가격 계산
    const currentTotal = item.price + selectedOptions.reduce((sum, opt) => sum + opt.price, 0);

    return (
        // ✨ 외부 배경 터치 시 닫기 (onClick={onClose})
        <div 
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={onClose}
        >
            {/* ✨ 내부 모달: 높이 자동 조절 (max-h-[85vh]), 너비 축소 (w-[90%]) */}
            <div 
                onClick={(e) => e.stopPropagation()} // 내부 클릭 시 닫힘 방지
                className="bg-white rounded-[2rem] w-[90%] h-auto max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200"
            >

                {/* 헤더 */}
                <div className="p-6 border-b bg-gray-50 flex justify-between items-center shrink-0">
                    <div className="flex-1 pr-4">
                        <h2 className="text-3xl font-extrabold text-gray-900 leading-tight">{item.name}</h2>
                        <p className="text-gray-500 text-lg mt-1 font-medium">Select your options</p>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <span className="text-3xl text-red-600 font-black">${currentTotal.toFixed(2)}</span>
                        
                        {/* ✨ X 닫기 버튼 추가 */}
                        <button 
                            onClick={onClose}
                            className="bg-red-100 p-2 rounded-full hover:bg-red-200 transition-colors shadow-sm"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-8 h-8 text-red-600">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* 옵션 스크롤 영역 */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-white">
                    {item.modifierGroups.length === 0 && (
                        <p className="text-center text-gray-400 py-10 text-2xl">No options available for this item.</p>
                    )}

                    {item.modifierGroups.map((groupName, idx) => {
                        const group = modifiersObj[groupName];
                        
                        // group이 없거나 옵션이 비어있으면 렌더링 안 함
                        if (!group || !group.options || group.options.length === 0) return null;

                        // ✨ 정렬 로직 (sort_order가 있다면 사용, 없으면 0 처리)
                        // 타입 에러 방지를 위해 any 캐스팅 혹은 옵셔널 체이닝 사용
                        const sortedOptions = [...group.options].sort((a: any, b: any) => {
                            return (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0);
                        });

                        return (
                            <div key={`${groupName}-${idx}`}>
                                <h3 className="text-3xl font-black mb-6 text-gray-800 border-l-8 border-red-500 pl-4 uppercase tracking-tight">
                                    {groupName}
                                </h3>
                                
                                {/* ✨ 3열 그리드 (grid-cols-3) */}
                                <div className="grid grid-cols-3 gap-5">
                                    {sortedOptions.map((option, optIdx) => {
                                        const isSelected = selectedOptions.some(o => o.name === option.name);
                                        return (
                                            <div
                                                key={`${option.name}-${optIdx}`}
                                                onClick={() => toggleOption(option, groupName)}
                                                // ✨ 패딩 확대 (p-6)
                                                className={`flex items-center p-6 border-2 rounded-2xl cursor-pointer transition-all active:scale-95
                                                    ${isSelected
                                                        ? 'border-red-500 bg-red-50 ring-2 ring-red-500 shadow-md'
                                                        : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50'
                                                    }`}
                                            >
                                                {/* ✨ 체크박스 원형 확대 (w-8 h-8) */}
                                                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center mr-5 shrink-0
                                                    ${isSelected ? 'bg-red-500 border-red-500' : 'bg-white border-gray-300'}`}
                                                >
                                                    {isSelected && <div className="w-3.5 h-3.5 bg-white rounded-full" />}
                                                </div>
                                                
                                                <div className="flex flex-col">
                                                    {/* ✨ 글씨 크기 확대 */}
                                                    <span className="text-2xl font-bold text-gray-800 leading-tight">{option.name}</span>
                                                    {option.price > 0 && (
                                                        <span className="text-xl text-red-600 font-bold mt-1">+${option.price.toFixed(2)}</span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* 하단 버튼 */}
                <div className="p-6 border-t bg-white flex gap-6 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                    <button
                        onClick={onClose}
                        className="flex-1 bg-gray-200 text-gray-700 text-2xl font-bold rounded-2xl h-20 hover:bg-gray-300 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleAddToCart}
                        className="flex-[2] bg-red-600 text-white text-2xl font-bold rounded-2xl h-20 hover:bg-red-700 shadow-xl shadow-red-200 transition-colors flex items-center justify-center gap-3"
                    >
                        Add to Order <span className="text-red-200 text-xl font-semibold">| ${currentTotal.toFixed(2)}</span>
                    </button>
                </div>

            </div>
        </div>
    );
}