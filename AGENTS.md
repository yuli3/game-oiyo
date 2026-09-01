# Game 작업 규칙

시작·안전·승인 계약은 `/Users/seuncho/coding/AGENTS.md`를 따른다. Astro/React 게임과 Lost Ark 도구의 저장소이며 Blog의 MDX·track/series/chapter·카탈로그를 복원하지 않는다.

## 구현

- 게임은 `src/components/games/`의 독립 컴포넌트, 정적 route는 `src/pages/[...lang]/`에 둔다. 공통 프레임은 `src/components/ui/game/GamePrimitives.tsx`를 재사용한다.
- 컴포넌트 COPY의 ko/en/ja/zh/fr/es를 함께 유지한다. zh는 간체이며 다른 언어에 KO/EN이 새지 않게 한다.
- AI 로직은 `src/lib/games/ai/`, 개인 기록 계약은 `src/lib/games/records.ts`와 해당 테스트가 정본이다. 현행 Workers 등 별도 기능의 존재를 확인하지 않고 “백엔드 없음”으로 가정하지 않는다.

## 개인 기록 보호

- 기존 localStorage 키·객체 모양을 재사용하거나 덮어써 기록을 버리지 않는다.
- GameRecord는 승/패/무, BestRecord는 서로 비교 가능한 value/unit, ConditionalBestRecord는 정확한 seed+difficulty+assist 조건에서만 비교한다. 조건 키와 내장 조건은 함께 검증하며 다른 cohort로 이관하지 않는다.
- StreakStats와 calendar-day DailyStreak는 별도 계약이다. 같은 날 반복은 streak를 늘리지 않고 누락일은 current만 초기화하며 best를 보존한다.
- 최근 플레이·PB 시각은 부가 저장소로 유지한다. 홈 win-rate는 data-game slug와 GameRecord를 읽으므로 형태를 보존한다.
- legacy per-game 키는 기존 fallback 이관을 유지하며 원본 키를 삭제하지 않는다.

## 검증

- 기본: `npm run type-check`, `npm run test -- --run`, `npm run validate:i18n`, `npm run build`, 이후 `npm run audit:localization`·`npm run audit:seo`.
- 기록 변경은 records.test.ts의 저장·일자 중복·누락일·게임 격리 계약을 반드시 통과시킨다.
- Vitest는 순수 게임 로직과 기록을 검증한다. 브라우저 상호작용 검증을 대신하지 않으므로 변경 화면을 별도로 확인한다.
- 명령은 package.json, 저장 키는 records.ts를 조회한다. 게임 수·테스트 수·과거 진행 상태를 여기에 복제하지 않는다.

- `public/_headers`를 건드리면 `npm run audit:headers-collision`을 함께 돌린다. **Cloudflare Pages는 매칭되는 규칙을 전부 적용하고 같은 헤더를 이어 붙인다**(교체가 아니다). 넓은 규칙(`/*`)에 Cache-Control을 두면 자산별 정책과 충돌해 `max-age`가 두 개인 헤더가 나가고, RFC 9111이 반복 지시어 처리를 구현에 맡기므로 실효 정책이 모호해진다. 2026-09-01에 다섯 사이트 전부 그 상태였고 해시 자산의 1년 불변 캐시가 무효화돼 있었다. 캐시 정책은 좁은 경로에만 건다. 스크립트 정본은 `shared/scripts/`다.
