'use client';

import { useState } from 'react';

export default function TestPrinter() {
  const [status, setStatus] = useState('Idle');

  const handleTestPrint = async () => {
    setStatus('Printing...');
    
    // 더미 데이터 (테스트용)
    const testData = {
      tableNumber: "999",
      items: [
        { name: "Test Burger", pos_name: "TST-BGR", quantity: 1, options: [] },
        { name: "Spicy Fries", pos_name: "SP-FF", quantity: 2, options: [{ name: "No Salt" }] }
      ]
    };

    try {
      // 내 PC(Localhost)에 떠있는 중계 서버(4000번 포트)로 요청
      const res = await fetch('http://localhost:4000/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData)
      });

      if (res.ok) {
        setStatus('✅ Success!');
        alert("프린터에서 종이가 나오는지 확인하세요!");
      } else {
        setStatus('❌ Failed');
        alert("프린터 연결 실패. server.js가 켜져 있나요?");
      }
    } catch (error) {
      console.error(error);
      setStatus('❌ Error');
      alert("로컬 서버(localhost:4000)에 연결할 수 없습니다.");
    }
    
    setTimeout(() => setStatus('Idle'), 2000);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button 
        onClick={handleTestPrint}
        className="bg-gray-800 text-white px-4 py-2 rounded-full shadow-lg font-bold hover:bg-gray-700 text-sm"
      >
        🖨️ Test Kitchen Print ({status})
      </button>
    </div>
  );
}