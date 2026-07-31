'use client'

import { useSyncExternalStore } from 'react'

// navigator.onLine은 브라우저 전용 API라 SSR 중에는 읽을 수 없다. useEffect 안에서
// setState로 초기값을 동기화하면 react-hooks/set-state-in-effect 린트 규칙에 걸리고
// 마운트 직후 리렌더가 한 번 더 발생한다 -- useSyncExternalStore가 이런 "리액트
// 바깥의 가변 상태를 구독"하는 경우를 위한 정식 훅이라 getServerSnapshot으로 SSR
// 기본값(false, 온라인으로 간주)을 주고 클라이언트에서만 실제 값을 읽도록 한다.
function subscribe(callback: () => void) {
  window.addEventListener('offline', callback)
  window.addEventListener('online', callback)
  return () => {
    window.removeEventListener('offline', callback)
    window.removeEventListener('online', callback)
  }
}

function getSnapshot() {
  return !navigator.onLine
}

function getServerSnapshot() {
  return false
}

export function OfflineBanner() {
  const isOffline = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  if (!isOffline) return null

  return (
    <div
      role="alert"
      data-testid="offline-banner"
      className="w-full bg-black px-4 py-3 text-center text-sm font-medium text-white"
    >
      인터넷 연결이 끊겼습니다. 예약 등 일부 기능이 동작하지 않을 수 있습니다.
    </div>
  )
}
