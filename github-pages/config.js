"use strict";
// GitHub Actions でのデプロイ時に、リポジトリ変数 GAS_WEB_APP_URL の値へ置換されます。
// ローカルで動作確認する場合はこのファイルの値を直接書き換えてください（コミットは不要）。
window.APP_CONFIG = {
  gasWebAppUrl: "__GAS_WEB_APP_URL__"
};
