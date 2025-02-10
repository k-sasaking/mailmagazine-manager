"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Auth } from "./Auth"
import { useAuthContext } from "./AuthProvider"
import { Loader2, Mail } from "lucide-react"
import { getAuth, signOut } from "firebase/auth"
import { FirebaseError } from "firebase/app"
import { useEffect, useState } from "react"

interface Newsletter {
  id: string
  genre: string
  summary: string
  unsubscribeUrl: string
  unsubscribeMethod: string
  unreadCount: number
  frequency: string
}

const newsletters: Newsletter[] = [
  {
    id: "1",
    genre: "テクノロジー",
    summary: "最新のテクノロジートレンドと革新的な製品に関する週刊ニュースレター",
    unsubscribeUrl: "https://example.com/unsubscribe/tech",
    unsubscribeMethod: "リンクをクリックして解除フォームに記入してください",
    unreadCount: 3,
    frequency: "週1回",
  },
  {
    id: "2",
    genre: "ビジネス",
    summary: "起業家とビジネスリーダーのための洞察とアドバイス",
    unsubscribeUrl: "https://example.com/unsubscribe/business",
    unsubscribeMethod: "メール本文の下部にある「解除」ボタンをクリックしてください",
    unreadCount: 1,
    frequency: "月2回",
  },
  {
    id: "3",
    genre: "ビジネス",
    summary: "起業家とビジネスリーダーのための洞察とアドバイス",
    unsubscribeUrl: "https://example.com/unsubscribe/business",
    unsubscribeMethod: "メール本文の下部にある「解除」ボタンをクリックしてください",
    unreadCount: 1,
    frequency: "月2回",
  },
  {
    id: "4",
    genre: "ビジネス",
    summary: "起業家とビジネスリーダーのための洞察とアドバイス",
    unsubscribeUrl: "https://example.com/unsubscribe/business",
    unsubscribeMethod: "メール本文の下部にある「解除」ボタンをクリックしてください",
    unreadCount: 1,
    frequency: "月2回",
  },
  // 他のニュースレターをここに追加できます
]

export default function NewsletterList() {
  const { user, loading } = useAuthContext()
 const [isLoading, setIsLoading] = useState(true)

  useEffect(()=>{
    setIsLoading(false)

  })

const handleSignOut = async () => {
  try {
    const auth = getAuth()
    await signOut(auth)
  } catch (e) {
    if (e instanceof FirebaseError) {
      console.log(e)
    }
  }
}

  return (
    <>
      {(loading || isLoading )? (
        <div className="flex justify-center items-center h-64">
          <p className="text-center mx-6">メルマガを解析しています...</p>
          <Loader2 className="animate-spin h-8 w-8" />
        </div>
      ) : user ? (
        <>
        <div className='flex w-full justify-between px-6'>
          <h1 className="text-3xl font-bold mb-6">メルマガ一覧</h1>
          <button onClick={handleSignOut}>ログアウト</button>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 px-6">
            {newsletters.map((newsletter) => (
              <Card key={newsletter.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle>{newsletter.genre}</CardTitle>
                    <Badge variant="secondary">{newsletter.frequency}</Badge>
                  </div>
                  <CardDescription>{newsletter.summary}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <div className="space-y-2">
                    <div>
                      <strong>未読:</strong> {newsletter.unreadCount}件
                    </div>
                    <div>
                      <strong>解除方法:</strong> {newsletter.unsubscribeMethod}
                    </div>
                    <div className="pt-4">
                      <Link href={newsletter.unsubscribeUrl} passHref>
                        <Button variant="outline" className="w-full bg-red-500 text-white">
                          メルマガを解除
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-white flex flex-col items-center justify-center p-4">
      <main className="max-w-2xl mx-auto text-center">
        <Mail className="w-16 h-16 text-blue-500 mx-auto mb-6" />
        <h1 className="text-4xl font-bold text-gray-800 mb-4">メール断捨離アプリ</h1>
        <p className="text-xl text-gray-600 mb-6">あなたのメール、たまっていませんか？</p>
        <div className='text-center'>
        <img src='/mail.jpeg' alt='mail' className='mx-auto my-5' width={200}/>
        </div>
        <p className="text-lg text-gray-700 mb-8">
        <span className='text-xl font-bold'>メール断捨離アプリ</span>は、<br/>あなたのメールボックスに溜まっている<span className='text-xl font-bold'>未読のメルマガを検出</span>し、<br/><span className='text-xl font-bold'>本当に必要なメールだけを残す</span>お手伝いをします。
          <br/><span className='text-xl font-bold'>不要なメルマガを簡単に特定</span>し、一括で処理することで、<br/>デジタルライフをスッキリさせましょう。
        </p>
        <div >
        <Auth />
        </div>
      </main>
    </div>
      )}
</>
  )
}
