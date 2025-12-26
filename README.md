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
- **클라우드 동기화(Firebase Firestore)**: "Sync with Cloud" 버튼 클릭 시, Google 계정별로 Firestore와 로컬 노트가 병합·동기화됨

## 🌥️ 클라우드 동기화

> **🎯 공용 Firebase 방식**: 개발자가 한 번만 설정하면, 모든 사용자가 Google 로그인만으로 사용 가능!

### 👥 사용자 (일반인)

**설정 불필요! Google 로그인만 하면 됩니다:**

1. 확장 프로그램 팝업 열기
2. **"Sync with Cloud"** 버튼 클릭
3. **Google 계정으로 로그인**
4. 완료! 🎉

여러 컴퓨터에서 같은 Google 계정으로 로그인하면 자동으로 노트가 동기화됩니다.

### 🔧 개발자 (프로젝트 유지보수자)

**한 번만 설정하면 모든 사용자가 사용 가능합니다:**

#### 1단계: Firebase 프로젝트 생성 (10분, 한 번만)

1. [Firebase Console](https://console.firebase.google.com/) 접속
2. "프로젝트 추가" 클릭
3. 프로젝트 이름: `youtube-notes-shared` (또는 원하는 이름)
4. Google Analytics: "지금은 사용 안 함" 선택

#### 2단계: Firestore 설정

1. Firestore Database → "데이터베이스 만들기"
2. "프로덕션 모드" 선택
3. 위치: `asia-northeast3 (Seoul)` 선택
4. "규칙" 탭에서 다음과 같이 설정:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /youtube_notes/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

#### 3단계: Authentication 설정

1. Authentication → "시작하기"
2. "Sign-in method" → "Google" 활성화
3. 프로젝트 공개용 이름 및 지원 이메일 입력

#### 4단계: 설정값 가져오기

1. 프로젝트 설정 (⚙️) → 일반 탭
2. 웹 앱 추가 (`</>` 아이콘)
3. Firebase SDK 구성 정보 복사

#### 5단계: popup.js 업데이트

`popup.js` 파일의 `FIREBASE_CONFIG`를 실제 값으로 교체:

```javascript
const FIREBASE_CONFIG = {
    apiKey: "실제-API-Key",
    authDomain: "프로젝트.firebaseapp.com",
    projectId: "프로젝트-id",
    storageBucket: "프로젝트.appspot.com",
    messagingSenderId: "숫자",
    appId: "1:숫자:web:문자열"
};
```

#### 6단계: Git 커밋 & 배포

```bash
git add popup.js
git commit -m "Add Firebase configuration"
git push
```

**끝!** 이제 모든 사용자가 Firebase 설정 없이 Google 로그인만으로 클라우드 동기화를 사용할 수 있습니다.

### 🔐 보안 구조

```
Firebase 프로젝트 (1개, 모든 사용자 공유)
├── User A (user-a@gmail.com)
│   └── notes: [A의 노트들...]
├── User B (user-b@gmail.com)
│   └── notes: [B의 노트들...]
└── User C (user-c@gmail.com)
    └── notes: [C의 노트들...]
```

- **하나의 Firebase 프로젝트를 모든 사용자가 공유**
- **각 사용자의 데이터는 Google UID로 완전히 분리**
- **Firestore 보안 규칙으로 자신의 데이터만 접근 가능**

### 💰 비용

**완전 무료!** (Firebase Spark Plan)
- 일일 50,000회 읽기, 20,000회 쓰기
- 무제한 Google 로그인
- 수천 명이 사용해도 무료 한도 내에서 충분

### 📚 상세 가이드

더 자세한 내용은 다음 파일 참고:
- **FIREBASE_DEVELOPER_GUIDE.md** - 개발자용 상세 가이드
- **FIREBASE_SETUP.md** - 단계별 설정 가이드

## 개발 및 수정

JavaScript 파일을 수정한 뒤 Chrome 확장 페이지에서 새로고침 버튼 클릭하여 반영됩니다.

## 라이선스

MIT License

## 기여

이슈 및 풀 요청은 언제든 환영합니다.

# Todo & history
- v1.0.1 : add tag filter
## todo
- google spreadsheet 지원하여 계정당 동기화
- 그 외에 정보를 주고 받을 곳이 있는지? git에 upload하는 방법은?