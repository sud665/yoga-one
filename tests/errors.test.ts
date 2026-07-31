import { describe, it, expect } from 'vitest'
import { isForbiddenError } from '@/lib/errors'

describe('isForbiddenError', () => {
  it('returns false for null or undefined', () => {
    expect(isForbiddenError(null)).toBe(false)
    expect(isForbiddenError(undefined)).toBe(false)
  })

  it('returns true for Postgres RLS error code 42501', () => {
    expect(isForbiddenError({ code: '42501' })).toBe(true)
  })

  it('returns true when the message contains "permission denied", case-insensitively', () => {
    expect(isForbiddenError({ message: 'permission denied for table bookings' })).toBe(true)
    expect(isForbiddenError({ message: 'PERMISSION DENIED for table bookings' })).toBe(true)
  })

  it('returns false for an unrelated error', () => {
    expect(isForbiddenError({ code: '23505', message: 'duplicate key value' })).toBe(false)
  })

  it('returns false for an error with neither a matching code nor message', () => {
    expect(isForbiddenError({})).toBe(false)
  })
})
