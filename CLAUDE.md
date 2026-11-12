# POSPIA 메인 사이트 작업 메모

포스피아(포스·키오스크·테이블오더·카드단말기·인터넷·CCTV·택스리펀드 설치) 회사 메인 홈페이지.
기존 카페24 사이트(https://pospia7107.cafe24.com/)를 새로 만든 것. 사용자는 개발 비전문가다.
설명은 쉬운 말로 하고, 수정할 때마다 화면을 직접 검사한 뒤 캡처와 미리보기 파일로 보여 준다.
자매 사이트: POSPIA TAX REFUND(`dearlovsa-code/popia-home`, https://taxrefund.pos-pia.workers.dev).

## 파일 구조 (여러 페이지 정적 사이트)
- **원본은 `src/`**: `src/pages/*.html`(페이지 본문) + `src/partials/`(header·footer·icons 공통 부분).
  루트의 `index.html`·`company.html`·`product.html`·`process.html`·`notice.html`은 **만들어진 결과물** — 손으로 고치지 않는다.
  `src/`를 고친 뒤에는 반드시 `node scripts/build.mjs` (페이지 + 미리보기를 함께 다시 만든다).
  각 페이지 첫 줄 주석 `<!-- title: … | desc: … | nav: company -->`가 제목·설명·현재 메뉴 표시.
- `assets/css/site.css`: 전체 스타일(공통 → HOME → COMPANY → PRODUCT → PROCESS → NOTICE 순).
- `assets/js/site.js`: 동작 전체. `assets/js/lenis.min.js`: 부드러운 스크롤(MIT).
- `assets/img/`: 사진(**WebP**). `prod-*`·`proc-*`·`banner-*`·`hero-desk`는 카페24 사이트 이미지에서 글자 없는 부분만 잘라 낸 것(가로 1000px 이하라 원본을 받으면 교체 권장).
  나머지(tera-*, adams-* 등)는 블로그 실제 설치 사진(taxrefund 사이트와 같은 파일).
- `assets/news/`: 홈 "Cases" 카드 썸네일. **자동 생성물, 손으로 고치지 않는다.**
- `assets/fonts/`: Pretendard 서브셋(400·700, KS X 1001 2350자, OFL) + Italiana(영문 제목 전용, latin, OFL).
- `assets/logo/`: 마크·워드마크(흰색=어두운 바탕, 남색=밝은 바탕).
- `미리보기/1-홈.html` … `5-공지사항.html`: 글꼴·사진·스크립트를 모두 넣은 확인용 파일(서로 링크됨, 같은 폴더에 두고 열기).
  사용자에게는 SendUserFile `display: attach`로 보낸다.
- `scripts/update-news.mjs`: 블로그 "포스피아 설치사례"(categoryNo=1) 최신 8개로 홈 Cases 카드를 다시 만든다
  (`src/pages/index.html`의 `<!-- NEWS:START -->`~`<!-- NEWS:END -->`만 바꾸고 build 실행).
- `.github/workflows/update-news.yml`: 위 스크립트를 6시간마다 실행, 바뀐 게 있을 때만 커밋.

## 메뉴 (사용자가 정함)
회사소개 · 제품소개 · TAX REFUND(→ taxrefund 사이트, 새 창) · 설치사례(→ 블로그 설치사례 카테고리, 새 창) · 가입절차 · 공지사항.
"제품영상" 메뉴는 빼기로 함(유튜브는 바닥글 링크만). 카페24의 회원가입·로그인·장바구니·쇼핑 기능은 없음.
레퍼런스: https://ktlea.co.kr (방식만 참고 — 협회소개→회사소개, 전통주소개→제품소개, 뉴스→공지사항). 문구·사진·코드는 가져오지 않는다.

## 디자인 규칙
디자인 판단은 `../popia-home/DESIGN-PRINCIPLES.md`(디자인베이스 강좌 요약 + 유튜브 무작정 따라하기 기준)를 따른다.
- 색: taxrefund 사이트와 같은 팬톤 2026 팔레트. 바탕 Cloud Dancer `#f0eee9`, 밝은 구역·카드 `#fbfaf7`, 어두운 구역 `#1c1b19`(진한 Hematite),
  브랜드 글자 Blue Fusion `#496175`/`#2f4152`, 주요 버튼 Golden Mist `#d6cd94`(화면마다 하나, 글자는 진한 색), 옅은 포인트는 Quiet Violet `#e9e3ec` 하나(태그·호버).
  옅은 초록·옅은 하늘색은 쓰지 않는다. 글자 대비 4.5:1 이상.
- 글꼴: 한글 Pretendard(400·700), 영문 큰 제목만 Italiana(400). 글자 크기 **4종만**: `--fs-xl`(영문 큰 제목) · `--fs-l`(한글 제목) · `--fs-m` · 16px.
- 자간: Pretendard는 -2.5%, Italiana는 0. 행간: 본문 1.6, 제목 1.4, 영문 큰 제목 1.05.
- 간격 4의 배수, 버튼 높이 40/48/56, 아이콘 16/24/32, 카드 모서리 20px(작은 카드 16px), 카드는 가는 테두리, 호버 그림자 `2px 2px 4px`.
- 휴대폰 누르는 곳 44px 이상.

## 구성
- 공통: 고정 헤더(어두운 첫 화면 위에서는 투명·흰 글자, 스크롤하면 밝은 바탕, 내릴 때 숨고 올릴 때 나옴), 1100px 이하 전체화면 메뉴,
  하위 페이지는 어두운 사진 제목 영역 + 붙어 다니는 탭(보고 있는 구역 표시). 오른쪽 아래 카카오 버튼 + 맨 위로 버튼.
- 홈: 사진 슬라이드(6초, 이전·멈춤·다음) → About(숫자 올라가는 효과) → Products(옆으로 넘기는 6개) → One-stop 3칸(TAX REFUND·설치사례·가입절차)
  → Cases(블로그 자동 8개) → Notice 3개 → Inquiry → 바닥글.
- 회사소개: 인사말 → 포스피아는(아이콘 6) → 연혁(스크롤하면 선이 채워짐) → 고객후기 4 → 협력브랜드(흐르는 글자) → 원스톱 관리 3 → 오시는 길.
- 제품소개: 소개 + 6개 제품(사진·설명·POINT 2개, 좌우 번갈아) → 마무리 띠.
- 가입절차: 가입 5단계(선이 이어지는 효과) → 카드사 개설 5단계 → 필요 서류 9개 → 고객센터.
- 공지사항: 검색 + 펼쳐 보기 목록. 공지 추가는 `src/pages/notice.html`의 안내 주석대로, 홈의 Notice 3줄도 함께 바꾼다.
- 부드러운 스크롤 안전장치(화면 신호가 없거나 첫 휠에 안 움직이면 기본 스크롤)는 지우지 말 것.

## 수정 후 확인 순서
1. `node scripts/build.mjs` → `python3 -m http.server 8090` (pospia-main에서).
2. Playwright로 5개 페이지 × 1440·1024·768·390 폭: 글자 크기 4종·굵기 2종, 가로 넘침 0, 대비, 휴대폰 터치 44px.
3. 동작: 휠·탭 이동(requestAnimationFrame을 막은 경우 포함), 슬라이드, 휴대폰 메뉴, 헤더 숨김/표시, 공지 검색·펼침.
4. 미리보기 5개 파일을 다른 폴더에 두고 열어 글꼴·사진·페이지 간 링크 확인.
5. 캡처를 보여 주고 커밋·푸시.
이 클라우드 환경에서 Node로 인터넷에 접속할 때는 `NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt`, 카페24는 브라우저 User-Agent가 있어야 열린다.

## 연락처 (사이트에 쓰는 값)
고객센터 1577-7107(평일 09:30–18:30) · pos-pia@naver.com · (16977) 경기도 용인시 기흥구 강남로 7, 아트프라자 901호 ·
카카오 http://pf.kakao.com/_KFGBn/chat · 블로그 https://blog.naver.com/pos-pia · 유튜브 @포스피아-l.
사업자: (주)포스피아 · 대표 나영균 · 142-81-83401 · 통신판매업 2021-용인기흥-0246 · 팩스 031-525-5202.

## 게시
- Cloudflare Workers 프로젝트 `pospia-main`(아직 연결 전). 연결하면 main 푸시 때 자동 배포, 주소 https://pospia-main.pos-pia.workers.dev 예정.
- `.assetsignore`: src·scripts·미리보기·메모·설정은 공개하지 않음.

## 확인 필요 / 남은 일
- [ ] 사용자 확인: 설립 연도(카페24 회사소개는 2010년, taxrefund 사이트 바닥글은 © 2014), 주소 표기(901호 / 9층).
- [ ] 공지사항 3개와 가입절차 단계 설명 문구는 초안 — 사용자 확인.
- [ ] 협력브랜드: 카페24 이미지의 로고 중 이름을 확실히 읽은 것만 글자로 넣음(로고 이미지는 쓰지 않음). 빠진 브랜드 확인.
- [ ] 사진 원본(특히 첫 화면·제품 사진) 받으면 교체.
- [ ] Cloudflare 연결, 도메인 연결.
