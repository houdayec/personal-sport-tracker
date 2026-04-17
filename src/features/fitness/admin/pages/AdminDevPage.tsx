import { useState } from 'react'
import { Alert, Button, Card } from '@/components/ui'
import { seedGlobalExercises } from '@/features/fitness/admin/services/adminDevService'
import { HiOutlineDatabase } from 'react-icons/hi'

const getErrorMessage = (error: unknown): string => {
    if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code?: string }).code === 'permission-denied'
    ) {
        return 'Permissions insuffisantes pour écrire dans global_exercises. Vérifie les règles Firestore (write admin uniquement).'
    }

    if (error instanceof Error && error.message) {
        return error.message
    }

    return 'Une erreur est survenue pendant le seed.'
}

const AdminDevPage = () => {
    const [isSeeding, setIsSeeding] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    const handleSeedGlobalExercises = async () => {
        setIsSeeding(true)
        setError(null)
        setSuccess(null)

        try {
            const result = await seedGlobalExercises()
            setSuccess(
                `Seed terminé: ${result.upserted} exercices globaux du catalogue local ont été upsertés dans global_exercises.`,
            )
        } catch (seedError) {
            setError(getErrorMessage(seedError))
        } finally {
            setIsSeeding(false)
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-orange-600 dark:text-orange-300">
                    Admin
                </p>
                <h3 className="mt-1 text-2xl font-semibold">Dev Tools</h3>
                <p className="mt-2 max-w-3xl text-sm text-gray-600 dark:text-gray-300">
                    Outils temporaires pour pousser des fichiers de seed locaux vers la
                    base depuis l’application.
                </p>
            </div>

            {error && (
                <Alert type="danger" showIcon>
                    {error}
                </Alert>
            )}

            {success && (
                <Alert type="success" showIcon>
                    {success}
                </Alert>
            )}

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
                        loading={isSeeding}
                        onClick={handleSeedGlobalExercises}
                    >
                        Lancer le seed
                    </Button>
                </div>
            </Card>
        </div>
    )
}

export default AdminDevPage
