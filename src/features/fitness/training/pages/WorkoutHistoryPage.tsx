import FitnessPlaceholderPage from '@/features/fitness/common/components/FitnessPlaceholderPage'

const WorkoutHistoryPage = () => {
    return (
        <FitnessPlaceholderPage
            section="Entraînement"
            title="Historique"
            description="Historique des séances terminées pour analyser la constance et comparer les performances dans le temps."
            nextBlocks={[
                'Liste paginée des séances passées.',
                'Filtrage par période, type de séance et groupe musculaire.',
                'Détail d’une séance avec progression par exercice.',
            ]}
        />
    )
}

export default WorkoutHistoryPage
