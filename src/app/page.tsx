// src/app/page.tsx
// [변경] csvParser 대신 dataFetcher를 import 합니다.
import { getKioskData } from '@/lib/dataFetcher';
import KioskMain from '@/components/KioskMain';

// Next.js 페이지 캐싱 설정 (0으로 설정하면 매번 최신 데이터를 가져옴)
// 상용 배포 시에는 60초 등으로 늘려서 DB 부하를 줄일 수 있습니다.
export const revalidate = 0;

export default async function Page() {
  const { categories, items, modifiersObj } = await getKioskData();

  return (
    <main className="h-screen w-screen overflow-hidden bg-gray-50">
      <KioskMain
        categories={categories}
        items={items}
        modifiersObj={modifiersObj}
      />
    </main>
  );
}