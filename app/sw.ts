import { defaultCache } from '@serwist/next/worker'
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist'
import { NetworkOnly, Serwist } from 'serwist'
import { supabaseUrl } from '@/lib/supabase/env'

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

// defaultCache's own catch-all rule caches every cross-origin GET
// (NetworkFirst, 1-hour TTL) into Cache Storage, which survives sign-out.
// CLAUDE.md flagged this as fine only "as long as every read currently goes
// through POST Server Actions" and to re-check the moment a client-side
// Supabase GET read landed -- components/chat/ChatRoomScreen.tsx's realtime
// chat is that read. Without this rule, one member's conversation history
// (fetched client-side from the Supabase REST origin) could still be served
// from cache to a *different* member who signs in on the same device within
// the hour. Prepended, not appended: Serwist tries runtimeCaching rules in
// array order and stops at the first match, so this has to come before
// defaultCache's own broader cross-origin entry to actually take effect.
const supabaseOrigin = new URL(supabaseUrl()).origin

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ url }) => url.origin === supabaseOrigin,
      handler: new NetworkOnly(),
    },
    ...defaultCache,
  ],
})

serwist.addEventListeners()
