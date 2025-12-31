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

  // ==================================================================
  // 초기화 및 타이머 로직
  // ==================================================================
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

  // ==================================================================
  // 계산 로직
  // ==================================================================
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

  // ---------------------------------------------------------
  // 장바구니 추가/삭제
  // ---------------------------------------------------------
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
        if (friesItem) {
          newCartItems.push({
            ...friesItem,
            selectedModifiers: [],
            totalPrice: 0,
            quantity: 1,
            uniqueCartId: Date.now().toString() + Math.random().toString(),
            name: `(Set) ${friesItem.name}`,
            groupId: currentGroupId 
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
            groupId: currentGroupId 
          });
        }
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

  // ---------------------------------------------------------
  // 결제 진행
  // ---------------------------------------------------------
  const handleTableNumberConfirm = (tableNum: string) => {
    setCurrentTableNumber(tableNum);
    setShowTableModal(false);     
    setShowOrderTypeModal(true);  
  };

  const handleOrderTypeSelect = (type: 'dine_in' | 'to_go') => {
    setSelectedOrderType(type);
    setShowOrderTypeModal(false); 
    setShowTipModal(true);
  };

  const handleTipSelect = (tipAmount: number) => {
    setSelectedTipAmount(tipAmount);
    setShowTipModal(false);
    processRealPayment(tipAmount);
  };

  const processRealPayment = async (finalTipAmount: number) => {
    if (cart.length === 0) return;
    setIsProcessing(true); 

    const orderType = selectedOrderType || 'dine_in';
    const tableNum = currentTableNumber || '00'; 

    try {
      const { subtotal, tax, cardFee, grandTotal } = calculateTotals();
      const finalAmountWithTip = grandTotal + finalTipAmount;
      
      const stripeRes = await fetch('/api/stripe/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: finalAmountWithTip })
      });

      if (!stripeRes.ok) throw new Error("Card Payment Failed or Declined.");

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          total_amount: finalAmountWithTip,
          status: 'paid',
          table_number: orderType === 'to_go' ? 'To Go' : tableNum, 
          order_type: orderType,
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

      try {
        await fetch('/api/clover/order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              items: cart,
              totalAmount: finalAmountWithTip,
              tableNumber: tableNum,
              orderType: orderType,
              tipAmount: finalTipAmount
            })
        });
      } catch (cloverError) { console.error("Clover Error:", cloverError); }

      try {
        await fetch('http://127.0.0.1:4000/print', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: "Order #" + tableNum,
            tableNumber: tableNum.toString(),
            orderType: orderType,            
            items: cart,                     
            subtotal: subtotal,
            tax: tax,
            cardFee: cardFee,
            tipAmount: finalTipAmount, 
            totalAmount: finalAmountWithTip,
            date: new Date().toLocaleString('en-US') 
          })
        });
      } catch (printError) { console.error("Printer Error:", printError); }

      setIsProcessing(false); 
      setIsSuccess(true);    
      setTimeout(() => { resetToHome(); }, 15000); 

    } catch (error: any) {
      setIsProcessing(false);
      alert("❌ Error: " + error.message); 
    }
  };

  return (
    <div className="flex h-full w-full bg-gray-100 relative overflow-hidden">
      
      {/* ------------------------------------------------------- */}
      {/* ✨ [왼쪽/메인] 메뉴 영역 */}
      {/* ------------------------------------------------------- */}
      <div className="w-full flex flex-col h-full">
        
        {/* ✨ [New] Site Title Header */}
        <div className="bg-white pt-8 px-8 pb-4 border-b border-gray-100 shrink-0">
          <h1 className="text-5xl font-black text-gray-900 tracking-tight">
            The Collegiate Grill Kiosk
          </h1>
        </div>

        {/* ✨ 상단 카테고리 탭 (크기 확대) */}
        {/* h-24 -> h-36 으로 높이 확대, 우측 여백(pr)을 카트 버튼 크기만큼 확보 */}
        <div className="flex overflow-x-auto bg-white px-4 pb-4 gap-4 shadow-sm h-36 scrollbar-hide items-center border-b border-gray-200 pr-48 shrink-0">
          {categories.map((cat, index) => {
            const displayName = cat.name === "Plates & Salads" ? "Salads" : cat.name;
            return (
              <button
                key={cat.id || index}
                onClick={() => setActiveTab(cat.name)}
                // ✨ px-8 h-24 text-3xl 로 버튼 사이즈 대폭 확대
                className={`flex-shrink-0 px-10 h-24 rounded-full text-3xl font-extrabold transition-all shadow-sm border-2
                  ${activeTab === cat.name 
                    ? 'bg-red-600 text-white border-red-600 shadow-lg scale-105' 
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'}`}
              >
                {displayName}
              </button>
            );
          })}
        </div>

        {/* 메뉴 아이템 그리드 */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-100">
          {/* ✨ 5열 그리드 (gap-6으로 간격 넓힘) */}
          <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 content-start pb-32"> 
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
                 <p className="text-3xl font-bold">No items available.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------- */}
      {/* ✨ [수정됨] 우측 상단 플로팅 카트 버튼 (대형화) */}
      {/* ------------------------------------------------------- */}
      <button 
        onClick={() => setIsCartOpen(true)}
        // ✨ top-8 right-6, h-28, 아이콘 및 글씨 확대
        className="absolute top-8 right-6 z-40 bg-white border-4 border-gray-100 p-6 rounded-[2rem] shadow-xl hover:shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-4 h-28 min-w-[10rem]"
      >
        <div className="relative">
          {/* ✨ 아이콘 크기 w-12 h-12 로 확대 */}
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-12 h-12 text-gray-900">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
          </svg>
          {cart.length > 0 && (
            // ✨ 뱃지 크기 w-8 h-8, 글씨 text-sm 확대
            <span className="absolute -top-3 -right-3 bg-red-600 text-white text-sm font-black w-8 h-8 flex items-center justify-center rounded-full border-2 border-white shadow-sm">
              {cart.length}
            </span>
          )}
        </div>
        {cart.length > 0 && (
            // ✨ 가격 글씨 text-2xl 확대
            <span className="font-black text-gray-900 text-2xl">
                ${grandTotal.toFixed(2)}
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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed top-0 right-0 h-full w-[500px] bg-white z-[60] shadow-2xl flex flex-col border-l border-gray-200"
            >
              <div className="p-8 bg-gray-900 text-white shadow-md flex justify-between items-center shrink-0">
                <div>
                  <h2 className="text-4xl font-extrabold">Order List</h2>
                  <p className="text-gray-300 text-xl mt-1">{cart.length} items</p>
                </div>
                <button 
                  onClick={() => setIsCartOpen(false)} 
                  className="bg-gray-800 p-3 rounded-full hover:bg-gray-700 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-8 h-8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-32 h-32 opacity-30">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                    </svg>
                    <p className="text-2xl font-bold">Your cart is empty.</p>
                  </div>
                ) : (
                  <>
                    <AnimatePresence initial={false} mode='popLayout'>
                      {cart.map((cartItem) => (
                        <motion.div 
                          key={cartItem.uniqueCartId}
                          layout 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -100 }} 
                          className="bg-white p-5 rounded-3xl shadow-sm border border-gray-200 flex flex-row gap-4 relative z-0"
                        >
                           <div className="flex-1 flex flex-col justify-center">
                              <div className="flex justify-between items-start">
                                <h4 className="font-extrabold text-2xl text-gray-900 leading-tight">{cartItem.name}</h4>
                              </div>
                              {cartItem.selectedModifiers.length > 0 && (
                                <div className="mt-3 text-lg text-gray-600 font-medium bg-gray-50 p-3 rounded-xl">
                                  {cartItem.selectedModifiers.map((opt, i) => (
                                    <span key={i} className="block">
                                      + {opt.name} {opt.price > 0 && `($${opt.price.toFixed(2)})`}
                                    </span>
                                  ))}
                                </div>
                              )}
                              <div className="mt-4 font-black text-gray-900 text-3xl">
                                ${cartItem.totalPrice.toFixed(2)}
                              </div>
                            </div>
                            <div className="flex flex-col justify-center border-l pl-5 border-gray-100">
                              <button 
                                onClick={() => removeFromCart(cartItem.uniqueCartId)}
                                className="w-14 h-14 flex items-center justify-center bg-red-50 text-red-500 rounded-2xl hover:bg-red-600 hover:text-white transition-all shadow-sm"
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
                    
                    <div className="text-right pt-2">
                        <button onClick={() => setCart([])} className="text-base text-red-500 hover:text-red-700 underline font-semibold">
                            Clear All Items
                        </button>
                    </div>
                  </>
                )}
              </div>

              {cart.length > 0 && (
                <div className="p-8 border-t bg-gray-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] shrink-0">
                  <div className="space-y-3 mb-6 text-gray-600 font-medium text-lg">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-base">
                      <span>Sales Tax (7%)</span>
                      <span>${tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-base">
                      <span>Card Fee (3%)</span>
                      <span>${cardFee.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mb-6 pt-6 border-t border-gray-200">
                    <span className="text-3xl font-bold text-gray-800">Total</span>
                    <span className="text-5xl font-black text-red-600">${grandTotal.toFixed(2)}</span>
                  </div>

                  <button 
                    className="w-full h-28 bg-green-600 text-white text-5xl font-black rounded-3xl hover:bg-green-700 shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => setShowTableModal(true)}
                  >
                    Pay Now
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 기타 모달 (변경 없음) */}
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
      {showDayWarning && (
        <DayWarningModal
          targetDay={warningTargetDay}
          onClose={() => setShowDayWarning(false)}
        />
      )}
      {isProcessing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md">
           <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl flex flex-col items-center w-[600px] text-center">
              <div className="mb-6 animate-spin">
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-20 h-20 text-blue-600">
                   <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                 </svg>
              </div>
              <h2 className="text-4xl font-black text-gray-900 mb-4">Processing...</h2>
              <p className="text-2xl text-gray-600">
                Please follow the instructions<br/>on the <b>Card Reader</b>.
              </p>
           </div>
        </div>
      )}
      {isSuccess && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md">
           <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl flex flex-col items-center w-[600px] text-center animate-bounce-in">
              <div className="mb-4 bg-green-100 rounded-full p-6">
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-20 h-20 text-green-600">
                   <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                 </svg>
              </div>
              <h2 className="text-5xl font-black text-gray-900 mb-2">Thank You!</h2>
              <p className="text-2xl text-gray-500 mb-6">Payment Complete.</p>
              <div className="bg-blue-50 border-2 border-blue-200 p-6 rounded-3xl w-full shadow-md">
                <p className="text-xl text-gray-800 font-bold leading-tight mb-2">🥤 If you ordered a Drink,</p>
                <p className="text-2xl text-blue-800 font-black leading-tight">
                  Please <span className="text-red-600 underline decoration-4 underline-offset-4">SHOW YOUR RECEIPT</span><br/>
                  to the Cashier to get a cup.
                </p>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}