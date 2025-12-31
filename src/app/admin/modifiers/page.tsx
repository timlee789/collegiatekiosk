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
    sort_order: number; // ✨ [New] 순서 필드 추가
}
interface SimpleItem {
    id: string;
    name: string;
    category_id: string; 
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
    const [linkedItemIds, setLinkedItemIds] = useState<string[]>([]); 
    const [allItems, setAllItems] = useState<SimpleItem[]>([]); 

    // 옵션 수정용 상태
    const [editingOptionId, setEditingOptionId] = useState<string | null>(null);
    const [editOptionForm, setEditOptionForm] = useState({ name: '', price: 0 });

    // 로딩 상태
    const [loadingOptions, setLoadingOptions] = useState(false);

    // 초기 데이터 로드
    useEffect(() => {
        fetchGroups();
        fetchAllItems();
    }, []);

    useEffect(() => {
        if (selectedGroup) {
            fetchOptions(selectedGroup.id);
            fetchLinkedItems(selectedGroup.id);
            setEditingOptionId(null); 
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
        const { data } = await supabase.from('items').select('id, name, category_id').order('name');
        if (data) setAllItems(data);
    };

    const fetchOptions = async (groupId: string) => {
        setLoadingOptions(true);
        // ✨ [수정] 정렬 기준을 price -> sort_order 로 변경
        const { data } = await supabase
            .from('modifiers')
            .select('*')
            .eq('group_id', groupId)
            .order('sort_order', { ascending: true }); 
        if (data) setOptions(data);
        setLoadingOptions(false);
    };

    const fetchLinkedItems = async (groupId: string) => {
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

        const { data: restData } = await supabase.from('restaurants').select('id').single();
        if (!restData) return alert("Restaurant not found");

        const { error } = await supabase.from('modifier_groups').insert({
            restaurant_id: restData.id,
            name: name
        });

        if (!error) fetchGroups();
        else alert(error.message);
    };

    const handleDeleteGroup = async (id: string) => {
        if (!confirm("Delete this group? All options inside it will be deleted.")) return;
        await supabase.from('modifier_groups').delete().eq('id', id);
        setSelectedGroup(null);
        fetchGroups();
    };

    // ---------------------------------------------------------
    // Handlers (Options - Add, Edit, Delete, Move)
    // ---------------------------------------------------------
    const handleAddOption = async () => {
        if (!selectedGroup) return;
        const name = prompt("Enter Option Name (e.g., 'Medium Rare')");
        if (!name) return;
        const priceStr = prompt("Enter Price (0 for free)", "0");
        const price = parseFloat(priceStr || "0");

        // ✨ [New] 현재 가장 큰 순서 번호 찾기 (맨 뒤에 추가하기 위해)
        const maxOrder = options.length > 0 ? Math.max(...options.map(o => o.sort_order || 0)) : 0;

        await supabase.from('modifiers').insert({
            group_id: selectedGroup.id,
            name,
            price,
            sort_order: maxOrder + 1 // ✨ 순서 부여
        });
        fetchOptions(selectedGroup.id);
    };

    const handleDeleteOption = async (id: string) => {
        if (!confirm("Delete this option?")) return;
        await supabase.from('modifiers').delete().eq('id', id);
        if (selectedGroup) fetchOptions(selectedGroup.id);
    };

    const startEditingOption = (opt: ModifierOption) => {
        setEditingOptionId(opt.id);
        setEditOptionForm({ name: opt.name, price: opt.price });
    };

    const handleUpdateOption = async () => {
        if (!editingOptionId || !selectedGroup) return;
        if (!editOptionForm.name) return alert("Name is required");

        const { error } = await supabase
            .from('modifiers')
            .update({
                name: editOptionForm.name,
                price: editOptionForm.price
            })
            .eq('id', editingOptionId);

        if (error) {
            alert("Error updating: " + error.message);
        } else {
            setEditingOptionId(null);
            fetchOptions(selectedGroup.id);
        }
    };

    // ✨ [New] 옵션 순서 변경 핸들러
    const handleMoveOption = async (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === options.length - 1) return;
    
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        
        // UI 낙관적 업데이트
        const newOptions = [...options];
        const optA = newOptions[index];
        const optB = newOptions[targetIndex];
        
        newOptions[index] = optB;
        newOptions[targetIndex] = optA;
        setOptions(newOptions);
    
        // DB 업데이트 (서로의 sort_order 교환)
        // 주의: DB에 sort_order가 null인 데이터가 있다면 0으로 취급
        const orderA = optA.sort_order || 0;
        const orderB = optB.sort_order || 0;

        // 만약 둘의 sort_order가 같다면(초기상태), 인덱스 기반으로 재정렬 필요할 수 있음.
        // 여기서는 단순 교환 방식 사용
        const { error: e1 } = await supabase.from('modifiers').update({ sort_order: orderB }).eq('id', optA.id);
        const { error: e2 } = await supabase.from('modifiers').update({ sort_order: orderA }).eq('id', optB.id);
    
        if (e1 || e2) {
            console.error("Reorder failed", e1, e2);
            if (selectedGroup) fetchOptions(selectedGroup.id); // 실패 시 원복
        }
    };

    // ---------------------------------------------------------
    // Handlers (Linking Items)
    // ---------------------------------------------------------
    const toggleItemLink = async (itemId: string, isLinked: boolean) => {
        if (!selectedGroup) return;

        if (isLinked) {
            const { error } = await supabase
                .from('item_modifier_groups')
                .delete()
                .eq('item_id', itemId)
                .eq('group_id', selectedGroup.id);

            if (!error) {
                setLinkedItemIds(prev => prev.filter(id => id !== itemId));
            }
        } else {
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

            {/* 1. 좌측: Modifier Groups 목록 */}
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

            {/* 2. 중앙: Options 관리 (수정/삭제/순서변경 기능 통합) */}
            <div className="w-1/3 bg-white border-r flex flex-col min-w-[350px]">
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
                        <ul className="space-y-3">
                            {options.length === 0 && <p className="text-sm text-gray-400 text-center">No options yet.</p>}
                            
                            {options.map((opt, index) => {
                                const isEditing = editingOptionId === opt.id;

                                return (
                                    <li key={opt.id} className={`bg-white p-3 rounded shadow-sm border flex flex-col gap-2 
                                        ${isEditing ? 'ring-2 ring-blue-500 border-transparent' : 'border-gray-200'}`}>
                                        
                                        {isEditing ? (
                                            // [수정 모드]
                                            <div className="space-y-2">
                                                <div>
                                                    <label className="text-xs text-gray-400 font-bold">Name</label>
                                                    <input 
                                                        type="text" 
                                                        value={editOptionForm.name}
                                                        onChange={(e) => setEditOptionForm(prev => ({...prev, name: e.target.value}))}
                                                        className="w-full border-b border-blue-500 outline-none text-sm font-bold"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <label className="text-xs text-gray-400 font-bold">Price($)</label>
                                                    <input 
                                                        type="number" 
                                                        step="0.01"
                                                        value={editOptionForm.price}
                                                        onChange={(e) => setEditOptionForm(prev => ({...prev, price: parseFloat(e.target.value) || 0}))}
                                                        className="w-20 border-b border-blue-500 outline-none text-sm font-bold"
                                                    />
                                                </div>
                                                <div className="flex justify-end gap-2 mt-2">
                                                    <button 
                                                        onClick={() => setEditingOptionId(null)}
                                                        className="px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button 
                                                        onClick={handleUpdateOption}
                                                        className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 font-bold"
                                                    >
                                                        Save
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            // [보기 모드]
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-3">
                                                    {/* ✨ [New] 순서 변경 화살표 */}
                                                    <div className="flex flex-col">
                                                        <button 
                                                            onClick={() => handleMoveOption(index, 'up')}
                                                            disabled={index === 0}
                                                            className="text-gray-300 hover:text-blue-600 disabled:opacity-0 text-[10px] leading-none"
                                                        >
                                                            ▲
                                                        </button>
                                                        <button 
                                                            onClick={() => handleMoveOption(index, 'down')}
                                                            disabled={index === options.length - 1}
                                                            className="text-gray-300 hover:text-blue-600 disabled:opacity-0 text-[10px] leading-none"
                                                        >
                                                            ▼
                                                        </button>
                                                    </div>

                                                    <div>
                                                        <span className="font-bold text-gray-800">{opt.name}</span>
                                                        {opt.price > 0 && <span className="text-sm text-green-600 ml-2">(+${opt.price})</span>}
                                                    </div>
                                                </div>

                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => startEditingOption(opt)}
                                                        className="text-blue-400 hover:text-blue-600 text-xs font-bold px-2 py-1 bg-blue-50 hover:bg-blue-100 rounded"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteOption(opt.id)}
                                                        className="text-red-400 hover:text-red-600 text-xs font-bold px-2 py-1 bg-red-50 hover:bg-red-100 rounded"
                                                    >
                                                        Del
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </div>

            {/* 3. 우측: 연결된 아이템 (Link Items) */}
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