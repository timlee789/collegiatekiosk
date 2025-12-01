// src/lib/dataFetcher.ts
import { createClient } from '@supabase/supabase-js';
import { Category, MenuItem, ModifierGroup } from './types';

// 읽기 전용 클라이언트 생성 (Anon Key 사용)
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const getKioskData = async () => {
    console.log("Fetching menu data from Supabase...");

    // 1. Supabase에서 전체 데이터 조회 (JOIN Query)
    // 카테고리 -> 아이템 -> 연결테이블 -> 옵션그룹 -> 옵션들 순으로 깊은 가져오기
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
        is_available,
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

    // 2. UI 컴포넌트용 데이터 구조로 변환 (Mapping)
    const categories: Category[] = [];
    const allItems: MenuItem[] = []; // 전체 아이템 리스트
    const modifiersObj: { [key: string]: ModifierGroup } = {};

    categoriesData.forEach((cat: any) => {
        // 2-1. 카테고리 리스트 생성
        categories.push({
            id: cat.id,
            name: cat.name,
            // 타입 호환성을 위해 빈 배열로 초기화 (UI에서는 filteredItems를 쓰므로 괜찮음)
            items: []
        });

        // 2-2. 아이템 가공
        // items가 배열인지 확인 (없으면 빈 배열)
        const dbItems = cat.items || [];

        dbItems.forEach((item: any) => {
            // 품절된 상품은 화면에 표시하지 않음 (선택 사항)
            if (item.is_available === false) return;

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
                modifierGroups: modGroups
            };

            allItems.push(menuItem);
        });
    });

    console.log(`✅ Data Fetched: ${categories.length} Categories, ${allItems.length} Items`);

    return { categories, items: allItems, modifiersObj };
};