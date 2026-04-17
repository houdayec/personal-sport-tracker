import Card from '@/components/ui/Card'
import { Link } from 'react-router-dom'
import { FITNESS_ROUTES } from '@/features/fitness/constants/routes'

const keyMetrics = [
    {
        label: 'Séance prévue',
        value: '45 min',
        note: 'Renforcement bas du corps',
    },
    {
        label: 'Poids du jour',
        value: '-- kg',
        note: 'A saisir dans Corps > Poids',
    },
    {
        label: 'Objectif hebdo',
        value: '3 / 4',
        note: 'Séances complétées',
    },
    {
        label: 'Série en cours',
        value: '5 jours',
        note: 'Suivi actif',
    },
]

const quickLinks = [
    {
        title: 'Bibliothèque d’exercices',
        description: 'Préparer et structurer les mouvements utiles.',
        to: FITNESS_ROUTES.trainingLibrary,
    },
    {
        title: 'Séance du jour',
        description: 'Lancer la routine planifiée pour aujourd’hui.',
        to: FITNESS_ROUTES.trainingToday,
    },
    {
        title: 'Poids',
        description: 'Enregistrer rapidement la pesée quotidienne.',
        to: FITNESS_ROUTES.bodyWeight,
    },
    {
        title: 'Progression',
        description: 'Suivre les tendances et prochains jalons.',
        to: FITNESS_ROUTES.progress,
    },
]

const FitnessDashboardPage = () => {
    return (
        <div className="space-y-6">
            <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-300">
                    Dashboard
                </p>
                <h3 className="mt-1 text-2xl font-semibold">Vue d’ensemble fitness</h3>
                <p className="mt-2 max-w-3xl text-sm text-gray-600 dark:text-gray-300">
                    Retrouve en un coup d’œil tes entraînements, ton corps et ta
                    progression.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {keyMetrics.map((metric) => (
                    <Card
                        key={metric.label}
                        className="dark:bg-[#243041] dark:border-[#4B5563]"
                    >
                        <p className="text-sm text-gray-500 dark:text-[#C7D2E5]">
                            {metric.label}
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-[#F9FAFB]">
                            {metric.value}
                        </p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-[#D1D5DB]">
                            {metric.note}
                        </p>
                    </Card>
                ))}
            </div>

            <Card header="Raccourcis">
                <div className="grid gap-3 md:grid-cols-2">
                    {quickLinks.map((link) => (
                        <Link
                            key={link.title}
                            to={link.to}
                            className="group rounded-xl border border-gray-200 bg-white p-4 transition hover:border-blue-300 hover:bg-blue-50/60 dark:border-[#4B5563] dark:bg-[#243041] dark:hover:border-blue-400/60 dark:hover:bg-[#374151]"
                        >
                            <p className="font-semibold text-gray-900 dark:text-[#F9FAFB]">
                                {link.title}
                            </p>
                            <p className="mt-1 text-sm text-gray-600 dark:text-[#D1D5DB]">
                                {link.description}
                            </p>
                            <p className="mt-3 text-xs font-semibold text-blue-600 transition group-hover:translate-x-0.5 dark:text-blue-300">
                                Ouvrir
                            </p>
                        </Link>
                    ))}
                </div>
            </Card>
        </div>
    )
}

export default FitnessDashboardPage
