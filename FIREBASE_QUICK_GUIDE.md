# 🚀 Firebase 5분 설정 가이드

## ❓ 자주 묻는 질문

### Q1: "your-project-id"가 뭔가요?
**A**: Firebase에서 만드는 프로젝트의 고유 이름입니다.

```
❌ 이게 아닙니다: yourname@gmail.com (Google 이메일)
✅ 이게 맞습니다: youtube-notes-12345 (Firebase 프로젝트 ID)
```

### Q2: Google ID와 다른가요?
**A**: 네, 완전히 다릅니다!

| 항목 | Google ID | Firebase 프로젝트 ID |
|------|-----------|---------------------|
| 무엇인가요? | 로그인 계정 (이메일) | 데이터 저장소 이름 |
| 예시 | yourname@gmail.com | youtube-notes-12345 |
| 언제 사용? | 로그인할 때 | 초기 설정할 때 |
| 가지고 있나요? | ✅ 이미 있음 | ❌ 새로 만들어야 함 |

### Q3: 왜 둘 다 필요한가요?
**A**: 
- **프로젝트 ID**: 내 노트를 저장할 클라우드 "창고" 만들기
- **Google ID**: 그 창고에 들어갈 때 사용하는 "열쇠"

## 📋 3단계 설정 방법

### 1단계: Firebase 프로젝트 만들기 (2분)

1. **Firebase Console 접속**
   ```
   https://console.firebase.google.com
   ```

2. **"프로젝트 추가" 클릭**
   - Google 계정으로 로그인 (이미 로그인되어 있을 수 있음)

3. **프로젝트 이름 입력**
   ```
   예: YouTube Notes
   또는: My Video Notes
   ```

4. **프로젝트 ID 확인**
   - 자동으로 생성됩니다
   ```
   예: youtube-notes-a1b2c
   또는: my-video-notes-d3e4f
   ```
   - 이 ID를 복사하거나 기억하세요!

5. **Google Analytics** 
   - "지금은 사용 안 함" 선택 (선택사항)

6. **"프로젝트 만들기" 클릭**

### 2단계: Firestore와 Authentication 설정 (2분)

#### Firestore Database 만들기
1. 왼쪽 메뉴에서 **"Firestore Database"** 클릭
2. **"데이터베이스 만들기"** 클릭
3. **"테스트 모드에서 시작"** 선택
4. 위치 선택: **asia-northeast3 (서울)** 또는 **asia-northeast1 (도쿄)**
5. **"사용 설정"** 클릭

#### Authentication 설정
1. 왼쪽 메뉴에서 **"Authentication"** 클릭
2. **"시작하기"** 클릭
3. **"Sign-in method"** 탭 선택
4. **"Google"** 클릭
5. **사용 설정 토글을 켜기**
6. 프로젝트 공개용 이름 입력 (예: YouTube Notes)
7. 지원 이메일 선택 (본인 이메일)
8. **"저장"** 클릭

### 3단계: Chrome 확장 프로그램에서 설정 (1분)

1. **확장 프로그램 팝업 열기**
   - YouTube 페이지에서 확장 아이콘 클릭

2. **"간단 설정" 클릭**
   - Firebase 경고 메시지에서 "간단 설정" 링크 클릭

3. **프로젝트 ID 입력**
   ```
   1단계에서 복사한 ID 입력
   예: youtube-notes-a1b2c
   ```

4. **"저장" 클릭**

5. **"Sync with Cloud" 클릭**
   - Google 계정으로 로그인 (Gmail 계정)
   - 완료!

## ✅ 확인 방법

설정이 제대로 되었는지 확인:

1. **팝업 상단 메시지 확인**
   ```
   ✓ Firebase 연결됨 (프로젝트: youtube-notes-a1b2c)
   ```

2. **테스트 동기화**
   - 노트 하나 저장
   - "Sync with Cloud" 클릭
   - "클라우드와 동기화 완료!" 메시지 확인

3. **Firebase Console에서 확인**
   - Firestore Database로 이동
   - `youtube_notes` 컬렉션에 데이터가 보이면 성공!

## 🔧 문제 해결

### "Firebase 설정이 필요합니다" 메시지가 계속 나옴
- 프로젝트 ID를 올바르게 입력했는지 확인
- 확장 프로그램을 새로고침: `chrome://extensions`

### "권한이 없습니다" 오류
- Authentication에서 Google 로그인이 활성화되었는지 확인
- Firestore에서 테스트 모드로 시작했는지 확인

### "Firebase 초기화 실패" 오류
- 인터넷 연결 확인
- Firebase Console에서 프로젝트가 제대로 생성되었는지 확인

## 💰 비용

**완전 무료입니다!**

Firebase 무료 플랜(Spark Plan):
- Firestore: 일일 50,000회 읽기, 20,000회 쓰기
- Authentication: 무제한 Google 로그인
- 저장 용량: 1GB

개인 노트 관리로는 절대 초과하지 않습니다.

## 🎯 핵심 요약

1. **Firebase 프로젝트 ID** = 노트 저장할 클라우드 공간 이름
2. **Google ID** = 로그인할 때 사용하는 이메일
3. **둘 다 필요합니다**: 프로젝트 ID로 공간 만들고, Google ID로 로그인
4. **무료입니다**: 개인 사용은 완전 무료
5. **선택사항입니다**: 로컬에서만 쓰려면 Firebase 없이도 OK

## 📞 도움이 더 필요하신가요?

- [FIREBASE_SETUP.md](FIREBASE_SETUP.md) - 상세 가이드
- 확장 프로그램 팝업에서 "❓ 도움말" 버튼 클릭
- Firebase 공식 문서: https://firebase.google.com/docs
