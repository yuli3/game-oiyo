# 외부 웹게임 포털 패키지

`public/prototypes/*-unity/` Unity WebGL 빌드를 CrazyGames·itch.io·GameDistribution 같은 외부 포털에 올릴 수 있는 zip으로 묶는다. 사이트 빌드 자체는 건드리지 않는다.

```bash
node scripts/portal/package-portal.mjs                 # 전부, dist-portal/ 에 생성
node scripts/portal/package-portal.mjs snowman-stack   # 일부만
node scripts/portal/package-portal.mjs --out <폴더>
```

게임마다 `<slug>.zip`(index.html이 zip 맨 위), `listing.md`(포털 입력 칸에 붙일 제목·설명·조작·태그), 표지 4종(`cover-1920x1080` 등, ImageMagick 필요)을 만든다. `portal-report.json`에 크기와 점검 결과가 남고, 하나라도 실패하면 종료 코드 1이다.

## 복사본에서 바뀌는 것

- game.oiyo.net 페이지와만 통신하는 `unity-frame-bridge.js`를 뺀다.
- 터치 패드(`unity-touch-pad.js`)를 index.html 옆에 두고 빌드 이름을 직접 알려 준다. 포털 주소에는 `/prototypes/<빌드>/`가 없기 때문이다.
- `?lang=`이 없으면 브라우저 언어로 채운다. 일부 빌드는 `?lang=` 없이 열면 한국어로 시작한다.
- `<title>`에서 ` · OIYO`를 뺀다.

## 목록 규칙 (`portal-catalog.json`)

- 이름과 설계가 우리 것인 게임만 넣는다. 상용 게임을 따라 만든 빌드(폴더 이름에 상용 게임 이름이 들어간 것)는 포털 심사·상표 문제로 넣지 않는다.
- 조작 설명은 `src/data/game-guides.ts`의 `how.en`을 그대로 쓴다. 손으로 쓰지 않는다.
- 스테이지 수처럼 빌드가 바뀌면 틀려지는 숫자는 설명에 쓰지 않는다.
- 표지가 어색하면 `cover`에 `public/` 기준 경로를 적어 바꾼다.

## 포털별 메모 (2026-11-24 확인)

- CrazyGames: 독점 아님. 기본 출시(Basic Launch)는 SDK 없이 올리고 지표를 본 뒤, 정식 출시(Full Launch)부터 SDK 연동과 광고 수익 배분. 첫 다운로드 50MB, 전체 250MB 이하. 정산은 Tipalti(월 1회, €100 이상).
- itch.io: HTML zip 업로드, 기부·가격 설정 가능.
