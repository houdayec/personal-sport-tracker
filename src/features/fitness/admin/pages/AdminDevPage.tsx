import { useState } from 'react'
import { Button, Card } from '@/components/ui'
import {
    seedGlobalExercises,
    seedGlobalHiitExercises,
    seedGlobalRunningTypes,
} from '@/features/fitness/admin/services/adminDevService'
import { showFitnessErrorToast, showFitnessSuccessToast } from '@/features/fitness/common/utils/feedbackToast'
import { HiOutlineDatabase } from 'react-icons/hi'

const getErrorMessage = (error: unknown): string => {
    if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code?: string }).code === 'permission-denied'
    ) {
        return 'Permissions insuffisantes pour écrire dans les collections globales. Vérifie les règles Firestore (write admin uniquement).'
    }

    if (error instanceof Error && error.message) {
        return error.message
    }

    return 'Une erreur est survenue pendant le seed.'
}

const AdminDevPage = () => {
    const [isSeedingGeneral, setIsSeedingGeneral] = useState(false)
    const [isSeedingHiit, setIsSeedingHiit] = useState(false)
    const [isSeedingRunningTypes, setIsSeedingRunningTypes] = useState(false)

    const handleSeedGlobalExercises = async () => {
        setIsSeedingGeneral(true)

        try {
            const result = await seedGlobalExercises()
            showFitnessSuccessToast(
                `Seed terminé: ${result.upserted} exercices globaux du catalogue local ont été upsertés dans global_exercises.`,
            )
        } catch (seedError) {
            showFitnessErrorToast(getErrorMessage(seedError))
        } finally {
            setIsSeedingGeneral(false)
        }
    }

    const handleSeedGlobalHiitExercises = async () => {
        setIsSeedingHiit(true)

        try {
            const result = await seedGlobalHiitExercises()
            showFitnessSuccessToast(
                `Seed HIIT terminé: ${result.upserted} exercices HIIT globaux ont été upsertés dans global_exercises.`,
            )
        } catch (seedError) {
            showFitnessErrorToast(getErrorMessage(seedError))
        } finally {
            setIsSeedingHiit(false)
        }
    }

    const handleSeedGlobalRunningTypes = async () => {
        setIsSeedingRunningTypes(true)

        try {
            const result = await seedGlobalRunningTypes()
            showFitnessSuccessToast(
                `Seed running terminé: ${result.upserted} types running globaux ont été upsertés dans global_running_types.`,
            )
        } catch (seedError) {
            showFitnessErrorToast(getErrorMessage(seedError))
        } finally {
            setIsSeedingRunningTypes(false)
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-300">
                    Admin
                </p>
                <h3 className="mt-1 text-2xl font-semibold">Dev Tools</h3>
                <p className="mt-2 max-w-3xl text-sm text-gray-600 dark:text-gray-300">
                    Outils internes pour lancer rapidement des actions de maintenance
                    quand c’est nécessaire.
                </p>
            </div>

            <Card>
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h5 className="font-semibold">Seed global_exercises</h5>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                            Envoie le catalogue JSON local (backup versionné) et
                            injecte/merge la banque d’exercices globale (bodyweight +
                            machines) en écriture directe Firestore depuis le client.
                        </p>
                    </div>
                    <Button
                        variant="solid"
                        icon={<HiOutlineDatabase />}
                        loading={isSeedingGeneral}
                        onClick={handleSeedGlobalExercises}
                    >
                        Lancer le seed
                    </Button>
                </div>
            </Card>

            <Card>
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h5 className="font-semibold">Seed global_exercises (HIIT)</h5>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                            Injecte le catalogue HIIT local pour enrichir la librairie
                            d’exercices utilisable dans les templates HIIT.
                        </p>
                    </div>
                    <Button
                        variant="solid"
                        icon={<HiOutlineDatabase />}
                        loading={isSeedingHiit}
                        onClick={handleSeedGlobalHiitExercises}
                    >
                        Uploader exercices HIIT
                    </Button>
                </div>
            </Card>

            <Card>
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h5 className="font-semibold">Seed global_running_types</h5>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                            Injecte les types de séance running (footing, seuil,
                            fractionné, trail, etc.) pour alimenter la bibliothèque
                            utilisée dans les templates course.
                        </p>
                    </div>
                    <Button
                        variant="solid"
                        icon={<HiOutlineDatabase />}
                        loading={isSeedingRunningTypes}
                        onClick={handleSeedGlobalRunningTypes}
                    >
                        Uploader types running
                    </Button>
                </div>
            </Card>
        </div>
    )
}

export default AdminDevPage
