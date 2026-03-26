import Button from '@/components/ui/Button'
import classNames from 'classnames'
import withHeaderItem from '@/utils/hoc/withHeaderItem'
import type { CommonProps } from '@/@types/common'

const WEBSITE_ADMIN_URL = 'https://control.rocket.net/n/manage/124081/wordpress'

const _WebsiteAdminButton = ({ className }: CommonProps) => {
    const handleOpen = () => {
        window.open(WEBSITE_ADMIN_URL, '_blank', 'noopener,noreferrer')
    }

    return (
        <div className={classNames(className, 'flex items-center')}>
            <Button size="sm" onClick={handleOpen}>
                Website
            </Button>
        </div>
    )
}

const WebsiteAdminButton = withHeaderItem(_WebsiteAdminButton)

export default WebsiteAdminButton
