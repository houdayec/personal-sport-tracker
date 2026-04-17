import { Link } from 'react-router-dom'
import {
    Alert,
    Button,
    Card,
    Input,
    Segment,
    Spinner,
    Tag,
} from '@/components/ui'
import { FITNESS_ROUTES } from '@/features/fitness/constants/routes'
import ExerciseProgressChart from '@/features/fitness/progress/components/ExerciseProgressChart'
import useExerciseProgress from '@/features/fitness/progress/hooks/useExerciseProgress'
import type { ExerciseProgressMetric } from '@/features/fitness/progress/types/exerciseProgress'
import {
    HiOutlineArrowLeft,
    HiOutlineRefresh,
} from 'react-icons/hi'

const ExerciseProgressPage = () => {
    const {
        exercises,
        selectedExercise,
        selectedExerciseId,
        metric,
        points,
        chartPoints,
        isLoadingExercises,
        isLoadingProgress,
        error,
        setSelectedExerciseId,
        setMetric,
        reloadExercises,
        reloadProgress,
    } = useExerciseProgress()

    const isLoading = isLoadingExercises || isLoadingProgress

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-300">
                        Progression
                    </p>
                    <h3 className="mt-1 text-2xl font-semibold">Exercise Progress</h3>
                    <p className="mt-2 max-w-3xl text-sm text-gray-600 dark:text-gray-300">
                        Suivi simple d’un exercice à partir des séances réalisées.
                    </p>
                </div>
                <Button
                    size="sm"
                    asElement={Link}
                    to={FITNESS_ROUTES.progress}
                    icon={<HiOutlineArrowLeft />}
                >
                    Retour progression
                </Button>
            </div>

            {error && (
                <Alert type="danger" showIcon>
                    {error}
                </Alert>
            )}

            <Card>
                <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto] lg:items-end">
                    <div>
                        <p className="mb-1 text-sm font-semibold">Exercice</p>
                        <Input
                            asElement="select"
                            value={selectedExerciseId}
                            onChange={(event) =>
                                setSelectedExerciseId(event.target.value)
                            }
                            disabled={isLoadingExercises || exercises.length === 0}
                        >
                            {exercises.length === 0 ? (
                                <option value="">Aucun exercice disponible</option>
                            ) : (
                                exercises.map((exercise) => (
                                    <option key={exercise.id} value={exercise.id}>
                                        {exercise.name}
                                    </option>
                                ))
                            )}
                        </Input>
                    </div>

                    <div>
                        <p className="mb-1 text-sm font-semibold">Métrique</p>
                        <Segment
                            size="sm"
                            value={metric}
                            onChange={(value) =>
                                setMetric(value as ExerciseProgressMetric)
                            }
                        >
                            <Segment.Item value="weight">Charge</Segment.Item>
                            <Segment.Item value="reps">Reps</Segment.Item>
                        </Segment>
                    </div>

                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            icon={<HiOutlineRefresh />}
                            onClick={reloadExercises}
                            disabled={isLoading}
                        >
                            Exercices
                        </Button>
                        <Button
                            size="sm"
                            icon={<HiOutlineRefresh />}
                            onClick={reloadProgress}
                            disabled={isLoading || !selectedExerciseId}
                        >
                            Progression
                        </Button>
                    </div>
                </div>
            </Card>

            <Card>
                {isLoading ? (
                    <div className="flex min-h-[220px] items-center justify-center">
                        <Spinner size={34} />
                    </div>
                ) : exercises.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center dark:border-gray-600">
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            Aucun exercice actif disponible.
                        </p>
                        <Button
                            className="mt-4"
                            size="sm"
                            asElement={Link}
                            to={FITNESS_ROUTES.trainingLibrary}
                        >
                            Ouvrir la bibliothèque d’exercices
                        </Button>
                    </div>
                ) : !selectedExercise ? (
                    <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center dark:border-gray-600">
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            Sélectionne un exercice.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <Tag className="bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-100">
                                {selectedExercise.name}
                            </Tag>
                            <Tag className="bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                                {points.length} séance{points.length > 1 ? 's' : ''}
                            </Tag>
                        </div>

                        <ExerciseProgressChart
                            exerciseName={selectedExercise.name}
                            metric={metric}
                            points={chartPoints}
                        />
                    </div>
                )}
            </Card>
        </div>
    )
}

export default ExerciseProgressPage
