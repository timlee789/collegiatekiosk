import { createClient } from '@supabase/supabase-js';
import { Category, MenuItem, ModifierGroup } from './types';

// 읽기 전용 클라이언트 생성 (Anon Key 사용)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const getKioskData = async () => {
  // console.log("Fetching menu data from Supabase...");

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
        item_modifier_groups (
          modifier_groups (
            name,
            modifiers (name, price)
          )
        )
      )
    `)
    .order('sort_order', { ascending: true }); // 카테고리 순서 정렬

  if (error) {
    console.error("❌ DB Fetch Error:", error.message);
    return { categories: [], items: [], modifiersObj: {} };
  }

  // 2. UI 컴포넌트용 데이터 구조로 변환 (Mapping)
  const categories: Category[] = [];
  const allItems: MenuItem[] = []; // 전체 아이템 리스트
  const modifiersObj: { [key: string]: ModifierGroup } = {};

  categoriesData.forEach((cat: any) => {
    categories.push({ 
      id: cat.id, 
      name: cat.name,
      items: [] 
    });

    // [중요] 아이템을 sort_order 기준으로 정렬
    const dbItems = cat.items || [];
    dbItems.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
    
    dbItems.forEach((item: any) => {
      // 품절 숨김 처리를 원하시면 아래 주석 해제
      // if (item.is_available === false) return;

      const modGroups: string[] = [];

      // 아이템에 연결된 옵션 그룹 처리
      if (item.item_modifier_groups) {
        item.item_modifier_groups.forEach((relation: any) => {
          const group = relation.modifier_groups;
          if (group) {
            modGroups.push(group.name);
            
            // 전역 Modifier Object에 추가 (중복 생성 방지)
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

      // 최종 MenuItem 객체 생성
      const menuItem: MenuItem = {
        id: item.id,
        name: item.name,        // 화면 표시 이름 (Real Name)
        posName: item.pos_name, // POS 매칭용 이름
        price: item.price,
        category: cat.name,
        description: item.description,
        image: item.image_url || '/placeholder.png', // 이미지 없으면 기본값
        modifierGroups: modGroups,
        sort_order: item.sort_order, // 순서 정보
        is_available: item.is_available // [중요] 품절 여부 연결
      };

      allItems.push(menuItem);
    });
  });

  return { categories, items: allItems, modifiersObj };
};