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
                    Shell opérationnel pour centraliser entraînement, suivi corporel
                    et progression avant branchement des données Firestore.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {keyMetrics.map((metric) => (
                    <Card key={metric.label}>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {metric.label}
                        </p>
                        <p className="mt-2 text-2xl font-semibold">{metric.value}</p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
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
                            className="rounded-xl border border-gray-200 p-4 transition hover:border-blue-300 hover:bg-blue-50/60 dark:border-gray-700 dark:hover:border-blue-400/60 dark:hover:bg-blue-500/5"
                        >
                            <p className="font-semibold">{link.title}</p>
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                                {link.description}
                            </p>
                        </Link>
                    ))}
                </div>
            </Card>
        </div>
    )
}

export default FitnessDashboardPage
