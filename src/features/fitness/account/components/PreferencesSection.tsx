import { useEffect, useState } from 'react'
import { Button, Card, FormContainer, FormItem, Input } from '@/components/ui'
import type {
    PreferredLengthUnit,
    PreferredWeightUnit,
    UserProfile,
} from '@/features/fitness/account/types/accountProfile'

interface PreferencesSectionProps {
    profile: UserProfile
    isSaving: boolean
    onSubmit: (input: {
        preferredWeightUnit: PreferredWeightUnit
        preferredLengthUnit: PreferredLengthUnit
        timezone: string
    }) => Promise<void>
}

const PreferencesSection = ({
    profile,
    isSaving,
    onSubmit,
}: PreferencesSectionProps) => {
    const [preferredWeightUnit, setPreferredWeightUnit] = useState<PreferredWeightUnit>(
        profile.preferredWeightUnit || 'kg',
    )
    const [preferredLengthUnit, setPreferredLengthUnit] = useState<PreferredLengthUnit>(
        profile.preferredLengthUnit || 'cm',
    )
    const [timezone, setTimezone] = useState(profile.timezone || 'UTC')

    useEffect(() => {
        setPreferredWeightUnit(profile.preferredWeightUnit || 'kg')
        setPreferredLengthUnit(profile.preferredLengthUnit || 'cm')
        setTimezone(profile.timezone || 'UTC')
    }, [profile.preferredWeightUnit, profile.preferredLengthUnit, profile.timezone])

    const handleSubmit = async () => {
        await onSubmit({
            preferredWeightUnit,
            preferredLengthUnit,
            timezone,
        })
    }

    return (
        <Card>
            <h5>Préférences</h5>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                Unités et fuseau horaire utilisés dans l’app.
            </p>

            <FormContainer className="mt-4" layout="vertical">
                <div className="grid gap-4 lg:grid-cols-3">
                    <FormItem label="Unité de poids">
                        <Input
                            asElement="select"
                            value={preferredWeightUnit}
                            onChange={(event) =>
                                setPreferredWeightUnit(event.target.value as PreferredWeightUnit)
                            }
                        >
                            <option value="kg">kg</option>
                            <option value="lb">lb</option>
                        </Input>
                    </FormItem>

                    <FormItem label="Unité de longueur">
                        <Input
                            asElement="select"
                            value={preferredLengthUnit}
                            onChange={(event) =>
                                setPreferredLengthUnit(event.target.value as PreferredLengthUnit)
                            }
                        >
                            <option value="cm">cm</option>
                            <option value="in">in</option>
                        </Input>
                    </FormItem>

                    <FormItem label="Timezone">
                        <Input
                            value={timezone}
                            onChange={(event) => setTimezone(event.target.value)}
                            placeholder="Europe/Paris"
                        />
                    </FormItem>
                </div>
            </FormContainer>

            <div className="mt-2 flex justify-end">
                <Button variant="solid" loading={isSaving} onClick={handleSubmit}>
                    Enregistrer les préférences
                </Button>
            </div>
        </Card>
    )
}

export default PreferencesSection
