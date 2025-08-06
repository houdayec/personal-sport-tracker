import { HiRefresh } from 'react-icons/hi'
import { SiEtsy, SiWordpress } from 'react-icons/si'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { useNavigate } from 'react-router-dom'

const ProductButtons = ({ sku }: { sku: string }) => {
    const navigate = useNavigate()

    return (
        <Card>
            <h5 className="mb-4 font-semibold">Metadata & Listing Tools</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Button
                    variant="twoTone"
                    icon={<HiRefresh />}
                    onClick={() => navigate(`/products/${sku}/generate-thumbnail-metadata`)}
                >
                    Générer Metadata Miniatures
                </Button>
                <Button
                    variant="twoTone"
                    icon={<SiWordpress />}
                    onClick={() => navigate(`/products/${sku}/generate-website-listing`)}
                >
                    Website Page
                </Button>
            </div>
        </Card>
    )
}

export default ProductButtons
