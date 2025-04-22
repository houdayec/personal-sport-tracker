import { Product } from '@/@types/product'
import Card from '@/components/ui/Card'

const DownloadInfoCard = ({ data }: { data: Product["wordpress"] }) => {
    if (!data?.downloadable) return null

    return (
        <Card>
            <h5 className="mb-4">Download Info</h5>
            <div className="text-sm">
                <p><strong>Download Limit:</strong> {data.downloadLimit ?? 'Unlimited'}</p>
                <p><strong>Download Expiry:</strong> {data.downloadExpiry ?? 'No Expiry'}</p>
                <ul className="mt-2">
                    {data.downloads?.map(dl => (
                        <li key={dl.id} className="mb-1">
                            <strong>{dl.name}</strong>: <a className="text-blue-600 underline" href={dl.file} target="_blank">{dl.file}</a>
                        </li>
                    ))}
                </ul>
            </div>
        </Card>
    )
}

export default DownloadInfoCard
