import FitnessPlaceholderPage from '@/features/fitness/common/components/FitnessPlaceholderPage'

const BodyMeasurementsPage = () => {
    return (
        <FitnessPlaceholderPage
            section="Corps"
            title="Mensurations"
            description="Espace dédié aux mesures corporelles clés pour compléter le suivi de poids et objectiver les changements."
            nextBlocks={[
                'Saisie des circonférences (taille, hanches, bras, cuisses).',
                'Comparaison par période avec deltas automatiques.',
                'Visualisation des évolutions par zone.',
            ]}
        />
    )
}

export default BodyMeasurementsPage
