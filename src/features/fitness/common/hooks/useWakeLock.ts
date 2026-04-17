import { useCallback, useEffect, useRef, useState } from 'react'

type WakeLockSentinelLike = {
    released: boolean
    release: () => Promise<void>
    addEventListener?: (
        type: 'release',
        listener: () => void,
        options?: AddEventListenerOptions,
    ) => void
}

const getWakeLock = () => {
    if (typeof navigator === 'undefined') {
        return null
    }

    return (navigator as Navigator & {
        wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> }
    }).wakeLock
}

const useWakeLock = (enabled: boolean) => {
    const [isSupported, setIsSupported] = useState<boolean>(Boolean(getWakeLock()))
    const [isActive, setIsActive] = useState(false)

    const sentinelRef = useRef<WakeLockSentinelLike | null>(null)

    const release = useCallback(async () => {
        if (!sentinelRef.current) {
            setIsActive(false)
            return
        }

        try {
            await sentinelRef.current.release()
        } catch {
            // no-op
        } finally {
            sentinelRef.current = null
            setIsActive(false)
        }
    }, [])

    const request = useCallback(async () => {
        const wakeLock = getWakeLock()
        setIsSupported(Boolean(wakeLock))

        if (!wakeLock || typeof document === 'undefined' || document.visibilityState !== 'visible') {
            return
        }

        try {
            const sentinel = await wakeLock.request('screen')
            sentinelRef.current = sentinel
            setIsActive(!sentinel.released)

            sentinel.addEventListener?.('release', () => {
                if (sentinelRef.current === sentinel) {
                    sentinelRef.current = null
                }
                setIsActive(false)
            })
        } catch {
            setIsActive(false)
        }
    }, [])

    useEffect(() => {
        if (enabled) {
            void request()
        } else {
            void release()
        }

        return () => {
            void release()
        }
    }, [enabled, release, request])

    useEffect(() => {
        if (typeof document === 'undefined') {
            return
        }

        const handleVisibilityChange = () => {
            if (!enabled) {
                return
            }

            if (document.visibilityState === 'visible' && !sentinelRef.current) {
                void request()
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
    }, [enabled, request])

    return {
        isSupported,
        isActive,
        request,
        release,
    }
}

export default useWakeLock
