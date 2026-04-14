import {
    NAV_ITEM_TYPE_ITEM,
    NAV_ITEM_TYPE_COLLAPSE,
} from '@/constants/navigation.constant'
import type { NavigationTree } from '@/@types/navigation'

const fitnessNavigationConfig: NavigationTree[] = [
    {
        key: 'home',
        path: '/home',
        title: 'Home',
        translateKey: 'nav.home',
        icon: 'home',
        type: NAV_ITEM_TYPE_ITEM,
        authority: [],
        subMenu: [],
    },
    {
        key: 'fitness',
        path: '/fitness',
        title: 'Fitness',
        translateKey: 'nav.fitness.title',
        icon: 'fitness',
        type: NAV_ITEM_TYPE_COLLAPSE,
        authority: [],
        subMenu: [
            {
                key: 'fitness.dashboard',
                path: '/fitness',
                title: 'Dashboard',
                translateKey: 'nav.fitness.dashboard',
                icon: '',
                type: NAV_ITEM_TYPE_ITEM,
                authority: [],
                subMenu: [],
            },
            {
                key: 'fitness.workouts',
                path: '/fitness/workouts',
                title: 'Workouts',
                translateKey: 'nav.fitness.workouts',
                icon: '',
                type: NAV_ITEM_TYPE_ITEM,
                authority: [],
                subMenu: [],
            },
            {
                key: 'fitness.body',
                path: '/fitness/body',
                title: 'Body',
                translateKey: 'nav.fitness.body',
                icon: '',
                type: NAV_ITEM_TYPE_ITEM,
                authority: [],
                subMenu: [],
            },
        ],
    },
]

const legacyNavigationConfig: NavigationTree[] = [
    {
        key: 'legacy',
        path: '/products',
        title: 'Legacy',
        translateKey: 'nav.legacy.title',
        icon: 'legacy',
        type: NAV_ITEM_TYPE_COLLAPSE,
        authority: [],
        subMenu: [
            {
                key: 'legacy.products',
                path: '/products',
                title: 'Products',
                translateKey: 'nav.legacy.products',
                icon: '',
                type: NAV_ITEM_TYPE_ITEM,
                authority: [],
                subMenu: [],
            },
            {
                key: 'legacy.tools',
                path: '/tools/upload',
                title: 'Tools',
                translateKey: 'nav.legacy.tools',
                icon: '',
                type: NAV_ITEM_TYPE_ITEM,
                authority: [],
                subMenu: [],
            },
        ],
    },
]

const navigationConfig: NavigationTree[] = [
    ...fitnessNavigationConfig,
    ...legacyNavigationConfig,
]

export default navigationConfig
