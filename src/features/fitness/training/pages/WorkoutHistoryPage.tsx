import dayjs from 'dayjs'
import { Link, generatePath } from 'react-router-dom'
import { Alert, Button, Card, Spinner, Tag } from '@/components/ui'
import { FITNESS_ROUTES } from '@/features/fitness/constants/routes'
import {
    formatDuration,
    useWorkoutHistoryList,
} from '@/features/fitness/training/hooks/useWorkoutHistory'
import { HiOutlineClock, HiOutlineRefresh, HiOutlineClipboardList } from 'react-icons/hi'

const WorkoutHistoryPage = () => {
    const { sessionSummaries, isLoading, error, loadHistory } =
        useWorkoutHistoryList()

    return (
        <div className="space-y-6">
            <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-orange-600 dark:text-orange-300">
                    Entraînement
                </p>
                <h3 className="mt-1 text-2xl font-semibold">Historique des séances</h3>
                <p className="mt-2 max-w-3xl text-sm text-gray-600 dark:text-gray-300">
                    Consultation des sessions réelles sauvegardées dans
                    `users/{'{uid}'}/workout_sessions`, sans dépendance aux templates actuels.
                </p>
            </div>

            {error && (
                <Alert type="danger" showIcon>
                    {error}
                </Alert>
            )}

            <Card>
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <HiOutlineClipboardList className="text-xl text-gray-500" />
                        <p className="font-semibold">Sessions triées par date décroissante</p>
                    </div>
                    <Button
                        size="sm"
                        icon={<HiOutlineRefresh />}
                        onClick={loadHistory}
                        disabled={isLoading}
                    >
                        Rafraîchir
                    </Button>
                </div>
            </Card>

            <Card>
                {isLoading ? (
                    <div className="flex min-h-[180px] items-center justify-center">
                        <Spinner size={34} />
                    </div>
                ) : sessionSummaries.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center dark:border-gray-600">
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            Aucune séance enregistrée pour le moment.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {sessionSummaries.map((session) => {
                            const sessionDate =
                                session.startedAt ||
                                session.completedAt ||
                                session.createdAt ||
                                session.updatedAt

                            return (
                                <div
                                    key={session.id}
                                    className="rounded-xl border border-gray-200 p-4 dark:border-gray-700"
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-4">
                                        <div>
                                            <p className="font-semibold">
                                                {sessionDate
                                                    ? dayjs(sessionDate.toDate()).format(
                                                          'DD/MM/YYYY HH:mm',
                                                      )
                                                    : 'Date indisponible'}
                                            </p>
                                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                                                Template:{' '}
                                                {session.templateName || 'Non renseigné'}
                                            </p>
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                <Tag
                                                    className={
                                                        session.status === 'completed'
                                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-100'
                                                            : 'bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-100'
                                                    }
                                                >
                                                    {session.status === 'completed'
                                                        ? 'Terminée'
                                                        : 'En cours'}
                                                </Tag>
                                                <Tag className="bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                                                    {session.plannedExerciseCount} exercice
                                                    {session.plannedExerciseCount > 1 ? 's' : ''}
                                                </Tag>
                                                <Tag className="bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                                                    <span className="inline-flex items-center gap-1">
                                                        <HiOutlineClock />
                                                        Durée: {formatDuration(session.durationMs)}
                                                    </span>
                                                </Tag>
                                            </div>
                                        </div>

                                        <div>
                                            <Button
                                                size="sm"
                                                asElement={Link}
                                                to={generatePath(
                                                    FITNESS_ROUTES.trainingHistoryDetail,
                                                    { sessionId: session.id },
                                                )}
                                            >
                                                Voir le détail
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </Card>
        </div>
    )
}

export default WorkoutHistoryPage
