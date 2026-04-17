import Card from '@/components/ui/Card'

interface FitnessPlaceholderPageProps {
    section: string
    title: string
    description: string
    nextBlocks: string[]
}

const FitnessPlaceholderPage = ({
    section,
    title,
    description,
    nextBlocks,
}: FitnessPlaceholderPageProps) => {
    return (
        <div className="space-y-6">
            <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-300">
                    {section}
                </p>
                <h3 className="mt-1 text-2xl font-semibold">{title}</h3>
                <p className="mt-2 max-w-3xl text-sm text-gray-600 dark:text-gray-300">
                    {description}
                </p>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
                <Card header="Statut du shell">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                        Structure d’interface prête. Cette page est volontairement
                        simple et attend le branchement des données métier.
                    </p>
                </Card>

                <Card header="Prochaines briques métier">
                    <ul className="space-y-2">
                        {nextBlocks.map((block) => (
                            <li
                                key={block}
                                className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300"
                            >
                                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-500" />
                                <span>{block}</span>
                            </li>
                        ))}
                    </ul>
                </Card>
            </div>
        </div>
    )
}

export default FitnessPlaceholderPage
