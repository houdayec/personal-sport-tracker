import FitnessPlaceholderPage from '@/features/fitness/common/components/FitnessPlaceholderPage'

const ExerciseLibraryPage = () => {
    return (
        <FitnessPlaceholderPage
            section="Entraînement"
            title="Bibliothèque d’exercices"
            description="Base de référence des exercices pour construire les séances et standardiser la saisie d’entraînement."
            nextBlocks={[
                'CRUD des exercices (nom, groupe musculaire, matériel, niveau).',
                'Filtres et recherche par objectif.',
                'Connexion Firestore et normalisation des champs.',
            ]}
        />
    )
}

export default ExerciseLibraryPage
