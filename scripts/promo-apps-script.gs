/**
 * 포스피아 랜딩페이지(통신 프로모션 /promo, 창업 오픈 패키지 /open, 포스 견적 /quote) 신청 → 구글 시트에 한 줄씩 쌓기 + 접수 알림 메일 + 주간 리포트
 *   /promo · /open → 첫 번째 탭,  /quote(포스 견적) → "신규견적문의" 탭 (없으면 맨 뒤에 자동으로 만듦)
 * 붙여 넣는 곳: 시트 메뉴 [확장 프로그램] → [Apps Script]  (코드 칸의 내용을 모두 지우고 이것만 붙여 넣기)
 * 바꾼 뒤에는 꼭: 저장 → [배포] → [배포 관리] → 연필(수정) → 버전 "새 버전" → [배포]
 *
 * 고칠 곳은 아래 NOTIFY_TO 한 줄뿐입니다(알림을 받을 메일 주소, 여러 개면 쉼표로).
 */
const NOTIFY_TO = 'pos-pia@naver.com';

const HEADERS = ['접수일시', '성함', '연락처', '설치 지역', '원하는 상품', '함께 상담할 장비', '상담 편한 시간', '보낸 페이지', '유입 경로', '업종', '오픈 예정'];
const QUOTE_SHEET = '신규견적문의';
const QUOTE_HEADERS = ['접수일시', '성함', '연락처', '상호명', '설치 지역', '사업자 구분', '원하는 기기', '함께 설치', '설치 희망 시기', '추가 문의', '유입 경로'];

function doPost(e) {
  const p = (e && e.parameters) || {};
  const one = k => (p[k] && p[k][0] ? String(p[k][0]).slice(0, 200) : '');
  const many = k => (p[k] ? p[k].map(String).join(', ').slice(0, 200) : '');
  if (one('website')) return ok(); // 스팸 막기 칸이 채워져 있으면 저장하지 않음
  const now = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');
  const isQuote = one('page').indexOf('quote') >= 0;

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  let row = null;
  try {
    if (isQuote) {
      row = [now, one('name'), "'" + one('tel'), one('shop'), one('area'), one('bizType'), many('devices'),
        many('items'), one('open'), p.memo && p.memo[0] ? String(p.memo[0]).slice(0, 500) : '', one('source') || '직접 방문'];
      quoteSheet().appendRow(row);
    } else {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
      if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);
      // 예전 제목 줄에 새 칸 제목이 없으면 채워 넣기
      const head = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
      HEADERS.forEach((h, i) => { if (!head[i]) sheet.getRange(1, i + 1).setValue(h); });
      row = [now, one('name'), "'" + one('tel'), one('area'), many('items'), many('devices'), one('time'), one('page'), one('source') || '직접 방문', one('biz'), one('open')];
      sheet.appendRow(row);
    }
  } finally {
    lock.releaseLock();
  }
  try { isQuote ? notifyQuote(row) : notify(row); } catch (err) { console.error(err); } // 메일이 실패해도 접수는 저장됨
  return ok();
}

/** 포스 견적 탭 ("신규견적문의"): 없으면 맨 뒤에 만들고, 제목 줄을 넣음. 첫 번째 탭은 건드리지 않음 */
function quoteSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(QUOTE_SHEET) || ss.insertSheet(QUOTE_SHEET, ss.getSheets().length);
  if (sh.getLastRow() === 0) sh.appendRow(QUOTE_HEADERS);
  return sh;
}

function notify(row) {
  if (!row || !NOTIFY_TO) return;
  const lines = HEADERS.map((h, i) => h + ': ' + String(row[i]).replace(/^'/, ''));
  MailApp.sendEmail(NOTIFY_TO, '[포스피아] 새 상담 신청 - ' + row[1] + ' (' + (String(row[7]).indexOf('open') >= 0 ? '오픈 패키지' : '통신 프로모션') + ' · ' + row[8] + ')',
    '랜딩페이지로 새 상담 신청이 들어왔어요. 1시간 안에 연락해 주세요.\n\n' + lines.join('\n') +
    '\n\n시트: ' + SpreadsheetApp.getActiveSpreadsheet().getUrl());
}

function notifyQuote(row) {
  if (!row || !NOTIFY_TO) return;
  const lines = QUOTE_HEADERS.map((h, i) => h + ': ' + String(row[i]).replace(/^'/, ''));
  MailApp.sendEmail(NOTIFY_TO, '[포스피아] 새 포스 견적 신청 - ' + row[1] + ' (' + row[6] + ' · ' + row[10] + ')',
    '포스 견적 페이지로 새 신청이 들어왔어요. 1시간 안에 연락해 주세요.\n\n' + lines.join('\n') +
    '\n\n시트("' + QUOTE_SHEET + '" 탭): ' + SpreadsheetApp.getActiveSpreadsheet().getUrl());
}

/** 매주 월요일 아침 지난 7일 요약을 메일로 보냅니다. (Apps Script 왼쪽 시계 아이콘 [트리거]에서 이 함수를 주 단위로 등록) */
function weeklyReport() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  const data = sheet.getDataRange().getValues().slice(1);
  const since = new Date(Date.now() - 7 * 864e5);
  const when = v => (v instanceof Date ? v : new Date(String(v).replace(' ', 'T') + '+09:00'));
  const rows = data.filter(r => r[0] && when(r[0]) >= since);
  const count = (col, split) => {
    const m = {};
    rows.forEach(r => String(r[col] || '없음').split(split ? ', ' : '\u0000').forEach(v => { v = v.trim() || '없음'; m[v] = (m[v] || 0) + 1; }));
    return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([k, v]) => '  - ' + k + ': ' + v + '건').join('\n') || '  - 없음';
  };
  const body = '지난 7일 랜딩페이지 상담 신청: ' + rows.length + '건\n\n' +
    '■ 페이지별\n' + count(7) + '\n\n■ 유입 경로별\n' + count(8) + '\n\n■ 원하는 상품별\n' + count(4, true) + '\n\n■ 함께 상담할 장비\n' + count(5, true) +
    '\n\n시트: ' + SpreadsheetApp.getActiveSpreadsheet().getUrl();
  MailApp.sendEmail(NOTIFY_TO, '[포스피아] 주간 상담 리포트 (' + rows.length + '건)', body);
}

function ok() {
  return ContentService.createTextOutput('ok');
}
