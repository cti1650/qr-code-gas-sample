# セットアップガイド

## デプロイ手順

### 1. GAS側のセットアップ

1. GASエディタの **プロジェクトの設定 > スクリプト プロパティ** を開きます
2. 以下の3つを設定します：

| キー | 値 | 例 |
|-----|---|---|
| `GITHUB_PAGES_ORIGIN` | GitHub Pagesのオリジン（複数指定可、カンマ区切り） | `https://cti1650.github.io` または `https://cti1650.github.io, http://localhost:8000` |
| `APP_PASSWORD` | アプリ用パスコード（十分に長いランダム文字列） | `AbC$D%E!Fg123` |

3. **デプロイ > デプロイを管理 > 鉛筆アイコン > アクセスできるユーザー: 全員** に設定します
   - 「Googleアカウントを持つ全員」ではなく「全員」を選択してください

4. WebアプリのURLをコピーしておきます（`https://script.google.com/macros/s/xxxxx/exec`）

### 2. GitHub Pagesのセットアップ

1. リポジトリの **Settings > Secrets and variables > Actions > Variables** で `GAS_WEB_APP_URL` を作成
2. GASのWebアプリURLを値として設定します
3. **Settings > Pages** で *Source* を **GitHub Actions** に設定します

### 3. デプロイ

GASを変更したときは必ずバージョンを上げます：

- **デプロイ > デプロイを管理 > 鉛筆アイコン > バージョン「新バージョン」> デプロイ**
- 「新しいデプロイ」ではなく既存デプロイの**編集**から行ってください
- 新規デプロイを作るとURLが変わり、リポジトリ変数の更新が必要になります

## ローカル開発

`.env`を用意して`config.js`を生成し、GitHub Pagesを静的サーバで配信します。

```sh
cp .env.example .env
# .env の GAS_WEB_APP_URL を実際のURLに書き換える
node scripts/generate-config.mjs
python3 -m http.server 8000 --directory github-pages
```

**注意点:**
- `.env`と生成された`config.js`は`.gitignore`済みのためコミットされません
- そのままではGAS側がメッセージを受け取りません
- 読み取り結果の連携をテストするには、GASのスクリプトプロパティへ開発用オリジンを追加します：
  ```
  https://<ユーザー名>.github.io, http://localhost:8000
  ```
- 本番用の値を消す必要はありません
