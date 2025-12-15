'use client';

import { useState } from 'react';

export default function TestPrinter() {
  const [status, setStatus] = useState('Idle');

  const handleTestPrint = async () => {
    setStatus('Sending...');
    
    // 주방 프린터 테스트용 가짜 데이터
    const testPayload = {
      tableNumber: "TEST-01",
      orderId: "TEST-9999",
      items: [
        { 
          name: "Test Burger", 
          pos_name: "TST-BGR", // 약자 테스트
          quantity: 1, 
          selectedModifiers: [{ name: "No Onion" }] // 빨간색 출력 테스트
        },
        { 
          name: "French Fries", 
          pos_name: "FF", 
          quantity: 2, 
          selectedModifiers: [] 
        }
      ]
    };

    try {
      // 로컬 프린터 서버로 직접 전송
      const res = await fetch('http://localhost:4000/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload)
      });

      if (res.ok) {
        setStatus('✅ OK');
        alert("🖨️ 프린터에서 종이가 나오는지 확인하세요!");
      } else {
        setStatus('❌ Fail');
        alert("서버에는 연결됐지만 프린터 에러가 났습니다.");
      }
    } catch (error) {
      console.error(error);
      setStatus('❌ Error');
      alert("로컬 서버(localhost:4000)가 켜져 있는지 확인하세요.");
    }
    
    setTimeout(() => setStatus('Idle'), 2000);
  };

  return (
    <div className="fixed bottom-10 left-10 z-50">
      <button 
        onClick={handleTestPrint}
        className="bg-red-600 text-white px-6 py-3 rounded-full shadow-2xl font-bold hover:bg-red-700 text-lg border-4 border-white"
      >
        🖨️ Test Print ({status})
      </button>
    </div>
  );
}