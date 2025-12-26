# Firebase 설정 가이드

YouTube Notes 확장 프로그램에서 클라우드 동기화 기능을 사용하려면 Firebase 프로젝트를 설정해야 합니다.

## 1. Firebase 프로젝트 생성

1. [Firebase Console](https://console.firebase.google.com/)로 이동
2. "프로젝트 추가" 클릭
3. 프로젝트 이름 입력 (예: youtube-notes)
4. Google Analytics는 선택사항 (권장)
5. 프로젝트 생성 완료

## 2. 웹 앱 추가

1. Firebase 프로젝트 개요 페이지에서 "웹 앱에 Firebase 추가" 클릭 (</>아이콘)
2. 앱 닉네임 입력 (예: YouTube Notes Extension)
3. "앱 등록" 클릭
4. Firebase SDK 설정 코드가 표시됩니다. 다음 정보를 기록해두세요:
   - `apiKey`
   - `authDomain`
   - `projectId`
   - `storageBucket`
   - `messagingSenderId`
   - `appId`

## 3. Firestore Database 설정

1. Firebase Console에서 "Firestore Database" 메뉴로 이동
2. "데이터베이스 만들기" 클릭
3. 보안 규칙 선택:
   - 처음에는 "테스트 모드"로 시작 (30일 후 자동으로 차단됨)
   - 나중에 프로덕션 모드로 변경 가능
4. Cloud Firestore 위치 선택 (가까운 지역 선택, 예: asia-northeast3)
5. "사용 설정" 클릭

## 4. Authentication 설정

1. Firebase Console에서 "Authentication" 메뉴로 이동
2. "시작하기" 클릭
3. "Sign-in method" 탭 선택
4. "Google" 제공업체 클릭
5. "사용 설정" 토글을 켜기
6. 프로젝트 공개용 이름 입력
7. 프로젝트 지원 이메일 선택
8. "저장" 클릭

## 5. Firestore 보안 규칙 설정

Firebase Console의 Firestore Database > 규칙 탭에서 다음 규칙을 설정하세요:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 사용자는 자신의 노트만 읽고 쓸 수 있습니다
    match /youtube_notes/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

"게시" 버튼을 클릭하여 규칙을 적용하세요.

## 6. Chrome Extension에 설정 입력

1. Chrome에서 확장 프로그램 아이콘 우클릭 > "옵션" 선택
2. Firebase Configuration 섹션에 다음 정보 입력:
   - **Firebase API Key**: 2단계에서 받은 `apiKey`
   - **Firebase Auth Domain**: `your-project.firebaseapp.com`
   - **Firebase Project ID**: `your-project-id`
   - **Firebase Storage Bucket**: `your-project.appspot.com`
   - **Firebase Messaging Sender ID**: 숫자로 된 ID
   - **Firebase App ID**: `1:xxxx:web:xxxx` 형식의 ID
3. "Save" 버튼 클릭

## 7. 사용 방법

1. 확장 프로그램 팝업을 엽니다
2. "Sync with Cloud" 버튼을 클릭합니다
3. Google 계정으로 로그인합니다
4. 로컬 노트와 클라우드 노트가 자동으로 병합됩니다

## 문제 해결

### "Firebase SDK 로딩 중입니다" 오류
- 인터넷 연결을 확인하세요
- Options 페이지에서 Firebase 설정이 올바르게 입력되었는지 확인하세요
- 확장 프로그램을 다시 로드해보세요 (chrome://extensions에서)

### "Firebase 초기화 실패" 오류
- Firebase Console에서 프로젝트 설정 > 일반 탭에서 설정 정보를 다시 확인하세요
- API Key가 올바른지 확인하세요

### "권한이 없습니다" 오류
- Firestore 보안 규칙이 올바르게 설정되었는지 확인하세요 (5단계)
- Google 로그인이 제대로 되었는지 확인하세요

### 동기화가 작동하지 않음
- Authentication에서 Google 로그인이 활성화되었는지 확인하세요 (4단계)
- Firestore Database가 생성되었는지 확인하세요 (3단계)

## 비용

Firebase의 무료 플랜(Spark Plan)으로 개인 사용에는 충분합니다:
- Firestore: 일일 50,000회 읽기, 20,000회 쓰기
- Authentication: 무제한 Google 로그인
- 저장 용량: 1GB

개인 노트 관리 용도로는 무료 한도를 초과하기 어렵습니다.
