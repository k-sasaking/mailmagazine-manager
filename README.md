# mailmagazine-manager

## 本番URL

https://mailmagazine-manager.vercel.app/

### ローカル環境構築手順

#### frontend
fireabase authenticationのAPI keyをenvに記載。
```
$ cd frontend
$ npm install
$ npm run dev
```

##### backend
firebase, GMAIL API, vertex GEMINI APIのアカウントを作成し、情報をenvに記載。
```
$ cd api
$ docker compose build
$ docker compose up -d
```

