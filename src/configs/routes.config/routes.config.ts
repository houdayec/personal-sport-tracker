import { lazy } from 'react'
import authRoute from './authRoute'
import type { Routes } from '@/@types/routes'
import { fitnessProtectedRoutes } from './fitnessRoutes.config'

export const publicRoutes: Routes = [...authRoute]

const coreProtectedRoutes: Routes = [
    {
        key: 'accessDenied',
        path: '/access-denied',
        component: lazy(() => import('@/views/errors/AccessDenied')),
        authority: [],
    },
]

export const protectedRoutes: Routes = [
    ...coreProtectedRoutes,
    ...fitnessProtectedRoutes,
]
