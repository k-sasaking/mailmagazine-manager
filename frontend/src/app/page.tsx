import MailMagazineList from "@/components/MailMagazineList";
import { AuthProvider } from "@/components/AuthProvider";

export default function Home() {
  return (
    <AuthProvider>
      <main className="container mx-auto py-8">
        <MailMagazineList />
      </main>
    </AuthProvider>
  );
}
