// src/components/ModifierModal.tsx
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

    // ⚠️ [수정됨] 옵션 선택 로직 (단일 선택 vs 다중 선택 분기 처리)
    const toggleOption = (option: ModifierOption, groupName: string) => {
        const lowerItemName = item.name.toLowerCase();
        const lowerGroupName = groupName.toLowerCase();
        
        // 🥤 밀크쉐이크 로직: Size와 Flavor 그룹은 '하나만' 선택 (Radio Button 동작)
        const isMilkshake = lowerItemName.includes('milkshake');
        const isSingleSelectGroup = isMilkshake && (lowerGroupName.includes('size') || lowerGroupName.includes('flavor'));

        if (isSingleSelectGroup) {
            setSelectedOptions(prev => {
                // 1. 현재 그룹에 속한 모든 옵션들의 이름을 가져옴
                const currentGroupOptions = modifiersObj[groupName].options.map(o => o.name);
                
                // 2. 기존 선택된 옵션들 중에서 '현재 그룹에 속하지 않은 것들'만 남김 (즉, 현재 그룹의 기존 선택 제거)
                const others = prev.filter(o => !currentGroupOptions.includes(o.name));
                
                // 3. 새로 클릭한 옵션을 추가 (교체 효과)
                return [...others, option];
            });
        } else {
            // ✅ 일반 로직 (다중 선택 / 토글)
            setSelectedOptions(prev => {
                const exists = prev.find(o => o.name === option.name);
                if (exists) {
                    return prev.filter(o => o.name !== option.name); // 이미 있으면 제거
                } else {
                    return [...prev, option]; // 없으면 추가
                }
            });
        }
    };

    // 장바구니 담기 전 유효성 검사
    const handleAddToCart = () => {
        const itemName = item.name.toLowerCase();

        // 🥤 밀크쉐이크인 경우 필수 선택 검사
        if (itemName.includes('milkshake')) {
            let hasSize = false;
            let hasFlavor = false;

            item.modifierGroups.forEach(groupName => {
                const group = modifiersObj[groupName];
                if (!group) return;

                const lowerGroupName = groupName.toLowerCase();
                
                // 현재 그룹에서 선택된 옵션이 있는지 확인
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
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            {/* ✨ 모달 너비 확대: max-w-6xl 적용 */}
            <div className="bg-white rounded-[2rem] w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">

                {/* 헤더 */}
                <div className="p-8 border-b bg-gray-50 flex justify-between items-center shrink-0">
                    <div>
                        {/* ✨ 헤더 글씨 확대 */}
                        <h2 className="text-4xl font-extrabold text-gray-900">{item.name}</h2>
                        <p className="text-gray-500 text-xl mt-2 font-medium">Select your options</p>
                    </div>
                    {/* ✨ 가격 글씨 확대 */}
                    <span className="text-4xl text-red-600 font-black">${currentTotal.toFixed(2)}</span>
                </div>

                {/* 옵션 스크롤 영역 */}
                <div className="flex-1 overflow-y-auto p-8 space-y-10 bg-white">
                    {item.modifierGroups.length === 0 && (
                        <p className="text-center text-gray-400 py-10 text-2xl">No options available for this item.</p>
                    )}

                    {item.modifierGroups.map((groupName, idx) => {
                        const group = modifiersObj[groupName];
                        if (!group) return null;

                        return (
                            <div key={`${groupName}-${idx}`}>
                                {/* ✨ 그룹 제목 글씨 확대 */}
                                <h3 className="text-3xl font-black mb-6 text-gray-800 border-l-8 border-red-500 pl-4 uppercase tracking-tight">
                                    {groupName}
                                </h3>
                                
                                {/* ✨ [핵심 수정] 무조건 3열 그리드 (grid-cols-3) 및 간격 확대 (gap-5) */}
                                <div className="grid grid-cols-3 gap-5">
                                    {group.options.map((option, optIdx) => {
                                        const isSelected = selectedOptions.some(o => o.name === option.name);
                                        return (
                                            <div
                                                key={`${option.name}-${optIdx}`}
                                                onClick={() => toggleOption(option, groupName)}
                                                // ✨ 박스 패딩 확대 (p-6)
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
                                                    {/* ✨ 옵션 이름 글씨 확대 (text-2xl) */}
                                                    <span className="text-2xl font-bold text-gray-800 leading-tight">{option.name}</span>
                                                    {option.price > 0 && (
                                                        // ✨ 가격 글씨 확대 (text-xl)
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
                <div className="p-8 border-t bg-white flex gap-6 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                    <button
                        onClick={onClose}
                        // ✨ 버튼 높이 및 글씨 확대
                        className="flex-1 bg-gray-200 text-gray-700 text-3xl font-bold rounded-2xl h-24 hover:bg-gray-300 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleAddToCart}
                        // ✨ 버튼 높이 및 글씨 확대
                        className="flex-[2] bg-red-600 text-white text-3xl font-bold rounded-2xl h-24 hover:bg-red-700 shadow-xl shadow-red-200 transition-colors flex items-center justify-center gap-3"
                    >
                        Add to Order <span className="text-red-200 text-2xl font-semibold">| ${currentTotal.toFixed(2)}</span>
                    </button>
                </div>

            </div>
        </div>
    );
}