import { supabase } from '$lib/supabase';

export class UsageTracker {
    constructor() {
        this.currentConversationId = null;
        this.currentSessionId = null;
        this.sessionStartTime = null;
        this.accumulatedUsage = {
            totalInputTokens: 0,
            totalOutputTokens: 0,
            totalInputTextTokens: 0,
            totalInputAudioTokens: 0,
            totalOutputTextTokens: 0,
            totalOutputAudioTokens: 0,
            totalCachedTokens: 0,
            totalCostCents: 0
        };
    }

    // 새 대화 세션 시작
    async startConversationSession(conversationId, sessionId = null) {
        this.currentConversationId = conversationId;
        this.currentSessionId = sessionId || `session_${Date.now()}`;
        this.sessionStartTime = new Date();
        this.resetAccumulatedUsage();
        
        console.log('📊 사용량 추적 시작:', {
            conversationId: this.currentConversationId,
            sessionId: this.currentSessionId,
            startTime: this.sessionStartTime
        });
    }

    // 현재 가격 정보 조회
    async getCurrentPricing(modelName = 'gpt-4o-realtime-preview-2024-12-17') {
        try {
            const { data, error } = await supabase
                .from('pricing_config')
                .select('*')
                .eq('model_name', modelName)
                .eq('is_active', true)
                .lte('effective_from', new Date().toISOString().split('T')[0])
                .order('effective_from', { ascending: false })
                .limit(1)
                .single();

            if (error) {
                console.error('가격 정보 조회 실패:', error);
                // 기본값 반환
                return this.getDefaultPricing(modelName);
            }

            return data;
        } catch (error) {
            console.error('가격 정보 조회 중 오류:', error);
            return this.getDefaultPricing(modelName);
        }
    }

    // 기본 가격 정보
    getDefaultPricing(modelName) {
        const defaultPricing = {
            'gpt-4o-realtime-preview-2024-12-17': {
                input_text_price_per_1m: 500,
                input_audio_price_per_1m: 10000,
                output_text_price_per_1m: 2000,
                output_audio_price_per_1m: 20000,
                cached_input_price_per_1m: 250
            },
            'gpt-4o-mini-realtime-preview-2024-12-17': {
                input_text_price_per_1m: 15,
                input_audio_price_per_1m: 1000,
                output_text_price_per_1m: 60,
                output_audio_price_per_1m: 6000,
                cached_input_price_per_1m: 75
            }
        };

        return defaultPricing[modelName] || defaultPricing['gpt-4o-realtime-preview-2024-12-17'];
    }

    // 사용량 추적 및 비용 계산
    async trackUsage(usageData, eventType = 'response.done', modelName = 'gpt-4o-realtime-preview-2024-12-17') {
        try {
            if (!this.currentConversationId) {
                console.warn('대화 세션이 시작되지 않았습니다. 사용량 추적을 건너뜁니다.');
                return;
            }

            // 사용량 데이터 파싱
            const usage = this.parseUsageData(usageData);
            
            // 현재 가격 정보 조회
            const pricing = await this.getCurrentPricing(modelName);
            
            // 비용 계산
            const costs = this.calculateCosts(usage, pricing);
            
            // 누적 사용량 업데이트
            this.updateAccumulatedUsage(usage, costs);
            
            // 데이터베이스에 기록
            await this.saveUsageRecord(usage, costs, eventType, modelName, usageData);
            
            // 일별 요약 업데이트
            await this.updateDailySummary(usage, costs);
            
            console.log('📊 사용량 추적 완료:', {
                eventType,
                tokens: usage,
                costs: costs,
                accumulated: this.accumulatedUsage
            });

            return {
                usage,
                costs,
                accumulated: { ...this.accumulatedUsage }
            };

        } catch (error) {
            console.error('사용량 추적 중 오류:', error);
            throw error;
        }
    }

    // 사용량 데이터 파싱
    parseUsageData(usageData) {
        const usage = usageData?.usage || usageData;
        
        return {
            totalTokens: usage?.total_tokens || 0,
            inputTokens: usage?.input_tokens || 0,
            outputTokens: usage?.output_tokens || 0,
            inputTextTokens: usage?.input_token_details?.text_tokens || 0,
            inputAudioTokens: usage?.input_token_details?.audio_tokens || 0,
            inputCachedTokens: usage?.input_token_details?.cached_tokens || 0,
            outputTextTokens: usage?.output_token_details?.text_tokens || 0,
            outputAudioTokens: usage?.output_token_details?.audio_tokens || 0,
            cachedTextTokens: usage?.input_token_details?.cached_tokens_details?.text_tokens || 0,
            cachedAudioTokens: usage?.input_token_details?.cached_tokens_details?.audio_tokens || 0
        };
    }

    // 비용 계산
    calculateCosts(usage, pricing) {
        const inputTextCost = Math.round(usage.inputTextTokens * pricing.input_text_price_per_1m / 1000000);
        const inputAudioCost = Math.round(usage.inputAudioTokens * pricing.input_audio_price_per_1m / 1000000);
        const outputTextCost = Math.round(usage.outputTextTokens * pricing.output_text_price_per_1m / 1000000);
        const outputAudioCost = Math.round(usage.outputAudioTokens * pricing.output_audio_price_per_1m / 1000000);
        const cachedCost = Math.round(usage.inputCachedTokens * pricing.cached_input_price_per_1m / 1000000);
        
        const inputCost = inputTextCost + inputAudioCost;
        const outputCost = outputTextCost + outputAudioCost;
        const totalCost = inputCost + outputCost + cachedCost;

        return {
            inputCostCents: inputCost,
            outputCostCents: outputCost,
            cachedCostCents: cachedCost,
            totalCostCents: totalCost,
            breakdown: {
                inputTextCost,
                inputAudioCost,
                outputTextCost,
                outputAudioCost,
                cachedCost
            }
        };
    }

    // 누적 사용량 업데이트
    updateAccumulatedUsage(usage, costs) {
        this.accumulatedUsage.totalInputTokens += usage.inputTokens;
        this.accumulatedUsage.totalOutputTokens += usage.outputTokens;
        this.accumulatedUsage.totalInputTextTokens += usage.inputTextTokens;
        this.accumulatedUsage.totalInputAudioTokens += usage.inputAudioTokens;
        this.accumulatedUsage.totalOutputTextTokens += usage.outputTextTokens;
        this.accumulatedUsage.totalOutputAudioTokens += usage.outputAudioTokens;
        this.accumulatedUsage.totalCachedTokens += usage.inputCachedTokens;
        this.accumulatedUsage.totalCostCents += costs.totalCostCents;
    }

    // 데이터베이스에 사용량 기록 저장
    async saveUsageRecord(usage, costs, eventType, modelName, rawData) {
        try {
            const { data: userData } = await supabase.auth.getUser();
            if (!userData.user) {
                console.warn('사용자 인증 정보가 없습니다.');
                return;
            }

            const { error } = await supabase
                .from('api_usage_records')
                .insert({
                    user_id: userData.user.id,
                    conversation_id: this.currentConversationId,
                    session_id: this.currentSessionId,
                    event_type: eventType,
                    total_tokens: usage.totalTokens,
                    input_tokens: usage.inputTokens,
                    output_tokens: usage.outputTokens,
                    input_text_tokens: usage.inputTextTokens,
                    input_audio_tokens: usage.inputAudioTokens,
                    input_cached_tokens: usage.inputCachedTokens,
                    output_text_tokens: usage.outputTextTokens,
                    output_audio_tokens: usage.outputAudioTokens,
                    cached_text_tokens: usage.cachedTextTokens,
                    cached_audio_tokens: usage.cachedAudioTokens,
                    input_cost_cents: costs.inputCostCents,
                    output_cost_cents: costs.outputCostCents,
                    cached_cost_cents: costs.cachedCostCents,
                    total_cost_cents: costs.totalCostCents,
                    model_name: modelName,
                    raw_usage_data: rawData
                });

            if (error) {
                console.error('사용량 기록 저장 실패:', error);
            }
        } catch (error) {
            console.error('사용량 기록 저장 중 오류:', error);
        }
    }

    // 일별 요약 업데이트
    async updateDailySummary(usage, costs) {
        try {
            const { data: userData } = await supabase.auth.getUser();
            if (!userData.user) return;

            const today = new Date().toISOString().split('T')[0];
            
            // 기존 요약 조회
            const { data: existingSummary } = await supabase
                .from('daily_usage_summary')
                .select('*')
                .eq('user_id', userData.user.id)
                .eq('usage_date', today)
                .single();

            if (existingSummary) {
                // 기존 데이터 업데이트
                const { error } = await supabase
                    .from('daily_usage_summary')
                    .update({
                        total_input_tokens: existingSummary.total_input_tokens + usage.inputTokens,
                        total_output_tokens: existingSummary.total_output_tokens + usage.outputTokens,
                        total_cached_tokens: existingSummary.total_cached_tokens + usage.inputCachedTokens,
                        total_input_text_tokens: existingSummary.total_input_text_tokens + usage.inputTextTokens,
                        total_input_audio_tokens: existingSummary.total_input_audio_tokens + usage.inputAudioTokens,
                        total_output_text_tokens: existingSummary.total_output_text_tokens + usage.outputTextTokens,
                        total_output_audio_tokens: existingSummary.total_output_audio_tokens + usage.outputAudioTokens,
                        total_cost_cents: existingSummary.total_cost_cents + costs.totalCostCents,
                        total_api_calls: existingSummary.total_api_calls + 1
                    })
                    .eq('id', existingSummary.id);

                if (error) {
                    console.error('일별 요약 업데이트 실패:', error);
                }
            } else {
                // 새 요약 생성
                const { error } = await supabase
                    .from('daily_usage_summary')
                    .insert({
                        user_id: userData.user.id,
                        usage_date: today,
                        total_input_tokens: usage.inputTokens,
                        total_output_tokens: usage.outputTokens,
                        total_cached_tokens: usage.inputCachedTokens,
                        total_input_text_tokens: usage.inputTextTokens,
                        total_input_audio_tokens: usage.inputAudioTokens,
                        total_output_text_tokens: usage.outputTextTokens,
                        total_output_audio_tokens: usage.outputAudioTokens,
                        total_cost_cents: costs.totalCostCents,
                        total_conversations: 1,
                        total_api_calls: 1
                    });

                if (error) {
                    console.error('일별 요약 생성 실패:', error);
                }
            }
        } catch (error) {
            console.error('일별 요약 처리 중 오류:', error);
        }
    }

    // 대화 종료 및 최종 통계 업데이트
    async endConversationSession() {
        if (!this.currentConversationId || !this.sessionStartTime) {
            return;
        }

        try {
            const endTime = new Date();
            const durationMinutes = Math.round((endTime - this.sessionStartTime) / 60000);

            // 대화 기록 업데이트 (지속시간 및 종료 시간)
            const { error: updateError } = await supabase
                .from('conversation_records')
                .update({
                    ended_at: endTime.toISOString(),
                    duration_minutes: durationMinutes
                })
                .eq('id', this.currentConversationId);

            if (updateError) {
                console.error('대화 기록 업데이트 실패:', updateError);
            }

            // 일별 요약의 평균 대화 시간 업데이트
            await this.updateAverageConversationDuration(durationMinutes);

            console.log('📊 대화 세션 종료:', {
                conversationId: this.currentConversationId,
                duration: durationMinutes,
                totalUsage: this.accumulatedUsage
            });

            // 세션 정보 초기화
            this.resetSession();

        } catch (error) {
            console.error('대화 세션 종료 처리 중 오류:', error);
        }
    }

    // 평균 대화 시간 업데이트
    async updateAverageConversationDuration(durationMinutes) {
        try {
            const { data: userData } = await supabase.auth.getUser();
            if (!userData.user) return;

            const today = new Date().toISOString().split('T')[0];
            
            const { data: summary } = await supabase
                .from('daily_usage_summary')
                .select('*')
                .eq('user_id', userData.user.id)
                .eq('usage_date', today)
                .single();

            if (summary) {
                const newAverageDuration = 
                    (summary.average_conversation_duration_minutes * (summary.total_conversations - 1) + durationMinutes) 
                    / summary.total_conversations;

                await supabase
                    .from('daily_usage_summary')
                    .update({
                        average_conversation_duration_minutes: Math.round(newAverageDuration * 100) / 100,
                        total_usage_time_minutes: summary.total_usage_time_minutes + durationMinutes
                    })
                    .eq('id', summary.id);
            }
        } catch (error) {
            console.error('평균 대화 시간 업데이트 실패:', error);
        }
    }

    // 세션 초기화
    resetSession() {
        this.currentConversationId = null;
        this.currentSessionId = null;
        this.sessionStartTime = null;
        this.resetAccumulatedUsage();
    }

    // 누적 사용량 초기화
    resetAccumulatedUsage() {
        this.accumulatedUsage = {
            totalInputTokens: 0,
            totalOutputTokens: 0,
            totalInputTextTokens: 0,
            totalInputAudioTokens: 0,
            totalOutputTextTokens: 0,
            totalOutputAudioTokens: 0,
            totalCachedTokens: 0,
            totalCostCents: 0
        };
    }

    // 현재 세션 사용량 조회
    getCurrentSessionUsage() {
        return {
            ...this.accumulatedUsage,
            conversationId: this.currentConversationId,
            sessionId: this.currentSessionId,
            startTime: this.sessionStartTime,
            duration: this.sessionStartTime ? Math.round((new Date() - this.sessionStartTime) / 60000) : 0
        };
    }

    // 비용을 달러로 변환
    static centsToUSD(cents) {
        return (cents / 100).toFixed(4);
    }

    // 토큰을 천 단위로 포맷
    static formatTokenCount(tokens) {
        if (tokens >= 1000000) {
            return `${(tokens / 1000000).toFixed(2)}M`;
        } else if (tokens >= 1000) {
            return `${(tokens / 1000).toFixed(1)}K`;
        }
        return tokens.toString();
    }
} 