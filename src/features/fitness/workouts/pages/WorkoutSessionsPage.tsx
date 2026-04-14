import { useTranslation } from 'react-i18next'

const WorkoutSessionsPage = () => {
    const { t } = useTranslation()

    return (
        <div className="space-y-2">
            <h3 className="text-xl font-semibold">{t('fitness.workouts.title')}</h3>
            <p className="text-gray-500 dark:text-gray-400">
                {t('fitness.workouts.description')}
            </p>
        </div>
    )
}

export default WorkoutSessionsPage
