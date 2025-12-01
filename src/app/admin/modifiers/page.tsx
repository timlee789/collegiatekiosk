"use client";
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

// 타입 정의
interface ModifierGroup {
    id: string;
    name: string;
}
interface ModifierOption {
    id: string;
    name: string;
    price: number;
}
interface SimpleItem {
    id: string;
    name: string;
    category_id: string; // 카테고리별 정렬을 위해
}

export default function AdminModifiersPage() {
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // 데이터 상태
    const [groups, setGroups] = useState<ModifierGroup[]>([]);
    const [selectedGroup, setSelectedGroup] = useState<ModifierGroup | null>(null);

    const [options, setOptions] = useState<ModifierOption[]>([]);
    const [linkedItemIds, setLinkedItemIds] = useState<string[]>([]); // 현재 그룹에 연결된 아이템 ID들
    const [allItems, setAllItems] = useState<SimpleItem[]>([]); // 연결 설정을 위한 전체 아이템 목록

    // 로딩 상태
    const [loadingOptions, setLoadingOptions] = useState(false);

    // 초기 데이터 로드 (그룹 목록 & 전체 아이템 목록)
    useEffect(() => {
        fetchGroups();
        fetchAllItems();
    }, []);

    // 그룹 선택 시 -> 옵션 목록 & 연결된 아이템 목록 가져오기
    useEffect(() => {
        if (selectedGroup) {
            fetchOptions(selectedGroup.id);
            fetchLinkedItems(selectedGroup.id);
        } else {
            setOptions([]);
            setLinkedItemIds([]);
        }
    }, [selectedGroup]);

    // ---------------------------------------------------------
    // Fetch Functions
    // ---------------------------------------------------------
    const fetchGroups = async () => {
        const { data } = await supabase.from('modifier_groups').select('*').order('name');
        if (data) setGroups(data);
    };

    const fetchAllItems = async () => {
        // 아이템 리스트 (체크박스용)
        const { data } = await supabase.from('items').select('id, name, category_id').order('name');
        if (data) setAllItems(data);
    };

    const fetchOptions = async (groupId: string) => {
        setLoadingOptions(true);
        const { data } = await supabase.from('modifiers').select('*').eq('group_id', groupId).order('price', { ascending: true });
        if (data) setOptions(data);
        setLoadingOptions(false);
    };

    const fetchLinkedItems = async (groupId: string) => {
        // 연결 테이블(item_modifier_groups) 조회
        const { data } = await supabase.from('item_modifier_groups').select('item_id').eq('group_id', groupId);
        if (data) {
            setLinkedItemIds(data.map(d => d.item_id));
        }
    };

    // ---------------------------------------------------------
    // Handlers (Groups)
    // ---------------------------------------------------------
    const handleAddGroup = async () => {
        const name = prompt("Enter new Group Name (e.g., 'Steak Temperature')");
        if (!name) return;

        // 식당 ID가 필요하므로 하나 가져옴 (단일 식당 가정)
        const { data: restData } = await supabase.from('restaurants').select('id').single();
        if (!restData) return alert("Restaurant not found");

        const { error } = await supabase.from('modifier_groups').insert({
            restaurant_id: restData.id,
            name: name
        });

        if (!error) fetchGroups();
    };

    const handleDeleteGroup = async (id: string) => {
        if (!confirm("Delete this group? All options inside it will be deleted.")) return;
        await supabase.from('modifier_groups').delete().eq('id', id);
        setSelectedGroup(null);
        fetchGroups();
    };

    // ---------------------------------------------------------
    // Handlers (Options)
    // ---------------------------------------------------------
    const handleAddOption = async () => {
        if (!selectedGroup) return;
        const name = prompt("Enter Option Name (e.g., 'Medium Rare')");
        if (!name) return;
        const priceStr = prompt("Enter Price (0 for free)", "0");
        const price = parseFloat(priceStr || "0");

        await supabase.from('modifiers').insert({
            group_id: selectedGroup.id,
            name,
            price
        });
        fetchOptions(selectedGroup.id);
    };

    const handleDeleteOption = async (id: string) => {
        if (!confirm("Delete this option?")) return;
        await supabase.from('modifiers').delete().eq('id', id);
        if (selectedGroup) fetchOptions(selectedGroup.id);
    };

    // ---------------------------------------------------------
    // Handlers (Linking Items) - ⭐ 핵심 기능
    // ---------------------------------------------------------
    const toggleItemLink = async (itemId: string, isLinked: boolean) => {
        if (!selectedGroup) return;

        if (isLinked) {
            // 연결 해제 (Delete)
            const { error } = await supabase
                .from('item_modifier_groups')
                .delete()
                .eq('item_id', itemId)
                .eq('group_id', selectedGroup.id);

            if (!error) {
                setLinkedItemIds(prev => prev.filter(id => id !== itemId));
            }
        } else {
            // 연결 추가 (Insert)
            const { error } = await supabase
                .from('item_modifier_groups')
                .insert({
                    item_id: itemId,
                    group_id: selectedGroup.id
                });

            if (!error) {
                setLinkedItemIds(prev => [...prev, itemId]);
            }
        }
    };

    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden">

            {/* ------------------------------------------------ */}
            {/* 1. 좌측: Modifier Groups 목록 */}
            {/* ------------------------------------------------ */}
            <div className="w-1/4 bg-white border-r flex flex-col min-w-[250px]">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                    <h2 className="font-bold text-gray-800">1. Groups</h2>
                    <button onClick={handleAddGroup} className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700">+ Add</button>
                </div>
                <ul className="flex-1 overflow-y-auto p-2 space-y-1">
                    {groups.map(group => (
                        <li
                            key={group.id}
                            onClick={() => setSelectedGroup(group)}
                            className={`p-3 rounded-lg cursor-pointer flex justify-between group items-center
                ${selectedGroup?.id === group.id ? 'bg-blue-100 text-blue-800 font-bold border-blue-200 border' : 'hover:bg-gray-50 text-gray-600'}`}
                        >
                            <span>{group.name}</span>
                            {selectedGroup?.id === group.id && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.id); }}
                                    className="text-red-400 hover:text-red-600 px-2"
                                >
                                    ×
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            </div>

            {/* ------------------------------------------------ */}
            {/* 2. 중앙: Options 관리 */}
            {/* ------------------------------------------------ */}
            <div className="w-1/3 bg-white border-r flex flex-col min-w-[300px]">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                    <h2 className="font-bold text-gray-800">
                        2. Options for: <span className="text-blue-600">{selectedGroup?.name || '-'}</span>
                    </h2>
                    <button
                        onClick={handleAddOption}
                        disabled={!selectedGroup}
                        className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 disabled:opacity-50"
                    >
                        + Add Option
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                    {!selectedGroup ? (
                        <div className="text-center text-gray-400 mt-10">Select a group first</div>
                    ) : loadingOptions ? (
                        <div className="text-center text-gray-400 mt-10">Loading...</div>
                    ) : (
                        <ul className="space-y-2">
                            {options.length === 0 && <p className="text-sm text-gray-400 text-center">No options yet.</p>}
                            {options.map(opt => (
                                <li key={opt.id} className="bg-white p-3 rounded shadow-sm border flex justify-between items-center">
                                    <div>
                                        <span className="font-bold text-gray-800">{opt.name}</span>
                                        {opt.price > 0 && <span className="text-sm text-green-600 ml-2">(+${opt.price})</span>}
                                    </div>
                                    <button
                                        onClick={() => handleDeleteOption(opt.id)}
                                        className="text-red-400 hover:text-red-600 text-sm font-bold px-2"
                                    >
                                        Delete
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {/* ------------------------------------------------ */}
            {/* 3. 우측: 연결된 아이템 (Link Items) */}
            {/* ------------------------------------------------ */}
            <div className="flex-1 bg-white flex flex-col">
                <div className="p-4 border-b bg-gray-50">
                    <h2 className="font-bold text-gray-800">3. Apply to Items</h2>
                    <p className="text-xs text-gray-500">Check items that use the <span className="font-bold text-blue-600">{selectedGroup?.name || '...'}</span> group.</p>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    {!selectedGroup ? (
                        <div className="text-center text-gray-400 mt-10">Select a group to manage links</div>
                    ) : (
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                            {allItems.map(item => {
                                const isLinked = linkedItemIds.includes(item.id);
                                return (
                                    <label
                                        key={item.id}
                                        className={`flex items-center p-3 border rounded cursor-pointer transition-all select-none
                      ${isLinked ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300' : 'hover:bg-gray-50 border-gray-200'}`}
                                    >
                                        <input
                                            type="checkbox"
                                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 mr-3"
                                            checked={isLinked}
                                            onChange={() => toggleItemLink(item.id, isLinked)}
                                        />
                                        <span className={`text-sm ${isLinked ? 'font-bold text-gray-800' : 'text-gray-600'}`}>
                                            {item.name}
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
}