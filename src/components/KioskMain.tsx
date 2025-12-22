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

interface ExtendedCartItem extends CartItem {
  groupId?: string;
}

export default function KioskMain({ categories, items, modifiersObj }: Props) {
  const [activeTab, setActiveTab] = useState<string>('');
  
  const [cart, setCart] = useState<ExtendedCartItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  
  // 모달 상태 관리
  const [showTableModal, setShowTableModal] = useState(false);
  const [showOrderTypeModal, setShowOrderTypeModal] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  
  // ★ 실전용: 결제 진행 중 상태 표시 (로딩 화면용)
  const [isProcessing, setIsProcessing] = useState(false);
  
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
    cartEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [cart]);

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
  // 장바구니 로직 (변경 없음)
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
  };

  const handleItemClick = (item: MenuItem) => {
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
  // 결제 진행 흐름 (수정됨)
  // ---------------------------------------------------------
  
  // 1. 테이블 번호 입력 완료
  const handleTableNumberConfirm = (tableNum: string) => {
    setCurrentTableNumber(tableNum);
    setShowTableModal(false);     
    setShowOrderTypeModal(true);  
  };

  // 2. 주문 타입 (Dine In / To Go) 선택 완료
  const handleOrderTypeSelect = (type: 'dine_in' | 'to_go') => {
    setSelectedOrderType(type);
    setShowOrderTypeModal(false); 
    
    // ★ 중요 수정: To Go를 선택해도 숫자를 'To Go' 문자로 덮어쓰지 않음!
    // (손님이 입력한 번호 12번을 유지해서 프린터로 보냄)
    // if (type === 'to_go') { setCurrentTableNumber('To Go'); }  <-- 삭제함

    setShowTipModal(true);
  };

  // 3. 팁 선택 완료 -> ★ 바로 결제 시작!
  const handleTipSelect = (tipAmount: number) => {
    setSelectedTipAmount(tipAmount);
    setShowTipModal(false);
    
    // 중간 확인 모달 없이 바로 실전 결제 함수 호출
    processRealPayment(tipAmount);
  };

  // ---------------------------------------------------------
  // ★ [REAL MODE] 최종 실전 결제 및 처리 함수
  // ---------------------------------------------------------
  const processRealPayment = async (finalTipAmount: number) => {
    if (cart.length === 0) return;
    
    setIsProcessing(true); // 로딩 화면 시작

    const orderType = selectedOrderType || 'dine_in';
    const tableNum = currentTableNumber || '00'; 

    try {
      const { subtotal, tax, cardFee, grandTotal } = calculateTotals();
      const finalAmountWithTip = grandTotal + finalTipAmount;

      console.log(`💳 Starting Payment Process... Total: $${finalAmountWithTip}`);
      
      // [Step 1] Stripe 결제 (실전)
      // Stripe Reader를 깨워서 카드를 긁게 합니다.
      const stripeRes = await fetch('/api/stripe/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              amount: finalAmountWithTip,
              // 필요한 경우 추가 정보 전송
          })
      });

      if (!stripeRes.ok) {
          throw new Error("Card Payment Failed or Declined.");
      }
      // (필요 시 Stripe 응답 데이터를 여기서 확인)
      // const stripeData = await stripeRes.json();


      // [Step 2] DB 저장 (Supabase)
      // 결제가 성공했을 때만 실행됩니다.
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          total_amount: finalAmountWithTip,
          status: 'paid',
          table_number: orderType === 'to_go' ? 'To Go' : tableNum, // DB에는 통계를 위해 'To Go'로 남길 수도 있고, 숫자를 남길 수도 있습니다. 사장님 선택에 따라 tableNum만 넣어도 됩니다. 일단 안전하게 기존 로직 유지하되 프린터는 따로 보냄.
          order_type: orderType,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 아이템 저장
      const orderItemsData = cart.map(item => ({
        order_id: orderData.id,
        item_name: item.name,
        quantity: item.quantity,
        price: item.totalPrice,
        options: item.selectedModifiers
      }));
      await supabase.from('order_items').insert(orderItemsData);


      // [Step 3] Clover 연동 (매출 기록 Sync)
      // 에러가 나도 고객 결제는 이미 끝났으므로 멈추지 않고 진행
      try {
        await fetch('/api/clover/order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              items: cart,
              totalAmount: finalAmountWithTip,
              tableNumber: tableNum, // 여기는 숫자를 보내줍니다
              orderType: orderType,
              tipAmount: finalTipAmount
            })
        });
      } catch (cloverError) {
          console.error("⚠️ Clover Sync Error (Ignored):", cloverError);
      }


      // [Step 4] 프린터 전송 (영수증 & 주방)
      // ★ 핵심: tableNum(숫자 12)을 그대로 보냅니다.
      try {
        await fetch('http://127.0.0.1:4000/print', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: "Order #" + tableNum, // 영수증 상단: Order #12
            tableNumber: tableNum.toString(), // 주방 프린터: "12" (큰 숫자)
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
      } catch (printError: any) {
        alert(`⚠️ 프린터 연결 실패: ${printError.message}\n(결제는 완료되었습니다)`);
      }

      // [완료 처리]
      setIsProcessing(false);
      alert("Payment Successful! Thank you.");
      
      // 초기화
      setCart([]); 
      setCurrentTableNumber('');
      setSelectedOrderType(null);

    } catch (error: any) {
      setIsProcessing(false);
      alert("❌ Error: " + error.message);
    }
  };

  return (
    <div className="flex h-full w-full bg-gray-100 relative">
      {/* 메뉴 리스트 */}
      <div className="w-[70%] flex flex-col border-r border-gray-300 h-full">
       {/* 메뉴 카테고리 리스트 (수정됨) */}
<div className="flex overflow-x-auto bg-white p-2 gap-2 shadow-sm h-24 scrollbar-hide items-center border-b border-gray-200">
  {categories.map((cat, index) => {
    // 1️⃣ 이름 변경 로직: 'Plates & Salads'를 'Salads'로 화면에만 짧게 표시
    // (데이터 로직은 그대로 두고 보여지는 글자만 바꿉니다)
    const displayName = cat.name === "Plates & Salads" ? "Salads" : cat.name;

    return (
      <button
        key={cat.id || index}
        onClick={() => setActiveTab(cat.name)} // 중요: 내부 로직은 원래 이름(cat.name) 유지
        className={`flex-shrink-0 px-5 h-14 rounded-full text-xl font-extrabold transition-all shadow-sm border-2
          ${activeTab === cat.name 
            ? 'bg-red-600 text-white border-red-600 shadow-md scale-105' 
            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'}`}
      >
        {displayName}
      </button>
    );
  })}
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

      {/* 장바구니 */}
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

      {/* ★ 실전용: 결제 진행 중 모달 (카드 리더기 안내) */}
      {isProcessing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md">
           <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl flex flex-col items-center animate-bounce-in w-[600px] text-center">
              <div className="mb-6 animate-spin">
                 {/* 로딩 스피너 아이콘 */}
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-20 h-20 text-blue-600">
                   <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                 </svg>
              </div>
              <h2 className="text-4xl font-black text-gray-900 mb-4">Processing Payment...</h2>
              <p className="text-2xl text-gray-600">
                Please follow the instructions<br/>on the <b>Card Reader</b>.
              </p>
           </div>
        </div>
      )}
    </div>
  );
}