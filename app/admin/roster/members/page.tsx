'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Search, UserPlus, UsersRound, X } from 'lucide-react'

import { listMembersDetailed, type MemberRosterRow, type MembershipStatus } from '@/lib/actions/roster'
import { createInvite } from '@/lib/actions/invites'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatusBadge } from '@/components/ui/Badge'
import { MemberDetailSheet } from '@/components/roster/MemberDetailSheet'
import { cx } from '@/components/ui/utils'

const STATUS_FILTERS: { value: MembershipStatus | 'all'; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'active', label: '유효' },
  { value: 'soon', label: '만료 임박' },
  { value: 'expired', label: '만료' },
  { value: 'unregistered', label: '정보 없음' },
]

const SORTS = [
  { value: 'name', label: '이름순' },
  { value: 'expiry', label: '만료 임박순' },
] as const

const PAGE_SIZE = 30

// 초성 그룹핑 -- 원본 design mockup의 CHO 테이블과 동일 (완성형 한글 코드
// 포인트 기준 588 단위 초성 인덱스).
const CHO = ['ㄱ', 'ㄱ', 'ㄴ', 'ㄷ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅂ', 'ㅅ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']
function initialLetter(name: string): string {
  const code = name.charCodeAt(0) - 0xac00
  if (code < 0 || code > 11171) return '#'
  return CHO[Math.floor(code / 588)]
}

const STATUS_TONE = { active: 'success', soon: 'warning', expired: 'danger', unregistered: 'neutral' } as const
const STATUS_LABEL = { active: '유효', soon: '만료 임박', expired: '만료', unregistered: '정보 없음' } as const

export default function MemberRosterPage() {
  const [members, setMembers] = useState<MemberRosterRow[] | null>(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<MembershipStatus | 'all'>('all')
  const [sort, setSort] = useState<(typeof SORTS)[number]['value']>('name')
  const [limit, setLimit] = useState(PAGE_SIZE)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null)
  const [inviting, setInviting] = useState(false)

  const refresh = useCallback(() => {
    listMembersDetailed().then(setMembers)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function handleInvite() {
    setInviting(true)
    const result = await createInvite('member')
    setInviting(false)
    if (!('error' in result)) setGeneratedUrl(result.url)
  }

  const stats = useMemo(() => {
    const all = members ?? []
    return {
      active: all.filter((m) => m.status === 'active').length,
      soon: all.filter((m) => m.status === 'soon').length,
      expired: all.filter((m) => m.status === 'expired').length,
      unregistered: all.filter((m) => m.status === 'unregistered').length,
    }
  }, [members])

  const filtered = useMemo(() => {
    let list = members ?? []
    if (statusFilter !== 'all') list = list.filter((m) => m.status === statusFilter)
    const q = query.trim()
    if (q) list = list.filter((m) => m.fullName.includes(q) || (m.phone ?? '').slice(-4).includes(q))
    const sorted = [...list]
    if (sort === 'name') sorted.sort((a, b) => a.fullName.localeCompare(b.fullName, 'ko'))
    else sorted.sort((a, b) => (a.daysLeft ?? Infinity) - (b.daysLeft ?? Infinity))
    return sorted
  }, [members, statusFilter, query, sort])

  const visible = filtered.slice(0, limit)

  const grouped = useMemo(() => {
    const groups: { key: string; rows: MemberRosterRow[] }[] = []
    visible.forEach((m) => {
      const key =
        sort === 'name'
          ? initialLetter(m.fullName)
          : m.status === 'expired'
            ? '만료됨'
            : m.daysLeft !== null && m.daysLeft <= 14
              ? '2주 안에 만료'
              : m.daysLeft !== null && m.daysLeft <= 30
                ? '한 달 안에 만료'
                : '여유 있음'
      let group = groups.find((g) => g.key === key)
      if (!group) {
        group = { key, rows: [] }
        groups.push(group)
      }
      group.rows.push(m)
    })
    return groups
  }, [visible, sort])

  return (
    <div className="w-full px-6 py-12">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-brand-tint">
          <UsersRound className="h-[19px] w-[19px] text-brand-deep" strokeWidth={1.75} />
        </span>
        <div>
          <h1 className="text-heading-lg text-ink">회원 관리</h1>
          <p className="mt-0.5 text-caption text-muted">전체 {members?.length ?? 0}명</p>
        </div>
      </div>

      {members !== null && members.length > 0 && (
        <div className="mb-4 flex divide-x divide-hairline rounded-card border border-hairline">
          <StatCell label="유효" value={stats.active} />
          <StatCell label="만료 임박" value={stats.soon} tone="text-warning" />
          <StatCell label="만료" value={stats.expired} tone="text-danger" />
          {/* 이 셀이 없으면 위 세 칸의 합이 헤더의 "전체 N명"과 어긋나
              보였다 -- 초대 링크로만 가입해 회원권 정보가 없는 회원은 셋
              중 어디에도 잡히지 않았기 때문 (QA 전수검사 2026-08-08, 항목
              27). */}
          <StatCell label="정보 없음" value={stats.unregistered} />
        </div>
      )}

      <Button href="/admin/roster/members/new" icon={UserPlus} className="w-full">
        회원 등록 (가입동의서 작성)
      </Button>
      <Button variant="secondary" onClick={handleInvite} disabled={inviting} className="mt-2 w-full">
        회원 초대 링크 발급
      </Button>
      {generatedUrl && (
        <p className="mt-3 break-all rounded-card bg-surface-soft px-4 py-3 text-body-md text-ink">
          발급된 링크:{' '}
          <a href={generatedUrl} className="text-body-strong text-brand-deep underline">
            {generatedUrl}
          </a>
        </p>
      )}

      <div className="mt-5 flex items-center gap-2 rounded-input border border-hairline bg-canvas px-3.5">
        <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setLimit(PAGE_SIZE)
          }}
          placeholder="이름 또는 전화번호 뒤 4자리"
          className="h-11 w-full border-0 bg-transparent text-body-md text-ink outline-none placeholder:text-muted"
        />
        {query && (
          <button
            type="button"
            aria-label="지우기"
            onClick={() => setQuery('')}
            className="shrink-0 rounded-full p-1 text-muted hover:text-ink"
          >
            <X aria-hidden="true" className="h-4 w-4" strokeWidth={1.75} />
          </button>
        )}
      </div>

      <div className="mt-2.5 flex gap-1.5 overflow-x-auto pb-1">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => {
              setStatusFilter(f.value)
              setLimit(PAGE_SIZE)
            }}
            className={cx(
              'shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-caption',
              statusFilter === f.value ? 'border-brand-deep bg-brand-tint text-brand-deep' : 'border-hairline bg-canvas text-body'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-3.5 flex items-center justify-between gap-2">
        <span className="text-caption text-muted">
          {filtered.length === visible.length ? `${filtered.length}명` : `${visible.length} / ${filtered.length}명 표시`}
        </span>
        <div className="flex gap-0.5">
          {SORTS.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setSort(s.value)}
              className={cx(
                'rounded-full px-2.5 py-1 text-caption',
                sort === s.value ? 'bg-brand-tint text-brand-deep' : 'text-muted'
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {members === null ? (
        <div className="mt-4 flex flex-col gap-3">
          <Skeleton variant="block" className="h-14" />
          <Skeleton variant="block" className="h-14" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          className="mt-4"
          title="조건에 맞는 회원이 없습니다"
          description="검색어를 지우거나 다른 필터를 확인해보세요."
        />
      ) : (
        <>
          {grouped.map((group) => (
            <div key={group.key} className="mt-3">
              <p className="sticky top-0 mb-0.5 bg-canvas py-1.5 text-label text-muted">{group.key}</p>
              {/* 구분선 리스트 대신 행마다 독립된 흰 카드 -- 회원 등록
                  마법사(members/new)의 선택 박스들과 같은 표면 처리. */}
              <ul className="flex flex-col gap-2">
                {group.rows.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(m.id)}
                      className="flex w-full items-center gap-2.5 rounded-card border border-hairline bg-surface px-3.5 py-3 text-left shadow-elev-1 transition-colors hover:bg-surface-soft"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-tint text-caption text-brand-deep">
                        {m.fullName.slice(0, 1)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="text-body-strong text-ink">{m.fullName}</span>
                          {m.planLabel && <span className="text-caption text-muted">{m.planLabel}</span>}
                        </span>
                        <span className="mt-0.5 block truncate text-caption text-muted">
                          {m.phone ?? '연락처 미등록'}
                        </span>
                      </span>
                      <StatusBadge tone={STATUS_TONE[m.status]} className="shrink-0">
                        {STATUS_LABEL[m.status]}
                      </StatusBadge>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {filtered.length > visible.length && (
            <button
              type="button"
              onClick={() => setLimit((n) => n + PAGE_SIZE)}
              className="mt-4 w-full rounded-button border border-hairline py-2.5 text-button text-ink hover:bg-surface-soft"
            >
              {PAGE_SIZE}명 더 보기 (남은 {filtered.length - visible.length}명)
            </button>
          )}
        </>
      )}

      {selectedId && (
        <MemberDetailSheet memberId={selectedId} onClose={() => setSelectedId(null)} onChanged={refresh} />
      )}
    </div>
  )
}

function StatCell({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="flex flex-1 flex-col gap-0.5 px-3.5 py-3 first:pl-4 last:pr-4">
      <span className="text-caption text-muted">{label}</span>
      <span className={cx('text-heading-md tabular-nums', tone ?? 'text-ink')}>{value}</span>
    </div>
  )
}
