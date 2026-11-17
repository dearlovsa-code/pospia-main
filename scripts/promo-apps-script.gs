/**
 * 포스피아 프로모션 랜딩페이지 상담 신청 → 구글 시트에 한 줄씩 쌓기
 * 붙여 넣는 곳: 시트 메뉴 [확장 프로그램] → [Apps Script]
 * 고칠 필요 없음. 첫 번째 탭에 쌓이고, 비어 있으면 제목 줄을 먼저 만듭니다.
 */
const HEADERS = ['접수일시', '성함', '연락처', '설치 지역', '원하는 상품', '함께 상담할 장비', '상담 편한 시간', '보낸 페이지'];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);
    const p = (e && e.parameters) || {};
    const one = k => (p[k] && p[k][0] ? String(p[k][0]).slice(0, 200) : '');
    const many = k => (p[k] ? p[k].map(String).join(', ').slice(0, 200) : '');
    if (one('website')) return ok(); // 스팸 막기 칸이 채워져 있으면 저장하지 않음
    sheet.appendRow([
      Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss'),
      one('name'), "'" + one('tel'), one('area'), many('items'), many('devices'), one('time'), one('page')
    ]);
    return ok();
  } finally {
    lock.releaseLock();
  }
}

function ok() {
  return ContentService.createTextOutput('ok');
}
