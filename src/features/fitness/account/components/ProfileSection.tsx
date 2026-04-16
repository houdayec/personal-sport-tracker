import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import { Button, Card, FormContainer, FormItem, Input } from '@/components/ui'
import type { UserProfile } from '@/features/fitness/account/types/accountProfile'

interface ProfileSectionProps {
    profile: UserProfile
    email: string
    isSaving: boolean
    onSubmit: (input: { displayName: string; photoUrl?: string }) => Promise<void>
}

const ProfileSection = ({ profile, email, isSaving, onSubmit }: ProfileSectionProps) => {
    const [displayName, setDisplayName] = useState(profile.displayName)
    const [photoUrl, setPhotoUrl] = useState(profile.photoUrl || '')

    useEffect(() => {
        setDisplayName(profile.displayName)
        setPhotoUrl(profile.photoUrl || '')
    }, [profile.displayName, profile.photoUrl])

    const handleSubmit = async () => {
        await onSubmit({
            displayName,
            photoUrl,
        })
    }

    return (
        <Card>
            <h5>Profil</h5>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                Informations de base du compte utilisateur.
            </p>

            <FormContainer className="mt-4" layout="vertical">
                <div className="grid gap-4 lg:grid-cols-2">
                    <FormItem label="Email (lecture seule)">
                        <Input value={email || '—'} disabled />
                    </FormItem>

                    <FormItem label="Nom affiché" asterisk>
                        <Input
                            value={displayName}
                            onChange={(event) => setDisplayName(event.target.value)}
                            placeholder="Ton nom"
                        />
                    </FormItem>
                </div>

                <FormItem label="Photo URL (optionnel)">
                    <Input
                        value={photoUrl}
                        onChange={(event) => setPhotoUrl(event.target.value)}
                        placeholder="https://..."
                    />
                </FormItem>

                <div className="grid gap-4 lg:grid-cols-2">
                    <FormItem label="Compte créé le">
                        <Input
                            disabled
                            value={
                                profile.createdAt
                                    ? dayjs(profile.createdAt.toDate()).format('DD/MM/YYYY HH:mm')
                                    : 'Date indisponible'
                            }
                        />
                    </FormItem>
                    <FormItem label="Dernière mise à jour">
                        <Input
                            disabled
                            value={
                                profile.updatedAt
                                    ? dayjs(profile.updatedAt.toDate()).format('DD/MM/YYYY HH:mm')
                                    : 'Date indisponible'
                            }
                        />
                    </FormItem>
                </div>
            </FormContainer>

            <div className="mt-2 flex justify-end">
                <Button variant="solid" loading={isSaving} onClick={handleSubmit}>
                    Enregistrer le profil
                </Button>
            </div>
        </Card>
    )
}

export default ProfileSection
