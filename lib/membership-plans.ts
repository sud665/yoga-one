// Config, not data -- there is no admin screen to edit these (the design
// spec doesn't have one either; PLANS/TERMS/AGREEMENTS are hardcoded
// constants there too), so they live in code rather than a database table.
//
// Deliberately does NOT include the design's FEES (원데이·특강 이용료) or
// CLASS_OPTIONS constants. Both were keyed to the mockup's own fake demo
// class names ('하타 집중 수련', '오전(인텐시브)') via string-matching, which
// don't exist in this app's real seed data (실제 클래스: '빈야사 플로우',
// '하타 요가', '아쉬탕가', '저녁 스트레칭', '주말 파워 요가') -- there is no
// real per-class pricing column anywhere in the schema for that logic to be
// faithful to. The registration wizard fetches real class template titles
// from the database instead of hardcoding a class list here.

export interface MembershipPlan {
  id: string
  label: string
  monthly: number
}

export const PLANS: MembershipPlan[] = [
  { id: 'w2', label: '주 2회', monthly: 130000 },
  { id: 'w3', label: '주 3회', monthly: 165000 },
  { id: 'w4', label: '주 4회', monthly: 190000 },
  { id: 'w5', label: '주 5회', monthly: 210000 },
]

export interface MembershipTerm {
  months: number
  label: string
  /** 0-1 fraction off the gross (monthly * months) total. */
  discount: number
}

export const TERMS: MembershipTerm[] = [
  { months: 1, label: '1개월', discount: 0 },
  { months: 3, label: '3개월 (10% 할인)', discount: 0.1 },
  { months: 6, label: '6개월 (15% 할인)', discount: 0.15 },
]

export function won(amount: number): string {
  return `${amount.toLocaleString('ko-KR')}원`
}

export function computeMembershipPrice(planId: string, termMonths: number) {
  const plan = PLANS.find((p) => p.id === planId) ?? PLANS[1]
  const term = TERMS.find((t) => t.months === termMonths) ?? TERMS[0]
  const gross = plan.monthly * term.months
  const total = Math.round((gross * (1 - term.discount)) / 1000) * 1000
  return { plan, term, gross, total }
}

export type AgreementId = 'terms' | 'privacy' | 'refund' | 'safety' | 'marketing' | 'photo'

export interface Agreement {
  id: AgreementId
  title: string
  required: boolean
  body: string[]
}

// 일반적인 요가원 가입동의서 문구다. 실제 사용 전에는 반드시 변호사 검토를 받아야 한다.
export const AGREEMENTS: Agreement[] = [
  {
    id: 'terms',
    title: '회원 이용약관',
    required: true,
    body: [
      '제1조 (회원권의 개시와 기간) 회원권은 가입동의서에 기재된 개시일부터 효력이 발생하며, 선택한 수강 기간이 만료되면 자동으로 종료됩니다. 자동 갱신은 하지 않습니다.',
      '제2조 (이용 방법) 회원은 선택한 주 이용 횟수 범위에서 요가원 앱을 통해 수업을 예약하고 이용합니다. 정원이 마감된 수업은 대기 등록할 수 있으며, 자리가 생기면 순서대로 확정됩니다.',
      '제3조 (예약 취소와 결석) 수업 시작 2시간 전까지 취소한 예약은 횟수에서 차감하지 않습니다. 그 이후 취소 또는 무단 결석은 이용 횟수 1회로 차감합니다.',
      '제4조 (휴회) 수강 기간이 1개월을 초과하는 회원권은 기간 중 1회, 최대 30일까지 휴회할 수 있습니다. 휴회는 개시 전 요가원에 서면 또는 앱으로 신청해야 합니다.',
      '제5조 (양도·양수) 회원권의 타인 양도 및 명의 변경은 원칙적으로 불가하며, 부상·전출 등 부득이한 사유가 있는 경우 요가원의 승인을 받아 1회 양도할 수 있습니다.',
      '제6조 (이용 제한) 다른 회원의 수업을 방해하거나 시설을 훼손한 경우, 요가원은 사전 통지 후 이용을 제한할 수 있습니다. 이 경우 잔여 기간에 해당하는 금액은 제6조 환불 규정에 따라 환급합니다.',
    ],
  },
  {
    id: 'privacy',
    title: '개인정보 수집·이용 동의',
    required: true,
    body: [
      '수집 항목 — 성명, 휴대전화번호, 이메일 주소, 회원권 정보, 수업 예약·출석 기록, 건강상 특이사항(본인이 자발적으로 고지한 경우에 한함).',
      '수집·이용 목적 — 회원 관리 및 본인 확인, 수업 예약·출석 관리, 회원권 정산 및 환불 처리, 안전사고 대응 및 응급 연락.',
      '보유 및 이용 기간 — 회원 탈퇴 시 지체 없이 파기합니다. 다만 「전자상거래 등에서의 소비자보호에 관한 법률」 등 관계 법령에 따라 보존이 필요한 거래·결제 기록은 해당 법령이 정한 기간(최대 5년) 동안 분리 보관합니다.',
      '제3자 제공 — 회원의 별도 동의 또는 법령에 근거가 있는 경우를 제외하고 제3자에게 제공하지 않습니다.',
      '동의를 거부할 권리 — 회원은 개인정보 수집·이용에 동의하지 않을 수 있으나, 이 경우 회원 등록 및 수업 이용이 불가합니다.',
    ],
  },
  {
    id: 'refund',
    title: '환불 규정',
    required: true,
    body: [
      '환불은 「체육시설의 설치·이용에 관한 법률」과 공정거래위원회 「소비자분쟁해결기준」을 따릅니다.',
      '① 개시일 이전 해지 — 이미 납부한 금액에서 총 대금의 10%를 위약금으로 공제한 잔액을 환급합니다.',
      '② 개시일 이후 해지 — 이용일수에 해당하는 금액과 총 대금의 10%를 공제한 잔액을 환급합니다. 이때 이용일수 해당액은 정상가 기준 1일 단가로 계산하며, 기간 할인 적용 전 금액을 기준으로 합니다.',
      '③ 요가원의 사정으로 수업이 폐강되거나 이용이 불가해진 경우 — 위약금 공제 없이 잔여 기간 전액을 환급하고, 회원이 입은 손해가 있으면 별도로 배상합니다.',
      '④ 회원의 질병·부상, 임신, 전출 등 부득이한 사유가 진단서 또는 증빙으로 확인되는 경우 — 위약금을 공제하지 않고 잔여 기간에 해당하는 금액을 환급합니다.',
      '⑤ 환불 신청은 요가원 접수일을 기준으로 산정하며, 접수 후 영업일 7일 이내에 회원 명의 계좌로 지급합니다.',
    ],
  },
  {
    id: 'safety',
    title: '건강 상태 고지 및 안전 주의사항',
    required: true,
    body: [
      '회원은 임신, 고혈압·심장질환, 디스크·관절 질환, 최근 6개월 이내의 수술 이력, 그 밖에 운동에 영향을 줄 수 있는 사항을 등록 시 요가원에 고지합니다.',
      '요가는 신체를 사용하는 활동으로 부상의 위험이 있습니다. 회원은 강사의 안내를 따르고, 통증이 느껴지는 자세는 즉시 중단하며 무리하게 동작을 수행하지 않습니다.',
      '고지하지 않은 기존 질환이나 강사의 중단 지시를 따르지 않아 발생한 사고에 대해서는 요가원의 책임이 제한될 수 있습니다.',
      '요가원은 시설 안전 관리 의무를 다하며, 시설 하자 또는 요가원의 과실로 발생한 사고에 대해서는 관계 법령에 따라 배상 책임을 부담합니다.',
      '수업 중 발생한 응급 상황에서 요가원은 회원이 고지한 연락처로 연락하고 필요한 응급조치를 취할 수 있습니다.',
      '개인 물품은 회원이 직접 관리하며, 요가원은 보관함 미사용으로 인한 분실에 대해 책임지지 않습니다.',
    ],
  },
  {
    id: 'marketing',
    title: '마케팅 정보 수신 동의 (선택)',
    required: false,
    body: [
      '요가원은 신규 프로그램, 워크숍, 할인 이벤트, 회원권 만료 안내 등을 문자메시지·이메일·앱 알림으로 발송할 수 있습니다.',
      '동의하지 않아도 회원 등록과 수업 이용에는 아무런 제한이 없습니다. 회원권 만료, 폐강, 시간표 변경 등 이용에 반드시 필요한 안내는 이 동의와 무관하게 발송됩니다.',
      '동의는 언제든지 프로필 화면 또는 요가원 문의를 통해 철회할 수 있으며, 철회 시 즉시 발송이 중단됩니다.',
    ],
  },
  {
    id: 'photo',
    title: 'SNS·홍보물 사진 게시 동의 (선택)',
    required: false,
    body: [
      '요가원은 수업 중 촬영한 사진·영상을 요가원 인스타그램 등 SNS 계정, 홈페이지, 오프라인 홍보물에 게시할 수 있습니다. 게시물에는 회원의 얼굴이 식별 가능한 형태로 포함될 수 있습니다.',
      '게시 목적은 요가원 소개 및 수업 안내에 한정하며, 회원의 성명·연락처 등 개인정보는 함께 게시하지 않습니다.',
      '동의하지 않아도 회원 등록과 수업 이용에는 아무런 제한이 없으며, 촬영 시 회원은 촬영 제외를 요청할 수 있습니다.',
      '동의는 언제든지 철회할 수 있고, 철회 또는 삭제 요청을 받은 게시물은 요가원이 관리하는 채널에서 지체 없이 삭제합니다. 다만 이미 제3자가 공유·저장한 게시물은 회수가 어려울 수 있습니다.',
      '동의 기간은 회원 자격 유지 기간으로 하며, 탈퇴 시 새로운 게시는 중단됩니다.',
    ],
  },
]

export const REQUIRED_AGREEMENT_IDS: AgreementId[] = AGREEMENTS.filter((a) => a.required).map((a) => a.id)
