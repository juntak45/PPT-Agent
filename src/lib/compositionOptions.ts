import { SlideContent, CompositionVariant, SlideLayout, ContentType } from './types';

interface CompositionOption {
  id: CompositionVariant;
  label: string;
  description: string;
}

// 슬라이드 내용에 따라 적합한 구도 후보 2~3개 반환
export function getCompositionOptions(slide: SlideContent): CompositionOption[] {
  const points = slide.bulletPoints?.length || 0;

  // 타이틀/구분 슬라이드는 구도 선택 불필요
  if (slide.layout === 'title-slide' || slide.layout === 'section-divider') {
    return [];
  }

  // 다이어그램/아키텍처 슬라이드
  if (slide.layout === 'diagram' || slide.mermaidCode) {
    return [
      { id: 'stack-vertical', label: '레이어 구조', description: '위아래로 쌓는 계층형' },
      { id: 'side-by-side', label: '좌우 비교', description: '왼쪽-오른쪽 나란히 배치' },
      { id: 'hub-spoke', label: '허브 & 스포크', description: '중앙 핵심 + 주변 연결' },
    ];
  }

  // 차트 슬라이드
  if (slide.layout === 'chart') {
    return [
      { id: 'center-highlight', label: '중앙 강조', description: '핵심 지표를 크게 표시' },
      { id: 'side-by-side', label: '좌우 분할', description: '차트 + 설명 나란히' },
      { id: 'grid-cards', label: '카드 그리드', description: '지표별 카드 배치' },
    ];
  }

  // 2컬럼 슬라이드
  if (slide.layout === 'two-column') {
    return [
      { id: 'side-by-side', label: '좌우 분할', description: '두 영역 나란히 배치' },
      { id: 'comparison-table', label: '비교 테이블', description: '표 형태로 항목 비교' },
      { id: 'stack-vertical', label: '상하 배치', description: '위아래로 쌓아 비교' },
    ];
  }

  // 결론/마무리
  if (slide.layout === 'conclusion') {
    return [
      { id: 'center-highlight', label: '중앙 강조', description: '핵심 메시지 중앙 배치' },
      { id: 'grid-cards', label: '카드 요약', description: '핵심 항목을 카드로' },
      { id: 'flow-horizontal', label: '흐름도', description: '결론까지의 흐름 표시' },
    ];
  }

  // 불릿이 적으면 (1~3개) → 카드가 좋음
  if (points > 0 && points <= 3) {
    return [
      { id: 'grid-cards', label: '카드 그리드', description: '각 항목을 카드로 시각화' },
      { id: 'flow-horizontal', label: '가로 흐름', description: '순서대로 화살표 연결' },
      { id: 'icon-list', label: '아이콘 리스트', description: '불릿 포인트 + 아이콘' },
    ];
  }

  // 불릿이 많으면 (4~5개) → 여러 옵션
  if (points >= 4 && points <= 5) {
    return [
      { id: 'icon-list', label: '아이콘 리스트', description: '깔끔한 불릿 포인트' },
      { id: 'grid-cards', label: '카드 그리드', description: '항목별 카드 배치' },
      { id: 'timeline', label: '타임라인', description: '순서/단계 형태로 표시' },
    ];
  }

  // 불릿이 많으면 (6개+) → 압축 레이아웃
  if (points >= 6) {
    return [
      { id: 'icon-list', label: '아이콘 리스트', description: '컴팩트한 리스트형' },
      { id: 'side-by-side', label: '좌우 분할', description: '두 컬럼으로 나눠 표시' },
      { id: 'flow-vertical', label: '세로 흐름', description: '위에서 아래로 단계적' },
    ];
  }

  // 기본
  return [
    { id: 'default', label: '기본 레이아웃', description: '표준 불릿 포인트' },
    { id: 'grid-cards', label: '카드 그리드', description: '카드 형태로 시각화' },
    { id: 'side-by-side', label: '좌우 분할', description: '내용을 두 영역으로' },
  ];
}
