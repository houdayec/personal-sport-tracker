import dayjs from 'dayjs'
import { Link, useParams } from 'react-router-dom'
import { Alert, Button, Card, Spinner, Tag } from '@/components/ui'
import Chart from '@/components/shared/Chart'
import { FITNESS_ROUTES } from '@/features/fitness/constants/routes'
import {
    formatDuration,
    useWorkoutHistoryDetail,
} from '@/features/fitness/training/hooks/useWorkoutHistory'
import { formatRunningTypeLabel } from '@/features/fitness/training/utils/runningType'
import { HiOutlineArrowLeft, HiOutlineRefresh } from 'react-icons/hi'

const hiitFormatLabel: Record<'interval' | 'circuit', string> = {
    interval: 'Intervalles',
    circuit: 'Circuit',
}

const formatElapsed = (seconds: number): string => {
    const safe = Math.max(0, Math.round(seconds))
    const hours = Math.floor(safe / 3600)
    const minutes = Math.floor((safe % 3600) / 60)
    const secs = safe % 60

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs
            .toString()
            .padStart(2, '0')}`
    }

    return `${minutes}:${secs.toString().padStart(2, '0')}`
}

const WorkoutHistoryDetailPage = () => {
    const { sessionId } = useParams<{ sessionId: string }>()
    const { session, durationMs, isLoading, error, loadSession } =
        useWorkoutHistoryDetail(sessionId)

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-300">
                        Historique
                    </p>
                    <h3 className="mt-1 text-2xl font-semibold">Détail de séance</h3>
                </div>
                <div className="flex gap-2">
                    <Button
                        size="sm"
                        asElement={Link}
                        to={FITNESS_ROUTES.trainingHistory}
                        icon={<HiOutlineArrowLeft />}
                    >
                        Retour historique
                    </Button>
                    <Button size="sm" icon={<HiOutlineRefresh />} onClick={loadSession}>
                        Rafraîchir
                    </Button>
                </div>
            </div>

            {error && (
                <Alert type="danger" showIcon>
                    {error}
                </Alert>
            )}

            <Card>
                {isLoading ? (
                    <div className="flex min-h-[180px] items-center justify-center">
                        <Spinner size={34} />
                    </div>
                ) : !session ? (
                    <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center dark:border-gray-600">
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            Séance introuvable.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-5">
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                            <Card>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Date</p>
                                <p className="mt-2 font-semibold">
                                    {session.startedAt
                                        ? dayjs(session.startedAt.toDate()).format(
                                              'DD/MM/YYYY HH:mm',
                                          )
                                        : session.endedAt
                                          ? dayjs(session.endedAt.toDate()).format(
                                                'DD/MM/YYYY HH:mm',
                                            )
                                        : 'Date indisponible'}
                                </p>
                            </Card>
                            <Card>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Modèle</p>
                                <p className="mt-2 font-semibold">
                                    {session.sourceTemplate?.name ||
                                        session.templateName ||
                                        'Non renseigné'}
                                </p>
                            </Card>
                            <Card>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Statut</p>
                                <div className="mt-2">
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
                                </div>
                            </Card>
                            <Card>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Durée</p>
                                <p className="mt-2 font-semibold">{formatDuration(durationMs)}</p>
                            </Card>
                        </div>

                        {session.sessionType === 'strength' && (
                            <Card header="Prévu vs réalisé">
                                <div className="space-y-4">
                                    {session.plannedExercises.map((plannedExercise) => {
                                        const performed =
                                            session.performedExercises[
                                                plannedExercise.plannedExerciseId
                                            ]

                                        return (
                                            <div
                                                key={plannedExercise.plannedExerciseId}
                                                className="rounded-xl border border-gray-200 p-4 dark:border-gray-700"
                                            >
                                                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                                    <div>
                                                        <p className="font-semibold">{plannedExercise.name}</p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                                            Ordre prévu: {plannedExercise.orderIndex + 1}
                                                        </p>
                                                    </div>
                                                    <Tag
                                                        className={
                                                            performed?.status === 'completed'
                                                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-100'
                                                                : performed?.status === 'in_progress'
                                                                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-100'
                                                                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
                                                        }
                                                    >
                                                        {performed?.status === 'completed'
                                                            ? 'Terminé'
                                                            : performed?.status === 'in_progress'
                                                              ? 'En cours'
                                                              : 'Non commencé'}
                                                    </Tag>
                                                </div>

                                                <div className="grid gap-3 lg:grid-cols-2">
                                                    <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/70">
                                                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                                            Prévu
                                                        </p>
                                                        {plannedExercise.plannedSets.length > 0 ? (
                                                            <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-200">
                                                                {plannedExercise.plannedSets.map((set) => (
                                                                    <li key={set.setNumber}>
                                                                        Set {set.setNumber}: reps{' '}
                                                                        {set.targetReps || '—'} / charge{' '}
                                                                        {set.targetWeight || '—'}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        ) : (
                                                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                                                Aucun set prévu.
                                                            </p>
                                                        )}
                                                    </div>

                                                    <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/70">
                                                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                                            Réalisé
                                                        </p>
                                                        {performed?.sets?.length ? (
                                                            <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-200">
                                                                {performed.sets.map((set) => (
                                                                    <li key={set.setNumber}>
                                                                        Set {set.setNumber}: reps {set.reps || '—'}
                                                                        {' / '}charge {set.weight || '—'}
                                                                        {set.notes
                                                                            ? ` / note: ${set.notes}`
                                                                            : ''}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        ) : (
                                                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                                                Aucun set réalisé.
                                                            </p>
                                                        )}

                                                        {performed?.notes && (
                                                            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                                                                Note: {performed.notes}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </Card>
                        )}

                        {session.sessionType === 'hiit' && (
                            <Card header="Détails HIIT">
                                <div className="space-y-2 text-sm text-gray-700 dark:text-gray-200">
                                    <p>Format: {hiitFormatLabel[session.hiitData?.format || 'interval']}</p>
                                    <p>
                                        Tours: {session.hiitData?.completedRounds || 0}/
                                        {session.hiitData?.rounds || 0}
                                    </p>
                                    <p>
                                        Effort/Repos: {session.hiitData?.workSec || 0}s /{' '}
                                        {session.hiitData?.restSec || 0}s
                                    </p>
                                    {session.hiitData?.notes && <p>Notes: {session.hiitData.notes}</p>}
                                </div>
                            </Card>
                        )}

                        {session.sessionType === 'running' && (
                            <Card header="Détails course">
                                <div className="space-y-2 text-sm text-gray-700 dark:text-gray-200">
                                    <p>Type: {formatRunningTypeLabel(session.runningData?.runType)}</p>
                                    <p>
                                        Distance: {session.runningData?.distanceKm || '—'} km
                                    </p>
                                    <p>
                                        Durée: {session.runningData?.durationSec || '—'} sec
                                    </p>
                                    <p>
                                        Allure moyenne: {session.runningData?.avgPaceSecPerKm || '—'} sec/km
                                    </p>
                                    {session.runningData?.notes && (
                                        <p>Notes: {session.runningData.notes}</p>
                                    )}
                                </div>

                                {session.runningData?.gpxData && (
                                    <div className="mt-5 space-y-4">
                                        <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                                            <h6 className="font-semibold">Données GPX</h6>
                                            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Fichier</p>
                                                    <p className="mt-1 text-sm font-semibold">
                                                        {session.runningData.gpxData.fileName}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Distance</p>
                                                    <p className="mt-1 text-sm font-semibold">
                                                        {session.runningData.gpxData.summary.distanceKm} km
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Durée</p>
                                                    <p className="mt-1 text-sm font-semibold">
                                                        {session.runningData.gpxData.summary.durationSec} sec
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Allure moyenne</p>
                                                    <p className="mt-1 text-sm font-semibold">
                                                        {session.runningData.gpxData.summary.avgPaceSecPerKm || '—'} sec/km
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Dénivelé +</p>
                                                    <p className="mt-1 text-sm font-semibold">
                                                        {session.runningData.gpxData.summary.elevationGainM || 0} m
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Dénivelé -</p>
                                                    <p className="mt-1 text-sm font-semibold">
                                                        {session.runningData.gpxData.summary.elevationLossM || 0} m
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Altitude min</p>
                                                    <p className="mt-1 text-sm font-semibold">
                                                        {session.runningData.gpxData.summary.minElevationM || '—'} m
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Altitude max</p>
                                                    <p className="mt-1 text-sm font-semibold">
                                                        {session.runningData.gpxData.summary.maxElevationM || '—'} m
                                                    </p>
                                                </div>
                                            </div>
                                            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                                                Points affichés: {session.runningData.gpxData.summary.storedPointCount} /{' '}
                                                {session.runningData.gpxData.summary.originalPointCount} (échantillonnage automatique si trace volumineuse).
                                            </p>
                                        </div>

                                        {session.runningData.gpxData.points.length > 1 && (
                                            <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                                                <h6 className="font-semibold">Progression distance</h6>
                                                <Chart
                                                    type="line"
                                                    height={280}
                                                    xAxis={session.runningData.gpxData.points.map((point) =>
                                                        formatElapsed(point.elapsedSec),
                                                    )}
                                                    series={[
                                                        {
                                                            name: 'Distance (km)',
                                                            data: session.runningData.gpxData.points.map(
                                                                (point) => point.distanceKm,
                                                            ),
                                                        },
                                                    ]}
                                                    customOptions={{
                                                        yaxis: {
                                                            labels: {
                                                                formatter: (value: number) =>
                                                                    `${Number(value.toFixed(2))}`,
                                                            },
                                                        },
                                                    }}
                                                />
                                            </div>
                                        )}

                                        {session.runningData.gpxData.points.some(
                                            (point) => typeof point.eleM === 'number',
                                        ) && (
                                            <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                                                <h6 className="font-semibold">Profil d’altitude</h6>
                                                <Chart
                                                    type="line"
                                                    height={280}
                                                    xAxis={session.runningData.gpxData.points.map((point) =>
                                                        formatElapsed(point.elapsedSec),
                                                    )}
                                                    series={[
                                                        {
                                                            name: 'Altitude (m)',
                                                            data: session.runningData.gpxData.points.map(
                                                                (point) => point.eleM ?? null,
                                                            ),
                                                        },
                                                    ]}
                                                    customOptions={{
                                                        yaxis: {
                                                            labels: {
                                                                formatter: (value: number) =>
                                                                    `${Number(value.toFixed(0))}`,
                                                            },
                                                        },
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </Card>
                        )}
                    </div>
                )}
            </Card>
        </div>
    )
}

export default WorkoutHistoryDetailPage
