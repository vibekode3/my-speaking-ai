-- AI 설정 정보를 대화 기록에 추가하는 마이그레이션
-- 실행 날짜: 2024-12-XX

-- conversation_records 테이블에 AI 설정 관련 컬럼 추가
ALTER TABLE conversation_records 
ADD COLUMN IF NOT EXISTS ai_settings JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS prompt_template VARCHAR(50) DEFAULT 'friendly',
ADD COLUMN IF NOT EXISTS custom_prompt TEXT DEFAULT '';

-- ai_settings 컬럼에 대한 인덱스 추가 (검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_conversation_records_prompt_template 
ON conversation_records(prompt_template);

-- ai_settings JSONB 컬럼에 GIN 인덱스 추가 (JSONB 검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_conversation_records_ai_settings 
ON conversation_records USING GIN (ai_settings);

-- 기존 데이터 업데이트 (기본값 설정)
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

-- 마이그레이션 완료 확인
SELECT 
    'AI settings migration completed' as status,
    COUNT(*) as total_records,
    COUNT(CASE WHEN ai_settings != '{}' THEN 1 END) as records_with_ai_settings
FROM conversation_records; 