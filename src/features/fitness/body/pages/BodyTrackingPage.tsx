import { useTranslation } from 'react-i18next'

const BodyTrackingPage = () => {
    const { t } = useTranslation()

    return (
        <div className="space-y-2">
            <h3 className="text-xl font-semibold">{t('fitness.body.title')}</h3>
            <p className="text-gray-500 dark:text-gray-400">
                {t('fitness.body.description')}
            </p>
        </div>
    )
}

export default BodyTrackingPage
