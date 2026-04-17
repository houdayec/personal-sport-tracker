import type {
    ForgotPassword,
    ResetPassword,
} from '@/@types/auth'

import { auth } from '@/firebase'
import {
    setPersistence,
    browserLocalPersistence,
    createUserWithEmailAndPassword,
    getAuth,
    signInWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
    confirmPasswordReset,
    verifyPasswordResetCode,
} from 'firebase/auth'

export async function apiSignIn({ email, password }: { email: string; password: string }) {
    const auth = getAuth()

    try {
        await setPersistence(auth, browserLocalPersistence)
        const userCredential = await signInWithEmailAndPassword(auth, email, password)

        return { success: true, user: userCredential.user }
    } catch (error: any) {
        console.log("🔥 Full error object:", error)
        console.log("🔥 All keys in error:", Object.keys(error))

        if (error.code === 'auth/multi-factor-auth-required') {
            console.log("🔥 MFA block hit")

            const resolver = (error as { resolver: any }).resolver
            console.log("🔥 Extracted resolver:", resolver)

            return {
                success: false,
                mfaRequired: true,
                resolver,
            }
        }

        return { success: false, error: error.message || 'Sign-in failed' }
    }
}


export async function apiSignUp({ email, password }: { email: string; password: string }) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        return { success: true, user: userCredential.user };
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error("Sign-up failed:", error.message);
            return { success: false, error: error.message };
        }
        return { success: false, error: "An unknown error occurred" };
    }
}

export async function apiSignOut() {
    try {
        await signOut(auth);
        return { success: true };
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error("Sign-out failed:", error.message);
            return { success: false, error: error.message };
        }
        return { success: false, error: "An unknown error occurred" };
    }
}


export async function apiForgotPassword(data: ForgotPassword) {
    const email = data.email.trim()

    if (!email) {
        throw new Error('Email requis.')
    }

    const actionCodeSettings = {
        url: `${window.location.origin}/reset-password`,
        handleCodeInApp: true,
    }

    await sendPasswordResetEmail(auth, email, actionCodeSettings)

    return { data: true }
}

export async function apiResetPassword(data: ResetPassword) {
    const password = data.password.trim()
    const oobCode = data.oobCode.trim()

    if (!oobCode) {
        throw new Error('Lien de réinitialisation invalide.')
    }

    if (!password) {
        throw new Error('Nouveau mot de passe requis.')
    }

    await confirmPasswordReset(auth, oobCode, password)

    return { data: true }
}

export async function apiVerifyResetPasswordCode(oobCode: string) {
    const code = oobCode.trim()

    if (!code) {
        throw new Error('Lien de réinitialisation invalide.')
    }

    await verifyPasswordResetCode(auth, code)

    return { data: true }
}
