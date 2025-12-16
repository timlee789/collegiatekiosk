'use client';

interface Props {
  subtotal: number;
  onSelectTip: (amount: number) => void;
}

export default function TipModal({ subtotal, onSelectTip }: Props) {
  // 팁 계산 함수
  const calculateTip = (pct: number) => Math.round(subtotal * (pct / 100) * 100) / 100;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-md">
      <div className="bg-white rounded-3xl p-8 w-[600px] text-center shadow-2xl">
        <h2 className="text-4xl font-extrabold text-gray-800 mb-2">Add a Tip?</h2>
        <p className="text-xl text-gray-500 mb-8">Support our team!</p>

        <div className="grid grid-cols-3 gap-4 mb-6">
          {[10, 15, 20].map((pct) => {
             const amount = calculateTip(pct);
             return (
              <button key={pct} onClick={() => onSelectTip(amount)}
                className="py-8 rounded-2xl bg-blue-50 border-2 border-blue-100 hover:bg-blue-600 hover:border-blue-600 hover:text-white transition-all group">
                <span className="block text-4xl font-extrabold mb-1">{pct}%</span>
                <span className="text-lg font-medium text-gray-500 group-hover:text-blue-100">${amount.toFixed(2)}</span>
              </button>
             );
          })}
        </div>
        
        <button onClick={() => onSelectTip(0)}
          className="w-full py-6 rounded-2xl border-2 border-gray-200 text-gray-400 font-bold text-2xl hover:bg-gray-100 hover:text-gray-600 transition-colors">
          No Tip
        </button>
      </div>
    </div>
  );
}