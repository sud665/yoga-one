---
version: alpha
name: Yoga-Studio-Design
description: |
  요가원 관리 PWA를 위한 디자인 시스템. Nike 커머스 디자인 시스템의 구조적 원칙 — 극단적 타이포그래피 대비, 순흑/순백 + 단일 그레이의 절제된 크롬, 알약형(pill) CTA, 그림자 없는 플랫 카드, 8px 그리드 — 를 그대로 계승하되, 상품/캠페인 사진 중심의 커머스 어휘를 클래스 시간표·예약·강사/회원 관리 화면에 맞는 어휘로 치환했다. 컬러는 흑백 기반에 예약상태(확정/마감)와 클래스 타입 태그에만 채도를 허용하는 절제된 팔레트를 유지한다.

colors:
  primary: "#111111"
  on-primary: "#ffffff"
  canvas: "#ffffff"
  soft-cloud: "#f5f5f5"
  ink: "#111111"
  charcoal: "#39393b"
  ash: "#4b4b4d"
  mute: "#707072"
  stone: "#9e9ea0"
  hairline: "#cacacb"
  hairline-soft: "#e5e5e5"
  full: "#d30005"
  full-deep: "#780700"
  success: "#007d48"
  success-bright: "#1eaa52"
  info: "#1151ff"
  info-deep: "#0034e3"
  tag-a: "#ed1aa0"
  tag-a-soft: "#ffb0dd"
  tag-a-deep: "#4c012d"
  tag-b-soft: "#beaffd"
  tag-b-pale: "#d6d1ff"
  tag-c: "#0a7281"

typography:
  display-hero:
    fontFamily: Bebas Neue
    fontSize: 64px
    fontWeight: 500
    lineHeight: 0.95
    letterSpacing: 0
    textTransform: uppercase
  heading-xl:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: 0
  heading-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: 0
  heading-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 500
    lineHeight: 1.75
    letterSpacing: 0
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0
  body-strong:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: 0
  button-lg:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: 0
  button-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: 0
  button-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: 0
  link-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 500
    lineHeight: 1.75
    letterSpacing: 0
    textDecoration: underline
  caption-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: 0
  caption-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: 0
  utility-xs:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: 0

rounded:
  none: 0px
  sm: 18px
  md: 24px
  lg: 30px
  full: 9999px

spacing:
  xxs: 2px
  xs: 4px
  sm: 8px
  md: 12px
  lg: 18px
  xl: 24px
  xxl: 30px
  section: 48px

components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button-md}"
    rounded: "{rounded.full}"
    padding: 16px 32px
    height: 48px
  button-primary-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button-md}"
    rounded: "{rounded.full}"
  button-secondary:
    backgroundColor: "{colors.soft-cloud}"
    textColor: "{colors.ink}"
    typography: "{typography.button-md}"
    rounded: "{rounded.full}"
    padding: 16px 32px
    height: 48px
  button-danger:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.full}"
    typography: "{typography.button-md}"
    rounded: "{rounded.full}"
    padding: 16px 32px
    height: 48px
  button-icon-circular:
    backgroundColor: "{colors.soft-cloud}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    size: 40px
  search-pill:
    backgroundColor: "{colors.soft-cloud}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: 8px 16px
    height: 40px
  search-pill-focused:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
  filter-chip:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.button-md}"
    rounded: "{rounded.full}"
    padding: 8px 16px
  filter-chip-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button-md}"
    rounded: "{rounded.full}"
  badge-tag:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.caption-sm}"
    rounded: "{rounded.full}"
    padding: 4px 12px
  badge-status-text:
    typography: "{typography.caption-md}"
  tag-dot:
    rounded: "{rounded.full}"
    size: 12px
  tag-dot-active:
    rounded: "{rounded.full}"
    size: 12px
  session-card:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.none}"
    padding: 0px
  session-card-media:
    backgroundColor: "{colors.soft-cloud}"
    rounded: "{rounded.none}"
  hero-tile:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-primary}"
    typography: "{typography.display-hero}"
    rounded: "{rounded.none}"
  quick-action-card:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.caption-md}"
    rounded: "{rounded.none}"
  dashboard-summary-card:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-primary}"
    typography: "{typography.heading-lg}"
    rounded: "{rounded.none}"
  faq-row:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.heading-md}"
    rounded: "{rounded.none}"
    padding: 24px 0px
  detail-disclosure-row:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.none}"
    padding: 24px 0px
  app-nav:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.none}"
    height: 56px
  filter-sidebar:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.none}"
---

## Overview

이 시스템은 Nike 커머스 디자인 시스템의 뼈대를 그대로 물려받는다: 사진 대신 정보가 주인공이라는 점만 다르다. 화면을 채우는 건 상품 사진이 아니라 클래스 시간표, 예약 현황, 강사·회원 목록이지만 — 크롬(nav, 필터, 버튼, 카드, 배지)은 Nike와 동일하게 `{colors.canvas}`와 `{colors.soft-cloud}` 위의 중립적인 타이포그래피와 알약(pill) 지오메트리로 환원된다. 장식적 그라디언트나 소프트 섀도우는 없고, 액센트 컬러는 "분위기"가 아니라 실제로 신호가 필요한 소수의 순간(정원마감 `{colors.full}`, 예약확정 `{colors.success}`, 클래스 타입 태그)에만 예약되어 있다.

밀도는 높지만 산만하지 않다 — 세 가지 장치 덕분이다: `{colors.soft-cloud}` 위에 올라간 세션 카드, 모든 실행 가능한 표면을 고정하는 알약형 검정 CTA(`{rounded.full}`), 그리고 카드와 필터를 수학적으로 정렬시키는 8px 기반 촘촘한 스페이싱 스케일.

원장/강사/회원 세 역할 화면(`/admin`, `/instructor`, `/member`) 전부 동일한 크롬을 공유한다 — 역할에 따라 데이터와 내비게이션 구성만 달라질 뿐, 버튼·카드·배지·타이포 시스템은 하나다.

**핵심 특징**
- 로그인/온보딩 화면에만 `{typography.display-hero}`(Bebas Neue, 64px, line-height 0.95, uppercase)를 사용한 임팩트 있는 헤드라인 — 앱 내부 화면에는 절대 쓰지 않는다
- 순흑/순백/단일 그레이 팔레트: `{colors.ink}`, `{colors.canvas}`, `{colors.soft-cloud}`가 전체 크롬의 ~95%를 차지
- 모든 CTA·검색창·필터칩·배지는 `{rounded.full}`(9999px) 또는 `{rounded.md}`(24px) — 각진 버튼 없음
- 세션 카드는 radius 0, 그림자 0, `{colors.canvas}` 위에 그대로 얹힘
- 2단 CTA 위계: `{component.button-primary}`(예약하기·저장 등 1순위 액션) vs `{component.button-secondary}`(취소·더보기 등 보조 액션) — 같은 화면에 검정 CTA는 하나만
- 8px 스페이싱, 섹션 리듬은 `{spacing.section}`(48px)
- 채도 있는 색은 정원마감(`{colors.full}`)과 예약확정(`{colors.success}`) 같은 상태 신호, 그리고 클래스 타입 태그(`{colors.tag-a}`, `{colors.tag-c}` 등)에만 등장

## Colors

### Brand & Neutral
- **Ink** (`{colors.ink}` — `#111111`): 유일한 "브랜드 컬러". 기본 CTA, 활성 필터칩, 히어로 배경, 헤드라인·본문 텍스트 전부 이 색.
- **Canvas** (`{colors.canvas}` — `#ffffff`): 모든 페이지 배경, 인크 위의 반전 텍스트.
- **Soft Cloud** (`{colors.soft-cloud}` — `#f5f5f5`): 세션 카드 미디어 영역, 검색창, 보조 CTA 배경. 시스템에서 가장 많이 쓰이는 비백색 표면.
- **Hairline** / **Hairline Soft**: 필터 행 구분선, 스티키 바 하단 인셋 그림자용 1px 라인.

### Text
- **Ink** `#111111`: 헤드라인, 클래스명, 본문.
- **Charcoal** `#39393b`, **Ash** `#4b4b4d`: ink가 과하게 무거운 자리의 대체.
- **Mute** `#707072`: 카테고리/부제(강사명, 시간), 캡션.
- **Stone** `#9e9ea0`: 어두운 배경 위 최저 강조 텍스트.

### Semantic (상태)
- **Full** (`{colors.full}` — `#d30005`): 정원마감·예약취소 신호. 예약 버튼 대신 노출되는 유일한 레드.
- **Full Deep** (`{colors.full-deep}`): 눌림/호버 상태.
- **Success** (`{colors.success}` — `#007d48`): 예약확정·출석 신호.
- **Success Bright**: 어두운 배경 위 반전 success.
- **Info** (`{colors.info}` — `#1151ff`): 공지·안내 배지.
- **Info Deep**: 눌림 상태.

### Tag (클래스 타입 라벨)
아주 절제해서 쓴다 — 필터 칩, 태그점(tag-dot), 시간표의 소규모 컬러 라벨에만. 본문 텍스트나 주요 CTA 색으로는 절대 쓰지 않는다.
- **Tag A** (`{colors.tag-a}` — `#ed1aa0`) / soft / deep 변형 — 예: 회원 전용 클래스
- **Tag B soft/pale** (`#beaffd` / `#d6d1ff`) — 예: 초급/입문 클래스
- **Tag C** (`{colors.tag-c}` — `#0a7281`) — 예: 야외/특강

클래스 타입과 태그 색상의 실제 매핑은 요가원(studio)마다 다르므로 앱 설정에서 지정한다 — 토큰 자체는 특정 클래스명에 고정되지 않는다.

## Typography

### Font Family
- **Bebas Neue** — `{typography.display-hero}` 전용. 로그인/온보딩 화면 임팩트 헤드라인. Google Fonts 무료 폰트, Nike Futura ND 대체.
- **Inter** — 그 외 전체(heading/body/button/caption). Nike의 Helvetica Now Text/Display 대체로 시스템 자체가 권장하는 조합이며, 무료·오픈소스(OFL)라 라이선스 문제 없음.

### Hierarchy
동일한 8단계 대비 구조를 유지한다: `{typography.display-hero}`(64px)에서 `{typography.heading-xl}`(32px)로, 다시 `{typography.body-md}`(16px)로 급격히 떨어지는 "히어로 위, 콘텐츠 아래" 구조. 중간 크기를 늘리지 않는다.

| Token | Size | Weight | Use |
|---|---|---|---|
| `{typography.display-hero}` | 64px | 500 | 로그인/온보딩 히어로 헤드라인 (uppercase) |
| `{typography.heading-xl}` | 32px | 500 | 대시보드 섹션 타이틀 |
| `{typography.heading-lg}` | 24px | 500 | 요약카드 타이틀, 다이얼로그 헤드라인 |
| `{typography.heading-md}` | 16px | 500 | 세션 카드 타이틀, FAQ 행, 필터 그룹 헤더 |
| `{typography.body-md}` | 16px | 400 | 본문, 설명 텍스트 |
| `{typography.body-strong}` | 16px | 500 | 클래스명, nav 링크, 목록 항목 라벨 |
| `{typography.button-lg}` | 20px | 500 | 히어로 내 큰 CTA |
| `{typography.button-md}` | 16px | 500 | 표준 알약 CTA (예약하기 등) |
| `{typography.button-sm}` | 14px | 500 | 소형 CTA, 배지 라벨 |
| `{typography.link-md}` | 16px | 500 | 밑줄 인라인 링크 |
| `{typography.caption-md}` | 14px | 500 | 부제(강사명·시간), 필터 카운트 |
| `{typography.caption-sm}` | 12px | 500 | 필터칩 라벨, 배지 텍스트 |
| `{typography.utility-xs}` | 11px | 500 | 타임스탬프, 최하단 유틸리티 텍스트 |

## Layout

### Spacing
- 기준 단위 8px. `{spacing.section}`(48px)을 대시보드 주요 블록 사이(요약카드 행 → 시간표 → 예약목록) 수직 리듬으로 사용.
- 세션 카드 그리드는 `{spacing.sm}`(8px) 거터, 상세정보 아코디언은 `{spacing.xl}`(24px) 수직 패딩.

### Grid & Container
- 최대 폭 ~1200px 콘텐츠 영역 (커머스형 1440px보다 좁게 — 관리형 앱 데이터 밀도에 맞춤).
- 시간표: 데스크톱 주간 캘린더 그리드(요일×시간), 태블릿 이하는 일자별 리스트로 전환.
- 필터 사이드바(요일/강사): 데스크톱 ~220px 고정폭, 좁은 화면에서는 "필터" 토글 버튼으로 축소.

### Whitespace Philosophy
섹션은 `{spacing.section}` 리듬으로 붙여 배치하고 장식적 구분선은 두지 않는다 — 여백은 분리를 위한 도구이지 장식이 아니다.

## Elevation & Depth

| Level | Treatment | Use |
|---|---|---|
| 0 — Flat | 그림자 없음 | 카드·버튼·섹션의 기본값 |
| 1 — Hairline | 1px solid `{colors.hairline}` | 필터 행 구분선, 상세정보 아코디언 구분선 |
| 2 — Inset bottom-line | `inset 0 -1px 0 {colors.hairline-soft}` | 스티키 상단바 하단 |

카드는 페이지 위에서 들뜨지 않는다. 깊이감은 색 대비(`{colors.ink}` 요약카드 vs `{colors.canvas}` 배경)로만 표현한다.

## Shapes

| Token | Value | Use |
|---|---|---|
| `{rounded.none}` | 0px | 카드, 요약카드, nav, 시간표 그리드 — 컨테이너 전부 |
| `{rounded.sm}` | 18px | 아바타/아이콘 컨테이너 |
| `{rounded.md}` | 24px | 검색창, 필터 입력창 |
| `{rounded.lg}` | 30px | (레거시 참고용 — 현재 CTA는 `{rounded.full}` 사용) |
| `{rounded.full}` | 9999px | 모든 CTA 알약, 태그점, 원형 아이콘 버튼 |

## Components

### Buttons
- **`button-primary`** — 화면당 1순위 액션 하나. `{colors.ink}` 배경, `{rounded.full}` 알약. "예약하기", "저장", "초대 링크 발급", "가입하기".
- **`button-secondary`** — 보조 액션. `{colors.soft-cloud}` 배경. "취소", "더보기".
- **`button-danger`** — 파괴적 액션(예약 취소 확정, 강사/회원 삭제). 배경은 `{colors.canvas}`, 텍스트만 `{colors.full}` — 배경을 채우지 않아 실수로 누르기 쉬운 강한 빨강 버튼을 피한다.
- **`button-icon-circular`** — 뒤로가기, 즐겨찾기, 필터 토글 등 아이콘 전용 컨트롤.

### Inputs & Filters
- **`search-pill`** — 강사/회원/클래스 검색.
- **`filter-chip`** / **`filter-chip-active`** — 요일·강사·클래스타입 필터. 선택 시 완전 반전(`{colors.ink}` 배경).

### Cards
- **`session-card`** — 시간표의 핵심 단위. 상단 `{component.session-card-media}`(선택적 썸네일, 없으면 `{colors.soft-cloud}` 단색), 그 아래 클래스명(`{typography.body-strong}`), 강사·시간(`{typography.caption-md}` `{colors.mute}`), 정원 현황 배지, 예약 CTA.
  - 정원 마감 시 카드 우상단에 `{component.badge-status-text}`를 `{colors.full}`로 "마감" 표시하고 CTA는 "대기 등록"으로 전환.
  - 예약 완료 시 CTA 자리에 `{colors.success}` "예약완료" 상태 텍스트만 표시(버튼 아님).
- **`dashboard-summary-card`** — 원장/강사/회원 홈 화면 요약(오늘 수업 수, 대기 인원, 다음 예약 등). `{colors.ink}` 배경에 `{typography.heading-lg}` 큰 숫자/타이틀.
- **`quick-action-card`** — 원장 대시보드의 바로가기(강사관리·회원관리·시간표관리 진입 카드). 중앙 아이콘 + `{typography.caption-md}` 라벨.
- **`tag-dot`** / **`tag-dot-active`** — 시간표에서 클래스 타입을 구분하는 12px 색점.

### Disclosure & Info
- **`faq-row`** — 도움말 화면 아코디언.
- **`detail-disclosure-row`** — 클래스 상세정보(강사 소개, 준비물, 환불 안내 등) 아코디언 행.

### Navigation
- **`app-nav`** — 역할별 상단/하단 내비게이션. 원장: 대시보드·강사·회원·시간표. 강사: 내 수업. 회원: 시간표·내 예약. `{colors.canvas}` 배경, 활성 항목은 `{colors.ink}` 2px 하단 밑줄.
- **`filter-sidebar`** — 시간표 화면 좌측 요일/강사 필터 레일.

## Do's and Don'ts

### Do
- `{typography.display-hero}`는 로그인/온보딩 화면에만 — 앱 내부 화면 제목에 쓰지 않는다.
- 화면당 `{component.button-primary}`는 하나만. 나머지는 `{component.button-secondary}`.
- 세션 카드 썸네일은 `{colors.soft-cloud}` 위에 얹는다(썸네일 없어도 동일 배경 유지로 그리드 정렬 흔들리지 않게).
- CTA는 전부 `{rounded.full}` 알약형으로 통일.
- `{colors.full}`은 정원마감·취소 신호에만 — 배경이나 장식色으로 쓰지 않는다.

### Don't
- 그림자/카드 elevation 넣지 않는다.
- 태그 컬러(`{colors.tag-a}`, `{colors.tag-c}` 등)를 주요 CTA나 본문 텍스트 색으로 쓰지 않는다 — 태그점·필터칩 전용.
- `{colors.ink}`를 `{colors.charcoal}` 같은 미묘한 회색으로 대체하지 않는다 — 기본 CTA는 순정 `#111111`.
- 세션 카드 내부에 여백을 넣지 않는다 — 메타데이터는 미디어 영역 바로 아래 `{spacing.sm}` 간격으로.
- 버튼 모양을 세 번째로 늘리지 않는다 — 알약형 또는 원형 아이콘, 그게 전부.

## Responsive Behavior

| Name | Width | Key Changes |
|---|---|---|
| desktop | 1200px+ | 시간표 주간 캘린더 그리드, 필터 사이드바 고정폭 |
| tablet | 768–1199px | 시간표 2일씩 묶어보기, 필터는 토글형 |
| mobile | ~767px 이하 | 시간표 일자별 세로 리스트 1열, 하단 탭 내비게이션(app-nav) |

- 터치 타겟은 WCAG AAA(44×44px) 기준 충족 — CTA 48px, 아이콘 버튼 40px(히트 영역 48px+로 확장).
- 섹션 간격은 데스크톱 48px → 태블릿 32px → 모바일 24px로 축소.

## Iteration Guide

1. 새 화면을 만들 때는 기존 컴포넌트 어휘(session-card, dashboard-summary-card, quick-action-card, filter-chip, disclosure-row)로 표현 가능한지 먼저 검토하고, 정말 필요할 때만 새 컴포넌트를 추가한다.
2. 컬러·타이포 값은 프로즈에서 풀어쓰지 말고 토큰(`{colors.ink}`, `{typography.body-strong}`)으로 직접 참조한다.
3. 새 상태(비활성/포커스 등)는 별도 컴포넌트 엔트리(`-active`, `-disabled`)로 추가하고 프로즈 속에 묻지 않는다.
4. 뷰포트당 `{colors.ink}` 사용을 절제한다 — 같은 화면에 검정 블록/알약이 두 개 이상 보이면 하나는 `{component.button-secondary}`나 `{colors.soft-cloud}`로 중화한다.

## Known Gaps

- 회원가입/로그인 폼 필드 스타일은 검색창(search-pill) 패턴을 참고해 추후 정의 필요.
- 채팅/단체채팅 화면 컴포넌트는 해당 기능이 별도 스펙으로 진행될 때 이 문서에 추가한다.
- 수강료관리(결제, 영수증) 화면 컴포넌트도 해당 스펙 진행 시 추가한다.
