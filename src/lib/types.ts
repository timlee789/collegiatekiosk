// src/lib/types.ts

export interface ModifierOption {
    name: string;
    price: number;
}

export interface ModifierGroup {
    name: string;
    options: ModifierOption[];
}

export interface MenuItem {
    id: string; // 고유 ID (Clover ID 또는 POS Name)
    name: string; // 화면 표시 이름 (Real Name 또는 POS Name)
    posName: string; // 데이터 매칭용 이름
    price: number;
    category: string; // Category.csv의 헤더 이름
    description?: string;
    image?: string;
    modifierGroups: string[]; // Modifier Group 이름 목록
    sort_order?: number;
    is_available?: boolean;
    clover_id?: string;
    pos_name?: string;
}

export interface Category {
    id: string;
    name: string;
    items: MenuItem[]; // 카테고리에 속한 아이템들
}

export interface CartItem extends MenuItem {
    uniqueCartId: string;
    selectedModifiers: ModifierOption[];
    totalPrice: number;
    quantity: number;
}