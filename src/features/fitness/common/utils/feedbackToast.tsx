import { Notification, toast } from '@/components/ui'

type FitnessToastType = 'success' | 'danger' | 'warning' | 'info'

const pushToast = (
    type: FitnessToastType,
    title: string,
    message?: string,
    duration = 3200,
) => {
    toast.push(
        <Notification type={type} title={title} duration={duration}>
            {message}
        </Notification>,
        {
            placement: 'top-end',
        },
    )
}

export const showFitnessSuccessToast = (message: string, title = 'Succès') => {
    pushToast('success', title, message)
}

export const showFitnessErrorToast = (message: string, title = 'Erreur') => {
    pushToast('danger', title, message, 4200)
}
