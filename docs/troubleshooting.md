# トラブルシューティング

## ブラウザコンソールのエラー

| エラー | 原因 | 対処 |
|-------|------|------|
| `Invalid target origin 'GITHUB_PAGES_ORIGIN'` | 旧バージョンの `Index.html` が配信されている | [setup.md](setup.md) の「デプロイ」セクションでバージョンを上げる |
| `The target origin provided ('...') does not match the recipient window's origin` | `window.parent` が中間フレームを指している（二重iframe構造） | `gas/Index.html` を最新に反映してバージョンを上げる |
| `Unexpected token '<'` | 新しい `Index.html` に対して、古い `Code.gs` が動いている（スクリプトレット `<?!= %>` が未評価） | `Code.gs` も更新してバージョンを上げる |

## GAS側のエラー

| エラー | 原因 | 対処 |
|-------|------|------|
| iframeにGASのエラーページが出る | スクリプトプロパティが未設定または書式が不正 | エラーページの本文に原因が表示される。[setup.md](setup.md) でプロパティを確認 |
| スクリプトプロパティの設定が反映されない | GAS側のプロパティを更新したが、再デプロイしていない | GASはデプロイ時点のプロパティ値を読む。ただし `doGet()` は実行のたびに読むので、**ページを再読み込みすれば反映される** |

## GitHub Pages側のエラー

| エラー | 原因 | 対処 |
|-------|------|------|
| 「GASのWebアプリURLが設定されていません」 / `config.js` が404 | `config.js` が生成されていない | ローカル：`node scripts/generate-config.mjs` を実行 / デプロイ：リポジトリ変数 `GAS_WEB_APP_URL` を確認 |
| 設定パネルが開かない / 効果音が再生されない | JavaScriptエラーが発生している | ブラウザコンソールでエラーを確認 |

## 読み取り・通信のエラー

| エラー | 原因 | 対処 |
|-------|------|------|
| 「パスワードが違います。」 | 入力したパスコードと `APP_PASSWORD` が不一致 | スクリプトプロパティの `APP_PASSWORD` 値を確認 |
| iframe内が 401 / ログイン画面が出ない | デプロイのアクセス権が「全員」以外に設定されている | [setup.md](setup.md) でアクセス権を「全員」に変更 |
| iframe内に「このページを埋め込んでいるオリジンは許可されていません」 | 埋め込み元のオリジン（例：`http://localhost:8000`）が `GITHUB_PAGES_ORIGIN` の許可リストにない | スクリプトプロパティ `GITHUB_PAGES_ORIGIN` にオリジンをカンマ区切りで追加（末尾スラッシュ・パスは不可） |
| スキャンしても何も起きない / 効果音が鳴らない | 親オリジンの不一致で `postMessage` が破棄されている | `GITHUB_PAGES_ORIGIN` が実際のオリジンと完全一致か確認（スキーム・ホスト・ポート） |
| 連続読み込みが動作しない | ブラウザが Audio 要素の再生をブロックしている可能性 | サイレントモード確認 / ブラウザ設定確認 |

## ローカル開発時の注意

### iframe内が読み込まれない場合

```
http://localhost:8000 → GAS WebApp
```

GAS側は `GITHUB_PAGES_ORIGIN` との完全一致で送信元を検証するため、`http` スキーム・ポート付きの場合も許可する必要があります。

スクリプトプロパティ `GITHUB_PAGES_ORIGIN` に以下のように設定：

```
https://<ユーザー名>.github.io, http://localhost:8000
```

### 読み取り結果が連携しない場合

GitHub Pages（localhost）→ GAS への `postMessage` が拒否されている可能性があります。

ブラウザコンソールを開いて、GASのiframe内で postMessage 関連のエラーがないか確認。

デバッグ用に、GAS側の `Index.html` で以下を確認：

```javascript
console.log("allowedParentOrigin:", ALLOWED_PARENT_ORIGIN);
console.log("event.origin:", event.origin);
```

完全一致するか確認してください。

## よくある質問

**Q: GitHub Actionsのワークフローが失敗する**

A: リポジトリ変数 `GAS_WEB_APP_URL` が未設定の可能性があります。[setup.md](setup.md) で設定してください。

**Q: 効果音が再生されない**

A: スマートフォンのサイレントモードを確認してください。また、ブラウザのコンソールでエラーがないか確認。

**Q: 複数のデバイス・ブラウザで設定が共有されない**

A: 設定は `sessionStorage` に保存され、**タブごと・デバイスごと**に独立しています。設計上の仕様です。
