import Button from '@/components/ui/Button'

type Props = {
    beforeDownload?: () => void
}

const EtsyDownloadButton = ({ beforeDownload }: Props) => {
    const handleDownloadClick = () => {
        if (beforeDownload) {
            beforeDownload()
            return
        }

        window.open("https://www.etsy.com/your/shops/me/download", "_blank")
    }

    return (
        <Button variant="solid" onClick={handleDownloadClick}>
            Download Etsy Data
        </Button>
    )
}

export default EtsyDownloadButton
