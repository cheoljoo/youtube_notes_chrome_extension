# ⚡ Firebase 10분 빠른 설정 (개발자용)

## 🎯 목표

**한 번만 설정하면, 모든 사용자가 Google 로그인만으로 클라우드 동기화 사용 가능!**

---

## 📋 체크리스트

- [ ] Firebase 프로젝트 생성
- [ ] Firestore Database 설정
- [ ] Authentication (Google) 활성화
- [ ] 보안 규칙 설정
- [ ] Firebase 설정값 가져오기
- [ ] popup.js 업데이트
- [ ] 테스트
- [ ] Git 커밋

---

## 🚀 단계별 가이드

### 1️⃣ Firebase Console 접속 (1분)

```
https://console.firebase.google.com
```

1. Google 계정으로 로그인
2. **"프로젝트 추가"** 클릭

### 2️⃣ 프로젝트 생성 (2분)

1. **프로젝트 이름**: `youtube-notes-shared` (또는 원하는 이름)
2. **프로젝트 ID**: 자동 생성됨 (예: `youtube-notes-shared-a1b2c`)
3. **Google Analytics**: "지금은 사용 안 함" 선택
4. **"프로젝트 만들기"** 클릭

### 3️⃣ Firestore Database 생성 (2분)

1. 왼쪽 메뉴 → **"Firestore Database"**
2. **"데이터베이스 만들기"** 클릭
3. **"프로덕션 모드에서 시작"** 선택
4. 위치: **asia-northeast3 (Seoul)** 또는 **asia-northeast1 (Tokyo)**
5. **"사용 설정"** 클릭

### 4️⃣ Firestore 보안 규칙 설정 (2분)

**중요!** 이 규칙으로 각 사용자의 데이터가 분리됩니다.

1. Firestore Database → **"규칙"** 탭
2. 다음 코드로 교체:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 각 사용자는 자신의 Google UID 문서만 읽고 쓸 수 있음
    match /youtube_notes/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

3. **"게시"** 버튼 클릭

### 5️⃣ Authentication 설정 (2분)

1. 왼쪽 메뉴 → **"Authentication"**
2. **"시작하기"** 클릭
3. **"Sign-in method"** 탭
4. **"Google"** 클릭
5. **사용 설정 토글 켜기**
6. 프로젝트 공개용 이름: `YouTube Notes`
7. 지원 이메일: 본인 이메일 선택
8. **"저장"** 클릭

### 6️⃣ Firebase 설정값 가져오기 (2분)

1. 프로젝트 개요 옆 **⚙️ 톱니바퀴** → **"프로젝트 설정"**
2. **"일반"** 탭
3. "내 앱" 섹션 → **웹 앱 추가** (`</>` 아이콘)
4. 앱 닉네임: `YouTube Notes Extension`
5. **"앱 등록"** 클릭
6. **Firebase SDK 구성** 정보가 표시됨:

```javascript
<script type="module">
  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  const firebaseConfig = {
    apiKey: "AIzaSyB8otEZ1uJmxLJ6OQZ40lirnJJCSIUhcK0",
    authDomain: "notes-shared-2f265.firebaseapp.com",
    projectId: "notes-shared-2f265",
    storageBucket: "notes-shared-2f265.firebasestorage.app",
    messagingSenderId: "995120058750",
    appId: "1:995120058750:web:b9ee2101567fd07ad3632f"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
</script>
```

$ npm install firebase
```
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB8otEZ1uJmxLJ6OQZ40lirnJJCSIUhcK0",
  authDomain: "notes-shared-2f265.firebaseapp.com",
  projectId: "notes-shared-2f265",
  storageBucket: "notes-shared-2f265.firebasestorage.app",
  messagingSenderId: "995120058750",
  appId: "1:995120058750:web:b9ee2101567fd07ad3632f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
```

7. 이 정보를 **복사**해두세요!

### 7️⃣ popup.js 파일 업데이트 (1분)

**파일 위치**: `c:\code\youtube_notes_chrome_extension\popup.js`

**현재 코드** (1-12번째 줄):
```javascript
const FIREBASE_CONFIG = {
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: ""
};
```

**변경 후** (복사한 실제 값으로 교체):
```javascript
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    authDomain: "youtube-notes-shared.firebaseapp.com",
    projectId: "youtube-notes-shared",
    storageBucket: "youtube-notes-shared.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef123456"
};
```

**저장** (Ctrl + S)

### 8️⃣ 테스트 (2분)

1. Chrome 확장 프로그램 페이지 열기:
   ```
   chrome://extensions
   ```

2. YouTube Notes 확장 프로그램 **새로고침** (🔄 버튼)

3. YouTube 페이지로 이동

4. 확장 프로그램 팝업 열기

5. **"Sync with Cloud"** 버튼 확인
   - 버튼이 **파란색**이면 성공!
   - 버튼이 **회색**이면 설정 실패 (popup.js 다시 확인)

6. **"Sync with Cloud"** 버튼 클릭

7. Google 계정으로 로그인

8. 노트 하나 저장 후 다시 동기화 버튼 클릭

9. Firebase Console → Firestore Database에서 데이터 확인:
   ```
   youtube_notes (컬렉션)
   └── [당신의 Google UID] (문서)
       └── notes: [배열]
   ```

### 9️⃣ Git 커밋 (1분)

```bash
git add popup.js
git commit -m "Configure Firebase for cloud sync"
git push
```

---

## ✅ 완료!

이제 **모든 사용자**가:
1. 확장 프로그램 설치
2. "Sync with Cloud" 버튼 클릭
3. Google 로그인
4. 자동 동기화 사용 가능!

---

## 🔒 보안 확인

### ✅ 올바른 Firestore 규칙
```javascript
match /youtube_notes/{userId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```
→ 각 사용자는 자신의 데이터만 접근 가능

### ❌ 잘못된 규칙 (사용하지 마세요!)
```javascript
match /youtube_notes/{userId} {
  allow read, write: if request.auth != null;  // 모든 인증된 사용자가 모든 데이터 접근!
}
```

---

## 💰 비용

**완전 무료!** Firebase Spark Plan (무료):

| 항목 | 한도 | 예상 사용량 (1000명) |
|------|------|---------------------|
| Firestore 읽기 | 50,000회/일 | ~2,000회/일 |
| Firestore 쓰기 | 20,000회/일 | ~2,000회/일 |
| Authentication | 무제한 | ✓ |
| 저장 용량 | 1GB | ~50MB |

**결론**: 수천 명이 사용해도 무료 한도로 충분합니다!

---

## 🆘 문제 해결

### "Sync with Cloud" 버튼이 회색
→ popup.js의 FIREBASE_CONFIG 값 확인

### "권한이 거부되었습니다" 오류
→ Firestore 보안 규칙 확인 (4단계)

### "Firebase 초기화 실패" 오류
→ Firebase 설정값이 올바른지 확인 (6-7단계)

### Chrome 개발자 도구로 디버깅
1. 확장 프로그램 팝업에서 우클릭 → "검사"
2. Console 탭에서 에러 메시지 확인
3. `firebaseEnabled` 값 확인: `console.log(firebaseEnabled)`

---

## 📞 추가 도움

- **FIREBASE_DEVELOPER_GUIDE.md** - 상세 개발자 가이드
- **FIREBASE_SETUP.md** - 사용자용 설명
- Firebase 공식 문서: https://firebase.google.com/docs

---

## 🎉 축하합니다!

Firebase 설정이 완료되었습니다! 이제 전 세계 사용자들이 별도 설정 없이 클라우드 동기화를 사용할 수 있습니다.
