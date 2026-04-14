import { lazy } from 'react'
import authRoute from './authRoute'
import type { Routes } from '@/@types/routes'
import { fitnessProtectedRoutes } from './fitnessRoutes.config'
import { legacyProtectedRoutes } from './legacyProtectedRoutes.config'

export const publicRoutes: Routes = [...authRoute]

const coreProtectedRoutes: Routes = [
    {
        key: 'home',
        path: '/home',
        component: lazy(() => import('@/views/Home')),
        authority: ['USER'],
    },
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
    ...legacyProtectedRoutes,
]
