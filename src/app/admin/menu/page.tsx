"use client";
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function AdminMenuPage() {
  // [중요] useState로 클라이언트 생성 (세션 유지 및 중복 생성 방지)
  const [supabase] = useState(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ));

  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [items, setItems] = useState<any[]>([]);
  
  // 수정 모드 상태
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({}); 

  // 초기 데이터 로드
  useEffect(() => {
    fetchCategories();
  }, []);

  // 카테고리 선택 시 아이템 로드
  useEffect(() => {
    if (selectedCatId) fetchItems(selectedCatId);
  }, [selectedCatId]);

  // ---------------------------------------------------------
  // Data Fetching
  // ---------------------------------------------------------
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
      .order('name');
    if (data) setItems(data);
  };

  // ---------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------

  // 1. 새 아이템 추가
  const handleAddNewItem = async () => {
    if (!selectedCatId) return;
    const name = prompt("Enter new Item Name:");
    if (!name) return;

    // 식당 ID는 첫 번째 카테고리의 것을 참조하거나, 별도 context에서 가져올 수 있음
    const restaurantId = categories[0]?.restaurant_id;

    const { error } = await supabase.from('items').insert({
      restaurant_id: restaurantId, 
      category_id: selectedCatId,
      name: name,
      price: 0,
      is_available: true
    });

    if (error) alert("Error adding item: " + error.message);
    else fetchItems(selectedCatId);
  };

  // 2. 수정 모드 진입
  const startEditing = (item: any) => {
    setEditingId(item.id);
    setEditForm({ ...item }); 
  };

  // 3. 저장 (수정 사항 DB 반영)
  const saveItem = async () => {
    if (!editForm.name) return alert("Name is required");

    const { error } = await supabase
      .from('items')
      .update({
        name: editForm.name,
        price: parseFloat(editForm.price) || 0,
        is_available: editForm.is_available,
        category_id: editForm.category_id // 카테고리 이동 반영
      })
      .eq('id', editingId);

    if (error) {
      alert("Error saving: " + error.message);
    } else {
      setEditingId(null);
      // 카테고리를 이동했을 수도 있으므로 현재 리스트 갱신
      fetchItems(selectedCatId!);
    }
  };

  // 4. 아이템 삭제
  const handleDeleteItem = async (itemId: string) => {
    if (!confirm("Are you sure you want to delete this item completely?")) return;
    await supabase.from('items').delete().eq('id', itemId);
    fetchItems(selectedCatId!);
  };

  // 5. 이미지 업로드 (컴포넌트 내부에서 직접 처리하여 RLS 문제 해결)
  const handleImageUpload = async (itemId: string, file: File) => {
    if (!confirm("Upload and replace image?")) return;
    
    // 파일명 생성
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `items/${fileName}`;

    // 인증된 클라이언트로 업로드
    const { error: uploadError } = await supabase.storage
      .from('menu-images')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Upload Error:', uploadError);
      alert("Upload Failed: " + uploadError.message);
      return;
    }

    // 공개 URL 가져오기
    const { data: urlData } = supabase.storage
      .from('menu-images')
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    // DB에 이미지 URL 업데이트
    const { error: dbError } = await supabase
      .from('items')
      .update({ image_url: publicUrl })
      .eq('id', itemId);
      
    if (dbError) {
      alert("DB Update failed: " + dbError.message);
    } else {
      alert("Image uploaded successfully!");
      fetchItems(selectedCatId!);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      
      {/* ------------------------------------------- */}
      {/* 왼쪽: 카테고리 사이드바 */}
      {/* ------------------------------------------- */}
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

      {/* ------------------------------------------- */}
      {/* 오른쪽: 아이템 관리 영역 */}
      {/* ------------------------------------------- */}
      <div className="flex-1 p-8 overflow-y-auto">
        
        {/* 헤더 */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Menu Items</h1>
            <p className="text-gray-500 text-sm">Manage items in <span className="font-bold text-blue-600">
              {categories.find(c => c.id === selectedCatId)?.name}
            </span>
            </p>
          </div>
          <button 
            onClick={handleAddNewItem}
            className="bg-green-600 text-white px-5 py-2 rounded-lg hover:bg-green-700 font-bold shadow-sm flex items-center gap-2"
          >
            <span>+</span> New Item
          </button>
        </div>

        {/* 아이템 그리드 */}
        {items.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-400">No items in this category.</p>
            <button onClick={handleAddNewItem} className="text-blue-500 font-bold mt-2 hover:underline">Create one?</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {items.map(item => {
              const isEditing = editingId === item.id;
              const displayData = isEditing ? editForm : item;

              return (
                <div key={item.id} className={`bg-white p-5 rounded-2xl shadow-sm border transition-all 
                  ${isEditing ? 'ring-2 ring-blue-500 border-transparent shadow-xl z-10 scale-[1.02]' : 'border-gray-200'}`}>
                  
                  {/* 1. 이미지 영역 (1:1 정사각형 비율 aspect-square) */}
                  <div className="aspect-square bg-gray-100 rounded-xl relative overflow-hidden group mb-4 flex items-center justify-center">
                     {displayData.image_url ? (
                       <img 
                        src={displayData.image_url} 
                        alt={displayData.name} 
                        className="w-full h-full object-cover" 
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.parentElement?.classList.add('bg-gray-200'); // 에러 시 배경색
                        }}
                       />
                     ) : (
                       <span className="text-gray-400 text-sm font-bold">No Image</span>
                     )}
                     
                     {/* 이미지가 없을 때 텍스트 표시 */}
                     <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm font-bold -z-10">
                        No Image
                     </div>

                     {/* 이미지 업로드 오버레이 */}
                     <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white font-bold text-sm z-20">
                       Change Photo
                       <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*" 
                        onChange={(e) => e.target.files?.[0] && handleImageUpload(item.id, e.target.files[0])} 
                       />
                     </label>
                  </div>

                  {/* 2. 입력 폼 영역 */}
                  <div className="space-y-3">
                    
                    {/* 카테고리 이동 (수정 모드일 때만 표시) */}
                    {isEditing && (
                      <div className="bg-yellow-50 p-2 rounded border border-yellow-200">
                        <label className="text-xs text-gray-500 font-bold uppercase block mb-1">Move Category</label>
                        <select
                          value={editForm.category_id}
                          onChange={(e) => setEditForm({ ...editForm, category_id: e.target.value })}
                          className="w-full p-1 bg-white border border-gray-300 rounded text-sm font-bold text-gray-800"
                        >
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* 이름 입력 */}
                    <div>
                      <label className="text-xs text-gray-400 font-bold uppercase">Item Name</label>
                      <input 
                        type="text" 
                        disabled={!isEditing}
                        value={displayData.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className={`w-full text-lg font-bold bg-transparent outline-none border-b-2 py-1
                          ${isEditing ? 'border-blue-500 text-gray-900' : 'border-transparent text-gray-800'}`}
                      />
                    </div>
                    
                    {/* 가격 및 품절 관리 */}
                    <div className="flex justify-between gap-4">
                       <div className="flex-1">
                          <label className="text-xs text-gray-400 font-bold uppercase">Price ($)</label>
                          <input 
                            type="number" 
                            step="0.01"
                            disabled={!isEditing}
                            value={displayData.price}
                            onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                            className={`w-full text-lg font-bold bg-transparent outline-none border-b-2 py-1
                              ${isEditing ? 'border-blue-500 text-gray-900' : 'border-transparent text-gray-800'}`}
                          />
                       </div>
                       <div className="flex items-end pb-2">
                          <button 
                            disabled={!isEditing}
                            onClick={() => setEditForm({ ...editForm, is_available: !editForm.is_available })}
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

                  {/* 3. 액션 버튼 (Edit / Save / Cancel / Delete) */}
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