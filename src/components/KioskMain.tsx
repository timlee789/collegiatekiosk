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
  const [showPaymentInstruction, setShowPaymentInstruction] = useState(false);
  
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
  // 장바구니 추가 로직
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
  // 결제 진행 흐름
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
    setShowPaymentInstruction(true);
  };

  // ---------------------------------------------------------
  // 🧪 [CLOVER TEST MODE] 결제 Skip + Clover 연동 + 프린트
  // ---------------------------------------------------------
  const processCloverTestWithoutPayment = async () => {
    if (cart.length === 0) return;
    const orderType = selectedOrderType || 'dine_in';
    const tipAmount = selectedTipAmount;
    const tableNum = currentTableNumber || (orderType === 'to_go' ? 'To Go' : '00');

    try {
      const { subtotal, tax, cardFee, grandTotal } = calculateTotals();
      const finalAmountWithTip = grandTotal + tipAmount;

      console.log(`🧪 [TEST] Skipping Payment. Sending to Clover & Printer: $${finalAmountWithTip}`);

      // 1. DB 저장 (테스트용 기록)
      let orderId = "TEST-CLOVER-" + Math.floor(Math.random() * 1000);
      try {
          const { data, error } = await supabase.from('orders').insert({
              total_amount: finalAmountWithTip,
              status: 'test_clover', // 테스트 상태
              table_number: tableNum,
              order_type: orderType,
          }).select().single();
          
          if(data) {
             orderId = "Kiosk-" + data.id;
             // 아이템 저장 (선택 사항)
             const itemsData = cart.map(item => ({
                 order_id: data.id,
                 item_name: item.name,
                 quantity: item.quantity,
                 price: item.totalPrice,
                 options: item.selectedModifiers
             }));
             await supabase.from('order_items').insert(itemsData);
          }
      } catch (e) { console.error("DB Error ignored", e); }

      // 2. ☘️ Clover 연동 (매출 잡힘)
      console.log("☘️ Sending to Clover...");
      try {
        const cloverRes = await fetch('/api/clover/order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              items: cart,
              totalAmount: finalAmountWithTip,
              tableNumber: tableNum,
              orderType: orderType,
              tipAmount: tipAmount
            })
        });
        if (!cloverRes.ok) {
            const errText = await cloverRes.text();
            throw new Error(`Clover API Error: ${errText}`);
        }
        console.log("☘️ Clover Success!");
      } catch (cloverErr: any) {
          alert(`⚠️ Clover 연동 실패 (프린트는 진행됨):\n${cloverErr.message}`);
      }

      // 3. 🖨️ 프린터 서버 전송
      console.log("🖨️ Sending to Printer...");
      const printRes = await fetch('http://127.0.0.1:4000/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: orderId,          
          tableNumber: tableNum, 
          orderType: orderType,            
          items: cart,                     
          subtotal: subtotal,
          tax: tax,
          cardFee: cardFee,
          tipAmount: tipAmount, 
          totalAmount: finalAmountWithTip, 
          date: new Date().toLocaleString('en-US') 
        })
      });
      
      if (!printRes.ok) throw new Error(`Printer Server Error: ${printRes.status}`);

      alert(`✅ Clover 테스트 & 인쇄 완료!\n\n쉐이크: 16oz, Chocolate 등 전체 단어 확인\n주방: K, Mus 등 약어 확인`);
      
      setShowPaymentInstruction(false);
      setCart([]); 
      setCurrentTableNumber('');
      setSelectedOrderType(null);

    } catch (error: any) {
      alert("❌ 테스트 실패: " + error.message);
    }
  };

  // ---------------------------------------------------------
  // [REAL MODE] 실전 결제
  // ---------------------------------------------------------
  const processRealPayment = async () => {
    if (cart.length === 0) return;
    const orderType = selectedOrderType || 'dine_in';
    const tipAmount = selectedTipAmount;
    const tableNum = currentTableNumber || (orderType === 'to_go' ? 'To Go' : '00');

    try {
      const { subtotal, tax, cardFee, grandTotal } = calculateTotals();
      const finalAmountWithTip = grandTotal + tipAmount;

      console.log(`💳 Processing Real Payment: $${finalAmountWithTip}`);
      
      // Stripe 결제 (실전 시 활성화)
      // await fetch('/api/stripe/process', ...);

      // DB 저장
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          total_amount: finalAmountWithTip,
          status: 'paid',
          table_number: tableNum,
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

      // Clover 연동
      try {
        await fetch('/api/clover/order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              items: cart,
              totalAmount: finalAmountWithTip,
              tableNumber: tableNum,
              orderType: orderType,
              tipAmount: tipAmount
            })
        });
      } catch (cloverError) {
          console.error("⚠️ Clover Error:", cloverError);
      }

      // 프린터 전송
      try {
        await fetch('http://127.0.0.1:4000/print', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: "Kiosk-" + orderData.id,          
            tableNumber: tableNum, 
            orderType: orderType,            
            items: cart,                     
            subtotal: subtotal,
            tax: tax,
            cardFee: cardFee,
            tipAmount: tipAmount, 
            totalAmount: finalAmountWithTip,
            date: new Date().toLocaleString('en-US') 
          })
        });
      } catch (printError: any) {
        alert(`⚠️ 프린터 연결 실패: ${printError.message}`);
      }

      setShowPaymentInstruction(false);
      alert("Payment Successful!");
      setCart([]); 
      setCurrentTableNumber('');
      setSelectedOrderType(null);

    } catch (error: any) {
      alert("❌ Payment Error: " + error.message);
      setShowPaymentInstruction(false);
    }
  };

  return (
    <div className="flex h-full w-full bg-gray-100 relative">
      {/* 메뉴 리스트 */}
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

      {/* ⚠️ [결제 대기 화면] */}
      {showPaymentInstruction && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-md">
           <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl flex flex-col items-center animate-bounce-in w-[600px]">
              
              <div className="mb-4 p-4 bg-purple-100 rounded-full text-purple-600">
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-16 h-16">
                   <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 001.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
                 </svg>
              </div>

              <h2 className="text-3xl font-black text-gray-900 mb-2 text-center">
                결제 대기 및 테스트
              </h2>
              <p className="text-lg text-gray-500 mb-8 text-center px-4">
                아래 보라색 버튼을 누르면<br/>
                <b>돈은 안 나가고, Clover 매출 + 프린트</b>만 실행됩니다.
              </p>

              <div className="flex flex-col gap-4 w-full">
                {/* 1. Clover 연동 테스트 버튼 */}
                <button
                  onClick={processCloverTestWithoutPayment}
                  className="w-full h-20 bg-purple-600 text-white text-2xl font-bold rounded-2xl hover:bg-purple-700 shadow-lg flex items-center justify-center gap-2 animate-pulse"
                >
                  ☘️ Clover 연동 + 🖨️ 프린트 (결제 Skip)
                </button>

                {/* 2. 실제 결제 버튼 */}
                <button
                  onClick={processRealPayment}
                  className="w-full h-20 bg-green-600 text-white text-2xl font-bold rounded-2xl hover:bg-green-700 shadow-lg flex items-center justify-center gap-2"
                >
                  💳 (실전) 카드 결제하기
                </button>

                <button
                  onClick={() => setShowPaymentInstruction(false)}
                  className="w-full h-16 bg-gray-200 text-gray-600 text-xl font-bold rounded-2xl hover:bg-gray-300"
                >
                  취소
                </button>
              </div>

           </div>
        </div>
      )}
    </div>
  );
}