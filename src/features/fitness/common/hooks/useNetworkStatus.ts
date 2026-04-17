import { useEffect, useState } from 'react'

const RECONNECTING_DURATION_MS = 3000

const getInitialOnlineStatus = (): boolean => {
    if (typeof navigator === 'undefined') {
        return true
    }

    return navigator.onLine
}

const useNetworkStatus = () => {
    const [isOnline, setIsOnline] = useState<boolean>(getInitialOnlineStatus)
    const [isReconnecting, setIsReconnecting] = useState(false)

    useEffect(() => {
        if (typeof window === 'undefined') {
            return
        }

        let reconnectingTimeoutId: number | null = null

        const clearReconnectingTimeout = () => {
            if (reconnectingTimeoutId !== null) {
                window.clearTimeout(reconnectingTimeoutId)
                reconnectingTimeoutId = null
            }
        }

        const handleOffline = () => {
            clearReconnectingTimeout()
            setIsReconnecting(false)
            setIsOnline(false)
        }

        const handleOnline = () => {
            setIsOnline((previouslyOnline) => {
                if (!previouslyOnline) {
                    clearReconnectingTimeout()
                    setIsReconnecting(true)
                    reconnectingTimeoutId = window.setTimeout(() => {
                        setIsReconnecting(false)
                        reconnectingTimeoutId = null
                    }, RECONNECTING_DURATION_MS)
                }

                return true
            })
        }

        window.addEventListener('offline', handleOffline)
        window.addEventListener('online', handleOnline)

        return () => {
            window.removeEventListener('offline', handleOffline)
            window.removeEventListener('online', handleOnline)
            clearReconnectingTimeout()
        }
    }, [])

    return {
        isOnline,
        isOffline: !isOnline,
        isReconnecting,
    }
}

export default useNetworkStatus
