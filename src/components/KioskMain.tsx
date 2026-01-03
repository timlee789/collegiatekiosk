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
import DayWarningModal from './DayWarningModal';

interface Props {
  categories: Category[];
  items: MenuItem[];
  modifiersObj: { [key: string]: ModifierGroup };
}

interface ExtendedCartItem extends CartItem {
  groupId?: string;
}

export default function KioskMain({ categories, items, modifiersObj }: Props) {
  const [activeTab, setActiveTab] = useState<string>('');
  
  const [cart, setCart] = useState<ExtendedCartItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const [showTableModal, setShowTableModal] = useState(false);
  const [showOrderTypeModal, setShowOrderTypeModal] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const [showDayWarning, setShowDayWarning] = useState(false);
  const [warningTargetDay, setWarningTargetDay] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const [currentTableNumber, setCurrentTableNumber] = useState<string>('');
  const [selectedOrderType, setSelectedOrderType] = useState<'dine_in' | 'to_go' | null>(null);
  const [selectedTipAmount, setSelectedTipAmount] = useState<number>(0);

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
    if (isCartOpen) {
      cartEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [cart, isCartOpen]);

  const resetToHome = () => {
    setCart([]);                
    setCurrentTableNumber('');  
    setSelectedOrderType(null); 
    setIsSuccess(false);        
    setIsProcessing(false);
    setShowTipModal(false);
    setShowTableModal(false);
    setShowOrderTypeModal(false);
    setShowDayWarning(false);
    setIsCartOpen(false); 
    if (categories.length > 0) {
      setActiveTab(categories[0].name); 
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const resetIdleTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (!isProcessing) { resetToHome(); }
      }, 180000); 
    };
    window.addEventListener('click', resetIdleTimer);
    window.addEventListener('touchstart', resetIdleTimer);
    window.addEventListener('scroll', resetIdleTimer);
    resetIdleTimer();
    return () => {
      clearTimeout(timer);
      window.removeEventListener('click', resetIdleTimer);
      window.removeEventListener('touchstart', resetIdleTimer);
      window.removeEventListener('scroll', resetIdleTimer);
    };
  }, [isProcessing, categories]); 

  const filteredItems = items.filter(item => item.category === activeTab);

  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
    const tax = subtotal * 0.07;
    const totalWithTax = subtotal + tax;
    const cardFee = totalWithTax * 0.03;
    const grandTotal = totalWithTax + cardFee;
    return { subtotal, tax, cardFee, grandTotal };
  };

  const { subtotal, tax, cardFee, grandTotal } = calculateTotals();

  const handleAddToCart = (item: MenuItem, selectedOptions: ModifierOption[]) => {
    const totalPrice = item.price + selectedOptions.reduce((sum, opt) => sum + opt.price, 0);
    const isSpecialSet = item.category === 'Special';
    const currentGroupId = isSpecialSet ? `group-${Date.now()}-${Math.random()}` : undefined;

    const mainCartItem: ExtendedCartItem = {
      ...item,
      selectedModifiers: selectedOptions,
      totalPrice: totalPrice,
      quantity: 1,
      uniqueCartId: Date.now().toString() + Math.random().toString(),
      groupId: currentGroupId, 
    };

    let newCartItems = [mainCartItem];

    if (isSpecialSet) {
      const desc = item.description?.toLowerCase() || '';
      if (desc.includes('fries') || desc.includes('ff')) {
        const friesItem = items.find(i => i.name === '1/2 FF' || i.name === 'French Fries' || i.posName === '1/2 FF');
        if (friesItem) newCartItems.push({ ...friesItem, selectedModifiers: [], totalPrice: 0, quantity: 1, uniqueCartId: Date.now().toString() + Math.random().toString(), name: `(Set) ${friesItem.name}`, groupId: currentGroupId });
      }
      if (desc.includes('drink')) {
        const drinkItem = items.find(i => i.name === 'Soft Drink' || i.posName === 'Soft Drink');
        if (drinkItem) newCartItems.push({ ...drinkItem, selectedModifiers: [], totalPrice: 0, quantity: 1, uniqueCartId: Date.now().toString() + Math.random().toString(), name: `(Set) ${drinkItem.name}`, groupId: currentGroupId });
      }
    }
    setCart(prev => [...prev, ...newCartItems]);
    setSelectedItem(null);
    setIsCartOpen(true); 
  };

  const handleItemClick = (item: MenuItem) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayIndex = new Date().getDay(); 
    const todayName = days[todayIndex];     
    const targetDay = days.find(day => item.name.includes(day));

    if (targetDay && targetDay !== todayName) {
      setWarningTargetDay(targetDay);
      setShowDayWarning(true); 
      return; 
    }
    if (!item.modifierGroups || item.modifierGroups.length === 0) {
      handleAddToCart(item, []); 
    } else {
      setSelectedItem(item);
    }
  };

  const removeFromCart = (uniqueId: string) => {
    setCart(prev => {
      const targetItem = prev.find(item => item.uniqueCartId === uniqueId);
      if (targetItem && targetItem.groupId) {
        return prev.filter(item => item.groupId !== targetItem.groupId);
      }
      return prev.filter(item => item.uniqueCartId !== uniqueId);
    });
  };

  // ------------------------------------------------------------------
  // ✨ [수정] Table Number Confirm 시 카트 닫기 로직 추가
  // ------------------------------------------------------------------
  const handleTableNumberConfirm = (tableNum: string) => { 
      setCurrentTableNumber(tableNum); 
      setShowTableModal(false); 
      setIsCartOpen(false); // ✨ [Fix] 여기서 카트 모달을 닫아야 다음 모달이 보입니다!
      setShowOrderTypeModal(true); 
  };

  const handleOrderTypeSelect = (type: 'dine_in' | 'to_go') => { setSelectedOrderType(type); setShowOrderTypeModal(false); setShowTipModal(true); };
  const handleTipSelect = (tipAmount: number) => { setSelectedTipAmount(tipAmount); setShowTipModal(false); processRealPayment(tipAmount); };

  const processRealPayment = async (finalTipAmount: number) => {
    if (cart.length === 0) return;
    setIsProcessing(true); 
    const orderType = selectedOrderType || 'dine_in';
    const tableNum = currentTableNumber || '00'; 

    try {
      const { subtotal, tax, cardFee, grandTotal } = calculateTotals();
      const finalAmountWithTip = grandTotal + finalTipAmount;
      
      const stripeRes = await fetch('/api/stripe/process', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: finalAmountWithTip }) });
      if (!stripeRes.ok) throw new Error("Card Payment Failed or Declined.");

      const { data: orderData, error: orderError } = await supabase.from('orders').insert({ total_amount: finalAmountWithTip, status: 'paid', table_number: orderType === 'to_go' ? 'To Go' : tableNum, order_type: orderType, }).select().single();
      if (orderError) throw orderError;

      const orderItemsData = cart.map(item => ({ order_id: orderData.id, item_name: item.name, quantity: item.quantity, price: item.totalPrice, options: item.selectedModifiers }));
      await supabase.from('order_items').insert(orderItemsData);

      try { await fetch('/api/clover/order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: cart, totalAmount: finalAmountWithTip, tableNumber: tableNum, orderType: orderType, tipAmount: finalTipAmount }) }); } catch (cloverError) { console.error("Clover Error:", cloverError); }
      try { await fetch('http://127.0.0.1:4000/print', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId: "Order #" + tableNum, tableNumber: tableNum.toString(), orderType: orderType, items: cart, subtotal: subtotal, tax: tax, cardFee: cardFee, tipAmount: finalTipAmount, totalAmount: finalAmountWithTip, date: new Date().toLocaleString('en-US') }) }); } catch (printError) { console.error("Printer Error:", printError); }

      setIsProcessing(false); 
      setIsSuccess(true);    
      setTimeout(() => { resetToHome(); }, 15000); 

    } catch (error: any) {
      setIsProcessing(false);
      alert("❌ Error: " + error.message); 
    }
  };

  // ------------------------------------------------------------------
  // UI 렌더링
  // ------------------------------------------------------------------
  return (
    <div className="flex flex-col h-full w-full bg-gray-100 relative overflow-hidden">
      
      {/* 1. 상단 헤더 */}
      <div className="bg-white border-b border-gray-200 shrink-0 z-30">
        <div className="pt-8 px-6 pb-2 text-center">
          <h1 className="text-4xl font-black text-gray-900 tracking-tight leading-tight">
            The Collegiate Grill
          </h1>
          <p className="text-gray-400 font-bold tracking-widest text-sm uppercase mt-1">Since 1947</p>
        </div>

       {/* 카테고리 탭 */}
        {/* ✨ 간격(gap)을 5 -> 3으로 줄여 더 많이 들어가게 함 */}
        <div className="flex overflow-x-auto px-4 py-4 gap-3 scrollbar-hide items-center">
          {categories.map((cat, index) => {
            const displayName = cat.name === "Plates & Salads" ? "Salads" : cat.name;
            return (
              <button
                key={cat.id || index}
                onClick={() => setActiveTab(cat.name)}
                // ✨ [재수정 사항] 적당한 중간 사이즈
                // 1. 패딩: px-10 -> px-6 (좌우 공간 절약)
                // 2. 높이: h-24 -> h-18 (너무 크지 않게, 약 72px)
                // 3. 글씨: text-3xl -> text-2xl (가독성 좋음)
                // 4. 테두리: border-4 -> border-3
                className={`flex-shrink-0 px-6 h-18 rounded-full text-2xl font-extrabold transition-all shadow-sm border-[3px] whitespace-nowrap
                  ${activeTab === cat.name 
                    ? 'bg-red-600 text-white border-red-600 shadow-md' 
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
              >
                {displayName}
              </button>
            );
          })}
        </div>
        </div>


      {/* 2. 아이템 리스트 */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-100">
        <div className="grid grid-cols-3 gap-4 pb-32"> 
          {filteredItems.length > 0 ? (
            filteredItems.map((item, index) => (
              <ItemCard 
                key={`${item.id}-${index}`} 
                item={item} 
                onClick={() => handleItemClick(item)} 
              />
            ))
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center pt-20 text-gray-500">
                <p className="text-2xl font-bold">No items available.</p>
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------- */}
      {/* 3. 플로팅 카트 버튼 (대폭 확대) */}
      {/* ------------------------------------------------------- */}
      <button 
        onClick={() => setIsCartOpen(true)}
        // ✨ [수정 사항]
        // 1. 위치: top-6 right-4 -> top-8 right-6 (여백 확보)
        // 2. 크기: w-20 h-20 -> w-32 h-32 (대폭 확대)
        // 3. 테두리: border-2 -> border-4 (더 두껍게)
        // 4. 둥글기: rounded-2xl -> rounded-[2.5rem]
        className="absolute top-8 right-6 z-50 bg-white border-4 border-gray-100 p-4 rounded-[2.5rem] shadow-2xl active:scale-95 transition-all flex flex-col items-center justify-center gap-2 w-32 h-32"
      >
        <div className="relative">
          {/* ✨ 아이콘 크기 확대: w-8 h-8 -> w-14 h-14 */}
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-14 h-14 text-gray-900">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
          </svg>
          
          {cart.length > 0 && (
            // ✨ 뱃지 크기 및 글씨 확대
            // w-6 h-6 -> w-10 h-10
            // text-xs -> text-xl
            <span className="absolute -top-3 -right-3 bg-red-600 text-white text-xl font-black w-10 h-10 flex items-center justify-center rounded-full border-4 border-white shadow-md">
              {cart.length}
            </span>
          )}
        </div>
        
        {cart.length > 0 && (
            // ✨ 가격 글씨 확대: text-xs -> text-xl
            <span className="font-black text-gray-900 text-xl tracking-tight">
                ${grandTotal.toFixed(0)}
            </span>
        )}
      </button>

      {/* ------------------------------------------------------- */}
      {/* 슬라이드 오버 (Drawer) 카트 */}
      {/* ------------------------------------------------------- */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ y: "100%" }} 
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed bottom-0 left-0 w-full h-[70%] bg-white z-[60] shadow-2xl flex flex-col rounded-t-[2rem]"
              onClick={(e) => e.stopPropagation()} 
            >
              <div className="p-6 bg-gray-900 text-white shadow-md flex justify-between items-center shrink-0 rounded-t-[2rem]">
                <div>
                  <h2 className="text-3xl font-extrabold">Your Order</h2>
                  <p className="text-gray-300 text-lg mt-1">{cart.length} items</p>
                </div>
                
                <button 
                  onClick={() => setIsCartOpen(false)} 
                  className="bg-red-600 p-3 rounded-full hover:bg-red-500 transition-colors shadow-lg"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-8 h-8 text-white">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* ✨ [수정] 카트 내부 글씨 크기 대폭 확대 */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
                    <p className="text-2xl font-bold">Cart is empty.</p>
                  </div>
                ) : (
                  <>
                    <AnimatePresence initial={false} mode='popLayout'>
                      {cart.map((cartItem) => (
                        <motion.div 
                          key={cartItem.uniqueCartId} layout 
                          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -100 }} 
                          className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 flex flex-row gap-4 relative z-0"
                        >
                           <div className="flex-1 flex flex-col justify-center">
                              {/* ✨ 이름 text-3xl */}
                              <h4 className="font-extrabold text-3xl text-gray-900 leading-tight">{cartItem.name}</h4>
                              
                              {cartItem.selectedModifiers.length > 0 && (
                                <div className="mt-3 text-xl text-gray-600 font-medium bg-gray-50 p-3 rounded-xl">
                                  {cartItem.selectedModifiers.map((opt, i) => (
                                    // ✨ 옵션 text-xl
                                    <span key={i} className="block">+ {opt.name} {opt.price > 0 && `($${opt.price.toFixed(2)})`}</span>
                                  ))}
                                </div>
                              )}
                              {/* ✨ 가격 text-3xl */}
                              <div className="mt-4 font-black text-gray-900 text-3xl">${cartItem.totalPrice.toFixed(2)}</div>
                            </div>
                            <div className="flex flex-col justify-center border-l pl-5 border-gray-100">
                              <button onClick={() => removeFromCart(cartItem.uniqueCartId)} className="w-16 h-16 flex items-center justify-center bg-red-50 text-red-500 rounded-2xl hover:bg-red-600 hover:text-white transition-all shadow-sm">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                              </button>
                            </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    <div ref={cartEndRef} />
                    <div className="text-right pt-2"><button onClick={() => setCart([])} className="text-xl text-red-500 hover:text-red-700 underline font-semibold">Clear All Items</button></div>
                  </>
                )}
              </div>

              {/* ✨ [수정] 하단 결제 정보 글씨 확대 */}
              {cart.length > 0 && (
                <div className="p-8 border-t bg-gray-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] shrink-0">
                  <div className="space-y-3 mb-6 text-gray-600 font-medium text-xl">
                    <div className="flex justify-between"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
                    <div className="flex justify-between text-lg"><span>Tax (7%)</span><span>${tax.toFixed(2)}</span></div>
                    <div className="flex justify-between text-lg"><span>Fee (3%)</span><span>${cardFee.toFixed(2)}</span></div>
                  </div>
                  <div className="flex justify-between items-center mb-6 pt-6 border-t border-gray-200">
                    <span className="text-3xl font-bold text-gray-800">Total</span>
                    <span className="text-5xl font-black text-red-600">${grandTotal.toFixed(2)}</span>
                  </div>
                  <button className="w-full h-24 bg-green-600 text-white text-4xl font-black rounded-3xl hover:bg-green-700 shadow-xl active:scale-95 transition-all" onClick={() => setShowTableModal(true)}>Pay Now</button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ... 나머지 모달들 ... */}
      {selectedItem && <ModifierModal item={selectedItem} modifiersObj={modifiersObj} onClose={() => setSelectedItem(null)} onConfirm={handleAddToCart} />}
      {showTableModal && <TableNumberModal onConfirm={handleTableNumberConfirm} onCancel={() => setShowTableModal(false)} />}
      {showOrderTypeModal && <OrderTypeModal onSelect={handleOrderTypeSelect} onCancel={() => setShowOrderTypeModal(false)} />}
      {showTipModal && <TipModal subtotal={subtotal} onSelectTip={handleTipSelect} />}
      {showDayWarning && <DayWarningModal targetDay={warningTargetDay} onClose={() => setShowDayWarning(false)} />}
      
      {isProcessing && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md">
            <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl flex flex-col items-center w-[90%] text-center">
              <div className="mb-6 animate-spin"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-20 h-20 text-blue-600"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg></div>
              <h2 className="text-3xl font-black text-gray-900 mb-4">Processing...</h2>
              <p className="text-xl text-gray-600">Please check the Card Reader.</p>
           </div>
         </div>
      )}
      {isSuccess && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl flex flex-col items-center w-[90%] text-center animate-bounce-in">
              <div className="mb-4 bg-green-100 rounded-full p-6"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-16 h-16 text-green-600"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg></div>
              <h2 className="text-4xl font-black text-gray-900 mb-2">Thank You!</h2>
              <p className="text-xl text-gray-500 mb-6">Payment Complete.</p>
              <div className="bg-blue-50 border-2 border-blue-200 p-6 rounded-3xl w-full shadow-md">
                <p className="text-lg text-gray-800 font-bold leading-tight mb-2">🥤 If you ordered a Drink,</p>
                <p className="text-xl text-blue-800 font-black leading-tight">Please <span className="text-red-600 underline">SHOW RECEIPT</span> for a cup.</p>
              </div>
           </div>
         </div>
      )}
    </div>
  );
}