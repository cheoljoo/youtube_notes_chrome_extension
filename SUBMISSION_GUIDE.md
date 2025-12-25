# Chrome Web Store 제출 가이드

## ✅ 준비 완료 사항

- ✓ manifest.json 업데이트 (v1.0.0)
- ✓ 아이콘 생성 (16x16, 48x48, 128x128 PNG)
- ✓ README.md 작성
- ✓ 개인정보 보호 정책 (privacy_policy.html)
- ✓ 최종 패킹 (youtube_notes_v1.0.0.zip)

## 📋 다음 단계

### 1️⃣ Chrome Developer Account 등록
- https://chrome.google.com/webstore/devconsole 방문
- Google 계정으로 로그인
- $5 USD 개발자 등록비 결제

### 2️⃣ 앱 공개

Chrome Developer Console에서:

1. **"새 항목" 클릭**
   - `youtube_notes_v1.0.0.zip` 파일 업로드

2. **기본 정보 입력**
   ```
   이름: YouTube → Notes
   
   설명: 
   YouTube 동영상의 제목, 게시 시간, URL을 자동으로 저장하고,
   태그로 분류하고, 개인 의견을 추가하며, CSV로 내보낼 수 있습니다.
   
   카테고리: 생산성 (Productivity)
   언어: 한국어, English
   ```

3. **아이콘 등록**
   ```
   프로모션 아이콘: images/icon-128.png
   (또는 Chrome이 자동 감지함)
   ```

4. **스크린샷 준비** (권장 - 1280x800px 이상)
   - 팝업 UI 스크린샷
   - 태그 필터링 예시
   - CSV 다운로드 기능
   
   > 팝업 스크린샷 방법:
   > 1. Chrome에서 확장 실행
   > 2. 우클릭 → 검사 → 팝업 우클릭 → "요소 캡처" 또는 스크린샷 도구 사용

5. **프라이버시 및 보안**
   - 프라이버시 정책 URL: 확장이 공개된 후 GitHub Pages 또는 개인 사이트에서 호스팅하거나, 아래 텍스트 사용:
   
   ```
   프라이버시 정책:
   이 확장은 모든 데이터를 로컬 장치에만 저장합니다.
   외부 서버로 데이터를 전송하거나 제3자와 공유하지 않습니다.
   자세한 내용은 privacy_policy.html을 참고하세요.
   ```

6. **콘텐츠 정책 체크**
   - ✅ "이 확장은 설명과 일치합니다"
   - ✅ "이 확장은 단일 목적을 충족합니다"
   - ✅ "프라이버시 정책이 공개되어 있습니다"

### 3️⃣ 심사 대기

Google의 자동 및 수동 심사 (보통 1-3일)

**심사 기준**:
- ✅ 악성 코드 없음 (정적 분석 완료)
- ✅ 명시된 권한만 사용 (storage, activeTab, scripting)
- ✅ 사용자 데이터 보호 (로컬 저장만 사용)
- ✅ 명확한 설명 및 프라이버시 정책

### 4️⃣ 공개

심사 통과 후 Chrome Web Store에서 자동 공개
→ "YouTube Notes" 검색 가능

## 📝 수정 및 업데이트

향후 기능 추가 시:

1. manifest.json의 버전 변경
   ```json
   "version": "1.0.1"
   ```

2. 파일 재패킹
   ```powershell
   $items = Get-ChildItem -Exclude '.venv'
   Compress-Archive -Path $items -DestinationPath youtube_notes_v1.0.1.zip -Force
   ```

3. Chrome Developer Console에서 새 버전 업로드

## 🔐 보안 권장사항

- ✅ 로컬 스토리지만 사용 (이미 구현)
- ✅ 외부 API 미사용 (이미 구현)
- ✅ HTTPS 권장 (Chrome이 자동 강제)
- ✅ 명확한 권한 설명 (이미 구현)

## 📞 문제 발생 시

1. **Google 지원**: https://support.google.com/chrome/
2. **확장 개발 문서**: https://developer.chrome.com/docs/extensions/
3. **커뮤니티**: Stack Overflow [google-chrome-extension]

---

**준비 상태**: 🟢 **제출 준비 완료**

파일 위치:
- `youtube_notes_v1.0.0.zip` ← **이 파일을 Chrome Web Store에 업로드**
- `privacy_policy.html` ← 프라이버시 정책 참고
- `README.md` ← 설명 및 사용법 참고
