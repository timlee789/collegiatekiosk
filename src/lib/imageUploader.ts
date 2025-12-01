import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const uploadMenuImage = async (file: File, path: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`; // 파일명 중복 방지
    const filePath = `${path}/${fileName}`;

    const { error } = await supabase.storage
        .from('menu-images') // 아까 만든 버킷 이름
        .upload(filePath, file);

    if (error) {
        console.error('Upload Error:', error);
        return null;
    }

    // 업로드된 이미지의 공개 URL 가져오기
    const { data } = supabase.storage
        .from('menu-images')
        .getPublicUrl(filePath);

    return data.publicUrl;
};