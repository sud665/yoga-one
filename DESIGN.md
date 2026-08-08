---
version: beta
name: Yoga-One-Design
description: |
  요가원 관리 모바일 앱(Expo/React Native — 2026-08-02 웹 폐기, 앱 온리 전환)을 위한 디자인 시스템.
  실사용 구현은 이 Next.js 앱의 app/globals.css `@theme` 블록이 1:1 소스다(별도 Expo 클라이언트는
  expo-native-app 브랜치에 보존되어 있고 이 문서를 따라가지 않는다).

  2026-08-08 3차 개정 — **"Classical" 포리스트 그린 패스.** 전판(세이지 리브랜드)은 순백+근흑
  관리도구 인상을 세이지 그린 하나로 풀었다. 이번 개정은 Claude Design으로 제작한 21개 화면
  프로토타입을 그대로 들여오며 세 가지를 더 바꾼다: ① 유일한 액센트가 세이지(#6B8F71 계열)에서
  더 깊은 포리스트 그린(#1F3A2E)으로 이동, ② 캔버스 하나로 카드까지 겸하던 1레이어 구조가
  웜 그레이지 페이지 위에 흰 표면이 뜨는 2레이어 구조로 바뀌고 그 흰 표면에 옅은 그림자가 붙는다
  (전판·전전판이 지켜온 "그림자 시스템 전체에 하나도 없다" 원칙의 명시적 폐기), ③ 타이포가
  Inter 단일 체제에서 Pretendard Variable(본문·UI 전체) + Gowun Batang(로그인류 대형 헤드라인
  전용 명조)로 바뀐다. 절제 원칙 중 살아남는 것과 폐기되는 것은 아래 각 섹션에 명시한다.

  admin-sidebar 어휘는 웹 시절의 것으로 현재 클라이언트에는 대응물이 없다(원장 nav는 하단 탭 5개).

colors:
  brand: "#6B8F71"
  brand-deep: "#1F3A2E"
  brand-pressed: "#2A4A38"
  brand-tint: "#E8F0E9"
  ink: "#1E221C"
  on-ink: "#FFFFFF"
  on-brand: "#FFFFFF"
  canvas: "#EFEEEC"
  surface: "#FFFFFF"
  surface-soft: "#F4F4F2"
  surface-strong: "#E5E4E1"
  body: "#3A4038"
  muted: "#6F746A"
  hairline: "#E6E4E0"
  hairline-soft: "#F1F0EE"
  success: "#1B7043"
  success-tint: "#E6F2EA"
  warning: "#8A5A00"
  warning-tint: "#FAEFD9"
  danger: "#AA2D00"
  danger-tint: "#F6E8E3"
  info: "#1B61C9"
  info-tint: "#E8F0FC"
  tag-peach: "#FCAB79"
  tag-mint: "#A8D8C4"
  tag-mustard: "#D9A441"
  tag-cream: "#F5E9D4"

typography:
  headline-lg:
    fontFamily: Gowun Batang
    fontSize: 34px
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Gowun Batang
    fontSize: 26px
    fontWeight: 400
    lineHeight: 1.35
    letterSpacing: -0.019em
  display-lg:
    fontFamily: Pretendard Variable
    fontSize: 34px
    fontWeight: 680
    lineHeight: 1
    letterSpacing: -0.042em
  heading-lg:
    fontFamily: Pretendard Variable
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: -0.028em
  heading-md:
    fontFamily: Pretendard Variable
    fontSize: 16px
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: -0.028em
  body-md:
    fontFamily: Pretendard Variable
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: -0.019em
  body-strong:
    fontFamily: Pretendard Variable
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: -0.019em
  button:
    fontFamily: Pretendard Variable
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: -0.019em
  label:
    fontFamily: Pretendard Variable
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: -0.015em
  caption:
    fontFamily: Pretendard Variable
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: -0.008em
  utility-xs:
    fontFamily: Pretendard Variable
    fontSize: 11px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: -0.008em

rounded:
  none: 0px
  input: 12px
  button: 12px
  card: 16px
  full: 9999px

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 40px
  section: 48px

elevation:
  elev-1: "0 1px 1px rgba(20,24,20,.04), 0 2px 6px -2px rgba(20,24,20,.07)"
  elev-2: "0 1px 2px rgba(20,24,20,.05), 0 12px 28px -10px rgba(20,24,20,.18)"
  accent: "0 2px 5px rgba(31,58,46,.22), 0 8px 18px -8px rgba(31,58,46,.38)"

components:
  button-primary:
    backgroundColor: "{colors.brand-deep}"
    textColor: "{colors.on-brand}"
    typography: "{typography.button}"
    rounded: "{rounded.button}"
    padding: 12px 20px
    height: 44px
    elevation: "{elevation.accent}"
  button-primary-active:
    backgroundColor: "{colors.brand-pressed}"
    textColor: "{colors.on-brand}"
    rounded: "{rounded.button}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.button}"
    padding: 12px 20px
    height: 44px
    border: "1px solid {colors.hairline}"
  button-danger:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.danger}"
    typography: "{typography.button}"
    rounded: "{rounded.button}"
    padding: 12px 20px
    height: 44px
    border: "1px solid {colors.danger}"
  button-icon-circular:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    size: 40px
    border: "1px solid {colors.hairline}"
  text-input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.input}"
    padding: 10px 14px
    height: 44px
    border: "1px solid {colors.hairline}"
  text-input-focus:
    border: "1px solid {colors.brand-deep}"
    rounded: "{rounded.input}"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.card}"
    border: "1px solid {colors.hairline}"
    elevation: "{elevation.elev-1}"
  card-brand:
    backgroundColor: "{colors.brand-deep}"
    textColor: "{colors.on-brand}"
    typography: "{typography.heading-lg}"
    rounded: "{rounded.card}"
  session-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.card}"
    border: "1px solid {colors.hairline}"
    elevation: "{elevation.elev-1}"
  quick-action-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.card}"
    border: "1px solid {colors.hairline}"
    elevation: "{elevation.elev-1}"
  status-badge:
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: 4px 10px
  tag-chip:
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: 4px 10px
  page-header-badge:
    backgroundColor: "{colors.brand-tint}"
    textColor: "{colors.brand-deep}"
    size: 38px
    iconSize: 19px
  app-tabs:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.muted}"
    activeTextColor: "{colors.brand-deep}"
    activeBackgroundColor: "{colors.brand-tint}"
    typography: "{typography.caption}"
    border: "1px solid {colors.hairline}"
    elevation: "{elevation.elev-2}"
  toast:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.card}"
    border: "1px solid {colors.hairline}"
    elevation: "{elevation.elev-2}"
  skeleton:
    backgroundColor: "{colors.hairline-soft}"
    rounded: "{rounded.card}"
  empty-state:
    backgroundColor: "{colors.surface-soft}"
    textColor: "{colors.ink}"
    typography: "{typography.heading-md}"
    rounded: "{rounded.card}"
    border: "1px solid {colors.hairline}"
  focus-ring:
    color: "{colors.brand-deep}"
    width: 2px
    offset: 2px
---

## Overview

구조 문법(헤어라인 경계, 크기·대비 기반 타이포 위계)은 Airtable 분석에서 계승한 것을 유지하지만,
이번 패스는 전판이 지켰던 두 원칙을 의도적으로 깬다 — 캔버스 1레이어와 무그림자. 네 가지 축:

1. **포리스트 그린이 유일한 브랜드 전압.** `{colors.brand}`(#6B8F71, 세이지)는 이제 장식용
   레거시 마커 하나(달력의 "수업 있음" 점)로만 남고, CTA·활성 상태·포커스 링·아이콘 배지는 전부
   `{colors.brand-deep}`(#1F3A2E, 포리스트 그린)가 담당한다. 대비가 검증된 짙은 색 하나로
   텍스트/CTA/아이콘을 전부 처리한다는 점에서 이전 세이지 체계보다 오히려 단순해졌다 — "밝은 색은
   장식만, 짙은 색은 텍스트도"라는 2단 대비 분리가 이번 패스엔 없다.
2. **캔버스가 2레이어로 갈라진다.** 전판까지는 `{colors.canvas}` 하나가 페이지 배경이자 카드·
   인풋·버튼·내비게이션 배경이었다. 이번 패스는 웜 그레이지 페이지(`{colors.canvas}`, #EFEEEC)
   위에 흰 표면(`{colors.surface}`, #FFFFFF — 신규 토큰)이 뜨는 구조다. 헤어라인만으로 표면을
   가르던 이전 규칙은 유지하되, 그 위에 옅은 앰비언트 그림자 한 겹을 더한다(아래 Elevation 참고).
3. **그림자가 시스템에 들어온다.** 두 판 전부터 이어온 "그림자 시스템 전체에 하나도 없다" 규칙은
   이번 패스로 폐기된다. 표면이 캔버스와 다른 색을 갖게 된 이상, 흰 표면에 최소한의 그림자를
   주는 쪽이 헤어라인만으로 반사되는 것보다 실제로 더 차분하게 읽힌다 — 볼드·원색 없이도 깊이를
   표현하는 수단이 하나 늘었다고 보는 편이 정확하다.
4. **타이포가 두 서체로 갈라진다.** Inter는 한글 글리프가 아예 없는 서체였다 — 이 앱의 모든
   한글 텍스트는 지금까지 `Inter`가 아니라 그 뒤의 시스템 폴백으로 조판되고 있었다(눈에 보이지
   않던 실질적 공백). 이번 패스는 본문·UI 전체를 Pretendard Variable로 옮겨 그 공백을 메우고,
   로그인류 대형 헤드라인에만 Gowun Batang 명조를 얹는다. 명조는 무게가 아니라 크기·자간으로
   존재감을 낸다 — `headline-*` 토큰은 전부 400(레귤러) 고정이다.

**유지하는 절제 원칙**: 헤어라인이 여전히 1차 경계 장치다(그림자는 그 위에 얹는 보조 장치이지
대체재가 아니다). 화면당 "전압" 표면(card-brand, primary 버튼)은 1-2개로 제한한다. 컬러 블록을
남발하는 순간 포리스트 그린도 이전 세이지·전판의 파랑만큼 시끄러워진다.

## Colors

### Brand
- **Brand Deep** (`{colors.brand-deep}` #1F3A2E): 실질적으로 유일한 액센트. primary CTA 배경,
  링크·활성 탭 텍스트/배경, 포커스 링, 아이콘 배지의 아이콘 색, 긍정 선택 상태 전부. 흰 텍스트·
  캔버스 위 텍스트 모두 넉넉히 AA를 통과한다(짙은 포리스트 그린이라 세이지보다 대비 여유가 크다).
- **Brand Pressed** (`{colors.brand-pressed}` #2A4A38): primary 눌림 상태.
- **Brand Tint** (`{colors.brand-tint}` #E8F0E9): 아이콘 배지 배경, 활성 탭/칩/세그먼트 배경,
  선택 상태 하이라이트. 전판과 정확히 같은 값 — 세이지 시절부터 쓰던 옅은 민트 틴트가 액센트가
  바뀐 뒤에도 그대로 어울려서 유지했다.
- **Brand** (`{colors.brand}` #6B8F71): 더 이상 일반 장식색이 아니다. 유일하게 살아남은 용도는
  `SessionCalendar`의 "이 날짜에 수업 있음" 점 마커(선택되지 않은 상태) 하나뿐 — 새 액센트가
  거기까지 칠하면 선택 표시와 헷갈리기 때문에 옛 세이지를 보조 마커로 남겨뒀다. 새 화면에서
  장식용 큰 면에 쓰지 않는다.

### Neutral — 2레이어
- **Canvas** (`{colors.canvas}` #EFEEEC): 페이지 배경 전용. 앱 셸 프레임(`app/layout.tsx`의
  `max-w-md` 래퍼)과 `<body>`만 이 색을 쓴다.
- **Surface** (`{colors.surface}` #FFFFFF, 신규): 카드·인풋·버튼·내비게이션·시트·토스트 등
  "콘텐츠를 담는 표면"은 전부 이 흰색이다. canvas 위에 뜨는 층이라는 뜻에서 대개
  `{elevation.elev-1}`이나 `{elevation.elev-2}`를 동반한다.
- **Surface Soft** (`{colors.surface-soft}` #F4F4F2): 빈 상태, 옅은 안내 박스, 호버 배경 — 그림자
  없이 캔버스보다 한 톤 밝은 정도로만 존재감을 낸다.
- **Surface Strong** (`{colors.surface-strong}` #E5E4E1): 비활성·중립 배지/필 배경.
- **Ink** (#1E221C) / **Body** (#3A4038) / **Muted** (#6F746A): 텍스트 3단계 — 값 불변. 전판의
  모스 언더톤 근흑이 포리스트 그린과도 잘 맞아 그대로 가져왔다.
- **Hairline** (#E6E4E0) / **Hairline Soft** (#F1F0EE): 경계선과 스켈레톤. 새 캔버스 톤에 맞춰
  살짝 재조정.

### Semantic — 성공 · 경고 · 실패

**값이 완전히 그대로다.** 브랜드 색이 바뀌어도 상태색은 브랜드와 독립적이어야 한다는 전판의
결정이 이번 개정에서도 그대로 옳았다 — 새 디자인 소스의 모든 성공/경고/실패 hex를 대조한 결과
바이트 단위로 동일했다.

| 상태 | 색 | tint |
|---|---|---|
| **Success** | `#1B7043` | `#E6F2EA` |
| **Warning** | `#8A5A00` | `#FAEFD9` |
| **Danger** | `#AA2D00` | `#F6E8E3` |

- **Info** (#1B61C9) — 여전히 역할 축소된 유산 토큰. 새 화면의 기본 선택지가 아니다.

**색만으로 상태를 전달하지 않는다** 원칙도 불변 — 상태 배지·토스트는 항상 아이콘을 동반한다.

## Icons

**lucide-react**, 불변. 크기·스트로크 관례도 그대로: nav·퀵액션 20px(`h-5 w-5`), 버튼·배지
16px(`h-4 w-4`), 배지 내부 14px(`h-3.5 w-3.5`), 본문 stroke-width 1.75 / 작은 배지 2.25.

**신규 관례 — 페이지 헤더 배지.** `{components.page-header-badge}`: 38px `rounded-full
bg-brand-tint` 원 안에 19px 아이콘(`text-brand-deep`, stroke-width 1.75), `<h1>` 옆에 나란히.
이 시스템에서 아이콘이 제목과 짝을 이루는 유일한 자리이며, 화면이 무엇에 관한 것인지 텍스트보다
먼저 눈에 들어오게 한다. 회원 탈퇴 등 파괴적 흐름은 같은 크기를 유지하되 danger 톤
(`bg-danger-tint`/`text-danger`)으로 바꾼다. 회원 본인의 대시보드만 예외 — 이 배지 대신 본인
이니셜 아바타(같은 크기, 같은 tint)를 쓴다: "이 화면은 무엇에 관한 화면인가"가 아니라 "이건
당신의 화면입니다"를 말해야 하는 유일한 자리이기 때문이다.

### Tag (클래스 타입 라벨)
tag-peach/mint/mustard/cream 파스텔 4색 유지 — 시간표 필터 칩, 클래스 타입 라벨 전용. 공지사항의
"고정" 표시는 이 파스텔 태그가 **아니다** — brand-tint/brand-deep 페어를 쓴다(상태가 아니라
분류지만, 새 디자인 소스가 명시적으로 그렇게 그렸다). 텍스트는 전부 `{colors.ink}`.

## Typography

**두 서체.** 본문·UI 전체는 **Pretendard Variable**(가변 폰트, 실제 사용 웨이트는 400/500/600만),
로그인류 대형 헤드라인만 **Gowun Batang**(명조, 400 하나만 로드 — 원본 디자인이 700도 불러오지만
실사용처가 없어 400만 가져왔다). Inter는 완전히 제거했다 — 애초에 한글 글리프가 없어 이 앱의
한글 텍스트에는 한 번도 적용된 적이 없었고(시스템 폰트로 조용히 폴백), 새 디자인 소스도 CSS에서
import만 하고 실제로 어디에도 참조하지 않는다(grep으로 확인).

| Token | Size | Weight | Family | Use |
|---|---|---|---|---|
| headline-lg | 34px | 400 | Gowun Batang | 로그인/가입/온보딩/초대/이메일·비밀번호 찾기 헤드라인 |
| headline-md | 26px | 400 | Gowun Batang | 짧은 중앙정렬 헤드라인 (비밀번호 재설정 완료, 접근 불가) |
| display-lg | 34px | 680 | Pretendard | 큰 숫자 표시 (회원 대시보드 D-day) |
| heading-lg | 24px | 600 | Pretendard | 페이지 타이틀 (아이콘 배지와 짝) |
| heading-md | 16px | 600 | Pretendard | 카드/섹션 타이틀 |
| body-md | 14px | 400 | Pretendard | 본문 |
| body-strong | 14px | 500 | Pretendard | 목록 항목, 클래스명 |
| button | 14px | 500 | Pretendard | 버튼 라벨 |
| label | 13px | 500 | Pretendard | 폼 라벨 |
| caption | 12px | 500 | Pretendard | 부제, 배지, 칩 |
| utility-xs | 11px | 500 | Pretendard | 타임스탬프, 탭 라벨 |

**크기가 무게를 정한다.** 전판의 "display까지 500이 최대"는 폐기됐다 — heading-lg/md는 이번
패스에서 600으로 올라간다. 다만 `headline-*`(명조)는 예외: 크든 작든 400 고정이다. 명조는 무게가
아니라 서체 자체와 자간으로 무게감을 낸다는 것이 원본 디자인의 명시적 결정이다. 본문·라벨·캡션은
그대로 가벼운 무게를 유지한다 — "작은 글자는 조용히"는 전판과 같다.

**자간이 전부 음수로 좁아진다.** 전판은 모든 토큰이 `letterSpacing: 0`이었다. 한글 UI에서 살짝
좁힌 자간은 글자 사이가 조밀해 보이는 걸 방지하는 실용적 조정이며, 원본 디자인의 크기별 자간
표를 토큰마다 구운 값으로 반영했다(원본은 이걸 raw 인라인 스타일 전체에 CSS 속성-선택자 훅으로
사후 강제하는 방식을 쓰는데, 그건 그 프로토타입 툴 특유의 기법이라 토큰화된 리액트 코드로는
그대로 옮기지 않고 최종 결과값만 각 토큰에 직접 굽는다).

## Elevation & Depth

| Level | Treatment | Use |
|---|---|---|
| 0 — Flat | 보더 없음 | 페이지 배경(canvas) |
| 1 — Hairline | 1px `{colors.hairline}` | 여전히 1차 경계 장치. surface-soft(빈 상태, 안내 박스)는 이 레벨에 머물고 그림자를 받지 않는다. |
| 2 — Surface shadow | `{elevation.elev-1}` | `{colors.surface}`(흰색) 표면 전부 — Card, 목록 컨테이너, 검색바, 캘린더. |
| 3 — Chrome shadow | `{elevation.elev-2}` | 더 도드라져야 하는 크롬 — 하단 탭 바, 바텀시트, 토스트. |
| 4 — Brand block | `{colors.brand-deep}` 배경 | card-brand, primary 버튼(+ `{elevation.accent}` 그린 틴트 그림자) — 화면당 1-2개 |

전판·전전판의 "그림자는 시스템 전체에 단 하나도 없다"는 이번 패스로 폐기된다. 흰 표면이
캔버스와 분리되는 순간부터는 헤어라인 하나로 버티는 것보다 옅은 앰비언트 그림자를 더하는 쪽이
차분하게 읽힌다 — 원본 디자인이 인풋에 주는 극도로 미세한 inset 그림자는 의도적으로 들여오지
않았다(거의 안 보이는 수준이고 브라우저 자동완성 스타일과 부딪힐 위험이 더 크다). 상태바 높이에
맞춘 원본의 페이지 상단 패딩(82px→70px) 같은 프로토타입 전용 수치도 들여오지 않는다 — 이 앱은
실제 상태바가 없는 반응형 PWA다.

## Shapes

| Token | Value | Use |
|---|---|---|
| none | 0px | 탭 바 등 화면 폭에 붙는 구조 크롬 |
| input | 12px | 텍스트 인풋 — 전판 8px에서 button과 같은 값으로 통합 |
| button | 12px | 모든 CTA — 알약형 아님 |
| card | 16px | 데이터 컨테이너 전부 — 전판 14px에서 소폭 확대 |
| full | 9999px | 상태 배지, 태그 칩, 요일 칩, 아바타, 페이지 헤더 배지 — 작은 원형 요소 전용 |

3단 스케일(input 8 / button 12 / card 14)이 2단(control 12 / surface 16)으로 정리됐다 — input과
button이 이제 같은 값이라 실질적으로 "컨트롤 vs 표면" 두 단계다.

## Components

### Buttons
- **button-primary** — 화면당 1순위 액션 하나. `{colors.brand-deep}` 배경 + 흰 라벨 +
  `{elevation.accent}`(포리스트 그린 틴트 그림자 — 채워진 CTA가 캔버스 위에서 살짝 뜨는 느낌).
- **button-secondary** — `{colors.surface}` 배경(전판은 canvas) + hairline 보더 + 잉크 라벨.
- **button-danger** — surface 배경, danger 보더/라벨. 배경을 채우지 않는다.
- **button-icon-circular** — hairline 보더 + full 라운드, 40px, surface 배경.

### Inputs
- **text-input / text-input-focus** — 44px, surface 배경(전판은 canvas), hairline 보더, 포커스 시
  `{colors.brand-deep}` 보더. 라운드가 12px로 커졌다(전판 8px).
- **field-label** — 프로필처럼 값이 미리 채워진 폼에만. 그 외는 placeholder만으로 식별.

### Cards & Signals
- **card** — 범용 컨테이너. surface + hairline + 16px + `{elevation.elev-1}`.
- **card-brand** — 화면당 1-2개 제한의 "전압" 표면. `{colors.brand-deep}` 배경 + 흰 타이포. 값
  불변, 배경 hex만 세이지에서 포리스트로.
- **status-badge** — full 라운드 + 톤별 tint 배경, 값 불변(성공/경고/실패는 안 바뀌었다).
- **tag-chip** — 파스텔 tag 배경 + 잉크 텍스트. "고정" 같은 분류 배지는 여기 안 들어간다(Icons
  섹션의 태그 규칙 참고).
- **page-header-badge** — 신규. 아이콘 배지 + `<h1>`, Icons 섹션에 상세.

### Navigation

세 역할이 같은 어휘를 쓰되 화면 수만큼만 쓴다. 768px 미만은 하단 탭 바, 이상은 원장만
사이드바이고 나머지 둘은 상단 바다.

| 역할 | 탭 | 데스크톱 |
|---|---|---|
| 원장 | 대시보드 · 시간표관리 · **인력관리▴** · 예약현황 · **내 정보▴** | 240px 사이드바 |
| 회원 | 대시보드 · 일정 · 내 예약 · 채팅 · 프로필 | 상단 바 |
| 강사 | 내 수업 · 채팅 · 프로필 | 상단 바 |

- **app-tabs** — 하단 탭 바 64px. `{colors.surface}` 배경(전판 canvas) + `{elevation.elev-2}`.
  활성 탭은 전판의 "상단 2px 보더 바" 방식을 버리고, 아이콘+라벨을 감싸는 `rounded-button`
  배경 필로 바뀐다 — `{colors.brand-tint}` 배경 + `{colors.brand-deep}` 텍스트/아이콘. 보더
  스트라이프는 완전히 사라진다.
- **app-tabs-sheet (▴)** — 자식이 있는 탭. 탭 자체는 이동하지 않고 하단 시트를 연다(surface +
  `rounded-t-card`). 라벨 옆 위쪽 셰브론이 유일한 예고 신호.
- **app-nav-top** — 56px, 하단 hairline, 활성 항목은 하단 2px `{colors.brand-deep}` 보더 유지
  (탭 바와 달리 이 상단 바는 필 배경으로 바꾸지 않는다 — 채팅방 헤더처럼 좁은 바에서 필 배경은
  비집고 들어갈 자리가 없다).
- 아이콘은 역할이 아니라 **의미**로 고른다(대시보드=LayoutDashboard, 일정=CalendarDays,
  예약=ClipboardList, 내 수업=ClipboardCheck, 프로필=CircleUser).

### Sign-out
- **sign-out** — 라벨 + LogOut 글리프, `{colors.muted}`, 버튼 얼굴 없음. 자리는 프로필 화면
  하단 하나뿐(원장 데스크톱 사이드바 최하단은 예외).

## Feedback & States

- **toast** — surface + hairline + 16px + `{elevation.elev-2}`, 톤별 좌측 액센트(긍정 brand-deep
  / 실패 danger / 중립 ink).
- **skeleton** — hairline-soft 배경.
- **empty-state** — surface-soft + hairline, 그림자 없음. "없음"이 아니라 다음 행동을 안내한다.
- **focus-ring** — `{colors.brand-deep}` 2px, 오프셋 2px.
- **Reduced Motion** — 시스템 설정 시 전환 duration 0.

## Do's and Don'ts

### Do
- 화면당 primary(포리스트 그린 CTA)는 하나. 나머지는 secondary.
- 긍정 상태(확정·출석·유효)는 success 그린으로 — brand-deep과 혼동하지 않는다(둘은 이제 색조차
  다르다: 브랜드는 포리스트, success는 좀 더 밝고 채도 높은 초록).
- 흰 표면(`surface`)에는 `elev-1`을, 캔버스·surface-soft에는 그림자를 얹지 않는다 — 그림자는
  "표면이 떠 있다"는 신호이지 장식이 아니다.
- 명조(headline-*)는 항상 400, 항상 중앙정렬 단일 컬럼 화면에만.
- canvas/surface/surface-soft/surface-strong의 웜 톤을 지킨다 — 순백·순흑·순회색을 새로 넣지 않는다.

### Don't
- card-brand와 primary 버튼을 한 화면에 3개 이상 쌓지 않는다.
- info 블루를 새 화면의 액센트나 포커스 색으로 쓰지 않는다(`ChatRoomScreen`이 과거 이 실수를
  했었다 — brand-deep으로 정정됨).
- 태그 파스텔을 본문 텍스트나 CTA에, 혹은 "고정" 같은 분류 배지에 쓰지 않는다.
- 아이콘 배지 크기(38px 원 / 19px 아이콘)를 화면마다 다른 임의값으로 재발명하지 않는다.
- full 라운드를 큰 버튼에 쓰지 않는다.

## Iteration Guide

1. 새 화면은 기존 어휘(card, status-badge, tag-chip, empty-state, page-header-badge)로 먼저
   조립을 시도한다.
2. 색·타이포는 토큰 참조로만 — 프로즈에 hex를 풀어쓰지 않는다.
3. 새 상태는 `-active`/`-focus` 엔트리로 추가한다.
4. "이 화면에서 brand-deep이 몇 번 등장하는가"를 셀 것 — 3번 이상이면 하나를 뺀다.

## Known Gaps

- 수강료관리 화면 어휘는 해당 스펙 진행 시 추가(채팅/공지사항/탈퇴/회원등록마법사는 이번 패스로
  정의 완료).
- 앱 아이콘·스플래시는 아직 Expo 기본 — 스토어 제출 전 포리스트 그린 브랜딩으로 교체 필요.
- 다크 모드 없음 (라이트 온리 시스템 — 전판 결정 유지).
