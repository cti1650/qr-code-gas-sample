#!/usr/bin/env node
"use strict";
// .env（ローカル）または環境変数（GitHub Actions）から github-pages/config.js を生成する。
// GitHub Pagesは静的ホスティングで実行時の環境変数を持てないため、配信前に値を埋め込む。
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const KEY = "GAS_WEB_APP_URL";
const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(rootDir, ".env");
const outputPath = resolve(rootDir, "github-pages", "config.js");

// process.env を優先する。CIではリポジトリ変数の値がこちらに入り、.env は存在しない。
const value = String(process.env[KEY] || readEnvFile(envPath)[KEY] || "").trim();

if (!value) {
  fail(
    `${KEY} が未設定です。ローカルでは .env（.env.example をコピー）に、` +
      "GitHub Actions では Settings > Secrets and variables > Actions > Variables に設定してください。"
  );
}
if (!isAllowedGasWebAppUrl(value)) {
  // index.html 側が同じ条件で弾くため、ここで落として原因を明示する。
  fail(`${KEY} の値が不正です: ${value}\nhttps://script.google.com/macros/s/xxxxx/exec 形式のURLを設定してください。`);
}

writeFileSync(
  outputPath,
  `"use strict";
// このファイルは scripts/generate-config.mjs が生成します。直接編集しないでください。
// 値の変更は .env（ローカル）またはリポジトリ変数 ${KEY}（デプロイ）で行います。
window.APP_CONFIG = {
  gasWebAppUrl: ${JSON.stringify(value)}
};
`,
  "utf8"
);
console.log(`generated: ${outputPath}`);

// KEY=VALUE / #コメント / export接頭辞 / 前後のクォートのみを解釈する最小実装。
// 依存パッケージを増やさないため dotenv は使わない。
function readEnvFile(path) {
  if (!existsSync(path)) return {};
  const result = {};
  for (const rawLine of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separatorIndex = line.indexOf("=");
    if (separatorIndex < 0) continue;
    const key = line.slice(0, separatorIndex).replace(/^export\s+/, "").trim();
    let value = line.slice(separatorIndex + 1).trim();
    const quote = value[0];
    if ((quote === '"' || quote === "'") && value.length >= 2 && value.endsWith(quote)) {
      value = value.slice(1, -1);
    }
    if (key) result[key] = value;
  }
  return result;
}

function isAllowedGasWebAppUrl(candidate) {
  try {
    const url = new URL(candidate);
    return (
      url.protocol === "https:" &&
      (url.hostname === "script.google.com" || url.hostname.endsWith(".googleusercontent.com"))
    );
  } catch (_) {
    return false;
  }
}

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}
