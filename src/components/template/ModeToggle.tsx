import classNames from 'classnames'
import { HiOutlineMoon, HiOutlineSun } from 'react-icons/hi'
import withHeaderItem from '@/utils/hoc/withHeaderItem'
import useDarkMode from '@/utils/hooks/useDarkmode'
import type { CommonProps } from '@/@types/common'

const _ModeToggle = ({ className }: CommonProps) => {
    const [isDark, setMode] = useDarkMode()

    const toggleMode = () => {
        setMode(isDark ? 'light' : 'dark')
    }

    return (
        <button
            type="button"
            className={classNames('text-xl', className)}
            onClick={toggleMode}
            title={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
            aria-label={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
        >
            {isDark ? <HiOutlineSun /> : <HiOutlineMoon />}
        </button>
    )
}

const ModeToggle = withHeaderItem(_ModeToggle)

export default ModeToggle
