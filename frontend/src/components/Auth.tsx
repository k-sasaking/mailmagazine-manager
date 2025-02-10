"use client"

import { useAuthContext } from "./AuthProvider"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

export function Auth() {
  const { user, loading, error, signIn, signOut } = useAuthContext()

  if (loading) {
    return (
      <div className="flex justify-end p-4">
        <Loader2 className="animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col p-4">
      {user ? (
        <div className="flex items-center gap-4">
          <span>ようこそ、{user.displayName}さん</span>
          <Button onClick={signOut}>ログアウト</Button>
        </div>
      ) : (
        <Button className="bg-blue-500 hover:bg-blue-700 text-white text-xl font-bold py-6 px-8 rounded-full" onClick={signIn}>Googleでログインして断捨離をする</Button>
      )}
      {error && <p className="text-red-500 mt-2">{error}</p>}
    </div>
  )
}

