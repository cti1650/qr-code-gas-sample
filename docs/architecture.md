# アーキテクチャ

## 全体構成

GitHub Pagesで QR読み取り → iframeで GAS WebApp → 結果を表示・効果音再生

```
GitHub Pages                 Google Apps Script
┌─────────────┐              ┌──────────────┐
│ HTML        │──iframe──→   │ WebApp       │
│ (QR reader) │              │ (doGet)      │
└─────────────┘              └──────────────┘
     ↑                             │
     └─────── postMessage ─────────┘
```

## 通信フロー

1. GitHub Pagesが読み込まれ、GASのWebAppを iframe で読み込む
2. ユーザーが QR を読み取る
3. GitHub Pages → GAS へ `postMessage` で QRテキスト + パスコードを送信
4. GAS側で検証 → 結果を返す
5. GitHub Pages側で効果音再生・UI更新

## セキュリティ対策

### 複数オリジンへの対応

`postMessage` の `targetOrigin` は1つしか指定できないため、複数オリジンを許可する場合は特殊な処理が必要です。

**実装方法:**

1. GitHub Pages側が `parentOrigin` クエリでオリジンを名乗る
   ```javascript
   // github-pages/index.html
   iframe.src = gasUrl + "?parentOrigin=" + location.origin
   ```

2. GAS側が許可リストと照合
   ```javascript
   // gas/Code.gs
   function resolveParentOrigin(e) {
     const allowed = getAllowedParentOrigins();
     const requested = e.parameter.parentOrigin;
     return allowed.indexOf(requested) >= 0 ? requested : '';
   }
   ```

3. 照合したオリジンを Index.html に埋め込む

**セキュリティ考察:**
- 名乗りを詐称しても、ブラウザの `targetOrigin` チェックで配送が拒否される
- 実装側も `event.origin` で完全一致検証する
- 詐称は効果がない

### パスコード認証

- Google認証は iframe では動かない（リダイレクトが X-Frame-Options: DENY で失敗）
- そのためアプリ独自のパスコード認証を実装
- 照合は**必ずサーバー側（GAS）で行う**（クライアントJSでの判定は迂回可能）
- パスワードは利用者が毎回入力する（ソースに埋め込まない）

**制限事項:**
- IP単位のレート制限は実装不可（GASはクライアントIPを取得不可）
- 十分に長いランダムなパスコードを設定してください

## iframeの二重構造

HtmlServiceは利用者のHTMLを二重のiframeで配信します。

```
GitHub Pages (親ページ)
└─ iframe: script.google.com/macros/s/.../exec
   └─ iframe: n-xxx.googleusercontent.com/userCodeAppPanel
      └─ Index.html が動作するのはここ
```

**postMessage の送信先:**

- **GAS側**: 親ページは `window.parent`（中間フレーム）ではなく `window.top`
- **GitHub Pages側**: 送信元は `iframe.contentWindow` ではなく内側フレーム

`GAS_READY` 受信時に `event.source` を保持して、以降の通信の返信先として使用します。

## ファイル構成

| ファイル | 役割 |
|---------|------|
| `gas/Code.gs` | WebAppのメインロジック。オリジン検証、パスコード照合、結果返却 |
| `gas/Index.html` | GAS側のUI（受信結果表示用） |
| `github-pages/index.html` | QR読み取り画面。設定パネル、効果音再生 |
| `github-pages/audio/` | 効果音素材（success.mp3, error.mp3） |
| `github-pages/config.js` | GAS WebAppのURL（生成物） |
| `scripts/generate-config.mjs` | GitHub Actions / ローカルで config.js を生成 |
| `.env.example` | ローカル開発用テンプレート |

## 設定値の流れ

```
GAS スクリプトプロパティ
└─ GITHUB_PAGES_ORIGIN (複数オリジン対応)
   └─ doGet() で Index.html へ埋め込み
      └─ postMessage で GitHub Pages へ送信

GitHub Actions リポジトリ変数
└─ GAS_WEB_APP_URL
   └─ generate-config.mjs で config.js へ生成
      └─ index.html が読み込み
         └─ GAS WebApp を iframe で読み込み
```
