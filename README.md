# YouTube → Gemini Notes (Chrome extension)

이 확장 프로그램은 현재 보고 있는 YouTube 영상의 정보를 Gemini(PaLM)로 요약하고, 사용자가 선택한 태그와 개인 의견을 함께 Google Sheets에 저장합니다.

설치 및 설정

- `manifest.json`을 기준으로 확장 설치(개발용): Chrome 확장 페이지에서 "압축해제된 확장 프로그램 로드"로 이 폴더를 선택하세요.
- 옵션에서 PaLM API Key(또는 Gemini용 API 키), 모델(`text-bison-001` 권장), 저장할 Google 스프레드시트 ID 및 시트 범위를 입력하세요.
- 스프레드시트 사용 권한: 확장 내에서 Google 계정으로 인증하면 Sheets API 권한이 요청됩니다.

사용 방법

- YouTube 영상 페이지에서 확장 아이콘을 클릭하세요.
- 태그를 선택하거나 새 태그를 입력하고, 개인 의견을 작성한 뒤 "요약+저장"을 누르세요.

구현 노트

- 요약은 PaLM REST API(v1beta2) `models/{model}:generateText` 엔드포인트를 사용합니다.
- 이 방식은 API 키를 확장 설정에 저장하므로 공개 배포 시 보안에 주의해야 합니다. 배포 목적이라면 서버 사이드 프록시를 권장합니다.

문제 및 확장

- 자막(트랜스크립트)을 자동으로 가져오는 기능은 영상별로 달라질 수 있어 우선은 제목/설명/URL 기반 요약으로 동작합니다. 필요하면 transcript 크롤링 로직을 추가하세요.
# youtube_notes_chrome_extension
 chrome extension으로 지금 보고 있는 youtube의 내용을 gemini에게 물어봐서 요약을 해주고 , 내가 tag들을 복수로 선택할수 있게 (없는 것은 직접 입력하게) , 나의 개인 생각을 적는 칸을 만들어...  이렇게 하여 등록하면 google drive안의 정해진 spreadsheet에 내용들이 날짜 , tags , 의견 , gemini 요약으로 해서 쌓일수 있게 만들었으면 해
