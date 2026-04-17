import useNetworkStatus from '@/features/fitness/common/hooks/useNetworkStatus'

const NetworkStatusBanner = () => {
    const { isOffline, isReconnecting } = useNetworkStatus()

    if (!isOffline && !isReconnecting) {
        return null
    }

    const isWarning = isOffline

    return (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-[90] px-3 pt-2">
            <div
                className={`mx-auto max-w-4xl rounded-md border px-3 py-2 text-xs font-medium shadow-md md:text-sm ${
                    isWarning
                        ? 'border-amber-400/60 bg-amber-100/95 text-amber-800 dark:border-amber-500/50 dark:bg-amber-500/20 dark:text-amber-100'
                        : 'border-blue-300/70 bg-blue-100/95 text-blue-800 dark:border-blue-500/50 dark:bg-blue-500/20 dark:text-blue-100'
                }`}
                role="status"
                aria-live="polite"
            >
                {isWarning
                    ? 'Mode hors ligne. Les données en cache restent consultables. Les modifications Firestore se synchronisent au retour réseau. Les uploads photo nécessitent une connexion.'
                    : 'Connexion rétablie. Synchronisation des changements en cours...'}
            </div>
        </div>
    )
}

export default NetworkStatusBanner
