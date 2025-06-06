-- 사용자별 프롬프트 관리 테이블 생성
-- 실행 날짜: 2024-12-XX

-- user_prompts 테이블 생성
CREATE TABLE IF NOT EXISTS user_prompts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT DEFAULT '',
    prompt_content TEXT NOT NULL,
    template_type VARCHAR(50) DEFAULT 'custom',
    is_favorite BOOLEAN DEFAULT FALSE,
    is_default BOOLEAN DEFAULT FALSE,
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 제약 조건
    CONSTRAINT user_prompts_name_length CHECK (length(name) >= 1 AND length(name) <= 100),
    CONSTRAINT user_prompts_content_length CHECK (length(prompt_content) >= 10 AND length(prompt_content) <= 2000)
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_user_prompts_user_id 
ON user_prompts(user_id);

CREATE INDEX IF NOT EXISTS idx_user_prompts_template_type 
ON user_prompts(template_type);

CREATE INDEX IF NOT EXISTS idx_user_prompts_is_favorite 
ON user_prompts(user_id, is_favorite);

CREATE INDEX IF NOT EXISTS idx_user_prompts_created_at 
ON user_prompts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_prompts_usage_count 
ON user_prompts(usage_count DESC);

-- Row Level Security (RLS) 활성화
ALTER TABLE user_prompts ENABLE ROW LEVEL SECURITY;

-- 사용자가 자신의 프롬프트만 볼 수 있도록 하는 정책
CREATE POLICY "Users can view own prompts" 
ON user_prompts FOR SELECT 
USING (auth.uid() = user_id);

-- 사용자가 자신의 프롬프트를 생성할 수 있도록 하는 정책
CREATE POLICY "Users can insert own prompts" 
ON user_prompts FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 사용자가 자신의 프롬프트를 수정할 수 있도록 하는 정책
CREATE POLICY "Users can update own prompts" 
ON user_prompts FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 사용자가 자신의 프롬프트를 삭제할 수 있도록 하는 정책
CREATE POLICY "Users can delete own prompts" 
ON user_prompts FOR DELETE 
USING (auth.uid() = user_id);

-- updated_at 자동 업데이트를 위한 트리거 생성
CREATE TRIGGER update_user_prompts_updated_at 
    BEFORE UPDATE ON user_prompts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 기본 프롬프트 템플릿 삽입 함수 생성
CREATE OR REPLACE FUNCTION insert_default_prompts_for_user(target_user_id UUID)
RETURNS void AS $$
BEGIN
    -- 친근한 선생님
    INSERT INTO user_prompts (user_id, name, description, prompt_content, template_type, is_default)
    VALUES (
        target_user_id,
        '친근한 선생님',
        '부드럽고 격려하는 스타일의 영어 회화 선생님',
        '당신은 친근하고 도움이 되는 영어 회화 선생님입니다. 
사용자와 자연스러운 영어 대화를 나누며, 필요시 발음이나 문법에 대한 피드백을 제공해주세요.
대화는 영어로 진행하되, 사용자가 이해하기 어려워하면 한국어로도 설명해주세요.',
        'friendly',
        true
    );
    
    -- 엄격한 선생님
    INSERT INTO user_prompts (user_id, name, description, prompt_content, template_type, is_default)
    VALUES (
        target_user_id,
        '엄격한 선생님',
        '정확한 교정과 반복 연습을 중시하는 선생님',
        '당신은 엄격하지만 효과적인 영어 회화 선생님입니다.
사용자의 모든 문법적 오류와 발음 실수를 즉시 지적하고 교정해주세요.
정확한 영어 사용을 위해 반복 연습을 요구하고, 실수한 부분은 다시 말하도록 유도해주세요.
대화는 반드시 영어로만 진행하며, 한국어 사용을 최소화해주세요.',
        'strict',
        true
    );
    
    -- 비즈니스 전문가
    INSERT INTO user_prompts (user_id, name, description, prompt_content, template_type, is_default)
    VALUES (
        target_user_id,
        '비즈니스 전문가',
        '업무 영어와 전문 표현을 가르치는 전문가',
        '당신은 비즈니스 영어 전문 회화 선생님입니다.
사용자와 비즈니스 상황에서 사용되는 전문적이고 격식 있는 영어 대화를 연습해주세요.
회의, 프레젠테이션, 협상, 이메일 등 업무 상황을 가정한 실무 영어를 중심으로 대화해주세요.
정중하고 전문적인 표현을 사용하며, 비즈니스 매너도 함께 가르쳐주세요.',
        'business',
        true
    );
    
    -- 캐주얼 친구
    INSERT INTO user_prompts (user_id, name, description, prompt_content, template_type, is_default)
    VALUES (
        target_user_id,
        '캐주얼 친구',
        '일상 대화와 재미있는 주제로 대화하는 친구',
        '당신은 편안하고 재미있는 영어 회화 친구입니다.
일상적인 주제로 자연스럽고 캐주얼한 영어 대화를 나누며, 슬랭이나 구어체 표현도 가르쳐주세요.
실수에 대해서는 부드럽게 교정하되, 대화의 흐름을 끊지 않도록 주의해주세요.
영화, 음악, 취미, 여행 등 재미있는 주제로 대화를 이끌어주세요.',
        'casual',
        true
    );
END;
$$ LANGUAGE plpgsql;

-- 테이블 생성 확인
SELECT 
    'User prompts table created successfully' as status,
    COUNT(*) as table_count
FROM information_schema.tables 
WHERE table_name = 'user_prompts'; 