import classNames from 'classnames'
import { APP_NAME } from '@/constants/app.constant'
import type { CommonProps } from '@/@types/common'

interface LogoProps extends CommonProps {
    type?: 'full' | 'streamline'
    mode?: 'light' | 'dark'
    imgClass?: string
    logoWidth?: number | string
}

const Logo = (props: LogoProps) => {
    const {
        type = 'full',
        mode = 'light',
        className,
        imgClass,
        style,
        logoWidth = 'auto',
    } = props

    return (
        <div
            className={classNames('logo my-4', className)}
            style={{
                ...style,
                ...{ width: logoWidth },
            }}
        >
            <div className="flex items-center gap-2">
                <div
                    className={classNames(
                        'flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold',
                        mode === 'dark'
                            ? 'bg-white/15 text-white'
                            : 'bg-orange-100 text-orange-600',
                        imgClass,
                    )}
                    aria-label={`${APP_NAME} logo`}
                >
                    ST
                </div>
                {type === 'full' && (
                    <span
                        className={classNames(
                            'text-sm font-semibold',
                            mode === 'dark'
                                ? 'text-white'
                                : 'text-gray-900 dark:text-white',
                        )}
                    >
                        {APP_NAME}
                    </span>
                )}
            </div>
        </div>
    )
}

export default Logo
