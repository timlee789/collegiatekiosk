import { createClient } from '@supabase/supabase-js';
import { Category, MenuItem, ModifierGroup } from './types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const getKioskData = async () => {
  const { data: categoriesData, error } = await supabase
    .from('categories')
    .select(`
      id, 
      name,
      items (
        id, 
        name, 
        pos_name, 
        price, 
        description, 
        image_url, 
        sort_order,
        is_available,
        clover_id,  
        item_modifier_groups (
          modifier_groups (
            name,
            modifiers (name, price, sort_order) 
          )
        )
      )
    `)
    .order('sort_order', { ascending: true }); // items 정렬은 여기서 처리됨 (기존 코드 유지)

  // modifiers(옵션) 정렬은 Supabase 깊은 중첩 쿼리에서 .order()가 복잡하므로
  // 아래 자바스크립트 로직에서 처리하는 것이 가장 안전하고 빠릅니다.

  if (error) {
    console.error("❌ DB Fetch Error:", error.message);
    return { categories: [], items: [], modifiersObj: {} };
  }

  const categories: Category[] = [];
  const allItems: MenuItem[] = [];
  const modifiersObj: { [key: string]: ModifierGroup } = {};

  categoriesData.forEach((cat: any) => {
    categories.push({ 
      id: cat.id, 
      name: cat.name,
      items: [] 
    });

    const dbItems = cat.items || [];
    dbItems.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
    
    dbItems.forEach((item: any) => {
      const modGroups: string[] = [];

      if (item.item_modifier_groups) {
        item.item_modifier_groups.forEach((relation: any) => {
          const group = relation.modifier_groups;
          if (group) {
            modGroups.push(group.name);
            if (!modifiersObj[group.name]) {
              
              // ✨ [수정된 부분] modifiers를 sort_order 기준으로 정렬 후 map 실행
              const sortedModifiers = (group.modifiers || []).sort(
                (a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0)
              );

              modifiersObj[group.name] = {
                name: group.name,
                options: sortedModifiers.map((m: any) => ({
                  name: m.name,
                  price: m.price
                  // types.ts를 건드리지 않기 위해 sort_order는 반환 객체에 넣지 않고 정렬에만 사용
                }))
              };
            }
          }
        });
      }

      const menuItem: MenuItem = {
        id: item.id,
        name: item.name,
        posName: item.pos_name,
        price: item.price,
        category: cat.name,
        description: item.description,
        image: item.image_url || '/placeholder.png',
        modifierGroups: modGroups,
        sort_order: item.sort_order,
        is_available: item.is_available,
        clover_id: item.clover_id 
      };

      allItems.push(menuItem);
    });
  });

  return { categories, items: allItems, modifiersObj };
};