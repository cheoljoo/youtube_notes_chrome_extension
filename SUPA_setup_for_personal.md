# 개인용 Supabase 설정 가이드 (Youtube Notes 확장)

개개인이 자신의 Supabase 무료 프로젝트를 사용해 더 많은 노트를 저장하고 안정적으로 이용할 수 있도록, 확장 프로그램 Settings에 필요한 값(“Supabase URL”, “Supabase API Key (anon/public)”)을 얻는 방법만 간단히 정리했습니다. 테이블 및 권한(스키마) 설정은 참고 문서에서 안내합니다.

**목표**
- 본인 계정의 Supabase 무료 프로젝트 생성
- Settings에 입력할 `Supabase URL`과 `Supabase API Key (anon/public)` 확보
- (선택) DB 사이즈 확인용 RPC/Edge 엔드포인트 설정은 참조 문서에 있음

**사전 준비**
- 이메일로 Supabase(https://supabase.com) 회원가입
- 웹 브라우저에서 Supabase Dashboard 접속

**절차 (Settings 값 확보)**
1. Supabase에서 새 프로젝트 생성
   - “New Project” → Organization/Project 선택 → Region/Database Password 설정 → Free Plan 유지
   - 생성 완료까지 1~2분 정도 소요될 수 있습니다.
2. Project Settings → API로 이동
   - 화면에 `Project URL`이 표시됩니다. 이것이 확장에서 말하는 “Supabase URL”입니다.
   - 같은 화면에서 `Project API Keys`의 `anon` (public) 키를 확인합니다. 이것이 “Supabase API Key (anon/public)”입니다.
3. 확장 프로그램 Settings에 입력
   - Options 페이지(확장 Settings)에서 아래 항목을 본인 프로젝트 값으로 채웁니다:
     - Supabase URL: 예) `https://xxxxx.supabase.co`
     - Supabase API Key (anon/public): 예) `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
     - Manual user email / ID: 필수. 예) 본인 이메일 또는 고유 ID
   - 입력 후 “Save”를 눌러 저장합니다.
4. 연결 테스트
   - Options 페이지에서 “Test Connection”으로 기본 API 응답 확인
   - “Test REST”로 `notes` 테이블에 REST 접근이 가능한지 확인

**스키마 및 보안 설정(참조)**
- 확장 프로그램이 정상적으로 동작하려면 `notes` 테이블 및 RLS 정책 등 초기 설정이 필요합니다.
- 구체적 SQL과 단계는 참조 문서 [SUPABASE_SETUP.md](SUPABASE_SETUP.md)에서 “노트 테이블 및 RLS” 관련 섹션을 따라 진행하세요.
- (선택) 개인 프로젝트에서 DB 사이즈(저장 용량) 확인을 원하면 [SUPABASE_SETUP.md](SUPABASE_SETUP.md)의 “DB 사이즈 엔드포인트 설정” 섹션을 참고해 RPC 함수(권장) 또는 Edge Function을 구성하세요. 확장은 Supabase URL 기반 RPC를 자동 사용합니다.

**주의 사항**
- 확장에서는 반드시 `anon`(public) 키만 사용하세요. `service_role` 키는 클라이언트에 노출하면 안 됩니다.
- 무료 플랜은 저장 용량·요청 수 제한이 있습니다. 용량 경고가 보이면 정리하거나 유료 플랜을 고려하세요.
- 이메일/ID는 사용자별 데이터를 구분하는 핵심 키이므로 Options에서 반드시 채워야 동기화가 가능합니다.

**문제 해결**
- Settings 저장 후에도 연결이 실패하면:
  - Supabase URL/anon 키 오타 확인
  - 프로젝트가 완전 생성(Provisioned)되었는지 확인
  - [SUPABASE_SETUP.md](SUPABASE_SETUP.md)의 스키마 및 RLS 설정을 정확히 적용했는지 확인
- 계속 문제가 있으면 Dashboard의 Logs/Reports를 확인하거나, REST 요청을 직접 테스트하세요.
