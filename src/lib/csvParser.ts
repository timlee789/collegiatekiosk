// src/lib/csvParser.ts
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { Category, MenuItem, ModifierGroup, ModifierOption } from './types';

// CSV 파싱 헬퍼
const parseCSV = async <T>(fileName: string): Promise<T[]> => {
    try {
        const filePath = path.join(process.cwd(), 'public/data', fileName);
        if (!fs.existsSync(filePath)) return [];

        const fileContent = fs.readFileSync(filePath, 'utf8');
        const { data } = Papa.parse(fileContent, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true,
        });
        return data as T[];
    } catch (error) {
        console.error(`Error loading ${fileName}:`, error);
        return [];
    }
};

export const getKioskData = async () => {
    // 1. 모든 CSV 데이터 로드
    const rawCategories = await parseCSV<any>('Category.csv');
    const rawItems = await parseCSV<any>('Items.csv');
    const rawModifiers = await parseCSV<any>('Modifier.csv');

    // -------------------------------------------------------
    // 2. Modifier 데이터 정리 (Group Name -> Option List)
    // -------------------------------------------------------
    const modifiersMap = new Map<string, ModifierGroup>();

    rawModifiers.forEach((row: any) => {
        // CSV 컬럼 매칭 (대소문자/띄어쓰기 유연 대응)
        const groupName = (row['Modifier Group Name'] || row.GroupName || '').trim();
        const optionName = (row.Modifier || row.OptionName || '').trim();
        const price = row.Price || 0;

        if (!groupName || !optionName) return;

        if (!modifiersMap.has(groupName)) {
            modifiersMap.set(groupName, {
                name: groupName,
                options: [],
            });
        }
        modifiersMap.get(groupName)?.options.push({
            name: optionName,
            price: price
        });
    });

    // -------------------------------------------------------
    // 3. Item 데이터 정리 (POS Name -> Item Object)
    // -------------------------------------------------------
    const itemsMap = new Map<string, any>();

    rawItems.forEach((row: any) => {
        // 'POS Name ' 처럼 뒤에 공백이 있을 수 있으므로 trim() 필수
        const posNameKey = (row['POS Name '] || row['POS Name'] || row.POSName || '').trim();

        if (posNameKey) {
            itemsMap.set(posNameKey, row);
        }
    });

    // -------------------------------------------------------
    // 4. Category 데이터 파싱 및 최종 구조 생성
    // Category.csv는 Header가 카테고리명, 그 아래가 Item Name들임
    // -------------------------------------------------------

    // PapaParse 결과인 rawCategories는 [{Header1: Item1, Header2: Item1}, ...] 형태의 행 리스트임.
    // 이를 카테고리별로 모으기 위해 헤더(Category Names)를 먼저 추출합니다.
    const categoryNames = rawCategories.length > 0 ? Object.keys(rawCategories[0]) : [];

    const categories: Category[] = [];
    const allItems: MenuItem[] = []; // 전체 아이템 리스트 (화면 표시용)

    categoryNames.forEach((catName) => {
        if (!catName) return;

        const categoryItems: MenuItem[] = [];

        // 각 행(Row)을 순회하며 해당 컬럼(catName)에 있는 아이템 이름을 가져옴
        rawCategories.forEach((row: any) => {
            const itemPosName = (row[catName] || '').trim();
            if (!itemPosName) return; // 빈 셀 건너뜀

            // Items.csv에서 해당 이름의 정보 찾기
            const itemData = itemsMap.get(itemPosName);

            if (itemData) {
                // Modifier Groups 파싱 ("Group1, Group2" -> ["Group1", "Group2"])
                let modGroups: string[] = [];
                const rawGroupStr = itemData['Modifier Groups'] || itemData.ModifierGroups;
                if (rawGroupStr && typeof rawGroupStr === 'string') {
                    modGroups = rawGroupStr.split(',').map(s => s.trim()).filter(s => s.length > 0);
                }

                const newItem: MenuItem = {
                    id: itemData['Clover ID'] || itemPosName,
                    posName: itemPosName,
                    name: itemData['Real Name'] || itemPosName, // 화면엔 Real Name 우선
                    price: itemData.Price || 0,
                    category: catName,
                    description: itemData.Description || undefined,
                    modifierGroups: modGroups,
                    image: '/placeholder.png' // 이미지 URL이 있다면 itemData['ImageURL'] 사용
                };

                categoryItems.push(newItem);
                allItems.push(newItem);
            } else {
                // console.warn(`Item not found in Items.csv: ${itemPosName} (Category: ${catName})`);
            }
        });

        if (categoryItems.length > 0) {
            categories.push({
                id: catName,
                name: catName,
                items: categoryItems
            });
        }
    });

    return { categories, items: allItems, modifiersMap };
};