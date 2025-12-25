# YouTube → Notes

YouTube 동영상 정보를 효율적으로 관리하는 Chrome 확장 프로그램입니다.

## 주요 기능

- ✅ **YouTube 정보 자동 추출**: 동영상 제목, 게시 시간, URL 자동 저장
- ✅ **스마트 태그 관리**: 기존 태그 버튼 클릭으로 빠르게 추가
- ✅ **개인 의견 저장**: 각 영상별 의견 기록
- ✅ **태그 필터링**: 특정 태그로 노트 검색
- ✅ **CSV 내보내기**: 모든 노트를 `youtube_notes.csv`로 다운로드
- ✅ **오프라인 저장**: 로컬 스토리지에 안전하게 저장

## 설치 방법

### 개발 환경에서 테스트

1. 이 폴더를 `C:\code\youtube_notes_chrome_extension` 에 복제
2. Chrome 주소창에 `chrome://extensions` 입력
3. 우측 상단의 "개발자 모드" 토글 켜기
4. "압축해제된 확장 프로그램 로드" 클릭
5. 이 폴더 선택

### Chrome Web Store 설치 (공개 후)

Chrome Web Store에서 "YouTube → Notes"를 검색하여 설치하세요.

## 사용 방법

1. YouTube 영상 페이지에서 확장 아이콘 클릭
2. 태그 선택 또는 입력 (기존 태그 버튼으로 빠른 추가)
3. 개인 의견 작성
4. "저장" 클릭
5. 목록에서 제목, 게시 시간, 태그 확인 가능
6. 특정 태그 클릭으로 필터링
7. "CSV 다운로드" 클릭으로 모든 노트 내보내기

## 파일 구조

```
youtube_notes_chrome_extension/
├── manifest.json          # 확장 설정
├── popup.html            # 팝업 UI
├── popup.js              # 팝업 로직 (저장, 렌더링, 필터, CSV)
├── options.html          # 설정 페이지
├── options.js            # 설정 로직
├── background.js         # 백그라운드 서비스 워커
├── content_script.js     # 콘텐츠 스크립트 (미사용)
├── images/
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png
├── generate_icons.html   # 아이콘 생성 도구
└── README.md             # 이 파일
```

## 데이터 저장 방식

- **로컬 스토리지** (`chrome.storage.local`): 모든 노트 저장
- **동기 스토리지** (`chrome.storage.sync`): 태그 목록 저장

## 개발 및 수정

JavaScript 파일을 수정한 뒤 Chrome 확장 페이지에서 새로고침 버튼 클릭하여 반영됩니다.

## 라이선스

MIT License

## 기여

이슈 및 풀 요청은 언제든 환영합니다.
