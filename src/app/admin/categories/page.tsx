"use client";
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

interface Category {
    id: string;
    name: string;
    sort_order: number;
    items: { count: number }[]; // Supabase에서 count만 가져오기 위한 타입
}

export default function AdminCategoriesPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    useEffect(() => {
        fetchCategories();
    }, []);

    // ---------------------------------------------------------
    // 데이터 불러오기 (아이템 개수 포함 & 순서대로 정렬)
    // ---------------------------------------------------------
    const fetchCategories = async () => {
        setLoading(true);
        // items(count)는 Supabase의 강력한 기능으로, 실제 데이터를 다 안 가져오고 개수만 셉니다.
        const { data, error } = await supabase
            .from('categories')
            .select('*, items(count)')
            .order('sort_order', { ascending: true });

        if (error) {
            alert("Error loading categories");
            console.error(error);
        } else {
            // items 배열의 길이를 count로 변환하여 저장
            setCategories(data as any);
        }
        setLoading(false);
    };

    // ---------------------------------------------------------
    // 기능 핸들러
    // ---------------------------------------------------------

    // 1. 카테고리 추가
    const handleAdd = async () => {
        const name = prompt("Enter new Category Name (e.g., 'Desserts')");
        if (!name) return;

        // 현재 가장 큰 sort_order 찾기
        const maxOrder = categories.length > 0 ? Math.max(...categories.map(c => c.sort_order)) : 0;

        // 식당 ID 가져오기
        const { data: restData } = await supabase.from('restaurants').select('id').single();
        if (!restData) return;

        const { error } = await supabase.from('categories').insert({
            restaurant_id: restData.id,
            name: name,
            sort_order: maxOrder + 1
        });

        if (!error) fetchCategories();
    };

    // 2. 이름 수정
    const handleRename = async (id: string, currentName: string) => {
        const newName = prompt("Rename Category:", currentName);
        if (!newName || newName === currentName) return;

        const { error } = await supabase
            .from('categories')
            .update({ name: newName })
            .eq('id', id);

        if (!error) fetchCategories();
    };

    // 3. 삭제
    const handleDelete = async (id: string, itemCount: number) => {
        if (itemCount > 0) {
            alert(`⚠️ Cannot delete!\nThis category contains ${itemCount} items.\nPlease move or delete the items first in 'Menu Management'.`);
            return;
        }

        if (!confirm("Are you sure you want to delete this empty category?")) return;

        await supabase.from('categories').delete().eq('id', id);
        fetchCategories();
    };

    // 4. 순서 변경 (핵심 로직)
    const handleMove = async (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === categories.length - 1) return;

        const targetIndex = direction === 'up' ? index - 1 : index + 1;

        // 배열 복사
        const newCategories = [...categories];
        const itemA = newCategories[index];
        const itemB = newCategories[targetIndex];

        // 1. 화면상에서 먼저 순서 바꾸기 (Optimistic UI)
        newCategories[index] = itemB;
        newCategories[targetIndex] = itemA;
        setCategories(newCategories);

        // 2. DB 업데이트 (sort_order 값을 서로 맞교환)
        // A의 순서를 B의 순서값으로, B의 순서를 A의 순서값으로 업데이트
        const { error: error1 } = await supabase
            .from('categories')
            .update({ sort_order: itemB.sort_order })
            .eq('id', itemA.id);

        const { error: error2 } = await supabase
            .from('categories')
            .update({ sort_order: itemA.sort_order })
            .eq('id', itemB.id);

        if (error1 || error2) {
            alert("Error reordering. Refreshing...");
            fetchCategories();
        }
    };

    return (
        <div className="p-10 max-w-4xl mx-auto min-h-screen">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Category Management</h1>
                    <p className="text-gray-500 mt-1">Reorder tabs or rename categories.</p>
                </div>
                <button
                    onClick={handleAdd}
                    className="bg-blue-600 text-white px-5 py-3 rounded-xl font-bold hover:bg-blue-700 shadow-md flex items-center gap-2"
                >
                    <span>+</span> Create Category
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="p-10 text-center text-gray-400">Loading...</div>
                ) : categories.length === 0 ? (
                    <div className="p-10 text-center text-gray-400">No categories found.</div>
                ) : (
                    <ul className="divide-y divide-gray-100">
                        {categories.map((cat, index) => {
                            // Supabase items(count) 결과 파싱
                            const itemCount = cat.items && cat.items[0] ? cat.items[0].count : 0;

                            return (
                                <li key={cat.id} className="p-4 flex items-center hover:bg-gray-50 transition-colors">

                                    {/* 순서 변경 버튼 */}
                                    <div className="flex flex-col mr-4 gap-1">
                                        <button
                                            onClick={() => handleMove(index, 'up')}
                                            disabled={index === 0}
                                            className="w-8 h-8 flex items-center justify-center rounded bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-600 disabled:opacity-30 disabled:hover:bg-gray-100 disabled:cursor-not-allowed"
                                        >
                                            ▲
                                        </button>
                                        <button
                                            onClick={() => handleMove(index, 'down')}
                                            disabled={index === categories.length - 1}
                                            className="w-8 h-8 flex items-center justify-center rounded bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-600 disabled:opacity-30 disabled:hover:bg-gray-100 disabled:cursor-not-allowed"
                                        >
                                            ▼
                                        </button>
                                    </div>

                                    {/* 카테고리 정보 */}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3">
                                            <span className="text-lg font-bold text-gray-800">{cat.name}</span>
                                            <span className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-500 font-bold">
                                                {itemCount} Items
                                            </span>
                                        </div>
                                    </div>

                                    {/* 액션 버튼 */}
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => handleRename(cat.id, cat.name)}
                                            className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 font-bold hover:bg-white hover:border-gray-400 transition-all text-sm"
                                        >
                                            Rename
                                        </button>
                                        <button
                                            onClick={() => handleDelete(cat.id, itemCount)}
                                            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all
                        ${itemCount > 0
                                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                    : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
}