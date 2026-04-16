import FitnessPlaceholderPage from '@/features/fitness/common/components/FitnessPlaceholderPage'

const BodyWeightPage = () => {
    return (
        <FitnessPlaceholderPage
            section="Corps"
            title="Poids"
            description="Suivi du poids corporel avec une saisie rapide et un historique exploitable pour la progression."
            nextBlocks={[
                'Entrées quotidiennes avec date, poids et notes.',
                'Tendance glissante (7j / 30j) pour lisser les variations.',
                'Objectif cible et alertes de dérive.',
            ]}
        />
    )
}

export default BodyWeightPage
