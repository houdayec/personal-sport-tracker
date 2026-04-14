import { useTranslation } from 'react-i18next'

const AccessDenied = () => {
    const { t } = useTranslation()

    return (
        <div className="space-y-2">
            <h3 className="text-xl font-semibold">{t('pages.accessDenied.title')}</h3>
            <p className="text-gray-500 dark:text-gray-400">
                {t('pages.accessDenied.description')}
            </p>
        </div>
    )
}

export default AccessDenied
