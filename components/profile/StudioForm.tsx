'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { TextInput } from '@/components/ui/TextInput'
import { useToast } from '@/components/ui/Toast'
import { updateStudioName } from '@/lib/actions/profile'

// 프로필 화면의 owner 전용 "요가원 정보" 카드. ProfileForm과 같은
// label-위-인풋 + 저장 + 토스트 앙상블 -- 요가원 이름은 가입 때 한 번
// 정하고 나면 고칠 곳이 없었다 (RoleBanner·초대 미리보기 등 모든 화면에
// 뜨는 값인데도).
export function StudioForm({ initialName }: { initialName: string }) {
  const { toast } = useToast()
  const [name, setName] = useState(initialName)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSaving(true)
    const result = await updateStudioName(new FormData(event.currentTarget))
    setSaving(false)
    if ('error' in result) {
      setError(result.error)
      return
    }
    toast({ title: '요가원 정보를 저장했습니다', tone: 'success' })
  }

  return (
    <Card className="mt-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <h2 className="text-heading-md text-ink">요가원 정보</h2>
          <p className="mt-1 text-caption text-muted">회원과 강사에게 보이는 요가원 이름입니다.</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="studio-name" className="text-label text-muted">
            요가원 이름
          </label>
          <TextInput
            id="studio-name"
            name="studioName"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </div>

        {error && (
          <p role="alert" className="text-body-md text-danger">
            {error}
          </p>
        )}

        <Button type="submit" disabled={saving} className="w-full">
          {saving ? '저장 중...' : '요가원 정보 저장'}
        </Button>
      </form>
    </Card>
  )
}
