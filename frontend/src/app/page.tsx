import NewsletterList from "@/components/NewsletterList"
import { AuthProvider } from "@/components/AuthProvider"

export default function Home() {
  return (
    <AuthProvider>
      <main className="container mx-auto py-8">
        <NewsletterList />
      </main>
    </AuthProvider>
  )
}

