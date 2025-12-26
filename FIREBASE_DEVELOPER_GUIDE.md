# 🔧 개발자를 위한 Firebase 설정 가이드

이 문서는 확장 프로그램 개발자 또는 포크하여 사용하는 개발자를 위한 Firebase 설정 가이드입니다.

## 📋 개요

이 확장 프로그램은 **하나의 고정된 Firebase 프로젝트**를 모든 사용자가 공유하는 방식으로 설계되었습니다.
- 각 사용자는 Google 계정으로 로그인
- Google UID별로 데이터가 분리되어 저장
- 사용자는 Firebase 설정 불필요 (Google 로그인만 필요)

## 🚀 Firebase 프로젝트 생성 (개발자용)

### 1. Firebase Console에서 프로젝트 생성

1. [Firebase Console](https://console.firebase.google.com/) 접속
2. "프로젝트 추가" 클릭
3. 프로젝트 이름 입력: `YouTube Notes Shared` (또는 원하는 이름)
4. Google Analytics: "지금은 사용 안 함" 선택
5. "프로젝트 만들기" 클릭

### 2. Firestore Database 설정

1. 왼쪽 메뉴 → **Firestore Database** 클릭
2. "데이터베이스 만들기" 클릭
3. **위치 선택**: 
   - `asia-northeast3 (Seoul)` 또는
   - `asia-northeast1 (Tokyo)`
4. **보안 규칙**: "프로덕션 모드에서 시작" 선택
5. "사용 설정" 클릭

#### Firestore 보안 규칙 설정

Firebase Console → Firestore Database → 규칙 탭에서 다음과 같이 설정:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // youtube_notes 컬렉션: 사용자는 자신의 문서만 읽고 쓸 수 있음
    match /youtube_notes/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

"게시" 버튼 클릭하여 규칙 저장.

### 3. Authentication 설정

1. 왼쪽 메뉴 → **Authentication** 클릭
2. "시작하기" 클릭
3. **Sign-in method** 탭 선택
4. **Google** 제공업체 클릭
5. **사용 설정** 토글 켜기
6. 프로젝트 공개용 이름 입력: `YouTube Notes`
7. 프로젝트 지원 이메일 선택 (본인 이메일)
8. "저장" 클릭

### 4. 웹 앱 구성 정보 가져오기

1. Firebase Console → 프로젝트 개요 (⚙️ 톱니바퀴 옆)
2. 프로젝트 설정 → 일반 탭
3. "내 앱" 섹션에서 웹 앱 추가 (`</>` 아이콘)
4. 앱 닉네임 입력: `YouTube Notes Extension`
5. "앱 등록" 클릭
6. **Firebase SDK 구성**이 표시됩니다:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "youtube-notes-shared.firebaseapp.com",
  projectId: "youtube-notes-shared",
  storageBucket: "youtube-notes-shared.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};
```

### 5. popup.js 파일 업데이트

`popup.js` 파일의 상단 `FIREBASE_CONFIG` 객체를 위에서 받은 실제 값으로 교체:

```javascript
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",  // 실제 API Key
    authDomain: "youtube-notes-shared.firebaseapp.com",  // 실제 Auth Domain
    projectId: "youtube-notes-shared",  // 실제 Project ID
    storageBucket: "youtube-notes-shared.appspot.com",  // 실제 Storage Bucket
    messagingSenderId: "123456789012",  // 실제 Sender ID
    appId: "1:123456789012:web:abcdef123456"  // 실제 App ID
};
```

### 6. manifest.json 업데이트 (필요시)

`host_permissions`에 Firebase 도메인이 포함되어 있는지 확인:

```json
"host_permissions": [
    "https://www.youtube.com/*",
    "https://video.google.com/*",
    "https://*.googleapis.com/*",
    "https://*.firebaseio.com/*",
    "https://*.firebaseapp.com/*"
]
```

## 🧪 테스트

### 로컬 테스트

1. Chrome 확장 프로그램을 다시 로드
2. YouTube 페이지에서 확장 프로그램 팝업 열기
3. "Sync with Cloud" 버튼 클릭
4. Google 계정으로 로그인
5. 노트 저장 및 동기화 테스트

### Firestore 확인

Firebase Console → Firestore Database에서 다음 구조 확인:

```
youtube_notes (컬렉션)
  └── [사용자 Google UID] (문서)
       └── notes: [배열]
            ├── 0: {tags, opinion, time, url, ...}
            ├── 1: {tags, opinion, time, url, ...}
            └── ...
```

## 🔒 보안 고려사항

### Firestore 보안 규칙 검증

```javascript
// ✅ 올바른 규칙: 사용자는 자신의 문서만 접근
match /youtube_notes/{userId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}

// ❌ 잘못된 규칙: 모든 사용자가 모든 문서 접근 (사용하지 말 것!)
match /youtube_notes/{userId} {
  allow read, write: if request.auth != null;
}
```

### API Key 보안

- Firebase API Key는 공개되어도 괜찮습니다 (클라이언트 SDK용)
- 실제 보안은 **Firestore 보안 규칙**과 **Authentication**으로 관리
- 하지만 GitHub에 공개할 때는 `.env` 파일 사용 권장

## 📊 모니터링

### Firebase Console에서 확인할 사항

1. **Authentication**: 사용자 수, 로그인 통계
2. **Firestore Database**: 
   - 문서 수 (사용자 수)
   - 읽기/쓰기 횟수
   - 저장 용량
3. **사용량**: 무료 한도 확인

### 무료 한도

Firebase Spark Plan (무료):
- Firestore: 일일 50,000회 읽기, 20,000회 쓰기
- Authentication: 무제한
- 저장 용량: 1GB

## 🚀 배포 전 체크리스트

- [ ] Firebase 프로젝트 생성 완료
- [ ] Firestore Database 생성 (프로덕션 모드)
- [ ] Firestore 보안 규칙 설정
- [ ] Authentication Google 로그인 활성화
- [ ] popup.js에 실제 Firebase 설정 입력
- [ ] 로컬 테스트 완료
- [ ] Firestore에 데이터 저장 확인
- [ ] 여러 계정으로 동기화 테스트
- [ ] Chrome Web Store 제출 전 최종 검토

## 🔄 업데이트 시 주의사항

- Firebase 설정 변경 시 모든 사용자에게 영향
- 보안 규칙 변경 시 기존 사용자 데이터 접근 확인
- API Key 변경 시 확장 프로그램 업데이트 필요

## 💰 비용 관리

예상 사용량 (1000명 사용자 기준):
- 사용자당 하루 동기화 2회
- 1회당 읽기 1회, 쓰기 1회
- 총: 일일 2000회 읽기, 2000회 쓰기

**결론**: 수천 명이 사용해도 무료 한도 내에서 충분히 운영 가능

## 📞 문제 해결

### "권한이 거부되었습니다" 오류
→ Firestore 보안 규칙 확인

### "Firebase 초기화 실패" 오류
→ popup.js의 FIREBASE_CONFIG 값 확인

### 사용자가 로그인할 수 없음
→ Authentication에서 Google 로그인 활성화 확인

## 📚 참고 자료

- [Firebase 공식 문서](https://firebase.google.com/docs)
- [Firestore 보안 규칙](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Authentication](https://firebase.google.com/docs/auth)
