import os
from datetime import datetime
import base64
import json
import re

from fastapi import FastAPI, Request, HTTPException, Header
from starlette.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, auth
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
import vertexai
from vertexai.generative_models import GenerativeModel


# 環境変数の読み込み
load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

firebase_cert = {
    "type": "service_account",
    "project_id": os.environ.get("FIREBASE_PROJECT_ID"),
    "private_key": os.environ.get("FIREBASE_PRIVATE_KEY").replace("\\n", "\n"),
    "client_email": os.environ.get("FIREBASE_CLIENT_EMAIL"),
    "token_uri": "https://oauth2.googleapis.com/token",
    # 必要に応じて他のキーも追加してください
}

cred = credentials.Certificate(firebase_cert)
firebase_app = firebase_admin.initialize_app(cred)

# genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))


async def verify_firebase_token(token: str) -> str:
    """
    Firebase の ID トークンを検証し、ユーザーのメールアドレスを返す。
    """
    try:
        decoded_token = auth.verify_id_token(token)
        print(decoded_token)
        return decoded_token.get("email")
    except Exception as e:
        print(e)
        raise HTTPException(status_code=401, detail="Invalid Firebase token")


@app.get("/")
def read_root():
    return {"Hello": "World!!"}


@app.get("/generate")
def generate():
    vertexai.init(project=os.environ.get("FIREBASE_PROJECT_ID"), location="us-central1")
    model = GenerativeModel("gemini-2.0-flash-001")
    response = model.generate_content(
        "emailを取得して、メルマガかどうかをpythonで判定したい。100字以内で答えてください。"
    )
    return response.text


@app.post("/analyze-emails")
async def analyze_emails_post(request: Request, authorization: str = Header(None)):

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="No token provided")
    token = authorization.split("Bearer ")[1]

    # Firebase トークンの検証
    user_email = await verify_firebase_token(token)

    body = await request.json()
    # 辞書から'access_token'の値を取得する
    access_token = body.get("access_token")
    # Gmail API の認証情報を設定
    credentials = Credentials(
        token=access_token,
        refresh_token=os.environ.get("GMAIL_PROJECT_ID"),
        token_uri="https://oauth2.googleapis.com/token",
        client_id=os.environ.get("GMAIL_CLIENT_ID"),
        client_secret=os.environ.get("GMAIL_CLIENT_SECRET"),
        scopes=["https://www.googleapis.com/auth/gmail.readonly"],
    )
    # Gmail API のクライアントを作成

    gmail_service = build("gmail", "v1", credentials=credentials)
    try:
        results = (
            gmail_service.users()
            .messages()
            .list(userId="me", q="is:unread", maxResults=100)
            .execute()
        )
        messages = results.get("messages", [])
        # Emailリスト作成
        emails = []
        for message in messages:
            msg_id = message.get("id")
            email_data = (
                gmail_service.users()
                .messages()
                .get(userId="me", id=msg_id, format="full")
                .execute()
            )
            mime_type = email_data.get("payload", {}).get("mimeType", "")
            print(mime_type)
            headers = email_data.get("payload", {}).get("headers", [])
            sender = None
            subject = None
            for header in headers:
                header_name = header.get("name", "").lower()
                if header_name == "from":
                    sender = header.get("value")
                elif header_name == "subject":
                    subject = header.get("value")
            # snippet を解析用コンテンツとして利用
            content = email_data.get("snippet", "")
            # rawデータの取得
            body = email_data.get("payload", {}).get("body", {}).get("data", "")
            content_raw = base64.urlsafe_b64decode(body).decode("utf-8")
            # dataの取得
            date = email_data.get("internalDate", "")
            emails.append(
                {
                    "from": sender,
                    "subject": subject,
                    "content": content,
                    "content_raw": content_raw,
                    "date": date,
                }
            )

        # 送信者ごとにグループ化
        analyzed_emails = await analyze_emails(emails)
        return analyzed_emails
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=str(e))


async def analyze_emails(emails: list) -> list:
    """
    送信者ごとにメールをグループ化し、解析したデータを挿入する。
    """
    grouped = {}
    for email in emails:
        sender = email.get("from")
        if sender not in grouped:
            grouped[sender] = {"from": sender, "unread_count": 0, "emails": []}
        grouped[sender]["unread_count"] += 1
        grouped[sender]["emails"].append(email)

    for key in grouped:
        emails = grouped[key]["emails"]
        analyzed_result = await analyze_summary_emails(emails)
        grouped[key]["is_mailmagazined"] = analyzed_result["is_mailmagazined"]
        grouped[key]["genre"] = analyzed_result["genre"]
        grouped[key]["unsubscribe_url"] = analyzed_result["unsubscribe_url"]
        grouped[key]["summary"] = analyzed_result["summary"]
        grouped[key]["frequency"] = calculate_email_list_frequency(emails)
    print("### grouped")
    # グループごとにレスポンス用の dict に整形（ここでは最初のメールの content を summary として使用）
    result = []
    for group in grouped.values():
        if not group["is_mailmagazined"]:
            continue
        result.append(
            {
                "from": group["from"],
                "from_email": group["from"].split("<")[1].split(">")[0],
                "from_name": group["from"].split("<")[0],
                "unread_count": group["unread_count"],
                "summary": group["summary"],
                "genre": group["genre"],
                "unsubscribe_url": group["unsubscribe_url"],
                "unsubscribe_method": "",
                "frequency": group["frequency"],
            }
        )
    return result


def analyze_from_gemini(content: str) -> str:
    vertexai.init(project=os.environ.get("FIREBASE_PROJECT_ID"), location="us-central1")
    model = GenerativeModel("gemini-1.5-flash-002")
    response = model.generate_content(content)
    return response.text


async def analyze_summary_emails(emails: list) -> dict:
    """
    複数のメール（リスト）を受け取り、geminiAPIを利用して以下の情報を解析して返す関数です。
      ・メルマガであるかどうかの判定
      ・メルマガ解約のURL
      ・どんなジャンルのメルマガか
      ・メルマガのサマリー

    引数:
      emails (list): 各メールは以下のキーを持つ辞書
         - "from": 送信元アドレス（string）
         - "subject": 件名（string）
         - "content": 本文（string）
         - "content_raw": 本文の生データ（string）
         - "date": 送信日時（string、ISO8601形式など）

    戻り値 (dict):
      {
         "is_mailmagazined": bool,         # メルマガなら True、そうでなければ False
         "unsubscribe_url": str,        # メルマガ解約URL（見つからなければ空文字）
         "genre": str,                  # メルマガのジャンル（例："newsletter"）
         "summary": str                 # メルマガのサマリー
      }
    """
    if not emails:
        return {
            "is_mailmagazined": False,
            "unsubscribe_url": "",
            "genre": "",
            "summary": "",
        }
    limit = 0
    for email in emails:
        contents = email["content_raw"]
        propmt = (
            f"""
    以下のメールの内容がメルマガかどうかを解析してください。
    ```
    {contents}
    ```
    メルマガの場合はis_mailmagazinedを true、そうでない場合は false としてください。
    また、メルマガの配信停止のURLも見つけた場合は、そのURLを出力してください。
    また、メールのジャンルとどんなメールかのサマリーを120字以内で出力してほしい。

    以下フォーマットのJSONで返答してください。

    JSONフォーマット:
    """
            + """
{
    "is_mailmagazined": true,
    "unsubscribe_url": 'https://example.com/',
    "genre": "人材紹介",
    "summary": "人材紹介の求人を紹介するメールです。",
}
最終応答は、"{"で始まり"}"で終わる、または"["で始まり"]"で終わるJSONのみを出力し、JSON以外の文字は一切応答に含めないでください。

JSON:
"""
        )
        try:
            text = analyze_from_gemini(propmt)
            output_text = text
            text = text.replace("null", '""')
            text = text.replace("null", '""')
            text = text.replace("\\", "")
            text = text.replace("'", '"')
            text = text.replace("True", "true")
            text = text.replace("False", "false")
            text = text.replace("```json", "")
            text = text.replace("```", "")

        except Exception as e:
            print("======")
            print(e)
            print("======")
            continue

        try:
            data = json.loads(text)
            is_mailmagazined = data.get("is_mailmagazined", False)
            unsubscribe_url = data.get("unsubscribe_url")
            genre = data.get("genre")
            summary = data.get("summary")
        except Exception as e:
            print("===error====")
            print(e)
            print("===plain_text====")
            print(output_text)
            print("===json_text====")
            print(text)
            text = text.replace("```json", "")
            text = text.replace("```", "")
            print("===fixed_text====")
            print(text)
            is_mailmagazined = False
            unsubscribe_url = ""
            genre = ""
            summary = ""

        print("===result===")
        print(is_mailmagazined)
        print(unsubscribe_url)
        print(genre)
        print(summary)

        if limit < 3 and not is_mailmagazined:
            limit += 1
            continue

        return {
            "is_mailmagazined": is_mailmagazined,
            "unsubscribe_url": unsubscribe_url,
            "genre": genre,
            "summary": summary,
        }
    return {
        "is_mailmagazined": False,
        "unsubscribe_url": "",
        "genre": "",
        "summary": "",
    }


def calculate_email_list_frequency(emails: list) -> str:
    """
    メールのリスト（各メールは辞書形式）から、全体の期間における平均の送信頻度を概算する関数。

    - メールの 'date' フィールド（ISO8601形式の文字列）をパースし、
      最古の日付と最新の日付の差から期間（日数）を算出。
    - その期間中に送信されたメールの総数から、1日あたりのメール数を求め、
      それを1週間（7日）または1ヶ月（30日）に換算して、頻度を計算する。
    - 全体の期間が30日未満の場合は「週に○○回」、30日以上の場合は「月に○○回」として出力する。

    注意:
      - メールが1件のみの場合は、期間が0日となるため、便宜上1日とみなして計算しています。
      - 日付のパースに失敗したメールは計算対象から除外します。

    引数:
      emails (list): 各メールが以下のキーを持つ辞書
         - "from": 送信元（string）
         - "subject": 件名（string）
         - "content": 本文（string）
         - "content_raw": 本文の生データ（string）
         - "date": 送信日時（ISO8601形式の文字列）

    戻り値:
      str: 「週に○○回」または「月に○○回」という形式の文字列
    """

    parsed_dates = []
    for email in emails:
        date_str = email.get("date", "")
        if not date_str:
            continue
        timestamp_sec = int(date_str) / 1000
        # ローカルタイムとして日時に変換
        dt = datetime.fromtimestamp(timestamp_sec)
        parsed_dates.append(dt)
    if not parsed_dates:
        return ""

    # 期間は最古の日付から最新の日付まで
    start_date = min(parsed_dates)
    end_date = max(parsed_dates)
    total_days = (end_date - start_date).days

    # もし期間が0日（＝1件のみなど）の場合、便宜上1日とする
    period = total_days if total_days > 0 else 1
    total_emails = len(parsed_dates)
    # 全体期間が30日未満の場合は週あたりの頻度、それ以外は月あたりの頻度で計算
    if total_days < 30:
        # 1日あたりの平均メール数から7日間（1週間）の数を算出
        avg_per_week = total_emails * 7 / period
        return f"週に{avg_per_week:.1f}回"
    else:
        # 1日あたりの平均メール数から30日間（1ヶ月）の数を算出
        avg_per_month = total_emails * 30 / period
        return f"月に{avg_per_month:.1f}回"
