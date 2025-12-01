// scripts/seed-data.ts
// 실행 명령어: npx ts-node scripts/seed-data.ts

import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// .env.local 파일에서 환경변수 로드
dotenv.config({ path: '.env.local' });

// Supabase 클라이언트 초기화 (Service Role Key 필요)
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function seed() {
    console.log("🚀 Starting Data Migration...");

    // ---------------------------------------------------------
    // 1. 식당(Restaurant) 생성
    // ---------------------------------------------------------
    // 기존에 생성된 식당이 있어도 새로 하나 만듭니다. (테스트용)
    // 실제 운영 시에는 이미 있는 ID를 쓰도록 로직을 바꿔야 할 수 있습니다.
    const { data: restaurant, error: rError } = await supabase
        .from('restaurants')
        .insert({ name: 'Collegiate Grill' })
        .select()
        .single();

    if (rError) {
        console.error("❌ Failed to create restaurant:", rError.message);
        return;
    }

    const restaurantId = restaurant.id;
    console.log(`✅ Restaurant Created: ${restaurant.name} (${restaurantId})`);

    // ---------------------------------------------------------
    // 2. CSV 파일 읽기 헬퍼 함수
    // ---------------------------------------------------------
    const readCSV = (fileName: string): any[] => {
        const filePath = path.join(process.cwd(), 'public/data', fileName);
        try {
            if (!fs.existsSync(filePath)) {
                console.warn(`⚠️ Warning: File not found - ${fileName}`);
                return [];
            }
            const content = fs.readFileSync(filePath, 'utf8');
            // PapaParse 결과를 any[] 로 강제 형변환하여 반환
            return Papa.parse(content, {
                header: true,
                skipEmptyLines: true,
                dynamicTyping: true
            }).data as any[];
        } catch (err) {
            console.error(`❌ Error reading ${fileName}:`, err);
            return [];
        }
    };

    // CSV 파일 로드
    const rawCategories = readCSV('Category.csv');
    const rawItems = readCSV('Items.csv');
    const rawModifiers = readCSV('Modifier.csv');

    // ---------------------------------------------------------
    // 3. Modifier Groups & Options 처리
    // ---------------------------------------------------------
    console.log("Processing Modifiers...");
    const modGroupMap = new Map<string, string>(); // GroupName -> GroupUUID 매핑용

    for (const row of rawModifiers) {
        // 컬럼명 대소문자/띄어쓰기 대응
        const groupName = (row['Modifier Group Name'] || row.GroupName || '').trim();
        const optName = (row['Modifier'] || row.OptionName || '').trim();
        const price = row['Price'] || row.price || 0;

        if (!groupName || !optName) continue;

        // 그룹이 DB에 없으면 생성, 있으면 ID 가져오기
        if (!modGroupMap.has(groupName)) {
            const { data: group, error: gError } = await supabase
                .from('modifier_groups')
                .insert({ restaurant_id: restaurantId, name: groupName })
                .select()
                .single();

            if (gError) {
                console.error(`Error creating modifier group ${groupName}:`, gError.message);
                continue;
            }
            modGroupMap.set(groupName, group.id);
        }

        // 옵션(Modifier) 추가
        const groupId = modGroupMap.get(groupName);
        if (groupId) {
            await supabase.from('modifiers').insert({
                group_id: groupId,
                name: optName,
                price: price
            });
        }
    }

    // ---------------------------------------------------------
    // 4. Items 데이터 전처리 (빠른 검색을 위해 Map 생성)
    // ---------------------------------------------------------
    const itemsMap = new Map<string, any>();
    rawItems.forEach((item: any) => {
        // POS Name 키 정규화 (공백 제거)
        const key = (item['POS Name '] || item['POS Name'] || item.POSName || '').trim();
        if (key) itemsMap.set(key, item);
    });

    // ---------------------------------------------------------
    // 5. Category & Items 생성 (핵심 로직)
    // ---------------------------------------------------------
    console.log("Processing Categories & Items...");

    // [안전장치] 데이터가 비어있는지 확인하여 에러 방지
    if (!rawCategories || rawCategories.length === 0) {
        console.error("❌ Error: Category.csv is empty or not found.");
        return;
    }

    // 첫 번째 행의 키값들을 가져와 카테고리 이름 목록으로 사용
    const catNames = Object.keys(rawCategories[0]);

    for (const catName of catNames) {
        if (!catName) continue; // 빈 헤더 건너뜀

        console.log(`Creating Category: ${catName}`);

        // 카테고리 DB 생성
        const { data: category, error: catError } = await supabase
            .from('categories')
            .insert({ restaurant_id: restaurantId, name: catName })
            .select()
            .single();

        if (catError) {
            console.error(`Error creating category ${catName}:`, catError.message);
            continue;
        }

        // 해당 카테고리 열(Column)에 있는 아이템들을 순회
        // rawCategories는 행들의 배열이므로, 각 행에서 현재 catName 컬럼의 값을 읽어야 함
        for (const row of rawCategories) {
            const itemPosName = (row[catName] || '').trim();

            // 빈 셀이면 건너뜀
            if (!itemPosName) continue;

            // Items.csv 데이터에서 상세 정보 조회
            const itemData = itemsMap.get(itemPosName);

            // Items.csv에 없는 메뉴라도 일단 이름으로 생성 (가격 0)
            const realName = itemData ? (itemData['Real Name'] || itemPosName) : itemPosName;
            const price = itemData ? (itemData['Price'] || 0) : 0;
            const description = itemData ? (itemData['Description'] || null) : null;

            // 아이템 DB 생성
            const { data: newItem, error: itemError } = await supabase
                .from('items')
                .insert({
                    restaurant_id: restaurantId,
                    category_id: category.id,
                    name: realName,
                    pos_name: itemPosName, // 나중을 위해 원본 ID 저장
                    price: price,
                    description: description,
                    is_available: true
                })
                .select()
                .single();

            if (itemError) {
                console.error(`Error creating item ${realName}:`, itemError.message);
                continue;
            }

            // -------------------------------------------------------
            // 아이템 - Modifier Group 연결 (N:M Relation)
            // -------------------------------------------------------
            if (itemData) {
                const rawGroupStr = itemData['Modifier Groups'] || itemData.ModifierGroups;
                if (rawGroupStr && typeof rawGroupStr === 'string') {
                    // 콤마로 구분된 그룹 이름들을 배열로 분리
                    const groups = rawGroupStr.split(',').map((s: string) => s.trim());

                    for (const gName of groups) {
                        const gId = modGroupMap.get(gName);
                        if (gId) {
                            await supabase.from('item_modifier_groups').insert({
                                item_id: newItem.id,
                                group_id: gId
                            });
                        } else {
                            // CSV에는 있는데 Modifier.csv에 없는 그룹일 경우 경고 로그
                            // console.warn(`Group not found: ${gName} for item ${realName}`);
                        }
                    }
                }
            }
        } // End of Item Loop
    } // End of Category Loop

    console.log("🎉 Migration Complete! Database is fully populated.");
}

// 실행 및 에러 캐치
seed().catch(e => console.error("Fatal Error:", e));