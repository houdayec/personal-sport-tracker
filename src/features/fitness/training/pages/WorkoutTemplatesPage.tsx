import FitnessPlaceholderPage from '@/features/fitness/common/components/FitnessPlaceholderPage'

const WorkoutTemplatesPage = () => {
    return (
        <FitnessPlaceholderPage
            section="Entraînement"
            title="Séances templates"
            description="Modèles de séances réutilisables pour démarrer rapidement une routine sans repartir de zéro."
            nextBlocks={[
                'Création et édition de templates multi-exercices.',
                'Gestion des séries, répétitions, charge et repos.',
                'Versionnement léger des templates favoris.',
            ]}
        />
    )
}

export default WorkoutTemplatesPage
