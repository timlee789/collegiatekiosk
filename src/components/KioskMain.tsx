"use client";
import { useState, useEffect, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Category, MenuItem, ModifierGroup, CartItem, ModifierOption } from '@/lib/types';
import ItemCard from './ItemCard';
import ModifierModal from './ModifierModal';
import TableNumberModal from './TableNumberModal';
import { motion, AnimatePresence } from 'framer-motion';

import OrderTypeModal from './OrderTypeModal'; 
import TipModal from './TipModal';

interface Props {
  categories: Category[];
  items: MenuItem[];
  modifiersObj: { [key: string]: ModifierGroup };
}

// ⚠️ [수정] CartItem 타입에 'groupId' 속성을 추가하여 내부적으로 확장 사용
// (기존 types.ts를 건드리지 않고 여기서만 확장해서 씁니다)
interface ExtendedCartItem extends CartItem {
  groupId?: string;
}

export default function KioskMain({ categories, items, modifiersObj }: Props) {
  const [activeTab, setActiveTab] = useState<string>('');
  
  // ⚠️ [수정] 확장된 타입(ExtendedCartItem)을 사용하여 상태 관리
  const [cart, setCart] = useState<ExtendedCartItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  
  // 모달 상태 관리
  const [showTableModal, setShowTableModal] = useState(false);
  const [showOrderTypeModal, setShowOrderTypeModal] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  
  const [currentTableNumber, setCurrentTableNumber] = useState<string>('');
  const [selectedOrderType, setSelectedOrderType] = useState<'dine_in' | 'to_go' | null>(null);

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

  // ---------------------------------------------------------
  // [계산 로직]
  // ---------------------------------------------------------
  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
    const tax = subtotal * 0.07;
    const totalWithTax = subtotal + tax;
    const cardFee = totalWithTax * 0.03;
    const grandTotal = totalWithTax + cardFee;
    return { subtotal, tax, cardFee, grandTotal };
  };

  const { subtotal, tax, cardFee, grandTotal } = calculateTotals();

  // ---------------------------------------------------------
  // 장바구니 추가 (세트 메뉴 그룹화 로직 추가됨)
  // ---------------------------------------------------------
  const handleAddToCart = (item: MenuItem, selectedOptions: ModifierOption[]) => {
    const totalPrice = item.price + selectedOptions.reduce((sum, opt) => sum + opt.price, 0);
    
    // ⚠️ [추가] 세트 메뉴일 경우 고유한 그룹 ID 생성 (아니면 undefined)
    const isSpecialSet = item.category === 'Special';
    const currentGroupId = isSpecialSet ? `group-${Date.now()}-${Math.random()}` : undefined;

    const mainCartItem: ExtendedCartItem = {
      ...item,
      selectedModifiers: selectedOptions,
      totalPrice: totalPrice,
      quantity: 1,
      uniqueCartId: Date.now().toString() + Math.random().toString(),
      groupId: currentGroupId, // 그룹 ID 부여
    };

    let newCartItems = [mainCartItem];

    // Special 세트 메뉴 자동 추가 로직
    if (isSpecialSet) {
      const desc = item.description?.toLowerCase() || '';
      
      if (desc.includes('fries') || desc.includes('ff')) {
        const friesItem = items.find(i => i.name === '1/2 FF' || i.name === 'French Fries' || i.posName === '1/2 FF');
        if (friesItem) {
          newCartItems.push({
            ...friesItem,
            selectedModifiers: [],
            totalPrice: 0,
            quantity: 1,
            uniqueCartId: Date.now().toString() + Math.random().toString(),
            name: `(Set) ${friesItem.name}`,
            groupId: currentGroupId // ⚠️ 사이드 메뉴에도 같은 그룹 ID 부여
          });
        }
      }

      if (desc.includes('drink')) {
        const drinkItem = items.find(i => i.name === 'Soft Drink' || i.posName === 'Soft Drink');
        if (drinkItem) {
          newCartItems.push({
            ...drinkItem,
            selectedModifiers: [],
            totalPrice: 0,
            quantity: 1,
            uniqueCartId: Date.now().toString() + Math.random().toString(),
            name: `(Set) ${drinkItem.name}`,
            groupId: currentGroupId // ⚠️ 사이드 메뉴에도 같은 그룹 ID 부여
          });
        }
      }
    }

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

  // ⚠️ [수정] 장바구니 삭제 로직 (그룹 삭제 기능 추가)
  const removeFromCart = (uniqueId: string) => {
    setCart(prev => {
      // 1. 삭제하려는 아이템을 찾음
      const targetItem = prev.find(item => item.uniqueCartId === uniqueId);
      
      // 2. 만약 그룹 ID가 있는 아이템(세트 메뉴)이라면?
      if (targetItem && targetItem.groupId) {
        // 그 그룹 ID를 가진 모~든 아이템을 다 지워버림 (햄버거+감튀+음료 함께 삭제)
        return prev.filter(item => item.groupId !== targetItem.groupId);
      }
      
      // 3. 일반 아이템이면 그냥 그것만 삭제
      return prev.filter(item => item.uniqueCartId !== uniqueId);
    });
  };

  // ---------------------------------------------------------
  // [STEP 1] 테이블 번호 입력 완료 -> 주문 유형 선택으로 이동
  // ---------------------------------------------------------
  const handleTableNumberConfirm = (tableNum: string) => {
    setCurrentTableNumber(tableNum);
    setShowTableModal(false);     
    setShowOrderTypeModal(true);  
  };

  // ---------------------------------------------------------
  // [STEP 2] 주문 유형 선택 -> 팁 모달 열기
  // ---------------------------------------------------------
  const handleOrderTypeSelect = (type: 'dine_in' | 'to_go') => {
    setSelectedOrderType(type);
    setShowOrderTypeModal(false); 
    
    if (type === 'to_go') {
        setCurrentTableNumber('To Go'); 
    }
    
    setShowTipModal(true);
  };

  // ---------------------------------------------------------
  // [STEP 3] 팁 선택 완료 -> 결제 시작
  // ---------------------------------------------------------
  const handleTipSelect = (tipAmount: number) => {
    setShowTipModal(false);
    processPayment(selectedOrderType || 'dine_in', tipAmount);
  };

  // ---------------------------------------------------------
  // [FINAL STEP] 실제 결제 및 처리
  // ---------------------------------------------------------
  const processPayment = async (orderType: 'dine_in' | 'to_go', tipAmount: number) => {
    if (cart.length === 0) return;

    try {
      const { grandTotal } = calculateTotals();
      const finalAmountWithTip = grandTotal + tipAmount;

      // 1. Stripe 결제 요청
      console.log(`💳 Processing Payment: $${finalAmountWithTip} (Tip: $${tipAmount})`);
      
      const stripeRes = await fetch('/api/stripe/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: finalAmountWithTip }) 
      });
      const stripeData = await stripeRes.json();
      if (!stripeData.success) throw new Error(stripeData.error || "Payment failed");
      const paymentIntentId = stripeData.paymentIntentId;

      // ... Stripe 결제 대기 ...
      let isPaid = false;
      for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const captureRes = await fetch('/api/stripe/capture', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ paymentIntentId })
        });
        const captureData = await captureRes.json();
        if (captureData.status === 'succeeded') {
          isPaid = true;
          break;
        }
      }
      if (!isPaid) throw new Error("Payment timed out.");

      // 2. DB 저장
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          total_amount: finalAmountWithTip,
          status: 'paid',
          table_number: currentTableNumber,
          order_type: orderType,
          tip_amount: tipAmount
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItemsData = cart.map(item => ({
        order_id: orderData.id,
        item_name: item.name,
        quantity: item.quantity,
        price: item.totalPrice,
        options: item.selectedModifiers
      }));
      await supabase.from('order_items').insert(orderItemsData);

      // 3. Clover 연동
      const cloverRes = await fetch('/api/clover/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart,
          totalAmount: finalAmountWithTip,
          tableNumber: currentTableNumber,
          orderType: orderType
        })
      });
      const cloverJson = await cloverRes.json();
      const cloverOrderId = cloverJson.orderId || "Error";

      // 4. 주방 프린터 전송
      console.log("🖨️ Sending to Local Printer Server...");
      try {
        await fetch('http://localhost:4000/print', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: cart, 
            tableNumber: currentTableNumber,
            orderId: cloverOrderId 
          })
        });
        console.log("🖨️ Print Command Sent!");
      } catch (printError) {
        console.error("Printer Error:", printError);
      }

      // 5. 완료
      alert(`Payment Successful!`);
      setCart([]); 
      setCurrentTableNumber('');
      setSelectedOrderType(null);

    } catch (error: any) {
      console.error("Order Process Error:", error);
      alert("Error: " + error.message);
    }
  };

  return (
    <div className="flex h-full w-full bg-gray-100">
      {/* 왼쪽: 메뉴판 영역 */}
      <div className="w-[70%] flex flex-col border-r border-gray-300 h-full">
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

      {/* 오른쪽: 장바구니 영역 */}
      <div className="w-[30%] bg-white flex flex-col h-full shadow-2xl z-20">
        <div className="p-6 bg-gray-900 text-white shadow-md flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-3xl font-extrabold">Order List</h2>
            <p className="text-gray-300 text-lg">{cart.length} items</p>
          </div>
          {cart.length > 0 && (
            <button onClick={() => setCart([])} className="text-base text-red-300 hover:text-white underline font-bold">
              Clear
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          <AnimatePresence initial={false} mode='popLayout'>
            {cart.map((cartItem) => (
              <motion.div 
                key={cartItem.uniqueCartId}
                layout 
                initial={{ opacity: 0, y: -50, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: -100, transition: { duration: 0.2 } }} 
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
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
          <div ref={cartEndRef} />
        </div>

        <div className="p-6 border-t bg-gray-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] shrink-0">
          <div className="space-y-2 mb-4 text-gray-600 font-medium">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Sales Tax (7%)</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Card Fee (3%)</span>
              <span>${cardFee.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex justify-between items-center mb-4 pt-4 border-t border-gray-200">
            <span className="text-2xl font-bold text-gray-800">Total</span>
            <span className="text-4xl font-black text-red-600">${grandTotal.toFixed(2)}</span>
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
          onConfirm={handleTableNumberConfirm} 
          onCancel={() => setShowTableModal(false)}
        />
      )}

      {showOrderTypeModal && (
        <OrderTypeModal
          onSelect={handleOrderTypeSelect}
          onCancel={() => setShowOrderTypeModal(false)}
        />
      )}

      {showTipModal && (
        <TipModal
          subtotal={subtotal} 
          onSelectTip={handleTipSelect}
        />
      )}
    </div>
  );
}