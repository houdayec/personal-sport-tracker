import type { JSX } from 'react'
import {
    HiOutlineHome,
    HiOutlineChartBar,
    HiOutlineCog,
} from 'react-icons/hi'

export type NavigationIcons = Record<string, JSX.Element>

const navigationIcon: NavigationIcons = {
    home: <HiOutlineHome />,
    fitness: <HiOutlineChartBar />,
    legacy: <HiOutlineCog />,
}

export default navigationIcon
