# 데이터베이스 마이그레이션 안내

## AI 설정 정보 저장 기능 추가

이번 업데이트에서는 대화 기록에 사용된 AI 설정 정보를 저장하고 표시하는 기능이 추가되었습니다.

### 🔄 마이그레이션 파일

- **파일**: `database/add_ai_settings_to_conversations.sql`
- **목적**: `conversation_records` 테이블에 AI 설정 관련 컬럼 추가

### 📋 추가되는 컬럼

1. **`ai_settings`** (JSONB): AI 설정 정보를 JSON 형태로 저장
2. **`prompt_template`** (VARCHAR): 사용된 프롬프트 템플릿 유형 ('friendly', 'strict', 'business', 'casual', 'custom')
3. **`custom_prompt`** (TEXT): 사용자가 작성한 커스텀 프롬프트

### 🚀 마이그레이션 실행 방법

#### Supabase 대시보드를 통한 실행

1. [Supabase Dashboard](https://supabase.com/dashboard) 접속
2. 프로젝트 선택
3. 좌측 메뉴에서 **SQL Editor** 클릭
4. **New Query** 버튼 클릭
5. `database/add_ai_settings_to_conversations.sql` 파일의 내용을 복사하여 붙여넣기
6. **Run** 버튼 클릭하여 실행

#### SQL 명령어로 직접 실행

```sql
-- conversation_records 테이블에 AI 설정 관련 컬럼 추가
ALTER TABLE conversation_records 
ADD COLUMN IF NOT EXISTS ai_settings JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS prompt_template VARCHAR(50) DEFAULT 'friendly',
ADD COLUMN IF NOT EXISTS custom_prompt TEXT DEFAULT '';

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_conversation_records_prompt_template 
ON conversation_records(prompt_template);

CREATE INDEX IF NOT EXISTS idx_conversation_records_ai_settings 
ON conversation_records USING GIN (ai_settings);

-- 기존 데이터 업데이트
UPDATE conversation_records 
SET 
    ai_settings = jsonb_build_object(
        'template', 'friendly',
        'templateName', '친근한 선생님',
        'customPrompt', '',
        'updatedAt', NOW()
    ),
    prompt_template = 'friendly',
    custom_prompt = ''
WHERE ai_settings = '{}' OR ai_settings IS NULL;
```

### ✨ 새로운 기능

#### 1. AI 설정 커스터마이저
- **위치**: 메인 페이지 사이드바 → "AI 설정" 탭
- **기능**: 
  - 4가지 사전 정의된 선생님 유형 선택
  - 커스텀 프롬프트 작성
  - 실시간 프롬프트 미리보기

#### 2. 대화 기록에 AI 설정 표시
- **대화 목록**: AI 설정 유형을 뱃지로 표시
- **상세보기**: AI 설정 정보 섹션에서 상세 정보 확인
  - 선생님 유형
  - 커스텀 프롬프트 (있는 경우)
  - 설정 업데이트 시간

#### 3. 선생님 유형

1. **😊 친근한 선생님**
   - 부드럽고 격려하는 스타일
   - 한국어 설명 지원

2. **🎯 엄격한 선생님**
   - 즉시 교정과 반복 연습
   - 영어 전용 대화

3. **💼 비즈니스 전문가**
   - 업무 영어와 전문 표현
   - 비즈니스 매너 교육

4. **🎉 캐주얼 친구**
   - 일상 대화와 재미있는 주제
   - 슬랭과 구어체 표현

5. **✏️ 커스텀 설정**
   - 사용자 직접 작성
   - 최대 1,000자

### 🔍 데이터 구조

#### ai_settings 컬럼 예시
```json
{
  "template": "friendly",
  "templateName": "친근한 선생님",
  "customPrompt": "",
  "updatedAt": "2024-12-20T10:30:00.000Z"
}
```

### 📊 마이그레이션 확인

마이그레이션 실행 후 다음 쿼리로 성공 여부를 확인할 수 있습니다:

```sql
-- 테이블 구조 확인
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'conversation_records' 
  AND column_name IN ('ai_settings', 'prompt_template', 'custom_prompt');

-- 기존 데이터 업데이트 확인
SELECT 
    COUNT(*) as total_records,
    COUNT(CASE WHEN ai_settings != '{}' THEN 1 END) as records_with_ai_settings,
    COUNT(CASE WHEN prompt_template IS NOT NULL THEN 1 END) as records_with_template
FROM conversation_records;
```

### ⚠️ 주의사항

1. **백업**: 마이그레이션 실행 전 데이터베이스 백업 권장
2. **기존 대화**: 기존 대화 기록은 "친근한 선생님" 설정으로 초기화됨
3. **연결 중 변경**: AI와 연결 중에는 설정 변경 불가 (다음 연결부터 적용)

### 🐛 문제 해결

#### 마이그레이션 실패 시
```sql
-- 컬럼 존재 여부 확인
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'conversation_records';

-- 수동으로 컬럼 추가 (필요시)
ALTER TABLE conversation_records ADD COLUMN ai_settings JSONB DEFAULT '{}';
ALTER TABLE conversation_records ADD COLUMN prompt_template VARCHAR(50) DEFAULT 'friendly';
ALTER TABLE conversation_records ADD COLUMN custom_prompt TEXT DEFAULT '';
```

#### 권한 오류 시
- Supabase 프로젝트 소유자 권한 확인
- RLS 정책이 올바르게 설정되었는지 확인

---

**업데이트 완료 후** 애플리케이션을 새로고침하면 새로운 AI 설정 기능을 사용할 수 있습니다! 🎉 

## 사용자 프롬프트 관리 시스템 추가

이번 업데이트에서는 사용자가 프롬프트를 저장하고 관리할 수 있는 시스템이 추가되었습니다.

### 🔄 마이그레이션 파일

1. **`database/add_ai_settings_to_conversations.sql`**: 기존 대화 기록에 AI 설정 정보 추가
2. **`database/create_user_prompts_table.sql`**: 사용자 프롬프트 관리 테이블 생성
3. **`database/update_conversations_with_prompt_references.sql`**: 대화 기록과 프롬프트 연결

### 📋 새로 추가되는 테이블

#### user_prompts 테이블
- **`id`** (UUID): 프롬프트 고유 ID
- **`user_id`** (UUID): 사용자 ID (auth.users 참조)
- **`name`** (VARCHAR): 프롬프트 이름
- **`description`** (TEXT): 프롬프트 설명
- **`prompt_content`** (TEXT): 프롬프트 내용
- **`template_type`** (VARCHAR): 템플릿 유형
- **`is_favorite`** (BOOLEAN): 즐겨찾기 여부
- **`is_default`** (BOOLEAN): 기본 프롬프트 여부
- **`usage_count`** (INTEGER): 사용 횟수
- **`last_used_at`** (TIMESTAMP): 마지막 사용 시간

#### conversation_records 테이블 업데이트
- **`prompt_id`** (UUID): 사용된 프롬프트 ID (user_prompts 참조)

### 🚀 마이그레이션 실행 순서

#### 1단계: 사용자 프롬프트 테이블 생성
```sql
-- database/create_user_prompts_table.sql 실행
```

#### 2단계: 대화 기록 테이블에 프롬프트 참조 추가
```sql
-- database/update_conversations_with_prompt_references.sql 실행
```

#### 3단계: 신규 사용자를 위한 기본 프롬프트 생성
각 사용자가 처음 로그인할 때 자동으로 4개의 기본 프롬프트가 생성됩니다:
- 😊 친근한 선생님
- 🎯 엄격한 선생님  
- 💼 비즈니스 전문가
- 🎉 캐주얼 친구

### ✨ 새로운 기능

#### 1. 프롬프트 관리 시스템
- **저장**: 커스텀 프롬프트를 저장하여 재사용
- **편집**: 저장된 프롬프트 수정
- **복제**: 기존 프롬프트를 복사하여 새로운 변형 생성
- **즐겨찾기**: 자주 사용하는 프롬프트 표시
- **검색**: 이름, 설명, 내용으로 프롬프트 검색

#### 2. 사용 통계 추적
- **사용 횟수**: 각 프롬프트의 사용 빈도 추적
- **마지막 사용**: 프롬프트 마지막 사용 시간
- **자동 정렬**: 사용 빈도에 따른 자동 정렬

#### 3. 대화 기록 연동
- **프롬프트 연결**: 각 대화에서 사용된 프롬프트 기록
- **상세 정보**: 대화 기록에서 사용된 프롬프트 정보 표시
- **통계 뷰**: 프롬프트별 사용 통계 조회

### 🔍 데이터 구조 예시

#### user_prompts 테이블
```json
{
  "id": "uuid-string",
  "user_id": "user-uuid",
  "name": "나만의 영어 선생님",
  "description": "비즈니스 영어 전문 + 친근한 스타일",
  "prompt_content": "당신은 비즈니스 영어에 특화된 친근한 선생님입니다...",
  "template_type": "custom",
  "is_favorite": true,
  "is_default": false,
  "usage_count": 15,
  "last_used_at": "2024-12-20T10:30:00.000Z"
}
```

#### conversation_records 업데이트
```json
{
  "id": "conversation-uuid",
  "prompt_id": "prompt-uuid",
  "ai_settings": {
    "template": "custom",
    "templateName": "나만의 영어 선생님",
    "customPrompt": "...",
    "updatedAt": "2024-12-20T10:30:00.000Z"
  }
}
```

### 📊 마이그레이션 확인 쿼리

```sql
-- 1. user_prompts 테이블 생성 확인
SELECT COUNT(*) as user_prompts_table_exists
FROM information_schema.tables 
WHERE table_name = 'user_prompts';

-- 2. conversation_records에 prompt_id 컬럼 추가 확인
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'conversation_records' 
  AND column_name = 'prompt_id';

-- 3. 기본 프롬프트 생성 확인
SELECT user_id, COUNT(*) as default_prompts_count
FROM user_prompts 
WHERE is_default = true
GROUP BY user_id;

-- 4. 프롬프트 사용 통계 뷰 확인
SELECT * FROM conversation_prompt_stats LIMIT 5;
```

### 🛠️ 사용자 프롬프트 관리 API

#### 기본 프롬프트 생성 (신규 사용자)
```sql
SELECT insert_default_prompts_for_user('user-uuid');
```

#### 프롬프트 사용 통계 업데이트 (자동)
대화 시작/종료 시 자동으로 트리거됩니다.

#### 기존 대화 프롬프트 마이그레이션
```sql
SELECT migrate_existing_conversation_prompts();
```

### ⚠️ 주의사항

1. **데이터 백업**: 마이그레이션 전 반드시 데이터베이스 백업
2. **순서 준수**: 마이그레이션 파일을 정확한 순서로 실행
3. **기본 프롬프트**: 신규 사용자는 첫 로그인 시 자동으로 기본 프롬프트 생성
4. **기존 사용자**: 기존 사용자도 프롬프트 관리 페이지 접속 시 기본 프롬프트 자동 생성

### 🔧 문제 해결

#### 기본 프롬프트가 생성되지 않는 경우
```sql
-- 수동으로 기본 프롬프트 생성
SELECT insert_default_prompts_for_user('사용자-UUID');
```

#### 프롬프트 사용 통계가 업데이트되지 않는 경우
```sql
-- 트리거 확인
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE trigger_name = 'update_prompt_usage_stats_trigger';
```

#### 기존 대화의 프롬프트 연결이 안 되는 경우
```sql
-- 수동으로 마이그레이션 실행
SELECT migrate_existing_conversation_prompts();
```

---

**업데이트 완료 후** 애플리케이션을 새로고침하면 새로운 프롬프트 관리 기능을 사용할 수 있습니다! 🎉

### 📈 기능 개선 사항

1. **1회성 → 저장형**: 이제 프롬프트를 저장하여 재사용 가능
2. **템플릿 → 개인화**: 사용자별 맞춤 프롬프트 라이브러리
3. **단순 → 고급**: 검색, 즐겨찾기, 사용 통계 등 고급 관리 기능
4. **기록 분리 → 통합**: 대화 기록과 프롬프트 정보 연동 