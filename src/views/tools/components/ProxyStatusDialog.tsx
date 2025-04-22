import { useEffect, useState } from 'react'
import ConfirmDialog from '@/components/shared/ConfirmDialog'

type Props = {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
}

// Fully self-contained proxy-check dialog
const ProxyStatusDialog = ({ isOpen, onClose, onConfirm }: Props) => {
    const [ipData, setIpData] = useState({ country: '', flag: '', ip: '' })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(false)

    const isProxyWorking = ipData?.country?.toLowerCase() === 'france'

    useEffect(() => {
        if (isOpen) fetchIpData()
    }, [isOpen])

    // Fetch user IP and geolocation
    const fetchIpData = async () => {
        setLoading(true)
        setError(false)

        try {
            const response = await fetch("https://ipapi.co/json/")
            const data = await response.json()
            setIpData({
                country: data.country_name,
                flag: `https://flagcdn.com/w40/${data.country_code.toLowerCase()}.png`,
                ip: data.ip,
            })
        } catch (error) {
            console.error("❌ Failed to fetch IP data:", error)
            setError(true)
        } finally {
            setLoading(false)
        }
    }

    return (
        <ConfirmDialog
            isOpen={isOpen}
            type={loading ? 'info' : isProxyWorking ? 'success' : 'danger'}
            title="Proxy Status"
            confirmButtonColor={isProxyWorking ? 'green-600' : 'red-600'}
            onClose={onClose}
            onRequestClose={onClose}
            onCancel={onClose}
            onConfirm={onConfirm}
            confirmText="Continue"
            cancelText="Go Back"
            width={320}
        >
            <div className="w-full flex flex-col items-start justify-center text-left min-h-[150px]">
                {loading && <p className="text-gray-500">Loading IP data...</p>}
                {error && <p className="text-red-600">Failed to load IP data</p>}
                {!loading && !error && (
                    <>
                        <img
                            src={ipData.flag}
                            alt={ipData.country}
                            className="w-12 h-auto mb-2 rounded border mt-4"
                        />
                        <h3 className="text-xl font-bold mb-1">{ipData.country}</h3>
                        <p className="text-sm text-gray-500 mb-3">{ipData.ip}</p>
                        <p
                            className={`text-lg font-semibold ${isProxyWorking ? 'text-green-600' : 'text-red-600'
                                }`}
                        >
                            {isProxyWorking ? 'Proxy working' : 'Proxy not working'}
                        </p>
                    </>
                )}
            </div>
        </ConfirmDialog>
    )
}

export default ProxyStatusDialog
