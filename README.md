# QRコード読み取りサンプル

1. GASの`Code.gs`と`Index.html`を配置してWebアプリとしてデプロイします。
2. GASのスクリプトプロパティ`GITHUB_PAGES_ORIGIN`にGitHub Pagesのオリジンを設定します（下記参照）。
3. GASのWebアプリURLを、リポジトリ変数`GAS_WEB_APP_URL`に設定します（下記参照）。
4. `main`ブランチへpushすると、GitHub Actionsが`github-pages/`をGitHub Pagesへデプロイします。

GitHub Pagesで読み取った文字列はiframeへ`postMessage`で渡り、`google.script.run.receiveQrText()`を介してGAS関数で受信されます。GAS関数の戻り値をiframe内へ表示します。

## 読み取りの挙動

連続送信はしません。**同じ値を3回連続で検知した時点で1度だけ送信し、スキャンを停止**します。
途中で異なる値を検知した場合はカウントをやり直すため、誤読が1回混じっても確定しません。
確認中は「読み取り確認中… (n/3)」と表示されます。続けて読み取るには再度ボタンを押してください。

回数は`github-pages/index.html`の`REQUIRED_MATCHES`で変更できます。

## 設定パネル

ページ上部の⚙️ボタンをタップすると設定パネルが開きます。以下の項目を設定できます。

### パスコード

読み取り開始に必要なパスコード。ここで変更した値は`sessionStorage`に保存され、タブを閉じるまで保持されます。

### 連続読み込みモード

読み取り成功後、自動的に3秒で再度読み込みを開始するかを選択できます。

- **OFF（既定）**: 読み取り成功後、手動で再開ボタンを押す必要があります
- **ON**: 読み取り成功後、3秒で自動的に再開。連続でQRコードを読み取る場合に便利です

読み取り失敗時は、ON/OFFに関わらず停止します。

## 効果音

読み取り結果を効果音で通知します。効果音ラボの高品質MP3ファイルを使用しています。

- **成功時**（決定音・ピコッ）: 読み取り成功時に再生
- **失敗時**（キャンセル音・ピュッ）: 読み取り失敗時に再生

スマートフォンの音量設定に従います。サイレントモード時は無音になります。

## アクセス制限（パスワード）

Google認証はiframeでは使えません。認証が必要な設定だとGASが`accounts.google.com`へ
リダイレクトし、そのログイン画面が`X-Frame-Options: DENY`を返すためです。PCで動いても
iOS Safari等はサードパーティCookieをブロックするため、スマホでは必ず失敗します。

そのためデプロイのアクセス権は**「全員」**にしたうえで、アプリ独自のパスワードで保護します。

1. GASエディタの **プロジェクトの設定 > スクリプト プロパティ** で
   `APP_PASSWORD` に任意のパスワードを設定します。
2. **デプロイ > デプロイを管理 > 鉛筆アイコン > アクセスできるユーザー: 全員** にします。
   「Googleアカウントを持つ全員」では動きません。

利用者はGitHub Pagesの画面でパスワードを入力します。値は`sessionStorage`に保持され、
タブを閉じると消えます。

### 設計上の要点

- **照合はGAS側（`receiveQrText`）で行います。** クライアントJSでの判定はDevToolsで
  迂回できるため、サーバー側でしか意味がありません。
- パスワードはソースに埋め込まず利用者が入力するため、公開リポジトリに置いても漏れません。
- `APP_PASSWORD`が未設定の場合は`throw`します（フェイルクローズ）。

### 制限事項

- **総当たり攻撃を防げません。** GASは`doGet`/`google.script.run`でクライアントIPを
  取得できないため、IP単位のレート制限を実装できません。全体でカウントする方式は
  攻撃者による締め出し（DoS）を招くので採用していません。**十分に長いランダムな
  パスワードを設定してください。**
- 守れるのは`receiveQrText`の実行だけです。`doGet`（iframe内の画面表示）自体は
  誰でも到達できます。ただし表示されるのは空の受信待ち画面のみです。

## GitHub Pagesオリジンの設定（GAS側）

GAS側は`GITHUB_PAGES_ORIGIN`をスクリプトプロパティから読み、`doGet()`が
テンプレート経由でクライアントJSへ埋め込みます。ソースへの直書きは不要です。

1. GASエディタの **プロジェクトの設定 > スクリプト プロパティ** を開きます。
2. プロパティ`GITHUB_PAGES_ORIGIN`に、パスを含まないオリジン
   （例: `https://<ユーザー名>.github.io`）を設定します。
3. プロパティだけを変更した場合、再デプロイは不要です。`doGet()`は実行のたびに
   プロパティを読むため、ページを再読み込みすれば反映されます。

末尾のスラッシュやリポジトリ名を含めると`doGet()`がエラーで停止します。
`postMessage`の`event.origin`はスキーム+ホスト+ポートのみで、完全一致で比較するためです。
未設定の場合も同様にエラーとなり、原因がメッセージに表示されます。

### 複数オリジンを許可する

**カンマ区切り**で複数指定できます。本番とローカル確認を1つのGASデプロイで
併用したい場合などに使います。前後の空白と重複は無視されます。

```
https://<ユーザー名>.github.io, http://localhost:8000
```

1つでも書式が不正な値が混ざっていると`doGet()`はエラーで停止します（フェイルクローズ）。

#### 送信先が1つに定まる仕組み

`postMessage`の送信先（`targetOrigin`）は1つしか指定できないため、許可リストが
複数あるだけでは返信先を決められません。そこで**埋め込み元がクエリ`parentOrigin`で
自分のオリジンを名乗り、GAS側が許可リストと照合して採用**します。

```
https://script.google.com/macros/s/xxxxx/exec?parentOrigin=https%3A%2F%2Fexample.github.io
```

- 付与するのは`github-pages/index.html`（`withParentOrigin()`）で、利用者の操作は不要です。
- 名乗りが許可リストにない場合は採用せず、iframe内にエラーを表示します（フェイルクローズ）。
- 名乗りがない場合は、許可リストが**1つのときのみ**それを採用します（従来どおりの動作）。

**名乗りを詐称されても安全です。** 悪意あるページが他人のオリジンを名乗って
このGAS画面を埋め込んでも、`targetOrigin`が実際の埋め込み元と一致しないため
ブラウザが配送を拒否し、そのページにはデータが届きません。受信側の検証も
従来どおり`event.origin`との完全一致で行うため、検証が緩くなることはありません。

### コードを変更したときは必ずバージョンを上げる

`/exec`のURLは**デプロイ時点で固定されたバージョン**を配信します。エディタで
`Code.gs`や`Index.html`を保存しただけでは`/exec`の内容は変わりません。

**デプロイ > デプロイを管理 > 鉛筆アイコン > バージョン「新バージョン」> デプロイ**

「新しいデプロイ」ではなく既存デプロイの**編集**から行ってください。新規デプロイを
作るとURLが変わり、リポジトリ変数`GAS_WEB_APP_URL`の更新も必要になります。

## GAS WebアプリURLの設定（GitHub Pages側）

GitHub Pagesは静的ホスティングのため実行時の環境変数を持てません。そのため
**配信前に`github-pages/config.js`を生成して値を埋め込む**方式にしています。

生成は`scripts/generate-config.mjs`（Node.js標準機能のみ、依存パッケージなし）が行い、
値は次の優先順で解決します。

1. 環境変数`GAS_WEB_APP_URL`（GitHub Actionsではリポジトリ変数の値が入ります）
2. リポジトリ直下の`.env`の`GAS_WEB_APP_URL`

未設定の場合、および`https://script.google.com/...`以外のURLの場合はエラーで停止します。
`github-pages/config.js`は生成物のため`.gitignore`済みです（直接編集しないでください）。

### 設定手順（デプロイ）

1. リポジトリの **Settings > Secrets and variables > Actions > Variables** で
   `GAS_WEB_APP_URL` を作成し、GASのWebアプリURL
   （`https://script.google.com/macros/s/xxxxx/exec`）を設定します。
2. **Settings > Pages** の *Source* を **GitHub Actions** にします。
3. `main`へpush、または *Actions* から `Deploy GitHub Pages` を手動実行します。

`GAS_WEB_APP_URL`が未設定の場合、ワークフローはエラーで停止します。

なお、URLは公開ページのソースに現れるため秘匿情報にはできません。Secretsではなく
Variablesを使うのはこのためです。

### ローカルでの動作確認

`.env`を用意して`config.js`を生成し、`github-pages/`を静的サーバで配信します。

```sh
cp .env.example .env
# .env の GAS_WEB_APP_URL を実際のURLに書き換える
node scripts/generate-config.mjs
python3 -m http.server 8000 --directory github-pages
```

`.env`と生成された`config.js`はどちらも`.gitignore`済みのため、コミットされません。

注意点があります。

- **そのままではGAS側がメッセージを受け取りません。** GAS側は
  `GITHUB_PAGES_ORIGIN`との完全一致で送信元を検証するため、`http://localhost:8000`
  からの`postMessage`は破棄されます。iframeの表示までは確認できますが、読み取り結果の
  連携まで通すにはスクリプトプロパティへ**カンマ区切りで開発用オリジンを追加**します
  （`http`とポート付きも許容されます）。本番用の値を消す必要はありません。

  ```
  https://<ユーザー名>.github.io, http://localhost:8000
  ```

### 仕組み

| ファイル | 役割 |
| --- | --- |
| `.env` / `.env.example` | ローカル用の`GAS_WEB_APP_URL`。`.env`はコミットしない |
| `scripts/generate-config.mjs` | 環境変数または`.env`から`github-pages/config.js`を生成（依存パッケージなし） |
| `github-pages/config.js` | 生成物（`.gitignore`済み）。`window.APP_CONFIG.gasWebAppUrl`を定義 |
| `.github/workflows/deploy-pages.yml` | `vars.GAS_WEB_APP_URL`を渡して生成スクリプトを実行し、Pagesへデプロイ |
| `github-pages/index.html` | `config.js`のURLを検証し、`parentOrigin`を付けてiframeの`src`に設定 |
| `gas/Code.gs` | `GITHUB_PAGES_ORIGIN`（カンマ区切り可）を検証し、`parentOrigin`と照合した1件をテンプレートへ渡す。`APP_PASSWORD`を照合 |
| `gas/Index.html` | `<?!= JSON.stringify(allowedParentOrigin) ?>`で受け取り送信元を検証 |

#### iframeの二重構造について

HtmlServiceは利用者のHTMLを**二重のiframe**で配信します。

```
GitHub Pages (親ページ)
└─ iframe: script.google.com/macros/s/.../exec        ← iframe.contentWindow はここ
   └─ iframe: n-xxx.googleusercontent.com/userCodeAppPanel  ← Index.html が動くのはここ
```

このため`postMessage`の相手は次のようになります。

- **GAS側**: 親ページは`window.parent`（中間フレーム）ではなく`window.top`
- **GitHub Pages側**: 送信元は`iframe.contentWindow`ではなく内側フレーム。直接参照できないため、
  `GAS_READY`受信時に`event.source`を保持して返信先に使い、検証はオリジン許可リストと
  「自ページ配下のフレームか」（`source.top === window.top`）で行います

URLは`script.google.com` / `*.googleusercontent.com`のHTTPSであることを検証してから
iframeへ設定します。未設定・不正な場合はiframeを読み込まず、画面にメッセージを表示します。

## トラブルシューティング

| ブラウザコンソールのエラー | 原因 | 対処 |
| --- | --- | --- |
| `Invalid target origin 'GITHUB_PAGES_ORIGIN'` | 旧`Index.html`が配信されている | 上記「バージョンを上げる」を実施 |
| `The target origin provided ('...') does not match the recipient window's origin ('https://...googleusercontent.com')` | `window.parent`が中間フレームを指している（二重iframe） | 最新の`gas/Index.html`を反映してバージョンを上げる |
| `Unexpected token '<'` | 新`Index.html`に対し`Code.gs`が旧いまま（スクリプトレット未評価） | `Code.gs`も更新してバージョンを上げる |
| iframeにGASのエラーページが出る | スクリプトプロパティが未設定または書式不正 | エラーページの本文に原因が表示されます |
| 「GASのWebアプリURLが設定されていません」 / `config.js`が404 | `config.js`が未生成 | ローカルは`node scripts/generate-config.mjs`、デプロイはリポジトリ変数`GAS_WEB_APP_URL`を確認 |
| `パスワードが違います。` | 入力値と`APP_PASSWORD`の不一致 | スクリプトプロパティの値を確認 |
| iframe内が401 / ログイン画面が出ない | アクセス権が「全員」以外 | デプロイ設定を「全員」に変更 |
| iframe内に「このページを埋め込んでいるオリジンは許可されていません」 | 埋め込み元のオリジンが`GITHUB_PAGES_ORIGIN`の許可リストにない | 該当オリジンをカンマ区切りで追加（末尾スラッシュ・パスは不可） |
| スキャンしても何も起きない | 親オリジンの不一致で`postMessage`が破棄されている | `GITHUB_PAGES_ORIGIN`が実際のオリジンと完全一致か確認 |
