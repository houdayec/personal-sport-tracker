import FitnessPlaceholderPage from '@/features/fitness/common/components/FitnessPlaceholderPage'

const AccountPage = () => {
    return (
        <FitnessPlaceholderPage
            section="Compte"
            title="Compte"
            description="Zone de configuration personnelle de l’application fitness et des préférences de suivi."
            nextBlocks={[
                'Profil utilisateur et préférences de base.',
                'Paramètres d’unités (kg/lb, cm/in).',
                'Configuration notifications et objectifs personnels.',
            ]}
        />
    )
}

export default AccountPage
