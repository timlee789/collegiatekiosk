"use client";
import { useState, useEffect, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Category, MenuItem, ModifierGroup, CartItem, ModifierOption } from '@/lib/types';
import ItemCard from './ItemCard';
import ModifierModal from './ModifierModal';
import TableNumberModal from './TableNumberModal';
// [New] 애니메이션 라이브러리 임포트
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
    categories: Category[];
    items: MenuItem[];
    modifiersObj: { [key: string]: ModifierGroup };
}

export default function KioskMain({ categories, items, modifiersObj }: Props) {
    const [activeTab, setActiveTab] = useState<string>('');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
    const [showTableModal, setShowTableModal] = useState(false);

    const cartEndRef = useRef<HTMLDivElement>(null);

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    useEffect(() => {
        if (categories.length > 0) {
            setActiveTab(categories[0].name);
        }
    }, [categories]);

    useEffect(() => {
        cartEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [cart]);

    const filteredItems = items.filter(item => item.category === activeTab);

    // [수정] 장바구니 추가 함수 (세트 메뉴 로직 적용)
    const handleAddToCart = (item: MenuItem, selectedOptions: ModifierOption[]) => {
        const totalPrice = item.price + selectedOptions.reduce((sum, opt) => sum + opt.price, 0);

        // 1. 메인 아이템 장바구니에 추가
        const mainCartItem: CartItem = {
            ...item,
            selectedModifiers: selectedOptions,
            totalPrice: totalPrice,
            quantity: 1,
            uniqueCartId: Date.now().toString() + Math.random().toString(),
        };

        // 임시 장바구니 배열 생성 (메인 아이템 포함)
        let newCartItems = [mainCartItem];

        // -------------------------------------------------------
        // [New] Special 메뉴 번들링(Bundling) 로직
        // -------------------------------------------------------
        if (item.category === 'Special') {
            const desc = item.description?.toLowerCase() || '';

            // A. 감자튀김 ("Fries" 또는 "FF"가 설명에 포함되면)
            if (desc.includes('fries') || desc.includes('ff')) {
                // 전체 아이템 목록에서 "1/2 FF" 또는 "French Fries" 찾기
                const friesItem = items.find(i =>
                    i.name === '1/2 FF' || i.name === 'French Fries' || i.posName === '1/2 FF'
                );

                if (friesItem) {
                    newCartItems.push({
                        ...friesItem,
                        selectedModifiers: [],
                        totalPrice: 0, // 세트 포함이므로 가격 0원
                        quantity: 1,
                        uniqueCartId: Date.now().toString() + Math.random().toString(),
                        name: `(Set) ${friesItem.name}` // 이름 앞에 (Set) 표시
                    });
                }
            }

            // B. 음료 ("Drink"가 설명에 포함되면)
            if (desc.includes('drink')) {
                // 전체 아이템 목록에서 "Soft Drink" 찾기
                const drinkItem = items.find(i =>
                    i.name === 'Soft Drink' || i.posName === 'Soft Drink'
                );

                if (drinkItem) {
                    newCartItems.push({
                        ...drinkItem,
                        selectedModifiers: [], // 주의: 음료 맛(콜라/사이다) 선택 로직은 추후 필요할 수 있음
                        totalPrice: 0, // 세트 포함이므로 가격 0원
                        quantity: 1,
                        uniqueCartId: Date.now().toString() + Math.random().toString(),
                        name: `(Set) ${drinkItem.name}`
                    });
                }
            }
        }

        // 2. 최종적으로 장바구니 상태 업데이트
        setCart(prev => [...prev, ...newCartItems]);
        setSelectedItem(null);
    };
    const handleItemClick = (item: MenuItem) => {
        if (!item.modifierGroups || item.modifierGroups.length === 0) {
            handleAddToCart(item, []);
        } else {
            setSelectedItem(item);
        }
    };

    const removeFromCart = (uniqueId: string) => {
        setCart(prev => prev.filter(item => item.uniqueCartId !== uniqueId));
    };

    const getCartTotal = () => {
        return cart.reduce((sum, item) => sum + item.totalPrice, 0);
    };

    const processOrder = async (tableNumber: string) => {
    setShowTableModal(false);
    if (cart.length === 0) return;

    try {
      // 1. [기존] Supabase DB 저장 (주문 내역 보관용)
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          total_amount: getCartTotal(),
          status: 'paid', // 결제 완료로 처리
          table_number: tableNumber,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // ... (Order Items 저장 로직 동일) ...

      // 2. [추가] Clover POS 연동 (매출 기록 및 프린트)
      // fetch를 사용해 방금 만든 Next.js API 호출
      const cloverResponse = await fetch('/api/clover/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart, // 장바구니 데이터 전송
          totalAmount: getCartTotal(),
          tableNumber: tableNumber
        })
      });

      if (!cloverResponse.ok) {
        console.error("Clover Sync Failed"); 
        // Clover 실패해도 주문은 들어간 것이므로 에러를 띄우진 않고 로그만 남김
      }

      alert(`Order Confirmed! \nPlease take Number Stand #${tableNumber}.`);
      setCart([]); 

    } catch (error: any) {
      console.error("Order Error:", error);
      alert("Failed to place order.");
    }
  };

    return (
        <div className="flex h-full w-full bg-gray-100">
            {/* ------------------------------------------- */}
            {/* 왼쪽: 메뉴판 영역 (70%) */}
            {/* ------------------------------------------- */}
            <div className="w-[70%] flex flex-col border-r border-gray-300 h-full">

                {/* 상단 카테고리 버튼 */}
                <div className="flex overflow-x-auto bg-white p-4 gap-3 shadow-sm h-28 scrollbar-hide items-center border-b border-gray-200">
                    {categories.map((cat, index) => (
                        <button
                            key={cat.id || index}
                            onClick={() => setActiveTab(cat.name)}
                            className={`flex-shrink-0 px-8 h-16 rounded-full text-2xl font-extrabold transition-all shadow-sm border-2
                ${activeTab === cat.name
                                    ? 'bg-red-600 text-white border-red-600 shadow-md scale-105'
                                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'}`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>

                {/* 메뉴 그리드 */}
                <div className="flex-1 overflow-y-auto p-4 bg-gray-100">
                    <div className="grid grid-cols-5 gap-4 content-start pb-20">
                        {filteredItems.length > 0 ? (
                            filteredItems.map((item, index) => (
                                <ItemCard
                                    key={`${item.id}-${index}`}
                                    item={item}
                                    onClick={() => handleItemClick(item)}
                                />
                            ))
                        ) : (
                            <div className="col-span-5 flex flex-col items-center justify-center pt-20 text-gray-500">
                                <p className="text-2xl font-bold">No items available.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ------------------------------------------- */}
            {/* 오른쪽: 장바구니 영역 (30%) */}
            {/* ------------------------------------------- */}
            <div className="w-[30%] bg-white flex flex-col h-full shadow-2xl z-20">

                {/* 헤더 */}
                <div className="p-6 bg-gray-900 text-white shadow-md flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-3xl font-extrabold">Order List</h2>
                        <p className="text-gray-300 text-lg">{cart.length} items</p>
                    </div>
                    {cart.length > 0 && (
                        <button
                            onClick={() => setCart([])}
                            className="text-base text-red-300 hover:text-white underline font-bold"
                        >
                            Clear
                        </button>
                    )}
                </div>

                {/* 리스트 (애니메이션 적용 영역) */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                    {cart.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4">
                            <div className="text-7xl opacity-30">🛒</div>
                            <p className="text-2xl font-bold">Touch item to add</p>
                        </div>
                    ) : (
                        // [New] AnimatePresence: 아이템이 제거될 때도 애니메이션 실행
                        <AnimatePresence initial={false} mode='popLayout'>
                            {cart.map((cartItem) => (
                                <motion.div
                                    key={cartItem.uniqueCartId}
                                    layout // 리스트 순서 변경 시 부드럽게 이동
                                    // 1. 등장 애니메이션 (위에서 떨어짐 + 스프링)
                                    initial={{ opacity: 0, y: -50, scale: 0.8 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, x: -100, transition: { duration: 0.2 } }} // 삭제 시 왼쪽으로 날아감
                                    transition={{
                                        type: "spring",
                                        stiffness: 400, // 스프링 강도
                                        damping: 15,    // 튕김 정도 (낮을수록 많이 튕김)
                                        mass: 0.8       // 무게감
                                    }}
                                    className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 flex flex-row gap-3 relative z-0"
                                >
                                    <div className="flex-1 flex flex-col justify-center">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-extrabold text-xl text-gray-900 leading-tight">{cartItem.name}</h4>
                                        </div>

                                        {cartItem.selectedModifiers.length > 0 && (
                                            <div className="mt-2 text-base text-gray-600 font-medium bg-gray-50 p-2 rounded-lg">
                                                {cartItem.selectedModifiers.map((opt, i) => (
                                                    <span key={i} className="block">
                                                        + {opt.name} {opt.price > 0 && `($${opt.price.toFixed(2)})`}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        <div className="mt-3 font-black text-gray-900 text-2xl">
                                            ${cartItem.totalPrice.toFixed(2)}
                                        </div>
                                    </div>

                                    <div className="flex flex-col justify-center border-l pl-4 border-gray-100">
                                        <button
                                            onClick={() => removeFromCart(cartItem.uniqueCartId)}
                                            className="w-14 h-14 flex items-center justify-center bg-red-50 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-8 h-8">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                            </svg>
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    )}
                    <div ref={cartEndRef} />
                </div>

                {/* 결제 버튼 */}
                <div className="p-6 border-t bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] shrink-0">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-2xl font-bold text-gray-700">Total</span>
                        <span className="text-4xl font-black text-red-600">${getCartTotal().toFixed(2)}</span>
                    </div>
                    <button
                        className="w-full h-24 bg-green-600 text-white text-4xl font-black rounded-2xl hover:bg-green-700 shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => setShowTableModal(true)}
                        disabled={cart.length === 0}
                    >
                        Pay Now
                    </button>
                </div>
            </div>

            {selectedItem && (
                <ModifierModal
                    item={selectedItem}
                    modifiersObj={modifiersObj}
                    onClose={() => setSelectedItem(null)}
                    onConfirm={handleAddToCart}
                />
            )}

            {showTableModal && (
                <TableNumberModal
                    onConfirm={processOrder}
                    onCancel={() => setShowTableModal(false)}
                />
            )}
        </div>
    );
}