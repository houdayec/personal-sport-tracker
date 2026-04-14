import { useTranslation } from 'react-i18next'

const FitnessDashboardPage = () => {
    const { t } = useTranslation()

    return (
        <div className="space-y-2">
            <h3 className="text-xl font-semibold">{t('fitness.dashboard.title')}</h3>
            <p className="text-gray-500 dark:text-gray-400">
                {t('fitness.dashboard.description')}
            </p>
        </div>
    )
}

export default FitnessDashboardPage
