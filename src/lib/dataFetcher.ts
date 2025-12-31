import { createClient } from '@supabase/supabase-js';
import { Category, MenuItem, ModifierGroup } from './types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const getKioskData = async () => {
  // 1. Supabase에서 데이터 가져오기
  const { data: categoriesData, error } = await supabase
    .from('categories')
    .select(`
      id, 
      name,
      sort_order,
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
    .order('sort_order', { ascending: true }); 

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

    // [정렬] 숫자 변환 후 정렬 (로그 삭제됨)
    dbItems.sort((a: any, b: any) => {
        const orderA = Number(a.sort_order ?? 9999);
        const orderB = Number(b.sort_order ?? 9999);
        return orderA - orderB;
    });
    
    dbItems.forEach((item: any) => {
      const modGroups: string[] = [];

      if (item.item_modifier_groups) {
        item.item_modifier_groups.forEach((relation: any) => {
          const group = relation.modifier_groups;
          if (group) {
            modGroups.push(group.name);
            if (!modifiersObj[group.name]) {
              
              // 옵션 정렬
              const sortedModifiers = (group.modifiers || []).sort(
                (a: any, b: any) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0)
              );

              modifiersObj[group.name] = {
                name: group.name,
                options: sortedModifiers.map((m: any) => ({
                  name: m.name,
                  price: m.price
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