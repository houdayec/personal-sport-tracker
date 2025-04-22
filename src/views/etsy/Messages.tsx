import { useEffect, useState } from 'react'
import ProxyStatusDialog from '../tools/components/ProxyStatusDialog'
import Button from '@/components/ui/Button'

const Messages = () => {
    const [showProxyPopup, setShowProxyPopup] = useState(false)

    useEffect(() => {
        setShowProxyPopup(true)
    }, [])

    const handleEtsyMessages = () => {
        setShowProxyPopup(false)
        window.open("https://www.etsy.com/messages/unread", "_blank")
    }

    const handleOpenChatGPT = () => {
        setShowProxyPopup(false)
        window.open("https://chatgpt.com/g/g-Uan3e7bwl-fts-customer-support/c/6747233e-d1f0-800d-a121-8fe84c49f708", "_blank")
    }

    return (
        <ProxyStatusDialog
            isOpen={showProxyPopup}
            onClose={() => setShowProxyPopup(false)}
            onConfirm={handleEtsyMessages}
        />
    )
}

export default Messages
