// src/app/admin/page.tsx
import Link from 'next/link';

export default function AdminDashboard() {
    return (
        <div className="p-10">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome Back, Manager! 👋</h1>
            <p className="text-gray-500 mb-8">Here is an overview of your restaurant.</p>

            {/* 바로가기 카드들 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* 메뉴 관리 바로가기 */}
                <Link
                    href="/admin/menu"
                    className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-500 transition-all group cursor-pointer"
                >
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-blue-50 rounded-xl text-3xl group-hover:scale-110 transition-transform">🍔</div>
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-1">Menu Management</h2>
                    <p className="text-sm text-gray-500">
                        Add items, update prices, manage stock.
                    </p>
                </Link>

                {/* 주문 내역 바로가기 */}
                <Link
                    href="/admin/orders"
                    className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md hover:border-green-500 transition-all group cursor-pointer"
                >
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-green-50 rounded-xl text-3xl group-hover:scale-110 transition-transform">🧾</div>
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-1">Order History</h2>
                    <p className="text-sm text-gray-500">
                        Check real-time orders and revenue.
                    </p>
                </Link>

            </div>
        </div>
    );
}