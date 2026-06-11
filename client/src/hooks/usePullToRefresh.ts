import { useEffect, useRef, useState } from 'react'

const THRESHOLD = 80

export function usePullToRefresh(onRefresh: () => void) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const callbackRef = useRef(onRefresh)
  callbackRef.current = onRefresh

  const startY = useRef(0)
  const active = useRef(false)

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        startY.current = e.touches[0].clientY
        active.current = true
      }
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (!active.current) return
      active.current = false
      const delta = e.changedTouches[0].clientY - startY.current
      if (delta >= THRESHOLD) {
        setIsRefreshing(true)
        callbackRef.current()
      }
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchend', onTouchEnd)
    }
  }, [])

  return { isRefreshing, setIsRefreshing }
}
