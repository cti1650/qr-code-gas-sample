const GITHUB_PAGES_ORIGIN_PROPERTY = 'GITHUB_PAGES_ORIGIN';
const APP_PASSWORD_PROPERTY = 'APP_PASSWORD';
const PARENT_ORIGIN_PARAMETER = 'parentOrigin';
const ORIGIN_PATTERN = /^https?:\/\/[A-Za-z0-9.-]+(?::\d+)?$/;

function doGet(e) {
  const template = HtmlService.createTemplateFromFile('Index');
  template.allowedParentOrigin = resolveParentOrigin(e);
  return template.evaluate()
    .setTitle('QRコード表示')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// 許可リストは複数指定できるが、postMessageの送信先は1つに定めなければならない。
// そのため埋め込み元がクエリ parentOrigin で名乗り、それを許可リストと照合して選ぶ。
// 名乗りを詐称されても、実際の埋め込み元と異なる送信先へブラウザは配送しないため
// 情報は漏れない。受信側の検証は event.origin との完全一致で従来どおり行う。
// 該当なしの場合は空文字を返し、Index.html側でエラー表示する（フェイルクローズ）。
function resolveParentOrigin(e) {
  const allowedOrigins = getAllowedParentOrigins();
  const requested = String((e && e.parameter && e.parameter[PARENT_ORIGIN_PARAMETER]) || '').trim();
  if (!requested) {
    // 名乗りがない場合、候補が1つに定まるときのみ従来どおり動作させる。
    return allowedOrigins.length === 1 ? allowedOrigins[0] : '';
  }
  return allowedOrigins.indexOf(requested) >= 0 ? requested : '';
}

function getAllowedParentOrigins() {
  const raw = (PropertiesService.getScriptProperties().getProperty(GITHUB_PAGES_ORIGIN_PROPERTY) || '').trim();
  if (!raw) {
    throw new Error(
      'スクリプトプロパティ ' + GITHUB_PAGES_ORIGIN_PROPERTY + ' が未設定です。' +
      'プロジェクトの設定 > スクリプト プロパティ で GitHub Pages のオリジンを設定してください。'
    );
  }
  const allowedOrigins = [];
  raw.split(',').forEach(function (entry) {
    const origin = entry.trim();
    if (!origin) return;
    if (!ORIGIN_PATTERN.test(origin)) {
      throw new Error(
        'スクリプトプロパティ ' + GITHUB_PAGES_ORIGIN_PROPERTY +
        ' はパスを含まないオリジン形式（例: https://example.github.io）で指定してください。' +
        '複数指定する場合はカンマ区切りです。不正な値: ' + origin
      );
    }
    if (allowedOrigins.indexOf(origin) < 0) allowedOrigins.push(origin);
  });
  if (!allowedOrigins.length) {
    throw new Error(
      'スクリプトプロパティ ' + GITHUB_PAGES_ORIGIN_PROPERTY + ' に有効なオリジンがありません。現在の値: ' + raw
    );
  }
  return allowedOrigins;
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
