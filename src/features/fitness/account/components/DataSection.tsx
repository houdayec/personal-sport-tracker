import { Button, Card } from '@/components/ui'
import { HiOutlineDownload } from 'react-icons/hi'

interface DataSectionProps {
    uid: string | null
    isExporting: boolean
    onExport: () => Promise<void>
}

const DataSection = ({ uid, isExporting, onExport }: DataSectionProps) => {
    return (
        <Card>
            <h5>Données</h5>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                Export JSON local du compte (profil, exercices, templates, séances,
                poids, mensurations).
            </p>

            <div className="mt-4 rounded-xl border border-dashed border-gray-300 p-4 dark:border-gray-600">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                    UID courant: {uid || 'indisponible'}
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Le fichier exporté contient uniquement les données du compte connecté.
                </p>
                <Button
                    className="mt-3"
                    size="sm"
                    variant="solid"
                    icon={<HiOutlineDownload />}
                    loading={isExporting}
                    onClick={onExport}
                    disabled={!uid}
                >
                    Exporter mes données (JSON)
                </Button>
            </div>
        </Card>
    )
}

export default DataSection
