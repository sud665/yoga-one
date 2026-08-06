'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { TextInput } from '@/components/ui/TextInput'
import { useToast } from '@/components/ui/Toast'
import { cx } from '@/components/ui/utils'
import { changeMyPassword, updateMyProfile, type MyProfile } from '@/lib/actions/profile'

// Real <label> elements, unlike every form that came before this one.
// TextInput's own comment flags the placeholder-only convention as a known
// follow-up, and a settings screen is where it stops being tenable: a
// placeholder vanishes the moment the field has a value, and this is the one
// form a user opens with the fields *already* filled in. Nothing existing
// breaks -- the Playwright specs that use getByPlaceholder are all pointed at
// the auth and schedule forms, which keep their placeholders.
function Field({
  label,
  hint,
  className,
  ...input
}: { label: string; hint?: string; className?: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label htmlFor={input.id} className="text-label text-muted">
        {label}
      </label>
      <TextInput {...input} />
      {hint && <p className="text-caption text-muted">{hint}</p>}
    </div>
  )
}

function FormError({ message }: { message: string | null }) {
  if (!message) return null
  // role="alert" so the message is announced when it replaces a submit that
  // looked like it was going to succeed.
  return (
    <p role="alert" className="text-body-md text-danger">
      {message}
    </p>
  )
}

export function ProfileForm({ profile }: { profile: MyProfile }) {
  const { toast } = useToast()

  const [fullName, setFullName] = useState(profile.fullName)
  const [phone, setPhone] = useState(profile.phone)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)

  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  async function handleProfileSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setProfileError(null)
    setSavingProfile(true)
    const result = await updateMyProfile(new FormData(event.currentTarget))
    setSavingProfile(false)

    if ('error' in result) {
      setProfileError(result.error)
      return
    }
    toast({ title: '저장했습니다', tone: 'success' })
  }

  async function handlePasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPasswordError(null)
    setSavingPassword(true)
    const form = event.currentTarget
    const result = await changeMyPassword(new FormData(form))
    setSavingPassword(false)

    if ('error' in result) {
      setPasswordError(result.error)
      return
    }
    // Nothing on screen reflects a changed password, so clearing the three
    // fields is the only visible acknowledgement besides the toast.
    form.reset()
    toast({ title: '비밀번호를 변경했습니다', tone: 'success' })
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <form onSubmit={handleProfileSubmit} className="flex flex-col gap-5">
          <div>
            <h2 className="text-heading-md text-ink">내 정보</h2>
            <p className="mt-1 text-caption text-muted">요가원 안에서 이 이름으로 표시됩니다.</p>
          </div>

          {/* Two short, related fields sit side by side rather than stacking
              into a column of full-width boxes -- a name and a phone number
              are one block of contact detail, and neither needs the full
              width to be readable. */}
          <div className="grid gap-4">
            <Field
              id="profile-full-name"
              label="이름"
              name="fullName"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              autoComplete="name"
              required
            />
            <Field
              id="profile-phone"
              label="전화번호"
              name="phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="010-0000-0000"
              inputMode="tel"
              autoComplete="tel"
            />
          </div>

          <Field id="profile-email" label="이메일" value={profile.email} readOnly disabled hint="로그인 아이디는 변경할 수 없습니다." />

          <FormError message={profileError} />

          {/* Right-aligned on desktop where the form is a bounded block, full
              width on mobile where it is the whole screen. */}
          <div className="flex">
            <Button type="submit" disabled={savingProfile} className="w-full">
              {savingProfile ? '저장 중...' : '저장'}
            </Button>
          </div>
        </form>
      </Card>

      {profile.canChangePassword && (
        <Card>
          <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-5">
            <div>
              <h2 className="text-heading-md text-ink">비밀번호 변경</h2>
              <p className="mt-1 text-caption text-muted">변경하려면 현재 비밀번호를 함께 입력해주세요.</p>
            </div>

            <Field
              id="password-current"
              label="현재 비밀번호"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
            />
            {/* The new password and its confirmation are a matched pair, so
                they share a row -- seeing both at once is the whole point of
                a confirmation field. */}
            <div className="grid gap-4">
              <Field
                id="password-new"
                label="새 비밀번호"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                minLength={8}
                hint="8자 이상"
                required
              />
              <Field
                id="password-confirm"
                label="새 비밀번호 확인"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>

            <FormError message={passwordError} />

            <div className="flex">
              <Button type="submit" variant="secondary" disabled={savingPassword} className="w-full">
                {savingPassword ? '변경 중...' : '비밀번호 변경'}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  )
}
