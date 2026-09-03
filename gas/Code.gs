const GITHUB_PAGES_ORIGIN_PROPERTY = 'GITHUB_PAGES_ORIGIN';
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

function receiveQrText(qrText) {
  if (typeof qrText !== 'string') throw new Error('QRコードの値が文字列ではありません。');
  const normalizedText = qrText.trim();
  if (!normalizedText) throw new Error('QRコードの値が空です。');
  return {
    text: normalizedText,
    receivedAt: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy/MM/dd HH:mm:ss')
  };
}
