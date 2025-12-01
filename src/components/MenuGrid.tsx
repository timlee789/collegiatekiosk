import React from 'react';
import { Item } from '@/lib/types';
import ItemCard from './ItemCard';

interface MenuGridProps {
    items: Item[];
    onItemClick: (item: Item) => void;
}

export default function MenuGrid({ items, onItemClick }: MenuGridProps) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-4 overflow-y-auto h-full">
            {items.map((item) => (
                <ItemCard key={item.id} item={item} onClick={onItemClick} />
            ))}
        </div>
    );
}
