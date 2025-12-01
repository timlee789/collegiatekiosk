import React from 'react';
import { Category } from '@/lib/types';

interface CategoryTabsProps {
    categories: Category[];
    selectedCategoryId: string;
    onSelectCategory: (id: string) => void;
}

export default function CategoryTabs({ categories, selectedCategoryId, onSelectCategory }: CategoryTabsProps) {
    return (
        <div className="flex overflow-x-auto gap-2 p-4 bg-white border-b border-gray-200 h-[80px] items-center">
            {categories.map((category) => (
                <button
                    key={category.id}
                    className={`px-6 py-3 rounded-full text-lg font-medium whitespace-nowrap transition-colors ${selectedCategoryId === category.id
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    onClick={() => onSelectCategory(category.id)}
                >
                    {category.name}
                </button>
            ))}
        </div>
    );
}
