-- 영어회화 기록을 저장할 테이블 생성
CREATE TABLE IF NOT EXISTS conversation_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) DEFAULT '영어회화 기록',
    messages JSONB NOT NULL DEFAULT '[]',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_conversation_records_user_id 
ON conversation_records(user_id);

CREATE INDEX IF NOT EXISTS idx_conversation_records_created_at 
ON conversation_records(created_at DESC);

-- Row Level Security (RLS) 활성화
ALTER TABLE conversation_records ENABLE ROW LEVEL SECURITY;

-- 사용자가 자신의 기록만 볼 수 있도록 하는 정책
CREATE POLICY "Users can view own conversation records" 
ON conversation_records FOR SELECT 
USING (auth.uid() = user_id);

-- 사용자가 자신의 기록을 생성할 수 있도록 하는 정책
CREATE POLICY "Users can insert own conversation records" 
ON conversation_records FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 사용자가 자신의 기록을 수정할 수 있도록 하는 정책
CREATE POLICY "Users can update own conversation records" 
ON conversation_records FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 사용자가 자신의 기록을 삭제할 수 있도록 하는 정책
CREATE POLICY "Users can delete own conversation records" 
ON conversation_records FOR DELETE 
USING (auth.uid() = user_id);

-- updated_at 자동 업데이트를 위한 함수 생성
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- updated_at 자동 업데이트 트리거 생성
CREATE TRIGGER update_conversation_records_updated_at 
    BEFORE UPDATE ON conversation_records 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column(); 