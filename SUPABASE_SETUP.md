# Supabase 설정 가이드

## 1. Supabase 프로젝트 생성

1. [Supabase](https://supabase.com)에 접속하여 계정 생성
2. "New Project" 클릭
3. 프로젝트 이름, 데이터베이스 비밀번호 설정
4. 리전 선택 (가까운 지역 선택)
5. 프로젝트 생성 완료 (약 2분 소요)

## 2. 데이터베이스 테이블 생성

### SQL Editor에서 실행

Supabase 대시보드 → SQL Editor → New query

아래 SQL을 복사하여 실행:

```sql
-- notes 테이블 생성 (user_email 컬럼 추가)
CREATE TABLE notes (
  id BIGSERIAL PRIMARY KEY,
  time BIGINT NOT NULL,
  user_email TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  opinion TEXT,
  url TEXT,
  youtube_title TEXT,
  youtube_published TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  UNIQUE(time, user_email)
);

-- time 컬럼에 인덱스 생성 (검색 속도 향상)
CREATE INDEX idx_notes_time ON notes(time DESC);

-- user_email 인덱스 생성 (사용자별 검색 속도 향상)
CREATE INDEX idx_notes_user_email ON notes(user_email);

-- tags 배열에 GIN 인덱스 생성 (태그 검색 속도 향상)
CREATE INDEX idx_notes_tags ON notes USING GIN(tags);

-- RLS (Row Level Security) 활성화
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- 사용자별 데이터 격리 정책
-- 각 사용자는 자신의 user_email과 일치하는 노트만 접근 가능
CREATE POLICY "Users can only access their own notes" ON notes
  FOR ALL
  USING (user_email = current_setting('request.headers')::json->>'x-user-email')
  WITH CHECK (user_email = current_setting('request.headers')::json->>'x-user-email');

-- 또는 간단한 버전 (모든 사용자가 모든 데이터 접근 가능 - 개인용)
-- 프로덕션에서는 위의 정책 사용 권장
DROP POLICY IF EXISTS "Users can only access their own notes" ON notes;
CREATE POLICY "Enable all access for all users" ON notes
  FOR ALL
  USING (true)
  WITH CHECK (true);
```

### 테이블 스키마 설명

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| id | BIGSERIAL | 자동 증가 기본 키 |
| time | BIGINT | 노트 생성 시간 (Unix timestamp ms) |
| user_email | TEXT | 사용자 이메일 (Google 계정) - 필수 |
| tags | TEXT[] | 태그 배열 |
| opinion | TEXT | 의견/메모 |
| url | TEXT | YouTube URL |
| youtube_title | TEXT | YouTube 영상 제목 |
| youtube_published | TEXT | YouTube 영상 게시일 |
| created_at | TIMESTAMP | 레코드 생성 시간 (Supabase) |

**중요**: `time`과 `user_email`의 조합이 고유 키입니다. 같은 사용자가 동일한 시간에 두 개의 노트를 생성할 수 없습니다.

## 3. API 키 확인

1. Supabase 대시보드 → Settings → API
2. 필요한 정보:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

⚠️ **주의**: `service_role` 키가 아닌 `anon` 키를 사용하세요!

## 4. Chrome Extension 설정

### Google 계정 로그인
1. Extension 아이콘 클릭 → 우측 하단 톱니바퀴 아이콘 (Options)
2. "Google Account" 섹션에서 **"Login with Google"** 버튼 클릭
3. Google 계정 선택 및 권한 승인
4. 로그인 성공 시 프로필 사진과 이메일 표시

### Supabase 연결 설정
1. "Supabase Sync Settings" 섹션에 입력:
   - **Supabase URL**: 위에서 복사한 Project URL
   - **Supabase API Key**: 위에서 복사한 anon public 키
2. "Test Connection" 버튼으로 연결 확인
3. "Save" 버튼 클릭

⚠️ **중요**: Supabase 동기화를 사용하려면 **반드시 Google 로그인이 필요**합니다.

## 5. 동기화 사용법

### 자동 동기화
- **Google 로그인 필수**
- 노트를 저장하면 자동으로 Supabase에 업로드됩니다
- "✓ Synced to cloud" 메시지가 표시되면 성공
- 각 사용자의 노트는 독립적으로 저장됨

### 수동 동기화
- **⇅ Sync** 버튼 클릭
- 로컬에만 있는 노트 → Supabase에 업로드
- Supabase에만 있는 노트 → 로컬로 다운로드
- 양방향 병합 완료
- **동일한 Google 계정의 노트만 동기화**

### 다른 기기에서 사용
1. 새 기기에 Extension 설치
2. Options에서 **동일한 Google 계정으로 로그인**
3. 동일한 Supabase URL/Key 입력
4. **⇅ Sync** 버튼 클릭
5. 해당 계정의 모든 노트가 다운로드됨

## 6. 데이터 확인

Supabase 대시보드 → Table Editor → notes 테이블에서 모든 데이터 확인 가능

## 7. 보안 고려사항

### 현재 설정 (개인용/다중 사용자)

**데이터 격리**:
- 각 사용자는 자신의 Google 계정(이메일)으로 식별됨
- Extension 코드 레벨에서 user_email로 필터링
- 같은 Supabase 프로젝트를 여러 사용자가 공유 가능
- 각 사용자는 자신의 노트만 조회/수정

**보안 수준**:
- ✅ 사용자별 데이터 분리
- ✅ Google OAuth 인증
- ⚠️ 누구나 API 키를 알면 다른 사용자 데이터 접근 가능 (현재 RLS 정책)

### 프로덕션 환경 (높은 보안)

더 강력한 보안이 필요한 경우 RLS 정책 강화:

```sql
-- 기존 정책 삭제
DROP POLICY IF EXISTS "Enable all access for all users" ON notes;

-- Supabase Auth 기반 정책 (추천)
-- 이 경우 Extension에서 Supabase Auth 통합 필요
CREATE POLICY "Users can only access their own notes" ON notes
  FOR ALL
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- user_id 컬럼 추가 및 수정 필요
ALTER TABLE notes ADD COLUMN user_id UUID REFERENCES auth.users(id);
```

**프로덕션 권장사항**:
1. Supabase Auth 통합 (JWT 토큰 기반)
2. Service role key는 절대 Extension에 포함하지 말 것
3. RLS 정책으로 데이터베이스 레벨 보안 강화
4. API rate limiting 설정

## 8. 문제 해결

### Connection Failed
- Supabase URL이 정확한지 확인
- API Key가 `anon` 키인지 확인
- 인터넷 연결 확인

### Google Login Required
- Options 페이지에서 Google 계정으로 로그인 필요
- Chrome의 Google 계정 권한 승인 필요
- 로그인 후 Sync 버튼 다시 시도

### Sync Failed
- Google 로그인 상태 확인
- RLS 정책이 올바르게 설정되었는지 확인
- 테이블 이름이 `notes`인지 확인
- `user_email` 컬럼이 있는지 확인
- SQL Editor에서 테이블 생성 쿼리 다시 실행

### Duplicate Key Error
- `time`과 `user_email` 조합이 고유해야 함
- 동일한 시간에 같은 사용자가 두 노트를 저장할 수 없음
- 중복된 시간 값이 있는 경우 발생
- 로컬 데이터 정리 후 다시 시도

## 9. REST API 엔드포인트

Extension에서 사용하는 API:

```javascript
// 모든 노트 가져오기 (현재 사용자만)
GET ${SUPABASE_URL}/rest/v1/notes?select=*&user_email=eq.user@example.com&order=time.desc

// 노트 저장
POST ${SUPABASE_URL}/rest/v1/notes
Body: { time: 1234567890, user_email: "user@example.com", tags: ["tag1"], opinion: "..." }

// 특정 시간 이후 노트 가져오기 (현재 사용자만)
GET ${SUPABASE_URL}/rest/v1/notes?select=*&user_email=eq.user@example.com&time=gt.1234567890

// 노트 삭제 (현재 사용자만)
DELETE ${SUPABASE_URL}/rest/v1/notes?time=eq.1234567890&user_email=eq.user@example.com
```

**중요**: 모든 API 요청에 `user_email` 파라미터가 포함됩니다.

## 10. 비용

- **무료 플랜**: 
  - 500MB 데이터베이스
  - 1GB 파일 저장소
  - 50,000 월간 활성 사용자
  - 개인용으로 충분

- **유료 플랜**: 
  - 더 많은 용량과 기능 필요 시
  - 프로덕션 환경 권장

## 11. DB 사이즈 엔드포인트 설정

확장 프로그램에서 표시하는 “DB 크기”를 서버에서 정확히 가져오려면 아래 중 하나를 설정하세요.
기본 위의 내용에 합쳐서 추가해도 될 듯!
아래 A. sql 2개를 Query에 추가한후에 그 부분을 선택하여 오른쪽 마우스를 누르고 RUN을 해준다. (처음에 한번에 넣는 것도 방법이다.)

### A. `notes` 테이블 전체 크기 (권장)

아래 SQL 함수는 `public.notes`의 실제 저장 크기를 반환합니다. 테이블 데이터, 인덱스, TOAST(큰 값 저장소)를 포함합니다.

```sql
create or replace function public.get_notes_table_size_json()
returns jsonb
language sql
stable
security definer
as $$
  select jsonb_build_object('bytes', pg_total_relation_size('public.notes'::regclass));
$$;
```

권한 부여(직접 RPC 호출 시):

```sql
grant execute on function public.get_notes_table_size_json() to anon;
```

RPC 엔드포인트:

- URL: `<SUPABASE_URL>/rest/v1/rpc/get_notes_table_size_json`
- 헤더: `apikey: <anon-key>`, `Accept: application/json`, `Content-Type: application/json`
- 바디: `{}` (빈 JSON)

테스트 예시:

```bash
curl -X POST \
  -H "apikey: <anon-key>" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  "<SUPABASE_URL>/rest/v1/rpc/get_notes_table_size_json" \
  -d '{}'
```

PowerShell:

```powershell
$url = "<SUPABASE_URL>/rest/v1/rpc/get_notes_table_size_json"
$headers = @{ apikey = "<anon-key>"; Accept = "application/json"; "Content-Type" = "application/json" }
Invoke-RestMethod -Method Post -Uri $url -Headers $headers -Body "{}"
```

반환 형식: `{ "bytes": 123456 }`

### B. 전체 데이터베이스 크기 (선택)

프로젝트 전체 DB 크기가 필요하다면 다음 함수를 사용하세요.

```sql
create or replace function public.get_db_size_bytes_json()
returns jsonb
language sql
stable
security definer
as $$
  select jsonb_build_object('bytes', pg_database_size(current_database()));
$$;
```

주의: 이 값은 모든 테이블과 인덱스를 포함한 전체 데이터베이스 크기입니다.

### C. Edge Function 사용 (보안 권장)

서비스 롤 키를 클라이언트에 노출하지 않으려면 Edge Function을 만들어 위 RPC를 서버에서 호출하도록 합니다.

- 예시 엔드포인트: `https://<project-ref>.functions.supabase.co/db-size`
- 함수 내부에서 `rpc('get_notes_table_size_json')` 호출 후 JSON 그대로 반환
- 비밀값: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

### D. 확장 프로그램에 연결하기

- 확장 프로그램은 설정된 Supabase URL을 기반으로 RPC 엔드포인트(`<SUPABASE_URL>/rest/v1/rpc/get_notes_table_size_json`)를 자동으로 호출합니다. 별도의 옵션 입력은 필요하지 않습니다.
- Edge Function을 사용하고 싶다면 `popup.js`의 `DB_SIZE_ENDPOINT_DEFAULT` 상수에 해당 URL을 지정하면 우선 사용됩니다.
- 엔드포인트가 정상 동작하면 팝업 로그에 `authoritative size ...`가 표시되며, 실패하거나 미설정 시 로컬 추정치 `size estimate ...`를 사용합니다.

### 사용자 식별자 설정 (필수)

- Options 페이지의 "Manual user email / ID"는 필수입니다. 해당 값은 동기화 시 `user_email` 키로 사용되어 사용자별 노트를 구분합니다.
- 저장 시 값이 비어 있으면 Settings가 저장되지 않으며 경고가 표시됩니다.

### 자주 묻는 질문

- 이 값에 “내용(데이터)”이 포함되나요? → 네, `pg_total_relation_size`는 테이블 데이터와 인덱스, TOAST까지 포함한 실제 저장 용량입니다.
- 사용자별 크기만 보고 싶어요 → 별도 함수로 `user_email` 필터를 적용해 행 수와 대략적인 행 바이트를 합산할 수 있습니다.

