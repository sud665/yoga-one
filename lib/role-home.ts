export type ProfileRole = 'owner' | 'instructor' | 'member'

/**
 * Where a signed-in profile belongs. Owners live under /admin; the other two
 * roles' homes are their own role name.
 *
 * Shared by middleware.ts and app/page.tsx rather than written twice: they
 * are the two places that answer "this request has a role but no
 * destination", and the pair silently disagreeing is what left the root route
 * serving the create-next-app template to anyone who signed in through
 * /login (signInWithPassword redirects to '/').
 */
export function roleHomePath(role: ProfileRole): string {
  return role === 'owner' ? '/admin' : `/${role}`
}
