import { useEffect, useState } from 'react'
import Tooltip from '@/components/ui/Tooltip'
import Spinner from '@/components/ui/Spinner'

const IPStatusBadge = () => {
    const [ipData, setIpData] = useState<{ country: string; flag: string; ip: string } | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch("https://ipapi.co/json/")
            .then((res) => res.json())
            .then((data) => {
                setIpData({
                    country: data.country_name,
                    flag: `https://flagcdn.com/w40/${data.country_code.toLowerCase()}.png`,
                    ip: data.ip,
                })
            })
            .catch((err) => {
                console.error("❌ Error fetching IP info:", err)
            })
            .finally(() => {
                setLoading(false)
            })
    }, [])

    if (loading || !ipData) {
        return (
            <div className="mx-2 w-8 h-8 flex items-center justify-center">
                <Spinner size={18} />
            </div>
        )
    }

    return (
        <Tooltip title={`IP: ${ipData.ip}`}>
            <div className="flex items-center space-x-2 mx-2">
                <img
                    src={ipData.flag}
                    alt={ipData.country}
                    className="w-6 h-6 rounded-full border"
                />
                <span className="text-sm font-medium">{ipData.country}</span>
            </div>
        </Tooltip>
    )
}

export default IPStatusBadge
