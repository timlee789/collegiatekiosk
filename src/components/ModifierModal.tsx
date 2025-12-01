// src/components/ModifierModal.tsx
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

    const toggleOption = (option: ModifierOption) => {
        setSelectedOptions(prev => {
            const exists = prev.find(o => o.name === option.name);
            if (exists) {
                return prev.filter(o => o.name !== option.name); // 이미 있으면 제거
            } else {
                return [...prev, option]; // 없으면 추가
            }
        });
    };

    // 총 가격 계산 (기본가 + 옵션가)
    const currentTotal = item.price + selectedOptions.reduce((sum, opt) => sum + opt.price, 0);

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">

                {/* 헤더 */}
                <div className="p-6 border-b bg-gray-50 flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-3xl font-extrabold text-gray-800">{item.name}</h2>
                        <p className="text-gray-500 text-sm mt-1">Select your options</p>
                    </div>
                    <span className="text-2xl text-red-600 font-bold">${currentTotal.toFixed(2)}</span>
                </div>

                {/* 옵션 스크롤 영역 */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-white">
                    {item.modifierGroups.length === 0 && (
                        <p className="text-center text-gray-400 py-10">No options available for this item.</p>
                    )}

                    {item.modifierGroups.map((groupName, idx) => {
                        const group = modifiersObj[groupName];
                        if (!group) return null;

                        // 'Add on'이 이름에 포함되어 있는지 확인 (대소문자 무시)
                        const isAddOn = groupName.toLowerCase().includes('add on');
                        const gridClass = isAddOn ? 'grid-cols-2' : 'grid-cols-1';

                        return (
                            <div key={`${groupName}-${idx}`}>
                                <h3 className="text-lg font-bold mb-3 text-gray-700 border-l-4 border-red-500 pl-3 uppercase">
                                    {groupName}
                                </h3>
                                <div className={`grid ${gridClass} gap-3`}>
                                    {group.options.map((option, optIdx) => {
                                        const isSelected = selectedOptions.some(o => o.name === option.name);
                                        return (
                                            <div
                                                key={`${option.name}-${optIdx}`}
                                                onClick={() => toggleOption(option)}
                                                className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all
                          ${isSelected
                                                        ? 'border-red-500 bg-red-50 ring-1 ring-red-500'
                                                        : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50'
                                                    }`}
                                            >
                                                <div className={`w-6 h-6 rounded border flex items-center justify-center mr-3
                          ${isSelected ? 'bg-red-500 border-red-500' : 'bg-white border-gray-300'}`}
                                                >
                                                    {isSelected && <span className="text-white text-sm">✔</span>}
                                                </div>
                                                <span className="text-lg font-medium text-gray-800">{option.name}</span>
                                                {option.price > 0 && (
                                                    <span className="ml-auto text-red-600 font-semibold">+${option.price.toFixed(2)}</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* 하단 버튼 */}
                <div className="p-6 border-t bg-white flex gap-4 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                    <button
                        onClick={onClose}
                        className="flex-1 bg-gray-200 text-gray-700 text-xl font-bold rounded-xl h-16 hover:bg-gray-300 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onConfirm(item, selectedOptions)}
                        className="flex-[2] bg-red-600 text-white text-xl font-bold rounded-xl h-16 hover:bg-red-700 shadow-lg shadow-red-200 transition-colors flex items-center justify-center gap-2"
                    >
                        Add to Order <span className="text-red-200 text-lg">| ${currentTotal.toFixed(2)}</span>
                    </button>
                </div>

            </div>
        </div>
    );
}