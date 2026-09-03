const GITHUB_PAGES_ORIGIN_PROPERTY = 'GITHUB_PAGES_ORIGIN';
const APP_PASSWORD_PROPERTY = 'APP_PASSWORD';
const ORIGIN_PATTERN = /^https?:\/\/[A-Za-z0-9.-]+(?::\d+)?$/;

function doGet() {
  const template = HtmlService.createTemplateFromFile('Index');
  template.allowedParentOrigin = getAllowedParentOrigin();
  return template.evaluate()
    .setTitle('QRコード表示')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getAllowedParentOrigin() {
  const origin = (PropertiesService.getScriptProperties().getProperty(GITHUB_PAGES_ORIGIN_PROPERTY) || '').trim();
  if (!origin) {
    throw new Error(
      'スクリプトプロパティ ' + GITHUB_PAGES_ORIGIN_PROPERTY + ' が未設定です。' +
      'プロジェクトの設定 > スクリプト プロパティ で GitHub Pages のオリジンを設定してください。'
    );
  }
  if (!ORIGIN_PATTERN.test(origin)) {
    throw new Error(
      'スクリプトプロパティ ' + GITHUB_PAGES_ORIGIN_PROPERTY +
      ' はパスを含まないオリジン形式（例: https://example.github.io）で指定してください。現在の値: ' + origin
    );
  }
  return origin;
}

function receiveQrText(qrText, password) {
  // 判定は必ずサーバー側で行う。クライアントJSでの照合は迂回できるため。
  verifyPassword(password);
  if (typeof qrText !== 'string') throw new Error('QRコードの値が文字列ではありません。');
  const normalizedText = qrText.trim();
  if (!normalizedText) throw new Error('QRコードの値が空です。');
  return {
    text: normalizedText,
    receivedAt: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy/MM/dd HH:mm:ss')
  };
}

function verifyPassword(password) {
  const expected = PropertiesService.getScriptProperties().getProperty(APP_PASSWORD_PROPERTY);
  if (!expected) {
    throw new Error(
      'スクリプトプロパティ ' + APP_PASSWORD_PROPERTY + ' が未設定です。' +
      'プロジェクトの設定 > スクリプト プロパティ でパスワードを設定してください。'
    );
  }
  if (typeof password !== 'string' || !matchesSecret(password, expected)) {
    throw new Error('パスワードが違います。');
  }
}

// 不一致文字を見つけた時点でreturnせず全文字を走査し、応答時間から
// 一致した先頭文字数が推測されるのを防ぐ。
function matchesSecret(input, expected) {
  if (input.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < input.length; i++) {
    diff |= input.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}
