-- 사용자 프로필 및 정책 동의 관리 테이블 생성
-- 실행 날짜: 2024-12-XX

-- 1. 사용자 프로필 테이블 생성
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    profile_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 제약 조건
    CONSTRAINT user_profiles_name_length CHECK (length(full_name) >= 2 AND length(full_name) <= 100),
    CONSTRAINT user_profiles_phone_format CHECK (phone_number ~ '^[0-9+\-\s()]+$')
);

-- 2. 정책 동의 테이블 생성
CREATE TABLE IF NOT EXISTS user_agreements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    agreement_type VARCHAR(50) NOT NULL,
    agreement_version VARCHAR(20) DEFAULT '1.0',
    agreed BOOLEAN NOT NULL DEFAULT FALSE,
    agreed_at TIMESTAMP WITH TIME ZONE,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 제약 조건
    CONSTRAINT user_agreements_type_check CHECK (agreement_type IN ('privacy_policy', 'terms_of_service')),
    CONSTRAINT user_agreements_agreed_check CHECK (
        (agreed = true AND agreed_at IS NOT NULL) OR 
        (agreed = false AND agreed_at IS NULL)
    ),
    
    -- 사용자별 동의 유형당 하나의 최신 레코드만 유지
    UNIQUE(user_id, agreement_type)
);

-- 3. 정책 버전 관리 테이블 생성
CREATE TABLE IF NOT EXISTS policy_versions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    policy_type VARCHAR(50) NOT NULL,
    version VARCHAR(20) NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    effective_date TIMESTAMP WITH TIME ZONE NOT NULL,
    is_current BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 제약 조건
    CONSTRAINT policy_versions_type_check CHECK (policy_type IN ('privacy_policy', 'terms_of_service')),
    CONSTRAINT policy_versions_version_format CHECK (version ~ '^\d+\.\d+$'),
    
    -- 정책 유형별로 하나의 현재 버전만 허용
    UNIQUE(policy_type, version)
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_profile_completed ON user_profiles(profile_completed);

CREATE INDEX IF NOT EXISTS idx_user_agreements_user_id ON user_agreements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_agreements_type ON user_agreements(agreement_type);
CREATE INDEX IF NOT EXISTS idx_user_agreements_agreed ON user_agreements(agreed);
CREATE INDEX IF NOT EXISTS idx_user_agreements_agreed_at ON user_agreements(agreed_at DESC);

CREATE INDEX IF NOT EXISTS idx_policy_versions_type ON policy_versions(policy_type);
CREATE INDEX IF NOT EXISTS idx_policy_versions_current ON policy_versions(is_current);
CREATE INDEX IF NOT EXISTS idx_policy_versions_effective_date ON policy_versions(effective_date DESC);

-- Row Level Security (RLS) 활성화
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_versions ENABLE ROW LEVEL SECURITY;

-- user_profiles RLS 정책
CREATE POLICY "Users can view own profile" 
ON user_profiles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" 
ON user_profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" 
ON user_profiles FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own profile" 
ON user_profiles FOR DELETE 
USING (auth.uid() = user_id);

-- user_agreements RLS 정책
CREATE POLICY "Users can view own agreements" 
ON user_agreements FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own agreements" 
ON user_agreements FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own agreements" 
ON user_agreements FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- policy_versions는 모든 사용자가 읽기 가능 (정책 내용 확인용)
CREATE POLICY "All users can view current policies" 
ON policy_versions FOR SELECT 
USING (true);

-- updated_at 자동 업데이트를 위한 트리거 생성
CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_agreements_updated_at 
    BEFORE UPDATE ON user_agreements 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 사용자 온보딩 완료 확인 함수
CREATE OR REPLACE FUNCTION check_user_onboarding_status(target_user_id UUID)
RETURNS TABLE(
    has_profile BOOLEAN,
    privacy_agreed BOOLEAN,
    terms_agreed BOOLEAN,
    onboarding_complete BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        EXISTS(SELECT 1 FROM user_profiles WHERE user_id = target_user_id AND profile_completed = true) as has_profile,
        EXISTS(SELECT 1 FROM user_agreements WHERE user_id = target_user_id AND agreement_type = 'privacy_policy' AND agreed = true) as privacy_agreed,
        EXISTS(SELECT 1 FROM user_agreements WHERE user_id = target_user_id AND agreement_type = 'terms_of_service' AND agreed = true) as terms_agreed,
        (
            EXISTS(SELECT 1 FROM user_profiles WHERE user_id = target_user_id AND profile_completed = true) AND
            EXISTS(SELECT 1 FROM user_agreements WHERE user_id = target_user_id AND agreement_type = 'privacy_policy' AND agreed = true) AND
            EXISTS(SELECT 1 FROM user_agreements WHERE user_id = target_user_id AND agreement_type = 'terms_of_service' AND agreed = true)
        ) as onboarding_complete;
END;
$$ LANGUAGE plpgsql;

-- 사용자 온보딩 정보 완성 함수
CREATE OR REPLACE FUNCTION complete_user_onboarding(
    target_user_id UUID,
    user_full_name TEXT,
    user_phone TEXT,
    user_ip INET DEFAULT NULL,
    user_agent_string TEXT DEFAULT NULL
)
RETURNS TABLE(
    profile_id UUID,
    privacy_agreement_id UUID,
    terms_agreement_id UUID,
    prompts_created BIGINT
) AS $$
DECLARE
    privacy_version TEXT;
    terms_version TEXT;
    profile_uuid UUID;
    privacy_uuid UUID;
    terms_uuid UUID;
    prompts_count BIGINT;
BEGIN
    -- 현재 정책 버전 가져오기
    SELECT version INTO privacy_version 
    FROM policy_versions 
    WHERE policy_type = 'privacy_policy' AND is_current = true;
    
    SELECT version INTO terms_version 
    FROM policy_versions 
    WHERE policy_type = 'terms_of_service' AND is_current = true;
    
    -- 사용자 프로필 생성/업데이트
    INSERT INTO user_profiles (user_id, full_name, phone_number, profile_completed)
    VALUES (target_user_id, user_full_name, user_phone, true)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        full_name = EXCLUDED.full_name,
        phone_number = EXCLUDED.phone_number,
        profile_completed = true,
        updated_at = NOW()
    RETURNING id INTO profile_uuid;
    
    -- 개인정보처리방침 동의 기록
    INSERT INTO user_agreements (user_id, agreement_type, agreement_version, agreed, agreed_at, ip_address, user_agent)
    VALUES (target_user_id, 'privacy_policy', privacy_version, true, NOW(), user_ip, user_agent_string)
    ON CONFLICT (user_id, agreement_type)
    DO UPDATE SET
        agreement_version = EXCLUDED.agreement_version,
        agreed = true,
        agreed_at = NOW(),
        ip_address = EXCLUDED.ip_address,
        user_agent = EXCLUDED.user_agent,
        updated_at = NOW()
    RETURNING id INTO privacy_uuid;
    
    -- 서비스 이용약관 동의 기록
    INSERT INTO user_agreements (user_id, agreement_type, agreement_version, agreed, agreed_at, ip_address, user_agent)
    VALUES (target_user_id, 'terms_of_service', terms_version, true, NOW(), user_ip, user_agent_string)
    ON CONFLICT (user_id, agreement_type)
    DO UPDATE SET
        agreement_version = EXCLUDED.agreement_version,
        agreed = true,
        agreed_at = NOW(),
        ip_address = EXCLUDED.ip_address,
        user_agent = EXCLUDED.user_agent,
        updated_at = NOW()
    RETURNING id INTO terms_uuid;
    
    -- 기본 프롬프트 생성 (이미 있으면 스킵)
    SELECT insert_default_prompts_for_user(target_user_id) INTO prompts_count;
    
    RETURN QUERY SELECT profile_uuid, privacy_uuid, terms_uuid, prompts_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 프롬프트 사용 횟수 증가 함수
CREATE OR REPLACE FUNCTION increment_prompt_usage(prompt_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE user_prompts 
    SET 
        usage_count = usage_count + 1,
        last_used_at = NOW(),
        updated_at = NOW()
    WHERE id = prompt_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 기본 정책 버전 삽입
INSERT INTO policy_versions (policy_type, version, title, content, effective_date, is_current)
VALUES 
(
    'privacy_policy',
    '1.0',
    '개인정보처리방침',
    '## 개인정보처리방침

### 1. 개인정보 처리 목적
My Speaking AI(이하 "회사")는 다음의 목적을 위하여 개인정보를 처리합니다.

- 회원 가입 및 관리
- 서비스 제공 및 향상
- 고객 지원 및 문의 응답
- 서비스 이용 통계 분석

### 2. 처리하는 개인정보 항목
- 필수항목: 이메일 주소, 이름, 전화번호
- 선택항목: 프로필 사진, 사용자 설정

### 3. 개인정보 처리 및 보유기간
회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시에 동의받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.

### 4. 개인정보의 제3자 제공
회사는 원칙적으로 정보주체의 개인정보를 제3자에게 제공하지 않습니다.

### 5. 개인정보 처리의 위탁
회사는 개인정보 처리업무를 외부에 위탁하지 않습니다.

### 6. 정보주체의 권리·의무
정보주체는 개인정보 열람, 정정·삭제, 처리정지 요구 등의 권리를 행사할 수 있습니다.

### 7. 개인정보보호책임자
- 성명: 관리자
- 연락처: support@myspeakingai.com

본 방침은 2024년 12월부터 적용됩니다.',
    NOW(),
    true
),
(
    'terms_of_service',
    '1.0', 
    '서비스 이용약관',
    '## 서비스 이용약관

### 제1조 (목적)
본 약관은 My Speaking AI(이하 "회사")가 제공하는 영어 회화 서비스(이하 "서비스")의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.

### 제2조 (정의)
1. "서비스"란 회사가 제공하는 AI 기반 영어 회화 학습 플랫폼을 의미합니다.
2. "이용자"란 본 약관에 따라 회사가 제공하는 서비스를 받는 회원을 말합니다.

### 제3조 (약관의 효력 및 변경)
1. 본 약관은 서비스를 이용하고자 하는 모든 이용자에 대하여 그 효력을 발생합니다.
2. 회사는 필요한 경우 본 약관을 변경할 수 있으며, 변경된 약관은 서비스 내 공지사항을 통해 공지합니다.

### 제4조 (서비스의 제공)
1. 회사는 이용자에게 다음과 같은 서비스를 제공합니다:
   - AI 기반 영어 회화 연습
   - 맞춤형 학습 콘텐츠 제공
   - 학습 기록 및 분석

### 제5조 (이용자의 의무)
1. 이용자는 다음 행위를 하여서는 안 됩니다:
   - 서비스를 상업적 목적으로 이용하는 행위
   - 다른 이용자의 개인정보를 수집하는 행위
   - 서비스의 운영을 방해하는 행위

### 제6조 (서비스 이용제한)
회사는 이용자가 본 약관을 위반한 경우 서비스 이용을 제한할 수 있습니다.

### 제7조 (책임제한)
회사는 무료 서비스의 특성상 서비스 이용으로 발생한 손해에 대해 책임을 지지 않습니다.

### 제8조 (분쟁해결)
본 약관과 관련된 분쟁은 대한민국 법률에 따라 해결됩니다.

본 약관은 2024년 12월부터 적용됩니다.',
    NOW(),
    true
)
ON CONFLICT (policy_type, version) DO NOTHING;

-- 테이블 생성 확인
SELECT 
    'User profiles and agreements tables created successfully' as status,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name IN ('user_profiles', 'user_agreements', 'policy_versions')) as table_count; 