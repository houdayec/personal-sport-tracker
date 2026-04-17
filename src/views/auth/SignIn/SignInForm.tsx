import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Checkbox from '@/components/ui/Checkbox'
import { FormItem, FormContainer } from '@/components/ui/Form'
import Alert from '@/components/ui/Alert'
import PasswordInput from '@/components/shared/PasswordInput'
import useTimeOutMessage from '@/utils/hooks/useTimeOutMessage'
import useAuth from '@/utils/hooks/useAuth'
import { Field, Form, Formik } from 'formik'
import * as Yup from 'yup'
import type { CommonProps } from '@/@types/common'
import { useState } from 'react'
import { setUser, signInSuccess, useAppDispatch } from '@/store'
import { useNavigate } from 'react-router-dom'
import { PhoneAuthProvider, PhoneMultiFactorGenerator } from 'firebase/auth'
import appConfig from '@/configs/app.config'

interface SignInFormProps extends CommonProps {
    disableSubmit?: boolean
}

type SignInFormSchema = {
    email: string
    password: string
    rememberMe: boolean
}


const validationSchema = Yup.object().shape({
    email: Yup.string().required('Please enter your email'),
    password: Yup.string().required('Please enter your password'),
    rememberMe: Yup.bool(),
})

const SignInForm = (props: SignInFormProps) => {
    const {
        disableSubmit = false,
        className,
    } = props

    const dispatch = useAppDispatch()
    const navigate = useNavigate()

    const [message, setMessage] = useTimeOutMessage()
    const [mfaResolver, setMfaResolver] = useState<any>(null)
    const [mfaPhoneHint, setMfaPhoneHint] = useState<string>('')
    const [verificationCode, setVerificationCode] = useState('')

    const { signIn } = useAuth()

    const onSignIn = async (
        values: SignInFormSchema,
        setSubmitting: (isSubmitting: boolean) => void
    ) => {
        const { email, password } = values
        setSubmitting(true)

        const result = await signIn({ email, password })

        if (result?.status === 'mfa-required') {
            const hints = result.resolver?.hints || []
            const phone = hints[0]?.phoneNumber || 'unknown number'

            setMfaResolver(result.resolver)
            setMfaPhoneHint(phone)
            setMessage('Enter the code sent to your phone')
            setSubmitting(false)
            return
        }

        else if (result?.status === 'failed') {
            setMessage(result.message)
        }

        setSubmitting(false)
    }



    const handleVerifyMfaCode = async () => {
        try {
            const verificationId = mfaResolver.session.verificationId

            const cred = PhoneAuthProvider.credential(
                verificationId,
                verificationCode
            )

            const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(cred)

            const userCredential = await mfaResolver.resolveSignIn(multiFactorAssertion)
            const user = userCredential.user
            const token = await user.getIdToken().catch(() => null)

            dispatch(
                signInSuccess({
                    uid: user.uid,
                    token,
                })
            )
            dispatch(
                setUser({
                    avatar: user.photoURL || '',
                    userName: user.displayName || 'Anonymous',
                    authority: ['USER', user.uid],
                    email: user.email || '',
                })
            )

            navigate(appConfig.authenticatedEntryPath)
        } catch (err: any) {
            setMessage(err.message || 'Failed to verify code')
        }
    }



    return (
        <div className={className}>
            {message && (
                <Alert showIcon className="mb-4" type="danger">
                    <>{message}</>
                </Alert>
            )}
            <Formik
                initialValues={{
                    email: '',
                    password: '',
                    rememberMe: true,
                }}
                validationSchema={validationSchema}
                onSubmit={(values, { setSubmitting }) => {
                    if (!disableSubmit) {
                        onSignIn(values, setSubmitting)
                    } else {
                        setSubmitting(false)
                    }
                }}
            >
                {({ touched, errors, isSubmitting }) => (
                    <Form>
                        <FormContainer>
                            <FormItem
                                label="Email"
                                invalid={
                                    (errors.email &&
                                        touched.email) as boolean
                                }
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
                            <FormItem
                                label="Password"
                                invalid={
                                    (errors.password &&
                                        touched.password) as boolean
                                }
                                errorMessage={errors.password}
                            >
                                <Field
                                    autoComplete="off"
                                    name="password"
                                    placeholder="Password"
                                    component={PasswordInput}
                                />
                            </FormItem>
                            <div className="flex justify-between mb-6">
                                <Field
                                    className="mb-0"
                                    name="rememberMe"
                                    component={Checkbox}
                                >
                                    Remember Me
                                </Field>
                                {/* <ActionLink to={forgotPasswordUrl}>
                                    Forgot Password?
                                </ActionLink> */}
                            </div>
                            <Button
                                block
                                loading={isSubmitting}
                                variant="solid"
                                type="submit"
                            >
                                {isSubmitting ? 'Signing in...' : 'Sign In'}
                            </Button>
                            {/* 
                            <div className="mt-4 text-center">
                                <span>{`Don't have an account yet?`} </span>
                                <ActionLink to={signUpUrl}>Sign up</ActionLink>
                            </div>
                                */}
                        </FormContainer>
                    </Form>
                )}
            </Formik>
            {mfaResolver && (
                <div className="mt-6">
                    <FormContainer>
                        {message && (
                            <Alert showIcon className="mb-4" type="danger">
                                <>{message}</>
                            </Alert>
                        )}
                        <FormItem label={`Verification code sent to ${mfaPhoneHint}`}>
                            <Input
                                placeholder="123456"
                                onChange={(e) => setVerificationCode(e.target.value)}
                                value={verificationCode}
                            />
                        </FormItem>
                        <Button
                            block
                            variant="solid"
                            onClick={handleVerifyMfaCode}
                        >
                            Verify Code
                        </Button>
                    </FormContainer>

                </div>
            )}

        </div>
    )
}

export default SignInForm
