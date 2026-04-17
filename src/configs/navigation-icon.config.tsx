import type { JSX } from 'react'
import {
    HiOutlineHome,
    HiOutlineClipboardList,
    HiOutlineUserCircle,
    HiOutlineChartBar,
    HiOutlineCog,
    HiOutlineKey,
} from 'react-icons/hi'

export type NavigationIcons = Record<string, JSX.Element>

const navigationIcon: NavigationIcons = {
    dashboard: <HiOutlineHome />,
    training: <HiOutlineClipboardList />,
    body: <HiOutlineUserCircle />,
    progress: <HiOutlineChartBar />,
    account: <HiOutlineCog />,
    admin: <HiOutlineKey />,
}

export default navigationIcon
