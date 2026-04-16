export const FITNESS_ROUTES = {
    dashboard: '/fitness',
    dashboardAlias: '/fitness/dashboard',

    trainingRoot: '/fitness/training',
    trainingLibrary: '/fitness/training/exercises',
    trainingTemplates: '/fitness/training/templates',
    trainingTemplatesAlias: '/templates',
    trainingToday: '/fitness/training/today',
    trainingHistory: '/fitness/training/history',
    trainingHistoryDetail: '/fitness/training/history/:sessionId',

    bodyRoot: '/fitness/body',
    bodyWeight: '/fitness/body/weight',
    bodyMeasurements: '/fitness/body/measurements',

    progress: '/fitness/progress',
    account: '/fitness/account',
} as const
