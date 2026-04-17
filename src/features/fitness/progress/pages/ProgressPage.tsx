import { Link } from 'react-router-dom'
import { Alert, Button, Card, Input, Segment, Spinner } from '@/components/ui'
import useProgressTracking from '@/features/fitness/progress/hooks/useProgressTracking'
import ProgressLineCard from '@/features/fitness/progress/components/ProgressLineCard'
import { BODY_MEASUREMENT_FIELDS } from '@/features/fitness/body/types/bodyMeasurement'
import type { ProgressTimeRange } from '@/features/fitness/progress/types/progress'
import { FITNESS_ROUTES } from '@/features/fitness/constants/routes'
import { HiOutlineRefresh } from 'react-icons/hi'

const ProgressPage = () => {
    const {
        timeRange,
        selectedMeasurement,
        selectedMeasurementMeta,
        weightPoints,
        measurementPoints,
        selectedMeasurementSeries,
        isLoading,
        error,
        setTimeRange,
        setSelectedMeasurement,
        reload,
    } = useProgressTracking()

    const currentWeightUnit = weightPoints[weightPoints.length - 1]?.unit || 'kg'
    const currentMeasurementUnit =
        selectedMeasurementSeries[selectedMeasurementSeries.length - 1]?.unit ||
        measurementPoints[measurementPoints.length - 1]?.unit ||
        'cm'

    return (
        <div className="space-y-6">
            <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-300">
                    Progression
                </p>
                <h3 className="mt-1 text-2xl font-semibold">Body Tracking</h3>
                <p className="mt-2 max-w-3xl text-sm text-gray-600 dark:text-gray-300">
                    Visualisation simple de l’évolution du poids et des mensurations.
                </p>
            </div>

            {error && (
                <Alert type="danger" showIcon>
                    {error}
                </Alert>
            )}

            <Card>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="font-semibold">Filtre temporel</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            Afficher les 30, 90 derniers jours ou tout l’historique.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            size="sm"
                            asElement={Link}
                            to={FITNESS_ROUTES.progressExercise}
                        >
                            Exercise Progress
                        </Button>
                        <Segment
                            size="sm"
                            value={timeRange}
                            onChange={(value) => setTimeRange(value as ProgressTimeRange)}
                        >
                            <Segment.Item value="30">30j</Segment.Item>
                            <Segment.Item value="90">90j</Segment.Item>
                            <Segment.Item value="all">Tout</Segment.Item>
                        </Segment>

                        <Button
                            size="sm"
                            icon={<HiOutlineRefresh />}
                            onClick={reload}
                            disabled={isLoading}
                        >
                            Rafraîchir
                        </Button>
                    </div>
                </div>
            </Card>

            {isLoading ? (
                <Card>
                    <div className="flex min-h-[220px] items-center justify-center">
                        <Spinner size={34} />
                    </div>
                </Card>
            ) : (
                <div className="space-y-6">
                    <ProgressLineCard
                        title="Poids"
                        subtitle="Évolution du poids mesuré"
                        points={weightPoints.map((point) => ({
                            date: point.date,
                            value: point.value,
                        }))}
                        valueLabel={`Poids (${currentWeightUnit})`}
                        emptyMessage="Aucune donnée de poids disponible pour cette période."
                    />

                    <Card>
                        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <h5>Mensurations</h5>
                                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                                    Sélectionne la mesure à afficher.
                                </p>
                            </div>

                            <div className="w-full lg:w-72">
                                <Input
                                    asElement="select"
                                    value={selectedMeasurement}
                                    onChange={(event) =>
                                        setSelectedMeasurement(event.target.value as typeof selectedMeasurement)
                                    }
                                >
                                    {BODY_MEASUREMENT_FIELDS.map((field) => (
                                        <option key={field.key} value={field.key}>
                                            {field.label}
                                        </option>
                                    ))}
                                </Input>
                            </div>
                        </div>

                        <ProgressLineCard
                            title={selectedMeasurementMeta.label}
                            subtitle={`Évolution de ${selectedMeasurementMeta.label.toLowerCase()}`}
                            points={selectedMeasurementSeries.map((point) => ({
                                date: point.date,
                                value: point.value,
                            }))}
                            valueLabel={`${selectedMeasurementMeta.label} (${currentMeasurementUnit})`}
                            emptyMessage="Aucune donnée de mensuration disponible pour cette période."
                            wrapCard={false}
                        />
                    </Card>
                </div>
            )}
        </div>
    )
}

export default ProgressPage
