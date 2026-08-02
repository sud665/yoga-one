import WebSocket from 'ws'

// @supabase/supabase-js's createClient() unconditionally constructs a
// RealtimeClient, even though this integration suite only ever calls
// .from()/.rpc() (plain PostgREST/RPC over HTTP, no realtime subscriptions).
// That constructor requires a WebSocket implementation to be resolvable at
// call time. Node 20 (used in this environment) has no native global
// WebSocket (that lands as stable/global starting in Node 22), so
// createClient() throws immediately without this polyfill. This only
// affects test-environment object construction, not anything under test:
// book_session/cancel_booking are invoked purely via .rpc(), so this has no
// bearing on the concurrency assertion itself.
if (!globalThis.WebSocket) {
  globalThis.WebSocket = WebSocket as unknown as typeof globalThis.WebSocket
}
