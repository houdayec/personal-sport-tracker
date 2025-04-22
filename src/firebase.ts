import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAnalytics } from "firebase/analytics";
import { getFunctions, httpsCallable } from "firebase/functions"
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

const firebaseApp = initializeApp(firebaseConfig)
const analytics = getAnalytics(firebaseApp);

const db = getFirestore(firebaseApp)
const auth = getAuth(firebaseApp)

export const functions = getFunctions(firebaseApp)
const currentUser = auth.currentUser
export const generateDownloadLink = httpsCallable(functions, "generateDownloadLink")

export {
    db,
    analytics,
    auth,
    currentUser,
    signInWithEmailAndPassword,
    signOut,
    createUserWithEmailAndPassword
}