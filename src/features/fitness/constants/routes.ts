export const FITNESS_ROUTES = {
    dashboard: '/fitness',
    dashboardAlias: '/fitness/dashboard',

    trainingRoot: '/fitness/training',
    trainingLibrary: '/fitness/training/exercises',
    trainingTemplates: '/fitness/training/templates',
    trainingTemplatesAlias: '/templates',
    trainingToday: '/fitness/training/today',
    trainingBreathing: '/fitness/breathing',
    trainingHistory: '/fitness/training/history',
    trainingHistoryDetail: '/fitness/training/history/:sessionId',

    bodyRoot: '/fitness/body',
    bodyCheckins: '/fitness/body/checkins',
    bodyWeight: '/fitness/body/weight',
    bodyMeasurements: '/fitness/body/measurements',

    progress: '/fitness/progress',
    progressPhotos: '/fitness/progress/photos',
    progressExercise: '/fitness/progress/exercise',
    account: '/fitness/account',
    adminRoot: '/fitness/admin',
    adminDev: '/fitness/admin/dev',
} as const

export const FITNESS_ADMIN_UID = 'CKz2MS0kdaWLbBIaAAVsJGKJqFL2' as const
