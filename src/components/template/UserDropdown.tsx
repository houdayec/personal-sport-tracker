import Avatar from '@/components/ui/Avatar'
import Dropdown from '@/components/ui/Dropdown'
import withHeaderItem from '@/utils/hoc/withHeaderItem'
import useAuth from '@/utils/hooks/useAuth'
import { Link } from 'react-router-dom'
import classNames from 'classnames'
import { HiOutlineLogout } from 'react-icons/hi'
import { useAppSelector } from '@/store'
import { buildUiAvatarUrl } from '@/utils/uiAvatar'
import type { CommonProps } from '@/@types/common'
import type { JSX } from 'react'

type DropdownList = {
    label: string
    path: string
    icon: JSX.Element
}

const dropdownItemList: DropdownList[] = [
    // {
    //     label: 'Settings',
    //     path: '/app/account/settings/profile',
    //     icon: <HiOutlineCog />,
    // },
]
const _UserDropdown = ({ className }: CommonProps) => {
    const { signOut } = useAuth()
    const userName = useAppSelector((state) => state.auth.user.userName)
    const userEmail = useAppSelector((state) => state.auth.user.email)

    const resolvedUserName = userName?.trim() || 'User'
    const resolvedUserEmail = userEmail?.trim() || 'No Email'
    const avatarSrc = buildUiAvatarUrl(resolvedUserName)

    const UserAvatar = (
        <div className={classNames(className, 'flex items-center gap-2')}>
            <Avatar size={32} shape="circle" src={avatarSrc} />
            <div className="hidden md:block">
                <div className="text-xs capitalize">{resolvedUserName}</div>
                <div className="font-bold">{resolvedUserEmail}</div>
            </div>
        </div>
    )

    return (
        <div>
            <Dropdown menuStyle={{ minWidth: 240 }} renderTitle={UserAvatar} placement="bottom-end">
                <Dropdown.Item variant="header">
                    <div className="py-2 px-3 flex items-center gap-2">
                        <Avatar shape="circle" src={avatarSrc} />
                        <div>
                            <div className="font-bold text-gray-900 dark:text-gray-100">
                                {resolvedUserName}
                            </div>
                            <div className="text-xs">{resolvedUserEmail}</div>
                        </div>
                    </div>
                </Dropdown.Item>
                <Dropdown.Item variant="divider" />
                {dropdownItemList.map((item) => (
                    <Dropdown.Item key={item.label} eventKey={item.label} className="mb-1 px-0">
                        <Link className="flex h-full w-full px-2" to={item.path}>
                            <span className="flex gap-2 items-center w-full">
                                <span className="text-xl opacity-50">{item.icon}</span>
                                <span>{item.label}</span>
                            </span>
                        </Link>
                    </Dropdown.Item>
                ))}
                <Dropdown.Item eventKey="Sign Out" className="gap-2" onClick={signOut}>
                    <span className="text-xl opacity-50">
                        <HiOutlineLogout />
                    </span>
                    <span>Sign Out</span>
                </Dropdown.Item>
            </Dropdown>
        </div>
    )
}

const UserDropdown = withHeaderItem(_UserDropdown)

export default UserDropdown
