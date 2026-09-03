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

### コードを変更したときは必ずバージョンを上げる

`/exec`のURLは**デプロイ時点で固定されたバージョン**を配信します。エディタで
`Code.gs`や`Index.html`を保存しただけでは`/exec`の内容は変わりません。

**デプロイ > デプロイを管理 > 鉛筆アイコン > バージョン「新バージョン」> デプロイ**

「新しいデプロイ」ではなく既存デプロイの**編集**から行ってください。新規デプロイを
作るとURLが変わり、リポジトリ変数`GAS_WEB_APP_URL`の更新も必要になります。

## GAS WebアプリURLの設定（GitHub Pages側）

GitHub Pagesは静的ホスティングのため実行時の環境変数を持てません。そのため
**デプロイ時にリポジトリ変数の値を`github-pages/config.js`へ埋め込む**方式にしています。

### 設定手順

1. リポジトリの **Settings > Secrets and variables > Actions > Variables** で
   `GAS_WEB_APP_URL` を作成し、GASのWebアプリURL
   （`https://script.google.com/macros/s/xxxxx/exec`）を設定します。
2. **Settings > Pages** の *Source* を **GitHub Actions** にします。
3. `main`へpush、または *Actions* から `Deploy GitHub Pages` を手動実行します。

`GAS_WEB_APP_URL`が未設定の場合、ワークフローはエラーで停止します。

なお、URLは公開ページのソースに現れるため秘匿情報にはできません。Secretsではなく
Variablesを使うのはこのためです。

### ローカルでの動作確認

`github-pages/config.js`の`gasWebAppUrl`を直接書き換えてから、`github-pages/`を
静的サーバで配信してください。

```sh
python3 -m http.server 8000 --directory github-pages
```

注意点が2つあります。

- **書き換えた`config.js`はコミットしないでください。** プレースホルダ
  `__GAS_WEB_APP_URL__`が消えた状態でpushすると、ワークフローの置換ステップが
  「プレースホルダが見つかりません」で失敗します。
- **この状態ではGAS側がメッセージを受け取りません。** GAS側は
  `GITHUB_PAGES_ORIGIN`との完全一致で送信元を検証するため、`http://localhost:8000`
  からの`postMessage`は破棄されます。iframeの表示までは確認できますが、
  読み取り結果の連携まで通すにはスクリプトプロパティを一時的に
  `http://127.0.0.1:5500`等へ変更してください（`http`とポート付きも許容されます）。

### 仕組み

| ファイル | 役割 |
| --- | --- |
| `github-pages/config.js` | `window.APP_CONFIG.gasWebAppUrl`を定義。既定値はプレースホルダ`__GAS_WEB_APP_URL__` |
| `.github/workflows/deploy-pages.yml` | プレースホルダを`vars.GAS_WEB_APP_URL`へ置換してPagesへデプロイ |
| `github-pages/index.html` | `config.js`のURLを検証してからiframeの`src`に設定 |
| `gas/Code.gs` | スクリプトプロパティ`GITHUB_PAGES_ORIGIN`を検証してテンプレートへ渡す |
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
| 「GASのWebアプリURLが設定されていません」 | `config.js`が未置換、またはURLが`script.google.com`以外 | リポジトリ変数`GAS_WEB_APP_URL`を確認 |
| スキャンしても何も起きない | 親オリジンの不一致で`postMessage`が破棄されている | `GITHUB_PAGES_ORIGIN`が実際のオリジンと完全一致か確認 |
