import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import dayjs from 'dayjs'
import ConfettiGenerator from 'confetti-js'
import {
    Alert,
    Button,
    Card,
    Dialog,
    Input,
    Progress,
    Select,
    Spinner,
    Tag,
} from '@/components/ui'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import HiitActiveSessionScreen from '@/features/fitness/training/components/HiitActiveSessionScreen'
import WorkoutExerciseDetailDialog from '@/features/fitness/training/components/WorkoutExerciseDetailDialog'
import useWorkoutTodaySession from '@/features/fitness/training/hooks/useWorkoutTodaySession'
import type { Exercise } from '@/features/fitness/training/types/exercise'
import type {
    PerformedWorkoutExercise,
    PlannedWorkoutExercise,
    PerformedExerciseStatus,
    SavePerformedExerciseInput,
    TemplateWorkoutSet,
    UpdateHiitSessionInput,
} from '@/features/fitness/training/types/workoutSession'
import { isCardioNoSetsExercise } from '@/features/fitness/training/utils/exerciseKind'
import { formatRunningTypeLabel } from '@/features/fitness/training/utils/runningType'
import {
    HiOutlinePlay,
    HiOutlineRefresh,
    HiOutlineCheckCircle,
    HiOutlineClock,
    HiOutlinePlus,
    HiOutlinePencil,
    HiOutlineUpload,
} from 'react-icons/hi'

const statusToTagClass: Record<PerformedExerciseStatus, string> = {
    not_started: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
    in_progress: 'bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-100',
    completed:
        'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-100',
}

const statusToLabel: Record<PerformedExerciseStatus, string> = {
    not_started: 'Non commencé',
    in_progress: 'En cours',
    completed: 'Terminé',
}

const sessionTypeLabel = {
    strength: 'Force',
    hiit: 'HIIT',
    running: 'Course',
} as const

const hiitFormatLabel: Record<'interval' | 'circuit', string> = {
    interval: 'Intervalles',
    circuit: 'Circuit',
}

interface ExerciseLibraryOption {
    value: string
    label: string
    exercise: Exercise
}

const toExerciseLibraryOption = (exercise: Exercise): ExerciseLibraryOption => {
    const sourceLabel = exercise.exerciseSource === 'global' ? 'Commun' : 'Perso'
    const details = [exercise.muscleGroup, exercise.equipment]
        .map((value) => value.trim())
        .filter(Boolean)
        .join(' · ')

    return {
        value: `${exercise.exerciseSource}:${exercise.id}`,
        label: details
            ? `${exercise.name} · ${sourceLabel} · ${details}`
            : `${exercise.name} · ${sourceLabel}`,
        exercise,
    }
}

const formatPlannedSetCell = (value?: string): string => {
    const normalized = (value || '').trim()
    return normalized || 'Libre'
}

const triggerSessionFinishedConfetti = () => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        return
    }

    const generators: Array<{
        canvas: HTMLCanvasElement
        instance: ConfettiGenerator
    }> = []

    const launchBurst = (side: 'left' | 'right') => {
        const canvas = document.createElement('canvas')
        canvas.style.position = 'fixed'
        canvas.style.top = '0'
        canvas.style.left = side === 'left' ? '0' : '50%'
        canvas.style.width = '50%'
        canvas.style.height = '100%'
        canvas.style.pointerEvents = 'none'
        canvas.style.zIndex = '2000'
        document.body.appendChild(canvas)

        const confetti = new ConfettiGenerator({
            target: canvas,
            max: 120,
            size: 1.2,
            animate: true,
            respawn: true,
            rotate: true,
            start_from_edge: true,
            clock: 20,
            width: Math.max(1, Math.floor(window.innerWidth / 2)),
            height: window.innerHeight,
            colors: [
                [34, 197, 94],
                [74, 222, 128],
                [59, 130, 246],
                [96, 165, 250],
                [245, 158, 11],
            ],
        })

        confetti.render()
        generators.push({
            canvas,
            instance: confetti,
        })
    }

    launchBurst('left')
    launchBurst('right')

    const secondWaveTimeout = window.setTimeout(() => {
        launchBurst('left')
        launchBurst('right')
    }, 550)

    window.setTimeout(() => {
        window.clearTimeout(secondWaveTimeout)
        generators.forEach(({ instance, canvas }) => {
            instance.clear()
            canvas.remove()
        })
    }, 3800)
}

const WorkoutTodayPage = () => {
    const {
        exerciseOptions,
        templates,
        activeSession,
        completedExerciseCount,
        isLoading,
        isStarting,
        isAddingExercise,
        isSavingExercise,
        isUploadingGpx,
        isFinishingSession,
        error,
        loadData,
        startSessionFromTemplate,
        addExerciseToSession,
        savePerformedExercise,
        completeExercise,
        saveHiitProgress,
        saveRunningProgress,
        uploadRunningGpx,
        finishSession,
    } = useWorkoutTodaySession()

    const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null)
    const [isFinishConfirmOpen, setIsFinishConfirmOpen] = useState(false)
    const [isAddExerciseOpen, setIsAddExerciseOpen] = useState(false)
    const [selectedExerciseOption, setSelectedExerciseOption] =
        useState<ExerciseLibraryOption | null>(null)
    const [addExerciseDialogError, setAddExerciseDialogError] = useState<string | null>(
        null,
    )
    const [isHiitActiveOpen, setIsHiitActiveOpen] = useState(false)
    const [runningDistanceKm, setRunningDistanceKm] = useState('')
    const [runningDurationSec, setRunningDurationSec] = useState('')
    const [runningAvgPaceSecPerKm, setRunningAvgPaceSecPerKm] = useState('')
    const [runningNotes, setRunningNotes] = useState('')
    const runningGpxInputRef = useRef<HTMLInputElement | null>(null)
    const autoOpenedHiitSessionIdRef = useRef<string | null>(null)

    const selectedPlannedExercise = useMemo(() => {
        if (!activeSession || !selectedExerciseId) {
            return null
        }

        return (
            activeSession.plannedExercises.find(
                (exercise) => exercise.plannedExerciseId === selectedExerciseId,
            ) || null
        )
    }, [activeSession, selectedExerciseId])

    const selectedPerformedExercise = useMemo(() => {
        if (!activeSession || !selectedExerciseId) {
            return null
        }

        return activeSession.performedExercises[selectedExerciseId] || null
    }, [activeSession, selectedExerciseId])

    const totalExercises = activeSession?.plannedExercises.length || 0
    const completionPercent =
        totalExercises > 0
            ? Math.round((completedExerciseCount / totalExercises) * 100)
            : 0
    const exerciseLibraryOptions = useMemo<ExerciseLibraryOption[]>(() => {
        return exerciseOptions
            .map(toExerciseLibraryOption)
            .sort((a, b) =>
                a.exercise.name.localeCompare(b.exercise.name, 'fr', {
                    sensitivity: 'base',
                }),
            )
    }, [exerciseOptions])

    useEffect(() => {
        if (!activeSession || activeSession.sessionType !== 'hiit') {
            setIsHiitActiveOpen(false)
            autoOpenedHiitSessionIdRef.current = null
            return
        }

        if (autoOpenedHiitSessionIdRef.current !== activeSession.id) {
            autoOpenedHiitSessionIdRef.current = activeSession.id
            setIsHiitActiveOpen(true)
        }
    }, [activeSession])

    useEffect(() => {
        if (!activeSession || activeSession.sessionType !== 'running') {
            return
        }

        setRunningDistanceKm(
            activeSession.runningData?.distanceKm
                ? String(activeSession.runningData.distanceKm)
                : '',
        )
        setRunningDurationSec(
            activeSession.runningData?.durationSec
                ? String(activeSession.runningData.durationSec)
                : '',
        )
        setRunningAvgPaceSecPerKm(
            activeSession.runningData?.avgPaceSecPerKm
                ? String(activeSession.runningData.avgPaceSecPerKm)
                : '',
        )
        setRunningNotes(activeSession.runningData?.notes || '')
    }, [activeSession])

    useEffect(() => {
        if (activeSession?.sessionType === 'strength') {
            return
        }
        setSelectedExerciseId(null)
    }, [activeSession])

    const openExercise = (exercise: PlannedWorkoutExercise) => {
        setSelectedExerciseId(exercise.plannedExerciseId)
    }

    const openExerciseOnSmallScreens = (exercise: PlannedWorkoutExercise) => {
        if (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches) {
            openExercise(exercise)
        }
    }

    const closeExerciseDialog = () => {
        setSelectedExerciseId(null)
    }

    const handleStartTemplate = async (templateId: string) => {
        try {
            await startSessionFromTemplate(templateId)
        } catch {
            // Error managed in hook state.
        }
    }

    const closeAddExerciseDialog = () => {
        if (isAddingExercise) {
            return
        }

        setIsAddExerciseOpen(false)
        setSelectedExerciseOption(null)
        setAddExerciseDialogError(null)
    }

    const handleAddExerciseToSession = async () => {
        if (!selectedExerciseOption) {
            setAddExerciseDialogError('Sélectionne un exercice à ajouter.')
            return
        }

        try {
            setAddExerciseDialogError(null)
            await addExerciseToSession(selectedExerciseOption.exercise)
            closeAddExerciseDialog()
        } catch (addError) {
            if (addError instanceof Error && addError.message) {
                setAddExerciseDialogError(addError.message)
            } else {
                setAddExerciseDialogError('Impossible d’ajouter l’exercice.')
            }
        }
    }

    const handleHiitProgressUpdate = async (input: UpdateHiitSessionInput) => {
        if (!activeSession || activeSession.sessionType !== 'hiit') {
            return
        }

        try {
            await saveHiitProgress(input, { silent: true })
        } catch {
            // Error managed in hook state.
        }
    }

    const handleOpenHiitActiveScreen = () => {
        setIsHiitActiveOpen(true)
    }

    const handleCloseHiitActiveScreen = () => {
        setIsHiitActiveOpen(false)
    }

    const handleFinalizeHiitSession = async () => {
        try {
            await finishSession()
            triggerSessionFinishedConfetti()
            setIsHiitActiveOpen(false)
            setIsFinishConfirmOpen(false)
        } catch {
            // Error managed in hook state.
        }
    }

    const handleSaveRunningProgress = async () => {
        if (!activeSession || activeSession.sessionType !== 'running') {
            return
        }

        try {
            await saveRunningProgress({
                distanceKm: runningDistanceKm ? Number(runningDistanceKm) : undefined,
                durationSec: runningDurationSec ? Number(runningDurationSec) : undefined,
                avgPaceSecPerKm: runningAvgPaceSecPerKm
                    ? Number(runningAvgPaceSecPerKm)
                    : undefined,
                notes: runningNotes,
            })
        } catch {
            // Error managed in hook state.
        }
    }

    const handleOpenGpxPicker = () => {
        runningGpxInputRef.current?.click()
    }

    const handleRunningGpxFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        event.target.value = ''

        if (!file) {
            return
        }

        try {
            await uploadRunningGpx(file)
        } catch {
            // Error managed in hook state.
        }
    }

    const buildQuickCompletePayload = (
        plannedExercise: PlannedWorkoutExercise,
        performedExercise?: PerformedWorkoutExercise | null,
    ): SavePerformedExerciseInput => {
        const isNoSetsExercise = isCardioNoSetsExercise(plannedExercise)
        const sets =
            isNoSetsExercise
                ? []
                : performedExercise?.sets && performedExercise.sets.length > 0
                  ? performedExercise.sets
                  : plannedExercise.plannedSets.map((set, index) => ({
                        setNumber: index + 1,
                        reps: set.targetReps || '',
                        weight: set.targetWeight || '',
                        notes: '',
                    }))

        return {
            plannedExerciseId: plannedExercise.plannedExerciseId,
            exerciseSource: plannedExercise.exerciseSource,
            exerciseId: plannedExercise.exerciseId,
            exerciseSnapshot: plannedExercise.exerciseSnapshot,
            name: plannedExercise.name,
            sets,
            notes: performedExercise?.notes || '',
            status: 'completed',
        }
    }

    const handleQuickCompleteExercise = async (
        plannedExercise: PlannedWorkoutExercise,
        performedExercise?: PerformedWorkoutExercise | null,
    ) => {
        if (performedExercise?.status === 'completed') {
            return
        }

        try {
            await completeExercise(
                buildQuickCompletePayload(plannedExercise, performedExercise),
            )
        } catch {
            // Error managed in hook state.
        }
    }

    const handleFinishSession = async () => {
        try {
            await finishSession()
            triggerSessionFinishedConfetti()
            setIsFinishConfirmOpen(false)
            setSelectedExerciseId(null)
        } catch {
            // Error managed in hook state.
        }
    }

    const renderTemplateLauncher = () => {
        if (templates.length === 0) {
            return (
                <Card>
                    <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center dark:border-gray-600">
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            Aucun template disponible pour démarrer une séance.
                        </p>
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            Ajoute au moins un template dans
                            <code className="mx-1 rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-gray-700">
                                users/{'{uid}'}/workout_templates
                            </code>
                            .
                        </p>
                    </div>
                </Card>
            )
        }

        return (
            <div className="grid gap-4 lg:grid-cols-2">
                {templates.map((template) => (
                    <Card key={template.id}>
                        <div className="flex h-full flex-col justify-between gap-4">
                            <div>
                                <h5>{template.name}</h5>
                                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                                    Type: {sessionTypeLabel[template.sessionType || 'strength']} ·{' '}
                                    {template.sessionType === 'strength'
                                        ? `${(template.strengthConfig?.exercises || template.exercises || []).length} exercices`
                                        : template.sessionType === 'hiit'
                                          ? `${template.hiitConfig?.rounds || 0} tours`
                                          : formatRunningTypeLabel(
                                                template.runningConfig?.runType,
                                            )}
                                </p>
                                {template.description && (
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                        {template.description}
                                    </p>
                                )}
                            </div>
                            <div className="flex justify-end">
                                <Button
                                    size="sm"
                                    variant="solid"
                                    icon={<HiOutlinePlay />}
                                    loading={isStarting}
                                    onClick={() => handleStartTemplate(template.id)}
                                >
                                    Lancer cette séance
                                </Button>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        )
    }

    const renderActiveSession = () => {
        if (!activeSession) {
            return null
        }

        if (activeSession.sessionType === 'hiit') {
            return (
                <div className="space-y-4">
                    <Card>
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <h5>Séance HIIT en cours</h5>
                                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                                    Format:{' '}
                                    {hiitFormatLabel[activeSession.hiitData?.format || 'interval']} ·{' '}
                                    {activeSession.hiitData?.workSec || 0}s travail /{' '}
                                    {activeSession.hiitData?.restSec || 0}s repos
                                </p>
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    Tours complétés: {activeSession.hiitData?.completedRounds || 0}
                                    /{activeSession.hiitData?.rounds || 0}
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    size="sm"
                                    variant="solid"
                                    icon={<HiOutlinePlay />}
                                    onClick={handleOpenHiitActiveScreen}
                                >
                                    Ouvrir l’écran actif
                                </Button>
                                <Button
                                    size="sm"
                                    variant="twoTone"
                                    icon={<HiOutlineCheckCircle />}
                                    loading={isFinishingSession}
                                    onClick={() => setIsFinishConfirmOpen(true)}
                                >
                                    Terminer la séance
                                </Button>
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <div className="flex flex-col gap-3 text-sm text-gray-600 dark:text-gray-300">
                            <p>
                                Mode immersif mobile avec timer circulaire, audio et gestion automatique des phases.
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Si tu fermes l’écran actif, la séance reste en cours et peut être reprise.
                            </p>
                            <Button
                                size="sm"
                                variant="solid"
                                icon={<HiOutlinePlay />}
                                onClick={handleOpenHiitActiveScreen}
                            >
                                Reprendre la séance HIIT active
                            </Button>
                        </div>
                    </Card>
                </div>
            )
        }

        if (activeSession.sessionType === 'running') {
            return (
                <div className="space-y-4">
                    <input
                        ref={runningGpxInputRef}
                        type="file"
                        accept=".gpx,application/gpx+xml,application/xml,text/xml"
                        className="hidden"
                        onChange={handleRunningGpxFileChange}
                    />

                    <Card>
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <h5>Séance course en cours</h5>
                                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                                    Type:{' '}
                                    {formatRunningTypeLabel(activeSession.runningData?.runType)}
                                </p>
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    Cible:{' '}
                                    {activeSession.runningData?.targetDistanceKm
                                        ? `${activeSession.runningData.targetDistanceKm} km`
                                        : '—'}{' '}
                                    /{' '}
                                    {activeSession.runningData?.targetDurationMin
                                        ? `${activeSession.runningData.targetDurationMin} min`
                                        : '—'}
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    size="sm"
                                    icon={<HiOutlineUpload />}
                                    loading={isUploadingGpx}
                                    disabled={isSavingExercise || isFinishingSession}
                                    onClick={handleOpenGpxPicker}
                                >
                                    Importer GPX
                                </Button>
                                <Button
                                    size="sm"
                                    variant="solid"
                                    icon={<HiOutlineCheckCircle />}
                                    loading={isFinishingSession}
                                    onClick={() => setIsFinishConfirmOpen(true)}
                                >
                                    Terminer la séance
                                </Button>
                            </div>
                        </div>
                    </Card>

                    {activeSession.runningData?.gpxData && (
                        <Card header="Trace GPX importée">
                            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                                <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/70">
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Fichier</p>
                                    <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-100">
                                        {activeSession.runningData.gpxData.fileName}
                                    </p>
                                </div>
                                <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/70">
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Distance GPX</p>
                                    <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-100">
                                        {activeSession.runningData.gpxData.summary.distanceKm} km
                                    </p>
                                </div>
                                <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/70">
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Durée GPX</p>
                                    <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-100">
                                        {activeSession.runningData.gpxData.summary.durationSec} sec
                                    </p>
                                </div>
                                <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/70">
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Points</p>
                                    <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-100">
                                        {activeSession.runningData.gpxData.summary.storedPointCount}/
                                        {activeSession.runningData.gpxData.summary.originalPointCount}
                                    </p>
                                </div>
                            </div>
                            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                                Importé le{' '}
                                {dayjs(activeSession.runningData.gpxData.uploadedAtMs).format(
                                    'DD/MM/YYYY HH:mm',
                                )}
                                .
                            </p>
                        </Card>
                    )}

                    <Card header="Données de course">
                        <div className="grid gap-3 md:grid-cols-2">
                            <Input
                                type="number"
                                min={0}
                                step={0.1}
                                value={runningDistanceKm}
                                placeholder="Distance (km)"
                                onChange={(event) =>
                                    setRunningDistanceKm(event.target.value)
                                }
                            />
                            <Input
                                type="number"
                                min={0}
                                value={runningDurationSec}
                                placeholder="Durée (sec)"
                                onChange={(event) =>
                                    setRunningDurationSec(event.target.value)
                                }
                            />
                            <Input
                                type="number"
                                min={0}
                                value={runningAvgPaceSecPerKm}
                                placeholder="Allure moyenne (sec/km)"
                                onChange={(event) =>
                                    setRunningAvgPaceSecPerKm(event.target.value)
                                }
                            />
                            <Input
                                textArea
                                rows={3}
                                value={runningNotes}
                                placeholder="Notes course"
                                onChange={(event) => setRunningNotes(event.target.value)}
                            />
                        </div>
                        <div className="mt-3 flex justify-end">
                            <Button
                                size="sm"
                                variant="solid"
                                loading={isSavingExercise}
                                onClick={handleSaveRunningProgress}
                            >
                                Sauvegarder progression
                            </Button>
                        </div>
                    </Card>
                </div>
            )
        }

        return (
            <div className="space-y-4">
                <Card>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h5>Séance en cours</h5>
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                                Démarrée le{' '}
                                {activeSession.startedAt
                                    ? dayjs(activeSession.startedAt.toDate()).format(
                                          'DD/MM/YYYY HH:mm',
                                      )
                                    : 'maintenant'}
                                .
                            </p>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Les exercices de cette séance sont figés au démarrage pour garder un historique fidèle.
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <Tag className="bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                                    {completedExerciseCount}/{totalExercises} terminé
                                    {totalExercises > 1 ? 's' : ''}
                                </Tag>
                                {(activeSession.sourceTemplate?.name ||
                                    activeSession.templateName) && (
                                    <Tag className="bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-100">
                                        Modèle:{' '}
                                        {activeSession.sourceTemplate?.name ||
                                            activeSession.templateName}
                                    </Tag>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Button
                                size="sm"
                                icon={<HiOutlinePlus />}
                                loading={isAddingExercise}
                                disabled={isSavingExercise || isFinishingSession}
                                onClick={() => {
                                    setAddExerciseDialogError(null)
                                    setIsAddExerciseOpen(true)
                                }}
                            >
                                Ajouter exercice
                            </Button>
                            <Button
                                size="sm"
                                variant="solid"
                                icon={<HiOutlineCheckCircle />}
                                loading={isFinishingSession}
                                onClick={() => setIsFinishConfirmOpen(true)}
                            >
                                Terminer la séance
                            </Button>
                        </div>
                    </div>
                </Card>

                <Card header="Exercices de la séance">
                    <div className="space-y-3">
                        {activeSession.plannedExercises.map((exercise) => {
                            const performed =
                                activeSession.performedExercises[exercise.plannedExerciseId]
                            const status: PerformedExerciseStatus =
                                performed?.status || 'not_started'
                            const isNoSetsExercise =
                                isCardioNoSetsExercise(exercise)

                            return (
                                <div
                                    key={exercise.plannedExerciseId}
                                    className="cursor-pointer rounded-xl border border-gray-200 p-4 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/40 md:cursor-default md:hover:bg-transparent"
                                    onClick={() => openExerciseOnSmallScreens(exercise)}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter' || event.key === ' ') {
                                            event.preventDefault()
                                            openExerciseOnSmallScreens(exercise)
                                        }
                                    }}
                                    role="button"
                                    tabIndex={0}
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <p className="font-semibold">{exercise.name}</p>
                                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                Ordre template: {exercise.orderIndex + 1}
                                            </p>
                                            {isNoSetsExercise ? (
                                                <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                                                    Objectif cardio: sans sets (durée et distance dans les notes).
                                                </p>
                                            ) : (
                                                <>
                                                    <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                                                        Objectif: {exercise.plannedSets.length} set
                                                        {exercise.plannedSets.length > 1
                                                            ? 's'
                                                            : ''}
                                                    </p>
                                                    <div className="mt-2 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                                                        <div className="grid grid-cols-[56px_1fr_1fr] bg-gray-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-800 dark:text-gray-300">
                                                            <span>Set</span>
                                                            <span>Répétitions</span>
                                                            <span>Poids</span>
                                                        </div>
                                                        <div className="divide-y divide-gray-200 dark:divide-gray-700">
                                                            {exercise.plannedSets
                                                                .slice(0, 3)
                                                                .map((set: TemplateWorkoutSet, index: number) => (
                                                                    <div
                                                                        key={`${exercise.plannedExerciseId}_set_${index + 1}`}
                                                                        className="grid grid-cols-[56px_1fr_1fr] px-2 py-1.5 text-xs text-gray-700 dark:text-gray-200"
                                                                    >
                                                                        <span className="font-semibold">
                                                                            {index + 1}
                                                                        </span>
                                                                        <span>
                                                                            {formatPlannedSetCell(
                                                                                set.targetReps,
                                                                            )}
                                                                        </span>
                                                                        <span>
                                                                            {formatPlannedSetCell(
                                                                                set.targetWeight,
                                                                            )}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                        </div>
                                                        {exercise.plannedSets.length > 3 && (
                                                            <p className="border-t border-gray-200 px-2 py-1 text-[11px] text-gray-500 dark:border-gray-700 dark:text-gray-400">
                                                                +
                                                                {exercise.plannedSets.length - 3}{' '}
                                                                set
                                                                {exercise.plannedSets.length - 3 >
                                                                1
                                                                    ? 's'
                                                                    : ''}{' '}
                                                                supplémentaires
                                                            </p>
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                <Tag className={statusToTagClass[status]}>
                                                    {statusToLabel[status]}
                                                </Tag>
                                                <Tag className="bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                                                    {exercise.muscleGroup || 'Muscle non défini'}
                                                </Tag>
                                                <Tag className="bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                                                    {exercise.equipment || 'Matériel non défini'}
                                                </Tag>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            <Button
                                                size="xs"
                                                variant={
                                                    status === 'completed' ? 'default' : 'solid'
                                                }
                                                icon={<HiOutlineCheckCircle />}
                                                disabled={
                                                    isSavingExercise ||
                                                    status === 'completed'
                                                }
                                                onClick={(event) => {
                                                    event.stopPropagation()
                                                    handleQuickCompleteExercise(
                                                        exercise,
                                                        performed,
                                                    )
                                                }}
                                            >
                                                {status === 'completed'
                                                    ? 'Terminé'
                                                    : 'Exercice fait'}
                                            </Button>
                                            <Button
                                                size="xs"
                                                icon={<HiOutlinePencil />}
                                                className="hidden md:inline-flex"
                                                onClick={(event) => {
                                                    event.stopPropagation()
                                                    openExercise(exercise)
                                                }}
                                            >
                                                Ouvrir
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-300">
                        Entraînement
                    </p>
                    <h3 className="mt-1 text-2xl font-semibold">Séance du jour</h3>
                    <p className="mt-2 max-w-3xl text-sm text-gray-600 dark:text-gray-300">
                        Démarre ou reprends ta séance, puis note ce que tu fais
                        réellement, à ton rythme.
                    </p>
                </div>
                <Button
                    size="xs"
                    variant="plain"
                    icon={<HiOutlineRefresh />}
                    onClick={loadData}
                    disabled={isLoading || isStarting || isSavingExercise || isFinishingSession}
                >
                    Rafraîchir
                </Button>
            </div>

            {error && (
                <Alert type="danger" showIcon>
                    {error}
                </Alert>
            )}

            {isLoading ? (
                <Card>
                    <div className="flex min-h-[180px] items-center justify-center">
                        <Spinner size={34} />
                    </div>
                </Card>
            ) : activeSession ? (
                renderActiveSession()
            ) : (
                renderTemplateLauncher()
            )}

            {activeSession?.sessionType === 'strength' && (
                <>
                    <WorkoutExerciseDetailDialog
                        isOpen={Boolean(selectedExerciseId && selectedPlannedExercise)}
                        plannedExercise={selectedPlannedExercise}
                        performedExercise={selectedPerformedExercise}
                        isSaving={isSavingExercise}
                        onClose={closeExerciseDialog}
                        onSave={savePerformedExercise}
                        onComplete={completeExercise}
                    />

                    <Dialog
                        width={680}
                        isOpen={isAddExerciseOpen}
                        onClose={closeAddExerciseDialog}
                        onRequestClose={closeAddExerciseDialog}
                    >
                        <div className="px-6 py-5">
                            <h5>Ajouter un exercice</h5>
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                                Choisis un exercice de la bibliothèque (global ou personnalisé), puis ajoute-le à la séance.
                            </p>

                            {addExerciseDialogError && (
                                <Alert type="danger" className="mt-4">
                                    {addExerciseDialogError}
                                </Alert>
                            )}

                            <div className="mt-4">
                                <Select<ExerciseLibraryOption, false>
                                    options={exerciseLibraryOptions}
                                    value={selectedExerciseOption}
                                    placeholder="Rechercher un exercice..."
                                    isSearchable
                                    isClearable
                                    noOptionsMessage={({ inputValue }) =>
                                        inputValue.trim()
                                            ? 'Aucun exercice trouvé'
                                            : 'Aucun exercice disponible'
                                    }
                                    onChange={(option) => {
                                        setSelectedExerciseOption(option)
                                        setAddExerciseDialogError(null)
                                    }}
                                />
                            </div>

                            <div className="mt-5 rounded-b-lg bg-gray-100 px-1 py-3 text-right dark:bg-gray-700">
                                <Button
                                    className="ltr:mr-2 rtl:ml-2"
                                    size="sm"
                                    onClick={closeAddExerciseDialog}
                                    disabled={isAddingExercise}
                                >
                                    Annuler
                                </Button>
                                <Button
                                    size="sm"
                                    variant="solid"
                                    loading={isAddingExercise}
                                    disabled={!selectedExerciseOption}
                                    onClick={handleAddExerciseToSession}
                                >
                                    Ajouter à la séance
                                </Button>
                            </div>
                        </div>
                    </Dialog>
                </>
            )}

            {activeSession?.sessionType === 'hiit' &&
                activeSession.hiitData &&
                isHiitActiveOpen && (
                    <HiitActiveSessionScreen
                        hiitData={activeSession.hiitData}
                        isFinishingSession={isFinishingSession}
                        onProgressUpdate={handleHiitProgressUpdate}
                        onFinalizeSession={handleFinalizeHiitSession}
                        onExit={handleCloseHiitActiveScreen}
                    />
                )}

            <ConfirmDialog
                isOpen={isFinishConfirmOpen}
                type="warning"
                title="Terminer la séance"
                confirmText="Terminer"
                cancelText="Annuler"
                onClose={() => setIsFinishConfirmOpen(false)}
                onRequestClose={() => setIsFinishConfirmOpen(false)}
                onCancel={() => setIsFinishConfirmOpen(false)}
                onConfirm={handleFinishSession}
            >
                <p>
                    Cette action clôture la séance actuelle et la place dans
                    l’historique. Tu pourras toujours la consulter ensuite.
                </p>
                {activeSession?.sessionType === 'strength' ? (
                    <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-400/30 dark:bg-emerald-500/10">
                        <div className="flex items-end justify-between gap-3">
                            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-200">
                                Progression actuelle
                            </p>
                            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-100">
                                {completionPercent}%
                            </p>
                        </div>

                        <div className="mt-3">
                            <Progress
                                variant="line"
                                percent={completionPercent}
                                showInfo={false}
                            />
                        </div>

                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                            <p className="inline-flex items-center gap-2 text-emerald-700 dark:text-emerald-200">
                                <HiOutlineCheckCircle />
                                {completedExerciseCount}/{totalExercises} exercice
                                {totalExercises > 1 ? 's' : ''} terminé
                                {totalExercises > 1 ? 's' : ''}
                            </p>
                            <p className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-300">
                                <HiOutlineClock />
                                {Math.max(totalExercises - completedExerciseCount, 0)} restant
                                {Math.max(totalExercises - completedExerciseCount, 0) > 1
                                    ? 's'
                                    : ''}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-100">
                        Séance {activeSession?.sessionType ? sessionTypeLabel[activeSession.sessionType] : ''} prête à être archivée dans l’historique.
                    </div>
                )}
            </ConfirmDialog>
        </div>
    )
}

export default WorkoutTodayPage
