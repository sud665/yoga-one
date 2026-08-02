---
version: alpha
name: Yoga-Studio-Design
description: |
  요가원 관리 PWA를 위한 디자인 시스템. Airtable 마케팅 사이트 디자인 분석(`airtable/DESIGN.md`)의
  구조적 원칙 — 절제된 근흑(near-black) 잉크와 순백 캔버스, 헤어라인 보더로 경계를 표현하는 플랫한
  카드, 무게가 아니라 크기·대비로 위계를 만드는 절제된 타이포(400/500만, 볼드 없음), 컬러는 실제
  "전압"이 필요한 소수의 순간에만 예약 — 을 계승하되, Airtable 원본은 마케팅 랜딩페이지(히어로 밴드,
  가격표, 아티클 그리드, 푸터)를 위한 시스템이라 그 어휘를 그대로 옮길 수 없다. 이 문서는 그 원칙만
  가져와 **앱(대시보드·시간표·예약·로스터·폼) 어휘로 처음부터 다시 번역**했다.

  이전(Nike 커머스 기반) 버전과의 관계: 알약형(pill) CTA·조건부 Bebas Neue 헤드라인·순정 `#111111`
  잉크는 폐기한다. 사이드바 nav 구조, 카드형 컨테이너에 라운드를 주는 방향, `info` 액센트를
  포커스링/인터랙티브 요소에 쓰는 원칙, 토스트/스켈레톤/빈상태 컴포넌트 어휘는 최근 파운데이션
  페이즈에서 이미 검증되고 사용자가 실제 화면으로 확인한 뒤 승인한 구조라 유지한다 — 이번 변경은
  그 구조 위에 얹는 **팔레트·타입·모양 언어의 교체**이지, nav/컴포넌트 아키텍처의 재설계가 아니다.

colors:
  ink: "#181d26"
  ink-active: "#0d1218"
  on-ink: "#ffffff"
  canvas: "#ffffff"
  surface-soft: "#f8fafc"
  surface-strong: "#e0e2e6"
  body: "#333840"
  muted: "#71757c"
  hairline: "#dddddd"
  hairline-soft: "#eeeeee"
  danger: "#aa2d00"
  danger-deep: "#7a2000"
  danger-tint: "#f6e8e3"
  success: "#0b6b1f"
  success-deep: "#084f17"
  success-tint: "#e7f3e8"
  info: "#1b61c9"
  info-deep: "#1a3866"
  info-tint: "#e8f0fc"
  tag-peach: "#fcab79"
  tag-mint: "#a8d8c4"
  tag-mustard: "#d9a441"
  tag-cream: "#f5e9d4"

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
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
    typography: "{typography.button}"
    rounded: "{rounded.button}"
    padding: 12px 20px
    height: 44px
  button-primary-active:
    backgroundColor: "{colors.ink-active}"
    textColor: "{colors.on-ink}"
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
    border: "1px solid {colors.info}"
    rounded: "{rounded.input}"
  card:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.card}"
    border: "1px solid {colors.hairline}"
  card-ink:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
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
  admin-sidebar:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-strong}"
    width: 240px
    border: "1px solid {colors.hairline}"
  admin-sidebar-item-active:
    backgroundColor: "{colors.info-tint}"
    textColor: "{colors.info}"
    border: "4px solid {colors.info}"
  admin-bottom-tabs:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
    border: "1px solid {colors.hairline}"
  app-nav:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-strong}"
    height: 56px
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
    color: "{colors.info}"
    width: 2px
    offset: 2px
---

## Overview

`airtable/DESIGN.md`(Airtable 마케팅 사이트 디자인 분석)를 근거로 삼되, 원본은 히어로 밴드·가격표·아티클 그리드·6단 푸터 같은 **랜딩페이지 전용 어휘**로 가득하다 — 이 앱은 마케팅 사이트가 아니라 원장이 매일 들여다보는 관리 도구이므로, 그 어휘를 그대로 옮기지 않고 원칙만 추출해 **처음부터 앱 컴포넌트로 재번역**했다: hero-band/signature-card/pricing-tier-card/logo-strip/article-card/footer 전부 대응물이 없다. 대신 남기는 건 세 가지 절제 원칙이다.

1. **에디토리얼한 차분함.** 순백 캔버스 위에 근흑(`{colors.ink}` `#181d26` — 순정 `#000000`이 아니라 살짝 부드러운 잉크)만 있으면 충분하다. 장식적 그라디언트·메시·소프트 글로우는 없다. 브랜드감은 컬러 블록이 아니라 여백과 타입 대비에서 나온다.
2. **헤어라인 보더가 1차 구조 장치.** 이전 버전은 색 대비(잉크 블록 vs 캔버스)로만 카드를 구분했다. 이 버전은 `{colors.hairline}` 1px 보더 + `{rounded.card}`를 카드·패널·인풋의 기본 경계로 쓴다 — 리터럴 드롭섀도우는 여전히 없다. "컬러 블록이 먼저, 그림자는 나중"이라는 Airtable 원칙을 "헤어라인이 먼저, 그림자는 없음"으로 한 단계 더 절제했다.
3. **타이포는 무게가 아니라 크기·대비로 말한다.** 전체 시스템에 볼드(600/700)가 없다 — display도 500이 최대다. 강조는 크기와 색 대비, 그리고 `{component.card-ink}` 같은 소수의 "전압" 표면에만 위임한다.

**이전 버전에서 유지하는 것** (최근 파운데이션 페이즈에서 사용자가 실제 화면으로 확인 후 승인): `/admin`의 좌측 사이드바 구조(데스크톱/태블릿 상시 고정) + 모바일 하단 탭 바, `components/ui/*` 프리미티브 아키텍처(Button/Card/Badge/Toast/Skeleton/EmptyState), `{colors.info}`를 포커스 링·인터랙티브 액센트로 쓰는 원칙, 토스트/스켈레톤/빈상태 어휘 자체. 이번 변경은 그 구조 위에 얹는 팔레트·타입·라운드·보더 언어의 교체다 — nav 아키텍처를 다시 논의하지 않는다.

**이전 버전에서 폐기하는 것**: 알약형(`rounded.full`) CTA — 버튼은 이제 `{rounded.button}`(12px) 각진-둥근 사각형이다(원형 아이콘 버튼과 작은 상태 배지·태그 칩만 여전히 `rounded.full`). 로그인/온보딩 전용 Bebas Neue 히어로 — 폰트는 이제 Inter 하나(디스플레이/본문 공용, weight로만 위계). 순정 `#111111` 잉크 — `#181d26`로 대체(체감 차이는 작지만 Airtable 원본 그대로).

## Colors

### Brand & Neutral
- **Ink** (`{colors.ink}` — `#181d26`): 유일한 브랜드 컬러. 기본 CTA 배경, 사이드바 활성 텍스트를 제외한 모든 헤드라인·본문.
- **Ink Active** (`{colors.ink-active}` — `#0d1218`): 기본 CTA 눌림 상태.
- **Canvas** (`{colors.canvas}` — `#ffffff`): 모든 페이지 배경.
- **Surface Soft** (`{colors.surface-soft}` — `#f8fafc`): 빈 상태 배경, 스켈레톤이 아닌 은은한 보조 표면.
- **Surface Strong** (`{colors.surface-strong}` — `#e0e2e6`): 비활성 상태, 강조가 필요한 중립 표면.
- **Hairline** / **Hairline Soft**: 카드·인풋·nav 보더(진한 쪽), 스켈레톤 배경(연한 쪽).

### Text
- **Ink**: 헤드라인, 본문, 라벨.
- **Body** (`{colors.body}` — `#333840`): ink보다 한 단계 가벼운 본문 텍스트(긴 설명 등).
- **Muted** (`{colors.muted}` — `#71757c`): 캡션, 부제(강사명·시간), 타임스탬프.

### Semantic (상태)
- **Danger** (`{colors.danger}` — `#aa2d00`): 정원마감·예약취소·파괴적 액션 신호. Airtable의 signature-coral을 재해석 — 알람처럼 튀는 빨강이 아니라 차분한 산화철색이라 절제 원칙과 맞는다.
- **Danger Tint** (`{colors.danger-tint}`): danger 배지의 옅은 배경.
- **Success** (`{colors.success}` — `#0b6b1f`): 예약확정·출석 신호.
- **Info** (`{colors.info}` — `#1b61c9`, Airtable 원본의 실제 link 컬러): 포커스 링, 링크, 사이드바/탭 활성 상태 전용 인터랙티브 액센트. 캔버스 위 대비비 ≈5.2:1로 텍스트·아이콘 액센트에도 안전. 배경을 채우는 주요 CTA 색으로는 쓰지 않는다 — 그 자리는 여전히 `{colors.ink}`.

### Tag (클래스 타입 라벨)
Airtable 데모-그리드 카드의 파스텔 표면(`signature-peach`/`mint`/`mustard`/`cream`)을 태그 칩 팔레트로 재사용 — 어차피 "작은 표면에서 콘텐츠를 구분한다"는 같은 역할이다. 필터 칩, 시간표의 소규모 라벨에만 쓴다. 텍스트는 전부 `{colors.ink}`(파스텔이라 대비 문제 없음). 실제 클래스 타입 매핑은 요가원마다 앱 설정에서 지정.

## Typography

### Font Family
**Inter** 하나. `next/font/google`의 variable weight를 그대로 쓴다(400/500만 실제로 사용 — 시스템에 볼드가 없다). Airtable 원본은 Haas Grotesk/Haas Groot Disp(라이선스 폰트)를 쓰지만, 문서 자체가 "Inter Display가 가장 가까운 오픈소스 대체재"라고 명시한다 — display 사이즈까지 포함해 Inter 하나로 통일하면 대체재 문제도, 두 폰트 페어링 관리 부담도 동시에 없앨 수 있다. (Google Fonts에 `Inter Display`라는 별도 패밀리가 없으면 `Inter` variable 폰트를 그대로 큰 사이즈에 쓰는 것으로 충분 — 구현 시 실제 `next/font/google` 목록에서 확인.)

### Hierarchy

| Token | Size | Weight | Use |
|---|---|---|---|
| `{typography.display-lg}` | 32px | 500 | 로그인/온보딩 헤드라인, 대시보드 최상단 타이틀 |
| `{typography.heading-lg}` | 24px | 500 | 페이지 타이틀("원장 대시보드" 등) |
| `{typography.heading-md}` | 16px | 500 | 카드/섹션 타이틀 |
| `{typography.body-md}` | 14px | 400 | 본문, 설명 |
| `{typography.body-strong}` | 14px | 500 | 목록 항목, nav 링크, 클래스명 |
| `{typography.button}` | 14px | 500 | 버튼 라벨 |
| `{typography.label}` | 13px | 500 | 폼 라벨 |
| `{typography.caption}` | 12px | 500 | 부제, 배지, 태그 칩 |
| `{typography.utility-xs}` | 11px | 500 | 타임스탬프, 최하단 유틸리티 텍스트 |

이전 버전 대비 전반적으로 한 단계 조밀하다(body 16→14px 등) — 관리형 앱의 데이터 밀도에 맞춘 Airtable 원본 자체의 body-md(14px) 사이즈를 그대로 따른 결과다.

## Layout

### Spacing
기준 단위 4px(Airtable 원본 그대로 — 8px 기준이던 이전 버전보다 더 촘촘하게 스냅). `{spacing.section}`(48px)을 대시보드 주요 블록 사이 수직 리듬으로 유지.

### Grid & Container
최대 폭 ~1200px. 세부 반응형 규칙(시간표 그리드, 필터 사이드바 등)은 이전 버전의 값을 유지 — Airtable 원본이 마케팅 그리드라 관리형 앱에 옮길 대응 규칙이 없는 영역이다.

### Whitespace Philosophy
Airtable 원본의 "여백이 곧 분위기" 철학을 유지하되, 96px 섹션 리듬은 관리형 데이터 밀도에 맞춰 48px로 압축한다 — 마케팅 페이지의 스크롤-앤-브리드 리듬은 앱에 그대로 옮기면 화면을 과도하게 비운다.

## Elevation & Depth

| Level | Treatment | Use |
|---|---|---|
| 0 — Flat | 보더 없음 | nav 배경, 페이지 배경 |
| 1 — Hairline | 1px solid `{colors.hairline}` | **기본값.** 카드, 인풋, 사이드바 경계, toast, empty-state — 리터럴 드롭섀도우 대신 이걸로 경계를 표현 |
| 2 — Ink block | `{colors.ink}` 배경 | `card-ink`(대시보드 핵심 통계) 같은 소수의 "전압" 표면에만 — 화면당 남발 금지 |

Airtable 원본의 "컬러 블록이 먼저, 그림자는 나중"을 "헤어라인이 먼저, 그림자는 없음"으로 한 단계 더 절제한 버전. 그림자는 시스템 전체에 단 하나도 없다.

## Shapes

| Token | Value | Use |
|---|---|---|
| `{rounded.none}` | 0px | nav 배경 바, 사이드바 컨테이너 자체의 바깥 모서리(전체 화면 폭에 붙는 구조적 크롬) |
| `{rounded.input}` | 8px | 텍스트 인풋 |
| `{rounded.button}` | 12px | 모든 CTA(`button-primary`/`secondary`/`danger`) — **더 이상 알약형이 아니다** |
| `{rounded.card}` | 14px | 데이터 컨테이너 전부(session-card, card-ink, toast, skeleton, empty-state) |
| `{rounded.full}` | 9999px | 원형 아이콘 버튼, 상태 배지, 태그 칩, 아바타 — "작고 둥근 것"에만, 큰 CTA에는 쓰지 않는다 |

Airtable 원본이 명시한 규칙 그대로: **pill/full은 아이콘·배지·아바타 같은 작은 원형 요소 전용이고, 큰 CTA 버튼에 pill을 쓰지 않는다.** 이전 버전과 가장 눈에 띄게 달라지는 지점이 이거다.

## Components

### Buttons
- **`button-primary`** — 화면당 1순위 액션 하나. `{colors.ink}` 배경, `{rounded.button}`(12px, 각진-둥근 사각형).
- **`button-secondary`** — `{colors.canvas}` 배경 + hairline 보더. Airtable 원본의 시그니처 버튼 페어(근흑 primary + 화이트 아웃라인 secondary)를 그대로.
- **`button-danger`** — `{colors.canvas}` 배경, `{colors.danger}` 텍스트 + 보더. 배경을 채우지 않는 절제된 파괴적 액션 버튼 원칙은 유지.
- **`button-icon-circular`** — hairline 보더 + `{rounded.full}`, 40px.

### Inputs
- **`text-input`** / **`text-input-focus`** — Airtable 원본에서 거의 그대로 가져온 유일한 컴포넌트. 이전 버전은 폼 필드 스타일이 "Known Gap"으로 미정의였는데, Airtable 원본이 실제 인풋 스펙(44px 높이, hairline 보더, 포커스 시 info 보더)을 갖고 있어 그 갭을 채운다.

### Cards
- **`card`** — 범용 데이터 컨테이너. `{colors.canvas}` + hairline 보더 + `{rounded.card}`, 그림자 없음. session-card/quick-action-card 등은 이 기본형의 variant.
- **`card-ink`** — 소수의 강조 표면 전용(대시보드 핵심 통계 등). `{colors.ink}` 배경 + `{typography.heading-lg}`. 화면당 남발 금지 원칙은 유지.
- **`status-badge`** — 예약상태(확정/대기/마감/출석) 등 상태 신호. `{rounded.full}`, 톤별 tint 배경 + 해당 semantic 컬러 텍스트(success/danger/info).
- **`tag-chip`** — 클래스 타입 라벨. 파스텔 tag 컬러 배경 + ink 텍스트, `{rounded.full}`.

### Navigation
- **`admin-sidebar`** — `/admin` 전용, 유지. 240px 고정폭, `{colors.canvas}` + 우측 hairline 보더(이전엔 색 대비만으로 구분, 이제 보더 추가). 활성 항목은 `{colors.info-tint}` 배경 + `{colors.info}` 좌측 4px 보더 + `{colors.info}` 텍스트.
  - **2단 구조(신규)**: 최상위 항목 5개 — 대시보드 / 시간표관리 / 인력관리(하위메뉴) / 예약현황 / 내 수업. "인력관리"는 부모 항목으로, 하위에 강사관리·회원관리·초대관리 3개를 묶는다(이전 버전의 flat 7항목에서 강사/회원/초대 3개를 인력관리 하위로 통합). 부모 항목 클릭 시 하위메뉴가 펼쳐진다(아코디언) — 현재 라우트가 하위메뉴 항목 중 하나면 부모는 기본 펼침 상태로 시작한다(예: `/admin/roster/instructors` 진입 시 인력관리가 이미 열려 있어야 함, 접힌 채로 시작해 사용자가 직접 펼쳐야 하면 안 됨). 하위메뉴 항목은 부모보다 한 단계 들여쓰기, `{typography.body-md}`(부모는 `{typography.body-strong}`)로 위계 차이를 표현. 모바일 하단 탭 바는 항목이 5개로 줄어 스크롤 없이 한 화면에 다 들어간다 — "인력관리" 탭은 누르면 하위 3개를 보여주는 서브 시트/드로어로 전환(하단 탭 바 자체에 2단 구조를 그대로 욱여넣지 않는다).
- **`admin-bottom-tabs`** — `/admin` 모바일 전용, 유지. `{colors.canvas}` + 상단 hairline 보더. 활성 탭은 상단 `{colors.info}` 보더 + `{colors.info}` 텍스트.
- **`app-nav`** — `/instructor`·`/member` 상단 바. `{colors.canvas}` + 하단 hairline 보더, 활성 항목 `{colors.info}` 텍스트.

## Feedback & States

이전 버전에서 신설된 어휘를 그대로 유지, 토큰 값만 교체.

- **`toast`** — `{colors.canvas}` + hairline 보더 + `{rounded.card}`, 톤별 좌측 액센트(성공 success / 실패 danger / 안내 info / 중립 ink). 실패는 `role="alert"`, 그 외는 `role="status"`.
- **`skeleton`** — `{colors.hairline-soft}` 배경, variant별 형태(text/block/circle) 유지.
- **`empty-state`** — `{colors.surface-soft}` + hairline 보더 + `{rounded.card}`. "없음"이 아니라 "다음에 뭘 할 수 있는지"를 안내.
- **`focus-ring`** — `{colors.info}` 2px 아웃라인, 2px 오프셋. 전역 base 규칙으로 유지.
- **Reduced Motion** — `prefers-reduced-motion: reduce` 시 전환 duration 0으로 수렴. 유지.

## Do's and Don'ts

### Do
- 화면당 `{component.button-primary}`는 하나만. 나머지는 `{component.button-secondary}`.
- 카드·패널·인풋은 전부 hairline 보더로 경계를 표현한다 — 그림자를 쓰지 않는다.
- `{component.card-ink}`는 화면당 최대 1-2개 — "전압"은 희소해야 신호가 된다.
- `{colors.info}`는 포커스 링·링크·활성 상태에만 — 배경을 채우는 CTA 색으로 쓰지 않는다.
- 큰 CTA는 `{rounded.button}`(각진-둥근 사각형), 작은 원형 요소만 `{rounded.full}`.

### Don't
- 리터럴 드롭섀도우를 넣지 않는다.
- `{rounded.full}`을 큰 버튼에 쓰지 않는다 — pill은 배지·태그·아이콘 전용.
- 태그 컬러를 본문 텍스트나 주요 CTA 색으로 쓰지 않는다.
- display 사이즈에 500보다 굵은 weight를 쓰지 않는다 — 강조는 크기·대비로, 굵기로 하지 않는다.

## Responsive Behavior

이전 버전의 브레이크포인트·터치 타겟 기준(WCAG AAA, 사이드바 768px 경계, 하단 탭 바)을 그대로 유지 — 이번 변경은 팔레트·타입·모양 레벨이라 반응형 전략 자체는 다시 논의하지 않는다.

## Iteration Guide

1. 새 화면은 기존 컴포넌트 어휘(card, status-badge, tag-chip 등)로 먼저 표현 가능한지 검토.
2. 컬러·타이포는 토큰으로 직접 참조, 프로즈에 풀어쓰지 않는다.
3. 새 상태는 별도 컴포넌트 엔트리(`-active`, `-focus`)로.
4. 화면당 `{colors.ink}`/`{component.card-ink}` 사용을 절제한다.

## Known Gaps

- 이 파일은 팔레트·타입·모양 토큰 교체까지만 정의한다 — 실제 `app/globals.css`(`@theme`)·`components/ui/*`·전 페이지 적용은 별도 구현 페이즈에서 진행.
- 채팅/단체채팅, 수강료관리(결제/영수증) 화면 컴포넌트는 해당 스펙 진행 시 추가.
- Airtable 원본의 pricing 서브시스템(Inter Display 특수 weight, pill 버튼)은 이 앱에 대응 화면이 없어 통째로 제외했다 — 향후 유료 플랜/과금 화면이 생기면 그때 이 시스템 안에서 다시 정의(원본의 별도 서브시스템 취급 원칙은 유지할 가치가 있다).
