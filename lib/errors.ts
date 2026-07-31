export function isForbiddenError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false
  return error.code === '42501' || error.message?.toLowerCase().includes('permission denied') === true
}
