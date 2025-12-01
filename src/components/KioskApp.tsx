'use client';

import React, { useState, useMemo } from 'react';
import { Category, Item, Modifier } from '@/lib/types';
import KioskLayout from './KioskLayout';
import CategoryTabs from './CategoryTabs';
import MenuGrid from './MenuGrid';
import CartSidebar from './CartSidebar';
import ModifierModal from './ModifierModal';

interface KioskAppProps {
    categories: Category[];
    items: Item[];
    modifiers: Modifier[];
}

interface CartItem {
    item: Item;
    modifiers: Modifier[];
    quantity: number;
}

export default function KioskApp({ categories, items, modifiers }: KioskAppProps) {
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>(categories[0]?.id || '');
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<Item | null>(null);

    const filteredItems = useMemo(() => {
        return items.filter(item => item.categoryId === selectedCategoryId);
    }, [items, selectedCategoryId]);

    const handleItemClick = (item: Item) => {
        setSelectedItem(item);
        setIsModalOpen(true);
    };

    const handleAddToCart = (item: Item, selectedModifiers: Modifier[]) => {
        setCartItems(prev => [
            ...prev,
            { item, modifiers: selectedModifiers, quantity: 1 }
        ]);
        setIsModalOpen(false);
        setSelectedItem(null);
    };

    const handleRemoveFromCart = (index: number) => {
        setCartItems(prev => prev.filter((_, i) => i !== index));
    };

    const handleCheckout = () => {
        alert('Checkout functionality coming soon!');
        setCartItems([]);
    };

    return (
        <KioskLayout
            cart={
                <CartSidebar
                    cartItems={cartItems}
                    onRemoveItem={handleRemoveFromCart}
                    onCheckout={handleCheckout}
                />
            }
        >
            <div className="flex flex-col h-full">
                <CategoryTabs
                    categories={categories}
                    selectedCategoryId={selectedCategoryId}
                    onSelectCategory={setSelectedCategoryId}
                />
                <MenuGrid
                    items={filteredItems}
                    onItemClick={handleItemClick}
                />
            </div>

            <ModifierModal
                item={selectedItem}
                modifiers={modifiers}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onAddToCart={handleAddToCart}
            />
        </KioskLayout>
    );
}
