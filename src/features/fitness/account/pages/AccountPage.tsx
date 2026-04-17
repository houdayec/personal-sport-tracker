import { useMemo, useState } from 'react'
import { Alert, Card, Segment, Spinner } from '@/components/ui'
import DataSection from '@/features/fitness/account/components/DataSection'
import PreferencesSection from '@/features/fitness/account/components/PreferencesSection'
import ProfileSection from '@/features/fitness/account/components/ProfileSection'
import SecuritySection from '@/features/fitness/account/components/SecuritySection'
import useAccountProfile from '@/features/fitness/account/hooks/useAccountProfile'
import useAuth from '@/utils/hooks/useAuth'

type AccountTab = 'profile' | 'preferences' | 'data' | 'security'

const AccountPage = () => {
    const {
        uid,
        authEmail,
        profile,
        isLoading,
        isSavingProfile,
        isSavingPreferences,
        isExporting,
        error,
        successMessage,
        saveProfile,
        savePreferences,
        exportData,
    } = useAccountProfile()

    const { signOut } = useAuth()

    const [tab, setTab] = useState<AccountTab>('profile')
    const [isSigningOut, setIsSigningOut] = useState(false)

    const tabLabel = useMemo(() => {
        switch (tab) {
            case 'profile':
                return 'Profil'
            case 'preferences':
                return 'Préférences'
            case 'data':
                return 'Données'
            case 'security':
                return 'Sécurité'
            default:
                return 'Compte'
        }
    }, [tab])

    const handleSignOut = async () => {
        setIsSigningOut(true)

        try {
            await signOut()
        } finally {
            setIsSigningOut(false)
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-300">
                    Compte
                </p>
                <h3 className="mt-1 text-2xl font-semibold">Paramètres du compte</h3>
                <p className="mt-2 max-w-3xl text-sm text-gray-600 dark:text-gray-300">
                    Gère ton profil, tes préférences, l’export des données et les actions
                    de sécurité.
                </p>
            </div>

            {error && (
                <Alert type="danger" showIcon>
                    {error}
                </Alert>
            )}

            {successMessage && (
                <Alert type="success" showIcon>
                    {successMessage}
                </Alert>
            )}

            <Card>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <Segment
                        size="sm"
                        value={tab}
                        onChange={(value) => setTab(value as AccountTab)}
                    >
                        <Segment.Item value="profile">Profil</Segment.Item>
                        <Segment.Item value="preferences">Préférences</Segment.Item>
                        <Segment.Item value="data">Données</Segment.Item>
                        <Segment.Item value="security">Sécurité</Segment.Item>
                    </Segment>

                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                        Section active: {tabLabel}
                    </p>
                </div>
            </Card>

            {isLoading ? (
                <Card>
                    <div className="flex min-h-[220px] items-center justify-center">
                        <Spinner size={34} />
                    </div>
                </Card>
            ) : !profile ? (
                <Card>
                    <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center dark:border-gray-600">
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            Profil introuvable. Recharge la page pour réessayer.
                        </p>
                    </div>
                </Card>
            ) : (
                <>
                    {tab === 'profile' && (
                        <ProfileSection
                            profile={profile}
                            email={authEmail}
                            isSaving={isSavingProfile}
                            onSubmit={saveProfile}
                        />
                    )}

                    {tab === 'preferences' && (
                        <PreferencesSection
                            profile={profile}
                            isSaving={isSavingPreferences}
                            onSubmit={savePreferences}
                        />
                    )}

                    {tab === 'data' && (
                        <DataSection
                            uid={uid}
                            isExporting={isExporting}
                            onExport={exportData}
                        />
                    )}

                    {tab === 'security' && (
                        <SecuritySection
                            isSigningOut={isSigningOut}
                            onSignOut={handleSignOut}
                        />
                    )}
                </>
            )}
        </div>
    )
}

export default AccountPage
