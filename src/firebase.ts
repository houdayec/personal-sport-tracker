import { initializeApp } from 'firebase/app'
import {
    getFirestore,
    initializeFirestore,
    persistentLocalCache,
    persistentMultipleTabManager,
    type Firestore,
} from 'firebase/firestore'
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics'
import { getFunctions, httpsCallable } from 'firebase/functions'
//import { setLogLevel } from "firebase/firestore"
//setLogLevel("debug")
import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
} from 'firebase/auth'
import 'firebase/compat/auth'
import 'firebase/compat/firestore'

import firebaseConfig from '@/configs/firebase.config'
import { getStorage } from 'firebase/storage'

const firebaseApp = initializeApp(firebaseConfig)
const hasValidMeasurementId =
    typeof firebaseConfig.measurementId === 'string' &&
    Boolean(firebaseConfig.measurementId.trim()) &&
    firebaseConfig.measurementId !== 'undefined' &&
    firebaseConfig.measurementId !== 'MISSING_MEASUREMENT_ID'
let analytics: Analytics | null = null

if (hasValidMeasurementId) {
    isSupported()
        .then((supported) => {
            if (supported) {
                analytics = getAnalytics(firebaseApp)
            }
        })
        .catch(() => {
            // Ignore analytics setup issues in local/dev environments.
        })
}

const createFirestore = (): Firestore => {
    try {
        return initializeFirestore(firebaseApp, {
            localCache: persistentLocalCache({
                tabManager: persistentMultipleTabManager(),
            }),
        })
    } catch {
        return getFirestore(firebaseApp)
    }
}

const db = createFirestore()
const auth = getAuth(firebaseApp)

export const storage = getStorage(firebaseApp)
export const functions = getFunctions(firebaseApp)
const currentUser = auth.currentUser
export const generateDownloadLink = httpsCallable(functions, 'generateDownloadLink')

export {
    db,
    analytics,
    auth,
    currentUser,
    signInWithEmailAndPassword,
    signOut,
    createUserWithEmailAndPassword,
}
