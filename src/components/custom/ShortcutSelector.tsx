import { useState } from 'react'
import Avatar from '@/components/ui/Avatar'
import Dropdown from '@/components/ui/Dropdown'
import Spinner from '@/components/ui/Spinner'
import classNames from 'classnames'
import withHeaderItem from '@/utils/hoc/withHeaderItem'
import { HiExternalLink, HiLink } from 'react-icons/hi'
import { SiOpenai, SiFirebase, SiWordpress, SiDocusaurus, SiGooglecloud } from 'react-icons/si'
import type { CommonProps } from '@/@types/common'

const shortcutList = [
    {
        label: 'Customer Support',
        url: 'https://chatgpt.com/g/g-Uan3e7bwl-fts-customer-support/c/6747233e-d1f0-800d-a121-8fe84c49f708',
        icon: <SiOpenai className="text-lg text-emerald-600" />,
    },
    {
        label: 'Firebase',
        url: 'https://console.firebase.google.com/project/fs-dashboard-d6b72',
        icon: <SiFirebase className="text-lg text-orange-500" />,
    },
    {
        label: 'Website Panel',
        url: 'https://control.rocket.net/manage/124081/wordpress',
        icon: <SiWordpress className="text-lg text-blue-600" />,
    },
    {
        label: 'Google Cloud Console',
        url: 'https://console.cloud.google.com/welcome?hl=en&invt=Abt1gw&project=fs-dashboard-d6b72',
        icon: <SiGooglecloud className="text-lg text-blue-600" />,
    },
    {
        label: 'Documentation',
        url: 'https://f0nt5t4t10n-d0c.pages.dev/',
        icon: <SiDocusaurus className="text-lg text-green-600" />,
    }
]

const _ShortcutSelector = ({ className }: CommonProps) => {
    const [loading, setLoading] = useState(false)

    const iconTitle = (
        <div className={classNames(className, 'flex items-center')}>
            {loading ? <Spinner size={20} /> : <HiExternalLink className="text-xl" />}
        </div>
    )

    return (
        <Dropdown renderTitle={iconTitle} placement="bottom-end">
            {shortcutList.map((shortcut) => (
                <Dropdown.Item
                    key={shortcut.label}
                    className="mb-1 justify-between"
                    eventKey={shortcut.label}
                    onClick={() => {
                        setLoading(true)
                        window.open(shortcut.url, '_blank')
                        setTimeout(() => setLoading(false), 800)
                    }}
                >
                    <span className="flex items-center">
                        {shortcut.icon}
                        <span className="ltr:ml-2 rtl:mr-2">{shortcut.label}</span>
                    </span>
                </Dropdown.Item>
            ))}
        </Dropdown>
    )
}

const ShortcutSelector = withHeaderItem(_ShortcutSelector)

export default ShortcutSelector
