"use client"

import { useState, useEffect } from "react"
import { type User, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const signIn = async () => {
    const provider = new GoogleAuthProvider()
    try {
      setError(null)
      await signInWithPopup(auth, provider)
    } catch (error) {
      console.error("Error signing in with Google", error)
      setError("Googleログインに失敗しました。もう一度お試しください。")
    }
  }

  const signOutUser = async () => {
    try {
      setError(null)
      await signOut(auth)
    } catch (error) {
      console.error("Error signing out", error)
      setError("ログアウトに失敗しました。もう一度お試しください。")
    }
  }

  return { user, loading, error, signIn, signOut: signOutUser }
}

