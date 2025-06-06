import { json } from '@sveltejs/kit';
import { supabase } from '$lib/supabase';

export async function GET({ url, request }) {
    try {
        // 인증 확인
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            console.error('API 요청에 인증 헤더가 없습니다.');
            return json({ 
                success: false,
                error: '인증이 필요합니다.' 
            }, { status: 401 });
        }

        // URL 파라미터 읽기
        const type = url.searchParams.get('type') || 'summary'; // summary, detailed, conversations
        const days = parseInt(url.searchParams.get('days')) || 30;
        const conversationId = url.searchParams.get('conversation_id');

        console.log(`사용량 API 요청: type=${type}, days=${days}${conversationId ? `, conversationId=${conversationId}` : ''}`);

        // Supabase 클라이언트에 인증 토큰 설정
        try {
            const token = authHeader.replace('Bearer ', '');
            
            // 세션 설정
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
                access_token: token,
                refresh_token: '' // refresh_token 없이도 작동하도록
            });

            if (sessionError) {
                console.error('세션 설정 오류:', sessionError);
                return json({ 
                    success: false,
                    error: '인증 토큰이 유효하지 않습니다.',
                    details: sessionError.message
                }, { status: 401 });
            }
            
            // 세션 설정 성공, 사용자 정보 확인
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            
            if (userError || !user) {
                console.error('사용자 정보 조회 오류:', userError);
                return json({ 
                    success: false,
                    error: '유효하지 않은 인증 토큰입니다.',
                    details: userError?.message || '사용자 정보를 찾을 수 없습니다.'
                }, { status: 401 });
            }

            console.log(`인증된 사용자 ID: ${user.id}`);
            
            const endDate = new Date();
            const startDate = new Date(endDate);
            startDate.setDate(endDate.getDate() - days);

            switch (type) {
                case 'summary':
                    return await getDailySummary(user.id, startDate, endDate);
                
                case 'detailed':
                    return await getDetailedUsage(user.id, startDate, endDate);
                
                case 'conversations':
                    return await getConversationUsage(user.id, startDate, endDate, conversationId);
                
                default:
                    return json({ 
                        success: false,
                        error: '잘못된 타입입니다.' 
                    }, { status: 400 });
            }
        } catch (authError) {
            console.error('인증 처리 중 오류:', authError);
            return json({ 
                success: false,
                error: '인증 처리 중 오류가 발생했습니다.',
                details: authError.message
            }, { status: 401 });
        }
    } catch (error) {
        console.error('사용량 조회 오류:', error);
        return json({ 
            success: false,
            error: '서버 오류가 발생했습니다.',
            details: error.message 
        }, { status: 500 });
    }
}

// 일별 요약 데이터 조회
async function getDailySummary(userId, startDate, endDate) {
    try {
        console.log(`일별 요약 조회: userId=${userId}, 기간=${startDate.toISOString().split('T')[0]} ~ ${endDate.toISOString().split('T')[0]}`);
        
        const { data, error } = await supabase
            .from('daily_usage_summary')
            .select('*')
            .eq('user_id', userId)
            .gte('usage_date', startDate.toISOString().split('T')[0])
            .lte('usage_date', endDate.toISOString().split('T')[0])
            .order('usage_date', { ascending: false });

        if (error) {
            console.error('일별 요약 조회 오류:', error);
            throw error;
        }

        console.log(`일별 요약 조회 결과: ${data.length}개 항목 조회됨`);

        // 총합 계산
        const totals = data.reduce((acc, day) => ({
            totalCostCents: acc.totalCostCents + (day.total_cost_cents || 0),
            totalInputTokens: acc.totalInputTokens + (day.total_input_tokens || 0),
            totalOutputTokens: acc.totalOutputTokens + (day.total_output_tokens || 0),
            totalCachedTokens: acc.totalCachedTokens + (day.total_cached_tokens || 0),
            totalConversations: acc.totalConversations + (day.total_conversations || 0),
            totalApiCalls: acc.totalApiCalls + (day.total_api_calls || 0),
            totalUsageTimeMinutes: acc.totalUsageTimeMinutes + (day.total_usage_time_minutes || 0)
        }), {
            totalCostCents: 0,
            totalInputTokens: 0,
            totalOutputTokens: 0,
            totalCachedTokens: 0,
            totalConversations: 0,
            totalApiCalls: 0,
            totalUsageTimeMinutes: 0
        });

        // 평균 계산
        const averageCostPerConversation = totals.totalConversations > 0 
            ? totals.totalCostCents / totals.totalConversations 
            : 0;
        
        const averageConversationDuration = totals.totalConversations > 0 
            ? totals.totalUsageTimeMinutes / totals.totalConversations 
            : 0;

        return json({
            success: true,
            data: {
                dailySummaries: data,
                totals: {
                    ...totals,
                    totalCostUSD: (totals.totalCostCents / 100).toFixed(4),
                    averageCostPerConversation: (averageCostPerConversation / 100).toFixed(4),
                    averageConversationDuration: Math.round(averageConversationDuration * 100) / 100
                },
                period: {
                    startDate: startDate.toISOString().split('T')[0],
                    endDate: endDate.toISOString().split('T')[0],
                    days: data.length
                }
            }
        });

    } catch (error) {
        console.error('일별 요약 처리 중 오류:', error);
        return json({ 
            success: false, 
            error: '일별 요약을 불러오는 중 오류가 발생했습니다.',
            details: error.message
        }, { status: 500 });
    }
}

// 상세 사용량 데이터 조회
async function getDetailedUsage(userId, startDate, endDate) {
    try {
        console.log(`상세 사용량 조회: userId=${userId}, 기간=${startDate.toISOString()} ~ ${endDate.toISOString()}`);
        
        const { data, error } = await supabase
            .from('api_usage_records')
            .select(`
                *,
                conversation_records (
                    title,
                    started_at,
                    ended_at,
                    duration_minutes
                )
            `)
            .eq('user_id', userId)
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString())
            .order('created_at', { ascending: false })
            .limit(1000); // 최대 1000개 제한

        if (error) {
            console.error('상세 사용량 조회 오류:', error);
            throw error;
        }

        console.log(`상세 사용량 조회 결과: ${data.length}개 항목 조회됨`);

        // 모델별 통계 계산
        const modelStats = data.reduce((acc, record) => {
            const model = record.model_name || 'unknown';
            if (!acc[model]) {
                acc[model] = {
                    totalCost: 0,
                    totalTokens: 0,
                    totalCalls: 0,
                    inputTokens: 0,
                    outputTokens: 0
                };
            }
            acc[model].totalCost += record.total_cost_cents || 0;
            acc[model].totalTokens += record.total_tokens || 0;
            acc[model].totalCalls += 1;
            acc[model].inputTokens += record.input_tokens || 0;
            acc[model].outputTokens += record.output_tokens || 0;
            return acc;
        }, {});

        return json({
            success: true,
            data: {
                records: data,
                modelStats,
                totalRecords: data.length
            }
        });

    } catch (error) {
        console.error('상세 사용량 처리 중 오류:', error);
        return json({ 
            success: false, 
            error: '상세 사용량을 불러오는 중 오류가 발생했습니다.',
            details: error.message
        }, { status: 500 });
    }
}

// 대화별 사용량 데이터 조회
async function getConversationUsage(userId, startDate, endDate, conversationId = null) {
    try {
        console.log(`대화별 사용량 조회: userId=${userId}, 기간=${startDate.toISOString()} ~ ${endDate.toISOString()}${conversationId ? `, conversationId=${conversationId}` : ''}`);
        
        let query = supabase
            .from('conversation_records')
            .select(`
                *,
                api_usage_records (
                    total_tokens,
                    input_tokens,
                    output_tokens,
                    total_cost_cents,
                    event_type,
                    model_name,
                    created_at
                )
            `)
            .eq('user_id', userId)
            .gte('started_at', startDate.toISOString())
            .lte('started_at', endDate.toISOString())
            .order('started_at', { ascending: false });

        if (conversationId) {
            query = query.eq('id', conversationId);
        }

        const { data, error } = await query;

        if (error) {
            console.error('대화별 사용량 조회 오류:', error);
            throw error;
        }

        console.log(`대화별 사용량 조회 결과: ${data.length}개 대화 조회됨`);

        // 각 대화별 통계 계산
        const conversationsWithStats = data.map(conversation => {
            const usage = conversation.api_usage_records || [];
            const stats = usage.reduce((acc, record) => ({
                totalCost: acc.totalCost + (record.total_cost_cents || 0),
                totalTokens: acc.totalTokens + (record.total_tokens || 0),
                inputTokens: acc.inputTokens + (record.input_tokens || 0),
                outputTokens: acc.outputTokens + (record.output_tokens || 0),
                apiCalls: acc.apiCalls + 1
            }), {
                totalCost: 0,
                totalTokens: 0,
                inputTokens: 0,
                outputTokens: 0,
                apiCalls: 0
            });

            return {
                ...conversation,
                usage_stats: {
                    ...stats,
                    totalCostUSD: (stats.totalCost / 100).toFixed(4),
                    costPerMinute: conversation.duration_minutes > 0 
                        ? ((stats.totalCost / 100) / conversation.duration_minutes).toFixed(4)
                        : '0.0000'
                }
            };
        });

        return json({
            success: true,
            data: {
                conversations: conversationsWithStats,
                totalConversations: conversationsWithStats.length
            }
        });

    } catch (error) {
        console.error('대화별 사용량 처리 중 오류:', error);
        return json({ 
            success: false, 
            error: '대화별 사용량을 불러오는 중 오류가 발생했습니다.',
            details: error.message
        }, { status: 500 });
    }
} 