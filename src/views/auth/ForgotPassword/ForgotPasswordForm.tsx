import { useState } from 'react'
import { FormItem, FormContainer } from '@/components/ui/Form'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Alert from '@/components/ui/Alert'
import ActionLink from '@/components/shared/ActionLink'
import { apiForgotPassword } from '@/services/AuthService'
import useTimeOutMessage from '@/utils/hooks/useTimeOutMessage'
import { Field, Form, Formik } from 'formik'
import { useAppSelector } from '@/store'
import * as Yup from 'yup'
import type { CommonProps } from '@/@types/common'

interface ForgotPasswordFormProps extends CommonProps {
    disableSubmit?: boolean
    signInUrl?: string
}

type ForgotPasswordFormSchema = {
    email: string
}

const validationSchema = Yup.object().shape({
    email: Yup.string().required('Please enter your email'),
})

const ForgotPasswordForm = (props: ForgotPasswordFormProps) => {
    const { disableSubmit = false, className, signInUrl = '/sign-in' } = props
    const authEmail = useAppSelector((state) => state.auth.user.email)
    const isSignedIn = useAppSelector((state) => state.auth.session.signedIn)
    const connectedEmail = (authEmail || '').trim()
    const shouldUseConnectedEmail = Boolean(isSignedIn && connectedEmail)

    const [emailSent, setEmailSent] = useState(false)

    const [message, setMessage] = useTimeOutMessage()

    const getErrorMessage = (error: unknown) => {
        if (error instanceof Error && error.message) {
            return error.message
        }

        return 'Unable to send reset email. Please try again.'
    }

    const onSendMail = async (
        values: ForgotPasswordFormSchema,
        setSubmitting: (isSubmitting: boolean) => void,
    ) => {
        setSubmitting(true)
        try {
            const resp = await apiForgotPassword(values)
            if (resp.data) {
                setSubmitting(false)
                setEmailSent(true)
            }
        } catch (error) {
            setMessage(getErrorMessage(error))
            setSubmitting(false)
        }
    }

    const wrapperClass = `w-full text-left ${className || ''}`.trim()

    return (
        <div className={wrapperClass} style={{ textAlign: 'left' }}>
            <div className="mb-5 space-y-2">
                {emailSent ? (
                    <>
                        <h3 className="text-2xl font-semibold leading-tight">
                            Check your email
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            We have sent a password recovery instruction to your
                            {shouldUseConnectedEmail ? ` email (${connectedEmail})` : ' email'}
                        </p>
                    </>
                ) : (
                    <>
                        <h3 className="text-2xl font-semibold leading-tight">
                            Forgot Password
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            {shouldUseConnectedEmail
                                ? `We will send a reset link to your connected account: ${connectedEmail}`
                                : 'Please enter your email address to receive a verification code'}
                        </p>
                    </>
                )}
            </div>
            {message && (
                <Alert showIcon className="mb-4" type="danger">
                    {message}
                </Alert>
            )}
            <Formik
                initialValues={{
                    email: connectedEmail,
                }}
                enableReinitialize
                validationSchema={validationSchema}
                onSubmit={(values, { setSubmitting }) => {
                    if (!disableSubmit) {
                        onSendMail(
                            {
                                email: shouldUseConnectedEmail
                                    ? connectedEmail
                                    : values.email,
                            },
                            setSubmitting,
                        )
                    } else {
                        setSubmitting(false)
                    }
                }}
            >
                {({ touched, errors, isSubmitting }) => (
                    <Form>
                        <FormContainer>
                            <div
                                className={
                                    emailSent || shouldUseConnectedEmail
                                        ? 'hidden'
                                        : 'mb-1'
                                }
                            >
                                <FormItem
                                    invalid={errors.email && touched.email}
                                    errorMessage={errors.email}
                                >
                                    <Field
                                        type="email"
                                        autoComplete="off"
                                        name="email"
                                        placeholder="Email"
                                        component={Input}
                                    />
                                </FormItem>
                            </div>
                            <Button
                                block
                                loading={isSubmitting}
                                variant="solid"
                                type="submit"
                                className="h-11"
                            >
                                {emailSent ? 'Resend Email' : 'Send Email'}
                            </Button>
                            <div className="mt-5 text-left text-sm">
                                <span>Back to </span>
                                <ActionLink to={signInUrl}>Sign in</ActionLink>
                            </div>
                        </FormContainer>
                    </Form>
                )}
            </Formik>
        </div>
    )
}

export default ForgotPasswordForm
