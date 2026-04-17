import { lazy } from 'react'
import type { Routes } from '@/@types/routes'
import {
    FITNESS_ADMIN_UID,
    FITNESS_ROUTES,
} from '@/features/fitness/constants/routes'

export const fitnessProtectedRoutes: Routes = [
    {
        key: 'fitness.dashboard',
        path: FITNESS_ROUTES.dashboard,
        component: lazy(
            () => import('@/features/fitness/dashboard/pages/FitnessDashboardPage'),
        ),
        authority: ['USER'],
    },
    {
        key: 'fitness.dashboard',
        path: FITNESS_ROUTES.dashboardAlias,
        component: lazy(
            () => import('@/features/fitness/dashboard/pages/FitnessDashboardPage'),
        ),
        authority: ['USER'],
    },
    {
        key: 'fitness.training.library',
        path: FITNESS_ROUTES.trainingRoot,
        component: lazy(
            () => import('@/features/fitness/training/pages/ExerciseLibraryPage'),
        ),
        authority: ['USER'],
    },
    {
        key: 'fitness.training.library',
        path: FITNESS_ROUTES.trainingLibrary,
        component: lazy(
            () => import('@/features/fitness/training/pages/ExerciseLibraryPage'),
        ),
        authority: ['USER'],
    },
    {
        key: 'fitness.training.templates',
        path: FITNESS_ROUTES.trainingTemplates,
        component: lazy(
            () => import('@/features/fitness/training/pages/WorkoutTemplatesPage'),
        ),
        authority: ['USER'],
    },
    {
        key: 'fitness.training.templates',
        path: FITNESS_ROUTES.trainingTemplatesAlias,
        component: lazy(
            () => import('@/features/fitness/training/pages/WorkoutTemplatesPage'),
        ),
        authority: ['USER'],
    },
    {
        key: 'fitness.training.today',
        path: FITNESS_ROUTES.trainingToday,
        component: lazy(
            () => import('@/features/fitness/training/pages/WorkoutTodayPage'),
        ),
        authority: ['USER'],
    },
    {
        key: 'fitness.training.history',
        path: FITNESS_ROUTES.trainingHistory,
        component: lazy(
            () => import('@/features/fitness/training/pages/WorkoutHistoryPage'),
        ),
        authority: ['USER'],
    },
    {
        key: 'fitness.training.history',
        path: FITNESS_ROUTES.trainingHistoryDetail,
        component: lazy(
            () => import('@/features/fitness/training/pages/WorkoutHistoryDetailPage'),
        ),
        authority: ['USER'],
    },
    {
        key: 'fitness.body.weight',
        path: FITNESS_ROUTES.bodyRoot,
        component: lazy(() => import('@/features/fitness/body/pages/BodyWeightPage')),
        authority: ['USER'],
    },
    {
        key: 'fitness.body.weight',
        path: FITNESS_ROUTES.bodyWeight,
        component: lazy(() => import('@/features/fitness/body/pages/BodyWeightPage')),
        authority: ['USER'],
    },
    {
        key: 'fitness.body.checkins',
        path: FITNESS_ROUTES.bodyCheckins,
        component: lazy(() => import('@/features/fitness/body/pages/BodyCheckinsPage')),
        authority: ['USER'],
    },
    {
        key: 'fitness.body.measurements',
        path: FITNESS_ROUTES.bodyMeasurements,
        component: lazy(
            () => import('@/features/fitness/body/pages/BodyMeasurementsPage'),
        ),
        authority: ['USER'],
    },
    {
        key: 'fitness.progress',
        path: FITNESS_ROUTES.progress,
        component: lazy(() => import('@/features/fitness/progress/pages/ProgressPage')),
        authority: ['USER'],
    },
    {
        key: 'fitness.progress.photos',
        path: FITNESS_ROUTES.progressPhotos,
        component: lazy(
            () => import('@/features/fitness/progress/pages/ProgressPhotosPage'),
        ),
        authority: ['USER'],
    },
    {
        key: 'fitness.progress.exercise',
        path: FITNESS_ROUTES.progressExercise,
        component: lazy(
            () => import('@/features/fitness/progress/pages/ExerciseProgressPage'),
        ),
        authority: ['USER'],
    },
    {
        key: 'fitness.account',
        path: FITNESS_ROUTES.account,
        component: lazy(() => import('@/features/fitness/account/pages/AccountPage')),
        authority: ['USER'],
    },
    {
        key: 'fitness.admin.dev',
        path: FITNESS_ROUTES.adminRoot,
        component: lazy(() => import('@/features/fitness/admin/pages/AdminDevPage')),
        authority: [FITNESS_ADMIN_UID],
    },
    {
        key: 'fitness.admin.dev',
        path: FITNESS_ROUTES.adminDev,
        component: lazy(() => import('@/features/fitness/admin/pages/AdminDevPage')),
        authority: [FITNESS_ADMIN_UID],
    },
]
