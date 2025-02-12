"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Auth } from "./Auth";
import { useAuthContext } from "./AuthProvider";
import { Loader2, Mail } from "lucide-react";
import { getAuth, signOut } from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { useEffect, useState } from "react";
import { headers } from "next/headers";

interface MailMagazines {
  id: string;
  genre: string;
  summary: string;
  from: string;
  fromName: string;
  fromEmail: string;
  unsubscribeUrl: string;
  unsubscribeMethod: string;
  unreadCount: number;
  frequency: string;
}

export default function MailMagazineList() {
  const { user, loading } = useAuthContext();
  const [mailMagazines, setMailMagazines] = useState<MailMagazines[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }
    fetchTest();
    fetchMails();
  }, [user]);

  const fetchTest = async () => {
    user?.getIdToken().then(async (token) => {
      const res = await fetch("http://localhost:8080/", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
    });
  };

  const fetchMails = async () => {
    setIsLoading(true);
    user?.getIdToken().then(async (token) => {
      const accessToken = localStorage.getItem("accessToken");
      try {
        console.log("###");
        const res = await fetch("http://localhost:8080/analyze-emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ access_token: accessToken }),
        });
        const result = await res.json();
        console.log(result);
        const mails = result
          .map((res: any) => {
            return {
              id: res.id ?? "",
              genre: res.genre ?? "",
              summary: res.summary,
              from: res.from,
              fromName: res.from_name,
              fromEmail: res.from_email,
              unsubscribeUrl: res.unsubscribe_url ?? "",
              unsubscribeMethod: res.unsubscribe_method ?? "",
              unreadCount: res.unread_count,
              frequency: res.frequency ?? "",
            };
          })
          .sort((a: any, b: any) => (a.unreadCount < b.unreadCount ? 1 : -1));
        setMailMagazines(mails);
      } catch (e) {
        console.log(e);
      } finally {
        setIsLoading(false);
      }
    });
  };

  const handleSignOut = async () => {
    try {
      const auth = getAuth();
      await signOut(auth);
    } catch (e) {
      if (e instanceof FirebaseError) {
        console.log(e);
      }
    }
  };

  return (
    <>
      <div className="flex w-full justify-between px-6">
        <h1 className="text-3xl font-bold mb-6">メルマガ一覧</h1>
        {user && <button onClick={handleSignOut}>ログアウト</button>}
      </div>
      {loading || isLoading ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-center mx-6">メルマガを解析しています...</p>
          <Loader2 className="animate-spin h-8 w-8" />
        </div>
      ) : user ? (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 px-6">
            {mailMagazines.map((mailMagazine, index) => (
              <Card key={index} className="flex flex-col">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle>{mailMagazine.fromName}</CardTitle>
                    <Badge variant="secondary">{mailMagazine.frequency}</Badge>
                  </div>
                  <CardDescription>{mailMagazine.fromEmail}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <div className="space-y-2">
                    <div>
                      <strong>未読:</strong> {mailMagazine.unreadCount}件
                    </div>
                    {/* <div>
                      <strong>解除方法:</strong>{" "}
                      {mailMagazine.unsubscribeMethod}
                    </div> */}
                    {mailMagazine.unsubscribeUrl && (
                      <div className="pt-4">
                        <Link href={mailMagazine.unsubscribeUrl} passHref>
                          <Button
                            variant="outline"
                            className="w-full bg-red-500 text-white"
                          >
                            メルマガを解除
                          </Button>
                        </Link>
                      </div>
                    )}
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
            <h1 className="text-4xl font-bold text-gray-800 mb-4">
              メール断捨離アプリ
            </h1>
            <p className="text-xl text-gray-600 mb-6">
              あなたのメール、たまっていませんか？
            </p>
            <div className="text-center">
              <img
                src="/mail.jpeg"
                alt="mail"
                className="mx-auto my-5"
                width={200}
              />
            </div>
            <p className="text-lg text-gray-700 mb-8">
              <span className="text-xl font-bold">メール断捨離アプリ</span>は、
              <br />
              あなたのメールボックスに溜まっている
              <span className="text-xl font-bold">未読のメルマガを検出</span>
              し、
              <br />
              <span className="text-xl font-bold">
                本当に必要なメールだけを残す
              </span>
              お手伝いをします。
              <br />
              <span className="text-xl font-bold">
                不要なメルマガを簡単に特定
              </span>
              し、一括で処理することで、
              <br />
              デジタルライフをスッキリさせましょう。
            </p>
            <div>
              <Auth />
            </div>
          </main>
        </div>
      )}
    </>
  );
}
