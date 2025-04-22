import toast from '@/components/ui/toast'
import { Alert } from '@/components/ui/Alert'

type AlertType = 'info' | 'success' | 'warning' | 'danger' | undefined

export function showToast({
    type = 'info',
    title,
    message,
}: {
    type?: AlertType
    title?: string
    message?: string
}) {
    toast.push(
        <Alert showIcon closable type={type} rounded className="mb-4">
            {title && <div className="font-semibold mb-1">{title}</div>}
            <div>{message}</div>
        </Alert>,
        {
            offsetX: 0,
            offsetY: 0,
            transitionType: 'fade',
            block: true,
        }
    )
}
