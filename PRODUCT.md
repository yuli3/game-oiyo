# Game OIYO

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

브라우저에서 설치 없이 바로 시작하되, 한 번 소비하고 끝나는 미니게임보다 반복 숙련과 명확한 성취를 원하는 플레이어가 주 사용자다. 모바일 터치와 데스크톱 키보드 사용자를 함께 지원한다.

## Product Purpose

짧은 진입 시간 안에 규칙을 이해하고 다시 돌아와 더 잘하고 싶어지는 게임을 제공한다. 신규 게임 수를 늘리는 것보다 조작감, 반복 동기, 읽기 쉬운 상태 변화와 완성도를 우선한다.

## Positioning

`타임루프 구조대`의 고유 기제는 이전 루프의 자기 행동을 결정론적으로 재생해 혼자서 협동 퍼즐을 푸는 것이다. 잔상은 장식이나 임의 AI가 아니라 플레이어가 직접 만든 동료다.

## Operating Context

게임은 Game OIYO의 Astro·React 웹 코드베이스 안에서 실행된다. 첫 플레이는 60초 안팎이며 방향키·WASD 또는 화면 터치 조작을 사용한다. 결과는 루프 수, 시간, 동일 입력 replay 검증으로 비교한다.

## Capabilities and Constraints

- 규칙의 정본은 정수 좌표 기반 fixed-step TypeScript module이다.
- React/Canvas는 입력·표시 adapter이며 시뮬레이션 규칙을 소유하지 않는다.
- 기존 `ReplayEnvelope`, 기록, visibility pause 계약을 재사용한다.
- 공개 route, 판매 가격, 유통 채널은 아직 결정되지 않았다.
- 이미지 에셋은 Grok이 승인된 프롬프트로 제작한다. 선택 전에는 Canvas 도형을 사용한다.
- 문제·퀴즈·오답 해설 강화 작업과 무관하다.

## Brand Commitments

귀엽지만 유아용이 아닌 정예 구조대, 청록색 현재 시간·보라색 기록 시간·황색 구조 목표·붉은 위험의 의미 체계를 유지한다. 기존 유명 게임·영화·애니메이션 IP나 특정 작가의 화풍을 모방하지 않는다.

## Evidence on Hand

- 플레이 프로토타입: `prototypes/time-loop-rescue-playable.html`
- 결정론적 규칙: `src/lib/games/time-loop-rescue.ts`
- 엔진 결정: company-brain `projects/game/time-loop-rescue-engine-decision-2026-09-08.md`
- 실제 사용자 플레이 관측, 판매 전환, 가격 수용도 자료는 아직 없다.

## Product Principles

1. 작동 여부가 아니라 트리플A급으로 인지되는 조작감·연출·일관성으로 출시를 판정한다.
2. 첫 30초 안에 원인과 결과가 보여야 한다.
3. 실패는 재도전을 부르고, 반복은 숙련을 증명해야 한다.
4. 규칙은 결정론적이고 렌더러와 분리한다.
5. 판매 가능한 권리 안전성과 에셋 출처를 보존한다.

## Accessibility & Inclusion

키보드와 터치 입력, 44px 이상의 터치 목표, 화면 이탈 시 안전한 일시정지, reduced-motion 대체 표현, 색상 외 실루엣·형태 구분을 제공한다.
