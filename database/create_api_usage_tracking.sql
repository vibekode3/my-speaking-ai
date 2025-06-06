-- OpenAI API 사용량과 요금 추적을 위한 테이블들

-- API 사용량 추적 테이블
CREATE TABLE IF NOT EXISTS api_usage_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversation_records(id) ON DELETE CASCADE,
    session_id VARCHAR(255), -- OpenAI session ID
    event_type VARCHAR(50) NOT NULL, -- 'response.done', 'session.created', etc.
    
    -- 토큰 사용량 정보
    total_tokens INTEGER DEFAULT 0,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    
    -- 세부 토큰 정보
    input_text_tokens INTEGER DEFAULT 0,
    input_audio_tokens INTEGER DEFAULT 0,
    input_cached_tokens INTEGER DEFAULT 0,
    output_text_tokens INTEGER DEFAULT 0,
    output_audio_tokens INTEGER DEFAULT 0,
    
    -- 캐시된 토큰 세부 정보
    cached_text_tokens INTEGER DEFAULT 0,
    cached_audio_tokens INTEGER DEFAULT 0,
    
    -- 비용 정보 (USD cents)
    input_cost_cents INTEGER DEFAULT 0,
    output_cost_cents INTEGER DEFAULT 0,
    cached_cost_cents INTEGER DEFAULT 0,
    total_cost_cents INTEGER DEFAULT 0,
    
    -- 모델 정보
    model_name VARCHAR(100) DEFAULT 'gpt-4o-realtime-preview-2024-12-17',
    
    -- 타임스탬프
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 원본 사용량 데이터 (JSON)
    raw_usage_data JSONB
);

-- 일별 사용량 요약 테이블
CREATE TABLE IF NOT EXISTS daily_usage_summary (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    usage_date DATE NOT NULL,
    
    -- 총 토큰 사용량
    total_input_tokens BIGINT DEFAULT 0,
    total_output_tokens BIGINT DEFAULT 0,
    total_cached_tokens BIGINT DEFAULT 0,
    
    -- 세부 토큰 분류
    total_input_text_tokens BIGINT DEFAULT 0,
    total_input_audio_tokens BIGINT DEFAULT 0,
    total_output_text_tokens BIGINT DEFAULT 0,
    total_output_audio_tokens BIGINT DEFAULT 0,
    
    -- 총 비용 (USD cents)
    total_cost_cents BIGINT DEFAULT 0,
    
    -- 대화 세션 수
    total_conversations INTEGER DEFAULT 0,
    total_api_calls INTEGER DEFAULT 0,
    
    -- 시간 통계
    average_conversation_duration_minutes DECIMAL(10,2) DEFAULT 0,
    total_usage_time_minutes DECIMAL(10,2) DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 중복 방지를 위한 유니크 제약
    UNIQUE(user_id, usage_date)
);

-- 실시간 가격 정보 테이블 (가격 변동 대응)
CREATE TABLE IF NOT EXISTS pricing_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    model_name VARCHAR(100) NOT NULL,
    
    -- 가격 정보 (per 1M tokens, USD cents)
    input_text_price_per_1m INTEGER NOT NULL, -- $5/1M tokens = 500 cents
    input_audio_price_per_1m INTEGER NOT NULL, -- $100/1M tokens = 10000 cents  
    output_text_price_per_1m INTEGER NOT NULL, -- $20/1M tokens = 2000 cents
    output_audio_price_per_1m INTEGER NOT NULL, -- $200/1M tokens = 20000 cents
    cached_input_price_per_1m INTEGER NOT NULL, -- $2.50/1M tokens = 250 cents
    
    -- 활성화 날짜
    effective_from DATE NOT NULL,
    effective_until DATE,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_api_usage_records_user_id ON api_usage_records(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_records_conversation_id ON api_usage_records(conversation_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_records_created_at ON api_usage_records(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_daily_usage_summary_user_date ON daily_usage_summary(user_id, usage_date DESC);
CREATE INDEX IF NOT EXISTS idx_pricing_config_model_date ON pricing_config(model_name, effective_from DESC);

-- Row Level Security 활성화
ALTER TABLE api_usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_usage_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_config ENABLE ROW LEVEL SECURITY;

-- API 사용량 기록 정책
CREATE POLICY "Users can view own api usage records" 
ON api_usage_records FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own api usage records" 
ON api_usage_records FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 일별 요약 정책
CREATE POLICY "Users can view own daily usage summary" 
ON daily_usage_summary FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily usage summary" 
ON daily_usage_summary FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily usage summary" 
ON daily_usage_summary FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 가격 정보는 모든 사용자가 읽을 수 있음
CREATE POLICY "Users can view pricing config" 
ON pricing_config FOR SELECT 
TO authenticated
USING (true);

-- 관리자만 가격 정보 수정 가능 (별도 권한 관리 필요)
CREATE POLICY "Only admins can modify pricing config" 
ON pricing_config FOR ALL
TO authenticated
USING (false); -- 기본적으로 차단, 별도 권한 시스템 필요

-- updated_at 자동 업데이트 트리거
CREATE TRIGGER update_daily_usage_summary_updated_at 
    BEFORE UPDATE ON daily_usage_summary 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 기본 가격 정보 삽입
INSERT INTO pricing_config (
    model_name, 
    input_text_price_per_1m, 
    input_audio_price_per_1m, 
    output_text_price_per_1m, 
    output_audio_price_per_1m, 
    cached_input_price_per_1m,
    effective_from
) VALUES (
    'gpt-4o-realtime-preview-2024-12-17',
    500,    -- $5.00 per 1M text input tokens
    10000,  -- $100.00 per 1M audio input tokens  
    2000,   -- $20.00 per 1M text output tokens
    20000,  -- $200.00 per 1M audio output tokens
    250,    -- $2.50 per 1M cached input tokens
    CURRENT_DATE
) ON CONFLICT DO NOTHING;

-- gpt-4o-mini-realtime 가격도 추가
INSERT INTO pricing_config (
    model_name, 
    input_text_price_per_1m, 
    input_audio_price_per_1m, 
    output_text_price_per_1m, 
    output_audio_price_per_1m, 
    cached_input_price_per_1m,
    effective_from
) VALUES (
    'gpt-4o-mini-realtime-preview-2024-12-17',
    15,     -- $0.15 per 1M text input tokens
    1000,   -- $10.00 per 1M audio input tokens  
    60,     -- $0.60 per 1M text output tokens
    6000,   -- $60.00 per 1M audio output tokens
    75,     -- $0.075 per 1M cached input tokens (50% discount)
    CURRENT_DATE
) ON CONFLICT DO NOTHING; 