"use client";
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

// 데이터 타입 정의
interface OrderItem {
    item_name: string;
    quantity: number;
    price: number;
    options: any; // JSONB 데이터
}

interface Order {
    id: string;
    total_amount: number;
    status: string;
    table_number: string | null;
    created_at: string;
    order_items: OrderItem[];
}

export default function AdminOrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    // Supabase 클라이언트 초기화
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    useEffect(() => {
        fetchOrders();

        // 실시간 주문 구독 (새 주문이 들어오면 자동 갱신)
        const channel = supabase
            .channel('realtime_orders')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => {
                console.log('New order received!');
                fetchOrders();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchOrders = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('orders')
            .select(`
        *,
        order_items (
          item_name,
          quantity,
          price,
          options
        )
      `)
            .order('created_at', { ascending: false }); // 최신순 정렬

        if (error) {
            console.error('Error fetching orders:', error);
        } else {
            setOrders(data || []);
        }
        setLoading(false);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('en-US', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <div className="p-8 max-w-6xl mx-auto min-h-screen bg-gray-50">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Order History</h1>
                <button
                    onClick={fetchOrders}
                    className="bg-white border border-gray-300 px-4 py-2 rounded-lg text-gray-700 font-bold hover:bg-gray-50 shadow-sm flex items-center gap-2"
                >
                    <span>↻</span> Refresh
                </button>
            </div>

            {loading ? (
                <div className="text-center py-20 text-gray-500 font-medium">Loading orders...</div>
            ) : orders.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-200">
                    <p className="text-xl text-gray-400 font-bold">No orders found yet.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {orders.map((order) => (
                        <div key={order.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

                            {/* 주문 헤더 */}
                            <div className="bg-gray-100 px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-200">
                                <div className="flex flex-wrap gap-4 items-center">
                                    <span className="font-bold text-gray-700 text-lg">
                                        #{order.id.slice(0, 8).toUpperCase()}
                                    </span>

                                    {/* 테이블 번호 배지 */}
                                    {order.table_number ? (
                                        <span className="bg-red-600 text-white px-3 py-1 rounded-lg font-extrabold text-xl shadow-sm animate-pulse">
                                            Table #{order.table_number}
                                        </span>
                                    ) : (
                                        <span className="bg-gray-200 text-gray-600 px-3 py-1 rounded-lg font-bold text-sm">
                                            Take Out
                                        </span>
                                    )}

                                    <span className="text-sm text-gray-500 font-medium">
                                        {formatDate(order.created_at)}
                                    </span>
                                </div>

                                <div className="flex items-center gap-4 self-end md:self-auto">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase
                    ${order.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}
                                    >
                                        {order.status}
                                    </span>
                                    <span className="text-2xl font-extrabold text-gray-900">
                                        ${order.total_amount.toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            {/* 주문 상세 */}
                            <div className="p-6 bg-white">
                                <ul className="space-y-3">
                                    {order.order_items.map((item, idx) => (
                                        <li key={idx} className="flex justify-between items-start border-b border-gray-50 last:border-0 pb-3 last:pb-0">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-red-600 text-lg">{item.quantity}x</span>
                                                    <span className="font-bold text-gray-800 text-lg">{item.item_name}</span>
                                                </div>
                                                {item.options && Array.isArray(item.options) && item.options.length > 0 && (
                                                    <div className="text-sm text-gray-500 mt-1 ml-6 font-medium">
                                                        {item.options.map((opt: any, i: number) => (
                                                            <span key={i} className="block">
                                                                + {opt.name} {opt.price > 0 && `($${opt.price})`}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <span className="font-bold text-gray-700">
                                                ${item.price.toFixed(2)}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}