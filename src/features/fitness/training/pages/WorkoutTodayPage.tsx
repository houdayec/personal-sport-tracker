import FitnessPlaceholderPage from '@/features/fitness/common/components/FitnessPlaceholderPage'

const WorkoutTodayPage = () => {
    return (
        <FitnessPlaceholderPage
            section="Entraînement"
            title="Séance du jour"
            description="Point d’entrée pour exécuter la séance planifiée, enregistrer les performances et valider la session."
            nextBlocks={[
                'Chargement de la séance active du jour.',
                'Saisie en temps réel des séries et reps réalisées.',
                'Validation de fin de séance avec résumé auto.',
            ]}
        />
    )
}

export default WorkoutTodayPage
