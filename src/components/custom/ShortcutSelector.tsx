import { useState } from 'react'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import classNames from 'classnames'
import withHeaderItem from '@/utils/hoc/withHeaderItem'
import { HiExternalLink } from 'react-icons/hi'
import type { CommonProps } from '@/@types/common'

const _ShortcutSelector = ({ className }: CommonProps) => {
    const [loading, setLoading] = useState(false)

    const handleOpenSheet = () => {
        setLoading(true)
        window.open('https://docs.google.com/spreadsheets/d/1XSNH0wZQkeekqdJhEmi3n21lQrf-AVzq9OSZeFA8qec/edit?gid=0', '_blank')
        setTimeout(() => setLoading(false), 800)
    }

    // Render a single button to open the Product Sheet
    return (
        <div className={classNames(className, 'flex items-center')}>
            <Button
                size="sm"
                loading={loading}
                onClick={handleOpenSheet}
            >
                Products Sheet
            </Button>
        </div>
    )
}

const ShortcutSelector = withHeaderItem(_ShortcutSelector)

export default ShortcutSelector
