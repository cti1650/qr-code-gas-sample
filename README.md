# QRコード読み取りサンプル

QRコードをカメラで読み取り、Google Apps Script で処理・表示するサンプルアプリ。GitHub Pages + GAS の連携パターンです。

## 主な機能

### 設定パネル
ページ上部の⚙️ボタンで設定パネルを開く。

- **パスコード**: 読み取り開始に必要（毎回の入力は不要、sessionStorageに保存）
- **連続読み込みモード**: 読み取り成功後、3秒で自動再開（連続スキャン用）
- **効果音**: 成功時は決定音、失敗時はキャンセル音（効果音ラボ）

### 読み取り精度
同じ値を3回連続で検知した時点で送信。誤読が1回混じっても確定しません。

### セキュリティ
- パスコード認証（GAS側で照合）
- オリジン検証
- 複数環境対応（本番 + ローカル開発）

## 動作確認

以下のテスト用QRコードで効果音の動作確認ができます。

| テスト | QRコード | 期待する動作 |
|--------|---------|-----------|
| **成功時** | ![SUCCESS-QR](assets/images/success-qr.png) | 決定音（ピコッ） |
| **失敗時** | ![ERROR-QR](assets/images/error-qr.png) | キャンセル音（ピピピッ） |

エラーテスト用QRコード（下）に「ERROR-TEST」というテキストが入っており、これを読み取るとエラーが発生します。

## クイックスタート

### 必要な準備

1. [Google Apps Script](https://script.google.com) でプロジェクトを作成
2. `gas/Code.gs` と `gas/Index.html` をコピー
3. WebApp としてデプロイ
4. スクリプトプロパティを設定（下記参照）
5. GitHubにコードをpush

### 設定項目

**GAS のスクリプトプロパティ:**
- `GITHUB_PAGES_ORIGIN`: GitHub Pages のオリジン（例: `https://cti1650.github.io`）
- `APP_PASSWORD`: アプリ用パスコード

**GitHub の Actions 変数:**
- `GAS_WEB_APP_URL`: GAS WebApp の URL

詳細は [docs/setup.md](docs/setup.md) を参照。

## トラブルシューティング

> [docs/troubleshooting.md](docs/troubleshooting.md) を参照

## 詳細ドキュメント

- [セットアップガイド](docs/setup.md) - デプロイ・ローカル開発手順
- [アーキテクチャ](docs/architecture.md) - 通信フロー・セキュリティ設計
- [トラブルシューティング](docs/troubleshooting.md) - よくあるエラーと対処

## 読み取り仕様

| 項目 | 仕様 |
|-----|------|
| 確認回数 | 同一値を3回連続検知で送信 |
| 認証 | パスコード（毎回入力は不要） |
| セキュリティ | オリジン検証 + パスコード検証 |
| 複数環境 | 本番＆ローカル開発を同一GASで対応 |

## ライセンス

- 効果音: 効果音ラボ（CC0相当、商用無料・クレジット不要）
- その他: 制限なし
