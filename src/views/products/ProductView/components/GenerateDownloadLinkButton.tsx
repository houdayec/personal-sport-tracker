import { useState } from 'react'
import Button from '@/components/ui/Button'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/firebase'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import { HiDownload, HiOutlineCheckCircle, HiOutlineLink, HiRefresh } from 'react-icons/hi'

type Props = {
    sku: string
    fileName: string
}

const GenerateDownloadLinkButton = ({ sku, fileName }: Props) => {
    const [loading, setLoading] = useState(false)
    const [copied, setCopied] = useState(false)

    const handleGenerateLink = async () => {
        console.log('Generating download link for:', sku, fileName)
        setLoading(true)
        try {
            const generateLink = httpsCallable(functions, 'generateDownloadLink')
            const response = await generateLink({ sku, fileName })

            const tempLink = (response.data as any).url

            await navigator.clipboard.writeText(tempLink)
            setCopied(true)

            toast.push(
                <Notification title="✅ Link Copied!" type="success">
                    Download link copied to clipboard for <b>{sku}</b>.
                </Notification>,
                { placement: 'top-center' }
            )
        } catch (err) {
            console.error('❌ Failed to generate link:', err)
            toast.push(
                <Notification title="Error" type="danger">
                    Failed to generate download link.
                </Notification>,
                { placement: 'top-center' }
            )
        } finally {
            setLoading(false)
        }
    }

    return (
        <div>
            <Button
                variant={copied ? 'twoTone' : 'twoTone'}
                color={copied ? 'green' : undefined}
                icon={copied ? <HiOutlineCheckCircle /> : <HiOutlineLink />}
                loading={loading}
                onClick={handleGenerateLink}
            >
                {copied ? 'Link Copied!' : ''}
            </Button>
        </div>
    )
}

export default GenerateDownloadLinkButton
