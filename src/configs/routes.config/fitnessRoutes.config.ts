import { lazy } from 'react'
import type { Routes } from '@/@types/routes'

export const fitnessProtectedRoutes: Routes = [
    {
        key: 'fitness.dashboard',
        path: '/fitness',
        component: lazy(() => import('@/features/fitness/dashboard/pages/FitnessDashboardPage')),
        authority: ['USER'],
    },
    {
        key: 'fitness.workouts',
        path: '/fitness/workouts',
        component: lazy(() => import('@/features/fitness/workouts/pages/WorkoutSessionsPage')),
        authority: ['USER'],
    },
    {
        key: 'fitness.body',
        path: '/fitness/body',
        component: lazy(() => import('@/features/fitness/body/pages/BodyTrackingPage')),
        authority: ['USER'],
    },
]
