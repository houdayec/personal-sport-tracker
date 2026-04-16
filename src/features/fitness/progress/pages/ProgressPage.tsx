import FitnessPlaceholderPage from '@/features/fitness/common/components/FitnessPlaceholderPage'

const ProgressPage = () => {
    return (
        <FitnessPlaceholderPage
            section="Progression"
            title="Progression"
            description="Vue synthétique des tendances d’entraînement et de suivi corporel pour piloter les décisions."
            nextBlocks={[
                'KPIs hebdo/mensuels (volume, fréquence, régularité).',
                'Corrélation entre charge d’entraînement et données corporelles.',
                'Objectifs, jalons et projections simples.',
            ]}
        />
    )
}

export default ProgressPage
