import React from 'react';
import { Item, Modifier } from '@/lib/types';

interface CartItem {
    item: Item;
    modifiers: Modifier[];
    quantity: number;
}

interface CartSidebarProps {
    cartItems: CartItem[];
    onRemoveItem: (index: number) => void;
    onCheckout: () => void;
}

export default function CartSidebar({ cartItems, onRemoveItem, onCheckout }: CartSidebarProps) {
    const total = cartItems.reduce((sum, cartItem) => {
        const itemTotal = cartItem.item.price + cartItem.modifiers.reduce((mSum, m) => mSum + m.price, 0);
        return sum + (itemTotal * cartItem.quantity);
    }, 0);

    return (
        <div className="h-full flex flex-col bg-white border-l border-gray-200 shadow-xl">
            <div className="p-6 border-b border-gray-100 bg-gray-50">
                <h2 className="text-2xl font-bold text-gray-800">Your Order</h2>
                <p className="text-gray-500 text-sm">{cartItems.length} items</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {cartItems.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400">
                        <p className="text-lg">Cart is empty</p>
                        <p className="text-sm">Select items to start</p>
                    </div>
                ) : (
                    cartItems.map((cartItem, index) => (
                        <div key={index} className="bg-white border border-gray-100 rounded-lg p-4 shadow-sm relative group">
                            <button
                                onClick={() => onRemoveItem(index)}
                                className="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                &times;
                            </button>
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-bold text-gray-800">{cartItem.item.name}</h4>
                                <span className="font-semibold text-gray-900">${cartItem.item.price.toFixed(2)}</span>
                            </div>
                            {cartItem.modifiers.length > 0 && (
                                <ul className="text-sm text-gray-500 space-y-1 mb-2">
                                    {cartItem.modifiers.map((mod, i) => (
                                        <li key={i} className="flex justify-between">
                                            <span>+ {mod.name}</span>
                                            <span>${mod.price.toFixed(2)}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            <div className="flex justify-between items-center pt-2 border-t border-gray-50 mt-2">
                                <span className="text-xs font-bold text-gray-400">QTY: {cartItem.quantity}</span>
                                <span className="font-bold text-blue-600">
                                    ${((cartItem.item.price + cartItem.modifiers.reduce((s, m) => s + m.price, 0)) * cartItem.quantity).toFixed(2)}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-200">
                <div className="flex justify-between items-center mb-4">
                    <span className="text-lg font-medium text-gray-600">Total</span>
                    <span className="text-3xl font-bold text-gray-900">${total.toFixed(2)}</span>
                </div>
                <button
                    onClick={onCheckout}
                    disabled={cartItems.length === 0}
                    className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-xl shadow-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all active:scale-95"
                >
                    Checkout
                </button>
            </div>
        </div>
    );
}
