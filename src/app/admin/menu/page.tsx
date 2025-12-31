"use client";
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function AdminMenuPage() {
  const [supabase] = useState(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ));

  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [items, setItems] = useState<any[]>([]);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({}); 

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (selectedCatId) fetchItems(selectedCatId);
  }, [selectedCatId]);

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*').order('sort_order');
    if (data && data.length > 0) {
      setCategories(data);
      if (!selectedCatId) setSelectedCatId(data[0].id);
    }
  };

  const fetchItems = async (catId: string) => {
    const { data } = await supabase
      .from('items')
      .select('*')
      .eq('category_id', catId)
      .order('sort_order', { ascending: true });
    if (data) setItems(data);
  };

  const handleAddNewItem = async () => {
    if (!selectedCatId) return;
    const name = prompt("Enter new Item Name:");
    if (!name) return;

    const maxOrder = items.length > 0 ? Math.max(...items.map(i => i.sort_order || 0)) : 0;

    const { error } = await supabase.from('items').insert({
      restaurant_id: categories[0].restaurant_id, 
      category_id: selectedCatId,
      name: name,
      price: 0,
      is_available: true,
      sort_order: maxOrder + 1
    });

    if (error) alert("Error adding item: " + error.message);
    else fetchItems(selectedCatId);
  };

  const startEditing = (item: any) => {
    setEditingId(item.id);
    setEditForm({ ...item }); 
  };

  const saveItem = async () => {
    if (!editForm.name) return alert("Name is required");

    // ✨ [수정 1] 업데이트 쿼리에 .select()를 추가하여 업데이트 결과를 확실히 확인
    const { data, error } = await supabase
      .from('items')
      .update({
        name: editForm.name,
        price: parseFloat(editForm.price) || 0,
        is_available: editForm.is_available,
        category_id: editForm.category_id
      })
      .eq('id', editingId)
      .select(); // 업데이트된 데이터를 반환받음

    if (error) {
      alert("Error saving: " + error.message);
    } else {
      // 데이터가 정상적으로 업데이트 되었는지 확인 (RLS 정책 등으로 인해 업데이트가 무시될 수 있음)
      if (data && data.length > 0) {
        setEditingId(null);
        fetchItems(selectedCatId!);
      } else {
        alert("Failed to update item. Please check Database Permissions (RLS).");
      }
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm("Delete this item?")) return;
    await supabase.from('items').delete().eq('id', itemId);
    fetchItems(selectedCatId!);
  };

  const handleImageUpload = async (itemId: string, file: File) => {
    if (!confirm("Upload image?")) return;
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `items/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('menu-images')
      .upload(filePath, file);

    if (uploadError) return alert("Upload Failed: " + uploadError.message);

    const { data: urlData } = supabase.storage.from('menu-images').getPublicUrl(filePath);

    await supabase.from('items').update({ image_url: urlData.publicUrl }).eq('id', itemId);
    alert("Image uploaded!");
    fetchItems(selectedCatId!);
  };

 // ---------------------------------------------------------
  // [Modified] 아이템 순서 변경 함수 (재정렬 방식)
  // ---------------------------------------------------------
  const handleMoveItem = async (index: number, direction: 'prev' | 'next') => {
    if (direction === 'prev' && index === 0) return;
    if (direction === 'next' && index === items.length - 1) return;

    const targetIndex = direction === 'prev' ? index - 1 : index + 1;
    
    // 1. 배열 복사 후 위치 교환 (UI 즉시 반영)
    const newItems = [...items];
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;
    
    setItems(newItems); // 화면 먼저 갱신

    // 2. [핵심] 전체 리스트를 순회하며 1부터 차례대로 번호 재부여
    // 이렇게 하면 기존에 1, 1, 5, 5 처럼 꼬여있던 번호들이 1, 2, 3, 4로 싹 고쳐집니다.
    const updates = newItems.map((item, idx) => ({
        id: item.id,
        sort_order: idx + 1 // 0번 인덱스 -> 1번, 1번 인덱스 -> 2번 ...
    }));

    // 3. 변경된 순서 DB에 저장 (Promise.all로 병렬 처리)
    try {
        const updatePromises = updates.map(u => 
            supabase.from('items').update({ sort_order: u.sort_order }).eq('id', u.id)
        );
        
        await Promise.all(updatePromises);
        
        // (선택) 확실한 동기화를 위해 완료 후 재조회 하셔도 되지만, 
        // UI가 이미 바뀌었으므로 생략해도 됩니다.
        // fetchItems(selectedCatId!); 

    } catch (error) {
        console.error("Reorder failed", error);
        alert("Failed to save order. Please refresh.");
        fetchItems(selectedCatId!); // 에러 시 원복
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      
      {/* 카테고리 사이드바 */}
      <div className="w-64 bg-white border-r flex flex-col">
        <div className="p-5 border-b bg-gray-100">
          <h2 className="text-lg font-bold text-gray-800">Filter by Category</h2>
        </div>
        <ul className="overflow-y-auto flex-1 p-2 space-y-1">
          {categories.map(cat => (
            <li 
              key={cat.id}
              onClick={() => {
                setSelectedCatId(cat.id);
                setEditingId(null);
              }}
              className={`p-3 cursor-pointer rounded-lg font-medium transition-all flex justify-between
                ${selectedCatId === cat.id 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <span>{cat.name}</span>
              {selectedCatId === cat.id && <span>👉</span>}
            </li>
          ))}
        </ul>
      </div>

      {/* 아이템 관리 영역 */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Menu Items</h1>
            <p className="text-gray-500 text-sm">
              Current Category: <span className="font-bold text-blue-600">{categories.find(c => c.id === selectedCatId)?.name}</span>
            </p>
          </div>
          <button 
            onClick={handleAddNewItem}
            className="bg-green-600 text-white px-5 py-2 rounded-lg hover:bg-green-700 font-bold shadow-sm flex items-center gap-2"
          >
            <span>+</span> New Item
          </button>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-400">No items in this category.</p>
            <button onClick={handleAddNewItem} className="text-blue-500 font-bold mt-2 hover:underline">Create one?</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {items.map((item, index) => {
              const isEditing = editingId === item.id;
              const displayData = isEditing ? editForm : item;

              return (
                <div key={item.id} className={`bg-white p-5 rounded-2xl shadow-sm border transition-all 
                  ${isEditing ? 'ring-2 ring-blue-500 border-transparent shadow-xl z-10 scale-[1.02]' : 'border-gray-200'}`}>
                  
                  {/* 순서 변경 버튼 */}
                  {!isEditing && (
                    <div className="flex justify-between mb-2">
                       <button 
                         onClick={() => handleMoveItem(index, 'prev')}
                         disabled={index === 0}
                         className="text-gray-400 hover:text-blue-600 disabled:opacity-20 text-lg font-bold px-2"
                       >
                         ◀
                       </button>
                       <span className="text-xs text-gray-300 pt-1">Order: {item.sort_order}</span>
                       <button 
                         onClick={() => handleMoveItem(index, 'next')}
                         disabled={index === items.length - 1}
                         className="text-gray-400 hover:text-blue-600 disabled:opacity-20 text-lg font-bold px-2"
                       >
                         ▶
                       </button>
                    </div>
                  )}

                  {/* 이미지 영역 */}
                  <div className="aspect-square bg-gray-100 rounded-xl relative overflow-hidden group mb-4 flex items-center justify-center">
                      {displayData.image_url ? (
                        <img 
                         src={displayData.image_url} 
                         alt={displayData.name} 
                         className="w-full h-full object-cover" 
                         onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      ) : (
                        <span className="text-gray-400 text-sm font-bold">No Image</span>
                      )}
                      
                      <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white font-bold text-sm z-20">
                        Change Photo
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageUpload(item.id, e.target.files[0])} />
                      </label>
                  </div>

                  {/* 입력 폼 */}
                  <div className="space-y-3">
                    {isEditing && (
                      <div className="bg-yellow-50 p-2 rounded border border-yellow-200">
                        <label className="text-xs text-gray-500 font-bold uppercase block mb-1">Move Category</label>
                        <select
                          value={editForm.category_id}
                          // ✨ [수정 2] 상태 업데이트 시 함수형 업데이트(prev => ...) 사용
                          onChange={(e) => setEditForm((prev: any) => ({ ...prev, category_id: e.target.value }))}
                          className="w-full p-1 bg-white border border-gray-300 rounded text-sm font-bold text-gray-800"
                        >
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="text-xs text-gray-400 font-bold uppercase">Item Name</label>
                      <input 
                        type="text" 
                        disabled={!isEditing}
                        value={displayData.name || ''} // 값이 없을 때 경고 방지
                        // ✨ [수정 3] 입력값 유실 방지를 위한 함수형 업데이트 적용
                        onChange={(e) => setEditForm((prev: any) => ({ ...prev, name: e.target.value }))}
                        className={`w-full text-lg font-bold bg-transparent outline-none border-b-2 py-1
                          ${isEditing ? 'border-blue-500 text-gray-900' : 'border-transparent text-gray-800'}`}
                      />
                    </div>
                    
                    <div className="flex justify-between gap-4">
                       <div className="flex-1">
                          <label className="text-xs text-gray-400 font-bold uppercase">Price ($)</label>
                          <input 
                            type="number" 
                            step="0.01"
                            disabled={!isEditing}
                            value={displayData.price}
                            // ✨ [수정 4] Price 입력도 함수형 업데이트 적용
                            onChange={(e) => setEditForm((prev: any) => ({ ...prev, price: e.target.value }))}
                            className={`w-full text-lg font-bold bg-transparent outline-none border-b-2 py-1
                              ${isEditing ? 'border-blue-500 text-gray-900' : 'border-transparent text-gray-800'}`}
                          />
                       </div>
                       <div className="flex items-end pb-2">
                          <button 
                            disabled={!isEditing}
                            // ✨ [수정 5] 토글 버튼도 함수형 업데이트 적용
                            onClick={() => setEditForm((prev: any) => ({ ...prev, is_available: !prev.is_available }))}
                            className={`text-xs font-bold px-3 py-1 rounded-full transition-colors
                              ${displayData.is_available 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-red-100 text-red-700'}`}
                          >
                            {displayData.is_available ? 'IN STOCK' : 'SOLD OUT'}
                          </button>
                       </div>
                    </div>
                  </div>

                  {/* 버튼 영역 */}
                  <div className="mt-6 pt-4 border-t flex justify-between items-center">
                    {isEditing ? (
                      <>
                        <button 
                          onClick={() => handleDeleteItem(item.id)}
                          className="text-red-500 text-sm font-bold hover:underline px-2"
                        >
                          Delete
                        </button>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setEditingId(null)}
                            className="px-3 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-lg text-sm"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={saveItem}
                            className="px-5 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md text-sm"
                          >
                            Save
                          </button>
                        </div>
                      </>
                    ) : (
                      <button 
                        onClick={() => startEditing(item)}
                        className="w-full py-2 bg-gray-50 text-gray-600 font-bold rounded-lg hover:bg-gray-100 border border-gray-200 text-sm"
                      >
                        Edit Item
                      </button>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}