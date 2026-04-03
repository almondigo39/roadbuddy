import { initializeApp } from 'firebase/app'
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth'
import type { ConfirmationResult } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyA_daPzXBWTDd6a2uUJAHKJC487MmT5iPc",
  authDomain: "roadbuddy-e9ac0.firebaseapp.com",
  projectId: "roadbuddy-e9ac0",
  storageBucket: "roadbuddy-e9ac0.firebasestorage.app",
  messagingSenderId: "155796737804",
  appId: "1:155796737804:web:23245f271d20ddbfea4329"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)

// Store the confirmation result globally so VerifyOTPScreen can access it
let confirmationResult: ConfirmationResult | null = null

export function getConfirmationResult(): ConfirmationResult | null {
  return confirmationResult
}

export function setConfirmationResult(result: ConfirmationResult | null): void {
  confirmationResult = result
}

export { RecaptchaVerifier, signInWithPhoneNumber }
