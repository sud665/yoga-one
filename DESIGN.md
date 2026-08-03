---
version: beta
name: Yoga-One-Design
description: |
  요가원 관리 모바일 앱(Expo/React Native — 2026-08-02 웹 폐기, 앱 온리 전환)을 위한 디자인 시스템.
  토큰은 src/constants/theme.ts에 1:1로 구현되어 있다.

  2026-08-02 2차 개정 — **세이지 브랜드 레이어 도입.** 이전 판(Airtable-에디토리얼)은 순백 캔버스 +
  근흑 잉크 + 블루 포커스만으로 구성된 순수 관리도구 문법이었고, 사용자 피드백이 정확히 그 지점을
  찔렀다: "너무 검은색 흰색만 있다, 관리 프로그램 같다, 회원도 쓰는 앱이다." 이번 개정은 절제 원칙
  (헤어라인 경계, 그림자 없음, 볼드 없음, 화면당 전압 1-2개)은 그대로 두고 그 위의 온도만 바꾼다:
  ① 순백 캔버스 → 웜 화이트/샌드, ② 잉크의 블루 언더톤 → 모스(이끼) 언더톤, ③ 유일한 액센트를
  블루(info)에서 세이지 그린(brand)으로 교체하고 CTA가 잉크 블록 대신 세이지를 입는다.
  Airtable에서 가져온 구조 문법은 유지하되, 색의 세계는 이제 요가원의 것(세이지·샌드·리넨)이다.

  admin-sidebar 어휘는 웹 시절의 것으로 현재 클라이언트에는 대응물이 없다(원장 nav는 하단 탭 5개).

colors:
  brand: "#6B8F71"
  brand-deep: "#4F6D55"
  brand-pressed: "#405C46"
  brand-tint: "#E8F0E9"
  ink: "#1E221C"
  on-ink: "#FFFFFF"
  on-brand: "#FFFFFF"
  canvas: "#FBFAF7"
  surface-soft: "#F6F3EC"
  surface-strong: "#E3E1D8"
  body: "#3A4038"
  muted: "#6F746A"
  hairline: "#E1DED4"
  hairline-soft: "#EDEAE1"
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
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: 0
  heading-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: 0
  heading-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0
  body-strong:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: 0
  button:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0
  label:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0
  utility-xs:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0

rounded:
  none: 0px
  input: 8px
  button: 12px
  card: 14px
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

components:
  button-primary:
    backgroundColor: "{colors.brand-deep}"
    textColor: "{colors.on-brand}"
    typography: "{typography.button}"
    rounded: "{rounded.button}"
    padding: 12px 20px
    height: 44px
  button-primary-active:
    backgroundColor: "{colors.brand-pressed}"
    textColor: "{colors.on-brand}"
    rounded: "{rounded.button}"
  button-secondary:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.button}"
    padding: 12px 20px
    height: 44px
    border: "1px solid {colors.hairline}"
  button-danger:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.danger}"
    typography: "{typography.button}"
    rounded: "{rounded.button}"
    padding: 12px 20px
    height: 44px
    border: "1px solid {colors.danger}"
  button-icon-circular:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    size: 40px
    border: "1px solid {colors.hairline}"
  text-input:
    backgroundColor: "{colors.canvas}"
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
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.card}"
    border: "1px solid {colors.hairline}"
  card-brand:
    backgroundColor: "{colors.brand-deep}"
    textColor: "{colors.on-brand}"
    typography: "{typography.heading-lg}"
    rounded: "{rounded.card}"
  session-card:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.card}"
    border: "1px solid {colors.hairline}"
  quick-action-card:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.card}"
    border: "1px solid {colors.hairline}"
  status-badge:
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: 4px 10px
  tag-chip:
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: 4px 10px
  app-tabs:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.muted}"
    activeTextColor: "{colors.brand-deep}"
    typography: "{typography.caption}"
    border: "1px solid {colors.hairline}"
  toast:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.card}"
    border: "1px solid {colors.hairline}"
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

구조 문법(헤어라인 경계, 무그림자, 크기·대비 기반 타이포 위계)은 Airtable 분석에서 계승한 것을
유지하고, 색의 세계를 요가원의 것으로 교체한 시스템이다. 세 가지 축:

1. **웜 캔버스.** 순백(#FFFFFF)이 아니라 웜 화이트 `{colors.canvas}`(#FBFAF7) 위에서 모든 화면이
   시작한다. 보조 표면은 샌드 `{colors.surface-soft}`(#F6F3EC). "관리 프로그램" 인상의 근원이
   순백+순흑 조합이었으므로, 배경의 온도가 이 시스템에서 가장 큰 한 수다.
2. **세이지가 유일한 브랜드 전압.** `{colors.brand}`(#6B8F71) 계열이 CTA·활성 상태·긍정 신호를
   전부 담당한다. 텍스트/작은 요소에는 대비가 검증된 `{colors.brand-deep}`(#4F6D55, 캔버스 위
   ≈5.4:1·화이트 위 ≈4.9:1)를 쓰고, 밝은 `{colors.brand}`는 장식·아이콘·큰 면에만 쓴다.
   이전 판의 블루(`info`)가 맡던 인터랙티브 액센트 역할은 전부 brand로 이관됐다.
3. **잉크는 모스 언더톤.** `{colors.ink}`(#1E221C)는 블루가 아니라 이끼 쪽으로 기운 근흑이라
   세이지·샌드와 같은 온도에서 섞인다. 잉크는 이제 텍스트와 아이콘의 색이지, CTA의 색이 아니다.

**유지하는 절제 원칙** (전판 그대로): 헤어라인 1px가 1차 경계 장치이고 리터럴 그림자는 시스템에
하나도 없다. 볼드(600+)도 없다 — display까지 500이 최대. 화면당 "전압" 표면(card-brand, primary
버튼)은 1-2개로 제한한다. 컬러 블록을 남발하는 순간 세이지도 관리툴의 파랑만큼 시끄러워진다.

## Colors

### Brand
- **Brand** (`{colors.brand}` #6B8F71): 세이지 그린. 큰 면(브랜드 카드의 장식, 아이콘, 활성 보더),
  일러스트성 요소. 흰 텍스트를 얹기엔 대비가 부족하므로(≈3.3:1) 텍스트가 올라가는 면에는 쓰지 않는다.
- **Brand Deep** (`{colors.brand-deep}` #4F6D55): 실무의 주인공. primary CTA 배경, 링크·활성 탭
  텍스트, 포커스 링, 긍정 배지 텍스트. 흰 텍스트(4.9:1)와 캔버스 위 텍스트(5.4:1) 모두 AA 통과.
- **Brand Pressed** (`{colors.brand-pressed}` #405C46): primary 눌림 상태.
- **Brand Tint** (`{colors.brand-tint}` #E8F0E9): 활성 탭/칩/세그먼트 배경, 긍정 배지 배경,
  선택 상태 하이라이트.

### Neutral
- **Canvas** (#FBFAF7): 모든 페이지 배경. / **Surface Soft** (#F6F3EC): 빈 상태, 보조 표면.
- **Surface Strong** (#E3E1D8): 비활성·중립 강조 표면.
- **Ink** (#1E221C) / **Body** (#3A4038) / **Muted** (#6F746A): 텍스트 3단계. 전부 모스/그레이지
  언더톤 — 순수 무채색을 쓰지 않는다.
- **Hairline** (#E1DED4) / **Hairline Soft** (#EDEAE1): 경계선과 스켈레톤. 역시 웜 톤.

### Semantic — 성공 · 경고 · 실패

세 상태는 각각 **텍스트/아이콘 색 + 그 위에 얹히는 옅은 tint** 한 쌍이다. 모든 조합을 실제로 발생하는
두 방향(캔버스 위, 자기 tint 위)에서 WCAG AA(4.5:1) 기준으로 계산 검증했다.

| 상태 | 색 | tint | 캔버스 위 | tint 위 | 흰 글자 |
|---|---|---|---|---|---|
| **Success** | `#1B7043` | `#E6F2EA` | 5.84 | 5.30 | 6.10 |
| **Warning** | `#8A5A00` | `#FAEFD9` | 5.68 | 5.20 | 5.93 |
| **Danger** | `#AA2D00` | `#F6E8E3` | 6.52 | 5.70 | 6.81 |

- **Success** — 예약확정·출석·유효한 초대. **더 이상 브랜드 세이지와 같은 값이 아니다.** 둘을 합치는 건
  이론상 말이 됐지만("확정된 예약이 곧 브랜드의 순간") 화면에서 무너졌다: 세이지 "예약완료" 배지가
  세이지 "예약하기" 버튼 옆에 앉으면서 상태와 액션이 같은 색이 됐고 배지가 눌리는 것처럼 보였다.
  `#1B7043`은 더 깊고 채도 높은 초록이라 절제된 브랜드 세이지(`#4F6D55`)와 충분히 떨어져 **정보로
  읽히지 액션으로 읽히지 않는다.**
- **Warning** — 신설. 대기명단 상태가 그동안 `muted` 회색이었는데, 그건 "비활성"이라는 뜻이지 "당신은
  줄을 서 있다"가 아니다. 회원이 알아채야 하는 상태라 자기 색을 준다.
- **Danger** — 정원마감·취소·결석·파괴적 액션. 알람처럼 튀는 빨강이 아닌 차분한 산화철색이라 절제
  원칙과 맞고 세이지·샌드와 같은 온도에서 섞인다.
- **Info** (#1B61C9) — 역할 축소된 유산 토큰. 인터랙티브 액센트 자리는 brand가 가져갔고, 순수 정보성
  알림(Toast의 `info` 톤)에만 남는다. 신규 화면의 기본 선택지가 아니다.

**색만으로 상태를 전달하지 않는다.** 상태 배지와 토스트는 항상 아이콘을 동반한다 — 색맹 사용자나 흑백
출력에서도 상태가 읽혀야 한다. 이전의 작은 컬러 점(dot)은 색을 한 번 더 반복할 뿐 두 번째 채널이
아니었다.

## Icons

**lucide-react**. 이전엔 인라인 SVG를 직접 그렸는데 4개일 땐 괜찮았지만 10개로 늘면서 각각을 검토하고
서로 시각적 일관성을 유지하는 비용이 생겼다. 라이브러리는 그 일관된 손을 공짜로 주고, lucide의 얇은
기하학적 스트로크는 애초에 그 손그림들이 흉내내던 것이다.

- **크기**: nav·퀵액션 20px(`h-5 w-5`), 버튼·배지 16px(`h-4 w-4`), 배지 내부 14px(`h-3.5 w-3.5`).
- **스트로크**: 본문 맥락 1.75, 작은 배지 2.25(작을수록 굵게 해야 같은 무게로 보인다).
- **접근성**: 라벨이 옆에 있으면 아이콘은 항상 `aria-hidden` — 이름은 텍스트가 갖고 한 번만 읽힌다.
  아이콘만 있는 버튼은 `aria-label` 필수.
- **어디에 쓰나**: 글리프가 **관례로 굳은 액션**에만 — 추가(`Plus`), 복사(`Copy`), 공유(`Share2`),
  취소·닫기(`X`), 로그아웃(`LogOut`), 확인(`Check`). 도메인 고유 액션("대기 등록", "예약하기")에 아이콘을
  발명해 붙이면 해독할 게 하나 더 느는 것이라 **텍스트만 쓴다.**
- nav 아이콘은 `admin-nav.tsx`에서 의미 기반 별칭(`ScheduleIcon` 등)으로 재수출한다. 나중에 글리프를
  바꿀 때 소비처를 전부 고치지 않고 그 블록 한 줄만 고치면 된다.

### Tag (클래스 타입 라벨)
tag-peach/mint/mustard/cream 파스텔 4색 유지 — 시간표 필터 칩, 클래스 타입 라벨 전용.
텍스트는 전부 `{colors.ink}`. 본문·CTA 색으로 쓰지 않는다.

## Typography

**Inter** 하나. 앱에서는 `@expo-google-fonts/inter`의 `Inter_400Regular`/`Inter_500Medium` 두
패밀리로 로드한다(400/500만 실제로 사용 — 시스템에 볼드가 없다. RN은 커스텀 폰트의 fontWeight
매핑이 플랫폼마다 어긋나므로 weight를 패밀리 이름으로 고정한다).

| Token | Size | Weight | Use |
|---|---|---|---|
| display-lg | 32px | 500 | 로그인/온보딩 헤드라인 |
| heading-lg | 24px | 500 | 페이지 타이틀 |
| heading-md | 16px | 500 | 카드/섹션 타이틀 |
| body-md | 14px | 400 | 본문 |
| body-strong | 14px | 500 | 목록 항목, 클래스명 |
| button | 14px | 500 | 버튼 라벨 |
| label | 13px | 500 | 폼 라벨 |
| caption | 12px | 500 | 부제, 배지, 칩 |
| utility-xs | 11px | 500 | 타임스탬프, 탭 라벨 |

## Elevation & Depth

| Level | Treatment | Use |
|---|---|---|
| 0 — Flat | 보더 없음 | 페이지 배경, 탭 바 배경 |
| 1 — Hairline | 1px `{colors.hairline}` | **기본값.** 카드, 인풋, 탭 바 상단 경계, 빈 상태 |
| 2 — Brand block | `{colors.brand-deep}` 배경 | card-brand(대시보드 핵심 통계), primary CTA — 화면당 1-2개 |

그림자는 시스템 전체에 단 하나도 없다. 전판의 "잉크 블록" 전압은 "세이지 블록"으로 교체됐다 —
검정 대신 브랜드가 화면의 가장 무거운 표면이 된다.

## Shapes

| Token | Value | Use |
|---|---|---|
| none | 0px | 탭 바 등 화면 폭에 붙는 구조 크롬 |
| input | 8px | 텍스트 인풋 |
| button | 12px | 모든 CTA — 알약형 아님 |
| card | 14px | 데이터 컨테이너 전부 |
| full | 9999px | 상태 배지, 태그 칩, 요일 칩, 아바타 — 작은 원형 요소 전용 |

## Components

### Buttons
- **button-primary** — 화면당 1순위 액션 하나. `{colors.brand-deep}` 배경 + 흰 라벨.
  회원의 "예약하기", 원장의 "반복 수업 추가"가 이 얼굴이다. 잉크 배경 CTA는 폐기됐다.
- **button-secondary** — 캔버스 배경 + hairline 보더 + 잉크 라벨.
- **button-danger** — 캔버스 배경 + danger 보더/라벨. 배경을 채우지 않는다.
- **button-icon-circular** — hairline 보더 + full 라운드, 40px.

### Inputs
- **text-input / text-input-focus** — 44px, hairline 보더, 포커스 시 `{colors.brand-deep}` 보더.
- **field-label** — `{typography.label}` + `{colors.muted}`, 인풋 위 6px. 값이 미리 채워진 채
  열리는 폼(프로필)에만 쓴다. 그 외 폼은 placeholder만으로 식별한다 — 라벨과 placeholder를
  둘 다 두면 같은 말을 두 번 하는 셈이고, 기존 스펙들도 placeholder로 필드를 찾는다.

### Cards & Signals
- **card** — 범용 컨테이너. 캔버스 + hairline + 14px.
- **card-brand** — 소수의 강조 표면(대시보드 핵심 통계). `{colors.brand-deep}` 배경 + 흰 타이포.
  화면당 1-2개 제한은 전판의 card-ink 규칙을 그대로 승계.
- **status-badge** — full 라운드 + 톤별 tint 배경. 긍정(예약확정/출석/유효)은 brand-tint +
  brand-deep 텍스트, 부정은 danger 계열, 중립(대기)은 surface-strong + body.
- **tag-chip** — 파스텔 tag 배경 + 잉크 텍스트.

### Navigation

세 역할이 같은 어휘를 쓰되 화면 수만큼만 쓴다. 768px 미만은 하단 탭 바, 이상은
원장만 사이드바이고 나머지 둘은 상단 바다.

| 역할 | 탭 | 데스크톱 |
|---|---|---|
| 원장 | 대시보드 · 시간표관리 · **인력관리▴** · 예약현황 · **내 정보▴** | 240px 사이드바 |
| 회원 | 대시보드 · 일정 · 내 예약 · 프로필 | 상단 바 |
| 강사 | 내 수업 · 프로필 | 상단 바 |

- **app-tabs** — 하단 탭 바 64px. 캔버스 배경 + 상단 hairline, 활성 탭은 상단 2px
  `{colors.brand-deep}` 바 + 같은 색 아이콘/라벨. `env(safe-area-inset-bottom)`로
  홈 인디케이터를 피한다.
- **app-tabs-sheet (▴)** — 자식이 있는 탭. 탭 자체는 이동하지 않고 하단 시트를 연다.
  라벨 옆 위쪽 셰브론이 유일한 예고 신호이며, 사이드바 아코디언과 같은 글리프를 쓴다.
  탭 하나당 최소 폭은 375px ÷ 탭 수 ≥ 62px이어야 하고, "시간표관리"가 그 하한을
  정한다 — 6개부터는 평면으로 못 들어가므로 묶는다.
- **app-nav-top** — 56px, 하단 hairline, 활성 항목은 하단 2px `{colors.brand-deep}` 보더.
  탭 바와 같은 아이콘·라벨을 쓴다.
- 아이콘은 역할이 아니라 **의미**로 고른다. 같은 종류의 화면은 누가 보든 같은 글리프다
  (대시보드=LayoutDashboard, 일정=CalendarDays, 예약=ClipboardList, 내 수업=ClipboardCheck,
  프로필=CircleUser).

### Sign-out
- **sign-out** — 라벨 + LogOut 글리프, `{colors.muted}`, 버튼 얼굴 없음.
  **자리는 프로필 화면 하단 하나뿐이다**(원장 데스크톱 사이드바 최하단은 예외).
  상단 바 → 페이지 하단 푸터를 거쳐 여기로 왔다. 앞의 둘은 어쩌다 한 번 쓰는 출구에
  모든 화면의 고정 공간을 내주고 있었다.

## Feedback & States

- **toast** — 캔버스 + hairline + 14px, 톤별 좌측 액센트(긍정 brand / 실패 danger / 중립 ink).
- **skeleton** — hairline-soft 배경.
- **empty-state** — surface-soft + hairline. "없음"이 아니라 다음 행동을 안내한다.
- **focus-ring** — `{colors.brand-deep}` 2px, 오프셋 2px.
- **Reduced Motion** — 시스템 설정 시 전환 duration 0.

## Do's and Don'ts

### Do
- 화면당 primary(세이지 CTA)는 하나. 나머지는 secondary.
- 긍정 상태(확정·출석·유효)는 brand 계열로 — success라는 별도 그린을 만들지 않는다.
- 경계는 전부 hairline. 그림자 금지.
- brand(밝은 세이지)는 장식·아이콘·큰 면 전용, 텍스트·CTA 배경은 brand-deep.
- 캔버스/샌드/잉크의 웜 톤을 지킨다 — 순백·순흑·순회색을 새로 넣지 않는다.

### Don't
- card-brand와 primary 버튼을 한 화면에 3개 이상 쌓지 않는다 — 전압은 희소해야 신호다.
- info 블루를 새 화면의 액센트로 쓰지 않는다 (정보성 배너 전용 유산 토큰).
- 태그 파스텔을 본문 텍스트나 CTA에 쓰지 않는다.
- display에 500보다 굵은 weight를 쓰지 않는다.
- full 라운드를 큰 버튼에 쓰지 않는다.

## Iteration Guide

1. 새 화면은 기존 어휘(card, status-badge, tag-chip, empty-state)로 먼저 조립을 시도한다.
2. 색·타이포는 토큰 참조로만 — 프로즈에 hex를 풀어쓰지 않는다.
3. 새 상태는 `-active`/`-focus` 엔트리로 추가한다.
4. "이 화면에서 세이지가 몇 번 등장하는가"를 셀 것 — 3번 이상이면 하나를 뺀다.

## Known Gaps

- 채팅/단체채팅, 수강료관리 화면 어휘는 해당 스펙 진행 시 추가.
- 앱 아이콘·스플래시는 아직 Expo 기본 — 스토어 제출 전 세이지/샌드 브랜딩으로 교체 필요.
- 다크 모드 없음 (라이트 온리 시스템 — 전판 결정 유지).
