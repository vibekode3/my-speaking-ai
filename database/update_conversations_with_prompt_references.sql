-- conversation_records 테이블에 user_prompts 참조 추가
-- 실행 날짜: 2024-12-XX

-- conversation_records 테이블에 prompt_id 컬럼 추가
ALTER TABLE conversation_records 
ADD COLUMN IF NOT EXISTS prompt_id UUID REFERENCES user_prompts(id) ON DELETE SET NULL;

-- prompt_id 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_conversation_records_prompt_id 
ON conversation_records(prompt_id);

-- 대화 기록에서 사용된 프롬프트 통계를 위한 뷰 생성
CREATE OR REPLACE VIEW conversation_prompt_stats AS
SELECT 
    up.id as prompt_id,
    up.name as prompt_name,
    up.user_id,
    COUNT(cr.id) as usage_count,
    MAX(cr.created_at) as last_used_at,
    AVG(cr.duration_minutes) as avg_duration_minutes
FROM user_prompts up
LEFT JOIN conversation_records cr ON up.id = cr.prompt_id
GROUP BY up.id, up.name, up.user_id;

-- 사용자별 프롬프트 사용 통계 업데이트 함수
CREATE OR REPLACE FUNCTION update_prompt_usage_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- 새로운 대화가 시작될 때 프롬프트 사용 통계 업데이트
    IF TG_OP = 'INSERT' AND NEW.prompt_id IS NOT NULL THEN
        UPDATE user_prompts 
        SET 
            usage_count = usage_count + 1,
            last_used_at = NEW.created_at
        WHERE id = NEW.prompt_id;
    END IF;
    
    -- 대화가 종료될 때 (ended_at이 업데이트될 때) 통계 업데이트
    IF TG_OP = 'UPDATE' AND NEW.ended_at IS NOT NULL AND OLD.ended_at IS NULL THEN
        IF NEW.prompt_id IS NOT NULL THEN
            UPDATE user_prompts 
            SET last_used_at = NEW.ended_at
            WHERE id = NEW.prompt_id;
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 프롬프트 사용 통계 업데이트 트리거 생성
CREATE TRIGGER update_prompt_usage_stats_trigger
    AFTER INSERT OR UPDATE ON conversation_records
    FOR EACH ROW
    EXECUTE FUNCTION update_prompt_usage_stats();

-- 기존 conversation_records의 ai_settings에서 prompt_id 추출 및 업데이트 함수
CREATE OR REPLACE FUNCTION migrate_existing_conversation_prompts()
RETURNS void AS $$
DECLARE
    conversation_record RECORD;
    matching_prompt_id UUID;
BEGIN
    -- 기존 대화 기록들을 순회하면서 매칭되는 프롬프트 찾기
    FOR conversation_record IN 
        SELECT id, user_id, ai_settings, prompt_template, custom_prompt 
        FROM conversation_records 
        WHERE prompt_id IS NULL
    LOOP
        -- 1. 커스텀 프롬프트가 있는 경우 매칭되는 사용자 프롬프트 찾기
        IF conversation_record.custom_prompt IS NOT NULL AND LENGTH(conversation_record.custom_prompt) > 0 THEN
            SELECT id INTO matching_prompt_id
            FROM user_prompts 
            WHERE user_id = conversation_record.user_id 
              AND prompt_content = conversation_record.custom_prompt
            LIMIT 1;
        END IF;
        
        -- 2. 매칭되는 프롬프트가 없으면 템플릿 기반으로 찾기
        IF matching_prompt_id IS NULL THEN
            SELECT id INTO matching_prompt_id
            FROM user_prompts 
            WHERE user_id = conversation_record.user_id 
              AND template_type = COALESCE(conversation_record.prompt_template, 'friendly')
              AND is_default = true
            LIMIT 1;
        END IF;
        
        -- 3. 찾은 프롬프트 ID로 업데이트
        IF matching_prompt_id IS NOT NULL THEN
            UPDATE conversation_records 
            SET prompt_id = matching_prompt_id
            WHERE id = conversation_record.id;
        END IF;
        
        -- 변수 초기화
        matching_prompt_id := NULL;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 마이그레이션 완료 확인
SELECT 
    'Conversation prompts reference migration completed' as status,
    COUNT(*) as total_conversations,
    COUNT(prompt_id) as conversations_with_prompt_ref
FROM conversation_records; 