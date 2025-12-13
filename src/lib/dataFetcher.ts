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
            modifiers (name, price)
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
    dbItems.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
    
    dbItems.forEach((item: any) => {
      const modGroups: string[] = [];

      if (item.item_modifier_groups) {
        item.item_modifier_groups.forEach((relation: any) => {
          const group = relation.modifier_groups;
          if (group) {
            modGroups.push(group.name);
            if (!modifiersObj[group.name]) {
              modifiersObj[group.name] = {
                name: group.name,
                options: group.modifiers.map((m: any) => ({
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
        // [수정] 이제 빨간 줄이 안 뜰 겁니다 (types.ts 수정 전제)
        clover_id: item.clover_id 
      };

      allItems.push(menuItem);
    });
  });

  return { categories, items: allItems, modifiersObj };
};