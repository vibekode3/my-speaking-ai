# 사용자 온보딩 시스템 설정 가이드

My Speaking AI 서비스에 사용자 온보딩 시스템이 추가되었습니다. 이 시스템은 회원가입 후 최초 로그인 시 개인정보처리방침 및 서비스 이용약관 동의와 사용자 기본 정보 입력을 받는 기능을 제공합니다.

## 🚀 주요 기능

### 1. 온보딩 프로세스
- **1단계**: 개인정보처리방침 및 서비스 이용약관 동의
- **2단계**: 사용자 이름 및 전화번호 입력
- **3단계**: 온보딩 완료 및 기본 프롬프트 자동 생성

### 2. 새로 추가된 테이블
- **`user_profiles`**: 사용자 기본 정보 (이름, 전화번호)
- **`user_agreements`**: 약관 동의 내역 (IP, User Agent 포함)
- **`policy_versions`**: 정책 버전 관리

### 3. 자동화된 기능
- 온보딩 완료 시 기본 프롬프트 4개 자동 생성
- 정책 동의 내역 추적 (IP 주소, User Agent)
- 프로필 완성 여부 자동 확인

## 📋 데이터베이스 마이그레이션

### 필수 실행 순서

데이터베이스에 다음 SQL 파일들을 순서대로 실행해주세요:

#### 1단계: 사용자 프로필 및 정책 테이블 생성
```sql
-- database/create_user_profiles_and_agreements.sql 실행
```

이 파일은 다음을 포함합니다:
- `user_profiles` 테이블 생성
- `user_agreements` 테이블 생성  
- `policy_versions` 테이블 생성
- 기본 정책 버전 삽입 (개인정보처리방침 v1.0, 서비스 이용약관 v1.0)
- 온보딩 관련 함수들 생성

### 데이터베이스 스키마

#### user_profiles 테이블
```sql
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    profile_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### user_agreements 테이블
```sql
CREATE TABLE user_agreements (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    agreement_type VARCHAR(50) NOT NULL, -- 'privacy_policy' | 'terms_of_service'
    agreement_version VARCHAR(20) DEFAULT '1.0',
    agreed BOOLEAN NOT NULL DEFAULT FALSE,
    agreed_at TIMESTAMP WITH TIME ZONE,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, agreement_type)
);
```

#### policy_versions 테이블
```sql
CREATE TABLE policy_versions (
    id UUID PRIMARY KEY,
    policy_type VARCHAR(50) NOT NULL, -- 'privacy_policy' | 'terms_of_service'
    version VARCHAR(20) NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    effective_date TIMESTAMP WITH TIME ZONE NOT NULL,
    is_current BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(policy_type, version)
);
```

## 🔧 주요 함수

### check_user_onboarding_status(target_user_id UUID)
사용자의 온보딩 완료 상태를 확인합니다.

```sql
SELECT * FROM check_user_onboarding_status('user-uuid');
```

**반환값:**
- `has_profile`: 프로필 작성 완료 여부
- `privacy_agreed`: 개인정보처리방침 동의 여부
- `terms_agreed`: 서비스 이용약관 동의 여부
- `onboarding_complete`: 전체 온보딩 완료 여부

### complete_user_onboarding()
사용자 온보딩을 완료 처리합니다.

```sql
SELECT complete_user_onboarding(
    'user-uuid',
    '홍길동',
    '010-1234-5678',
    '192.168.1.1'::inet,
    'Mozilla/5.0...'
);
```

이 함수는 다음을 자동으로 처리합니다:
1. 사용자 프로필 생성/업데이트
2. 개인정보처리방침 동의 기록
3. 서비스 이용약관 동의 기록
4. 기본 프롬프트 4개 생성

## 🎯 사용자 플로우

### 신규 사용자
1. **회원가입** → 이메일 인증
2. **로그인** → 온보딩 상태 확인
3. **온보딩 페이지 리다이렉트** (`/onboarding`)
4. **약관 동의** → 개인정보처리방침 + 서비스 이용약관
5. **개인정보 입력** → 이름 + 전화번호
6. **온보딩 완료** → 메인 페이지 리다이렉트

### 기존 사용자
- 온보딩이 완료된 사용자는 바로 메인 페이지로 이동
- 로그인 시마다 온보딩 상태 자동 확인

## 📁 새로 추가된 파일들

### 데이터베이스
- `database/create_user_profiles_and_agreements.sql` - 테이블 및 함수 생성

### 백엔드 API
- `src/lib/onboarding.js` - 온보딩 관련 API 함수들

### 프론트엔드
- `src/routes/onboarding/+page.svelte` - 온보딩 페이지 컴포넌트
- `src/routes/+layout.svelte` - 온보딩 상태 확인 로직 추가

## 🔐 보안 및 개인정보 보호

### Row Level Security (RLS)
모든 테이블에 RLS가 활성화되어 있어 사용자는 자신의 데이터만 접근 가능합니다.

### 동의 기록 추적
- 동의 시점의 IP 주소 기록
- User Agent 정보 기록
- 정책 버전 추적

### 데이터 검증
- 이름: 2-100자 제한
- 전화번호: 숫자, +, -, 공백, 괄호만 허용
- 필수 동의 검증

## 🧪 테스트 방법

### 1. 새 계정으로 테스트
```bash
# 새 이메일로 회원가입
# 로그인 후 /onboarding 페이지로 자동 리다이렉트 확인
```

### 2. 온보딩 상태 확인
```sql
-- 사용자 온보딩 상태 확인
SELECT * FROM check_user_onboarding_status('user-uuid');

-- 사용자 프로필 확인
SELECT * FROM user_profiles WHERE user_id = 'user-uuid';

-- 동의 내역 확인
SELECT * FROM user_agreements WHERE user_id = 'user-uuid';
```

### 3. 기본 프롬프트 생성 확인
```sql
-- 사용자의 기본 프롬프트 확인
SELECT * FROM user_prompts WHERE user_id = 'user-uuid' AND is_default = true;
```

## 🐛 문제 해결

### 온보딩 페이지가 표시되지 않는 경우
1. 데이터베이스 마이그레이션이 완료되었는지 확인
2. RLS 정책이 올바르게 설정되었는지 확인
3. 브라우저 콘솔에서 에러 메시지 확인

### 정책 내용이 표시되지 않는 경우
```sql
-- 현재 정책 확인
SELECT * FROM policy_versions WHERE is_current = true;
```

### 온보딩 완료 후에도 리다이렉트되는 경우
```sql
-- 온보딩 상태 강제 확인
SELECT * FROM check_user_onboarding_status('user-uuid');
```

## 📝 정책 내용 업데이트

새로운 정책 버전을 추가하려면:

```sql
-- 기존 정책을 현재가 아닌 것으로 변경
UPDATE policy_versions SET is_current = false WHERE policy_type = 'privacy_policy';

-- 새 버전 추가
INSERT INTO policy_versions (policy_type, version, title, content, effective_date, is_current)
VALUES ('privacy_policy', '2.0', '개인정보처리방침 v2.0', '새로운 내용...', NOW(), true);
```

---

**⚠️ 중요**: 데이터베이스 마이그레이션 전에 반드시 백업을 생성하세요!

**✅ 완료**: 이제 사용자는 회원가입 후 최초 로그인 시 약관 동의와 기본 정보 입력을 통해 서비스를 시작할 수 있습니다. 