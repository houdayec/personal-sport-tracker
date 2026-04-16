import ProgressLineCard from '@/features/fitness/progress/components/ProgressLineCard'
import type { ExerciseProgressMetric } from '@/features/fitness/progress/types/exerciseProgress'

interface ExerciseProgressChartProps {
    exerciseName: string
    metric: ExerciseProgressMetric
    points: Array<{ date: Date; value: number }>
}

const ExerciseProgressChart = ({
    exerciseName,
    metric,
    points,
}: ExerciseProgressChartProps) => {
    const metricLabel = metric === 'weight' ? 'Charge max' : 'Répétitions totales'

    return (
        <ProgressLineCard
            title={exerciseName}
            subtitle={`Progression ${metric === 'weight' ? 'de la charge' : 'du volume de répétitions'}`}
            points={points}
            valueLabel={metricLabel}
            emptyMessage="Aucune donnée disponible pour cet exercice."
            wrapCard={false}
        />
    )
}

export default ExerciseProgressChart
