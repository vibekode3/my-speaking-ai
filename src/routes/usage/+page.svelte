<!-- src/routes/usage/+page.svelte -->
<script>
    import { onMount } from 'svelte';
    import { supabase } from '$lib/supabase';
    import { user } from '$lib/stores/auth.js';
    import { goto } from '$app/navigation';
    import { UsageTracker } from '$lib/utils/usageTracker.js';

    let loading = true;
    let currentView = 'summary'; // summary, detailed, conversations
    let selectedPeriod = 30; // days
    let usageData = null;
    let error = null;

    // 필터 옵션
    const periodOptions = [
        { value: 7, label: '최근 7일' },
        { value: 30, label: '최근 30일' },
        { value: 90, label: '최근 90일' }
    ];

    const viewOptions = [
        { value: 'summary', label: '요약', icon: '📊' },
        { value: 'detailed', label: '상세', icon: '📋' },
        { value: 'conversations', label: '대화별', icon: '💬' }
    ];

    // 1분 대화 예상 비용 정보
    const costEstimates = {
        gpt4o: {
            audioInput: {
                tokens: 150,
                cost: 0.015 // $0.015 (약 20원)
            },
            audioOutput: {
                tokens: 200,
                cost: 0.04 // $0.04 (약 54원)
            },
            totalCost: 0.055 // $0.055 (약 74원)
        },
        gpt4oMini: {
            audioInput: {
                tokens: 150,
                cost: 0.0015 // $0.0015 (약 2원)
            },
            audioOutput: {
                tokens: 200,
                cost: 0.012 // $0.012 (약 16원)
            },
            totalCost: 0.0135 // $0.0135 (약 18원)
        }
    };

    // 인증 확인
    onMount(async () => {
        if (!$user) {
            goto('/login');
            return;
        }
        await loadUsageData();
    });

    // 사용량 데이터 로드
    async function loadUsageData() {
        try {
            loading = true;
            error = null;
            
            // 1. 세션 확인 
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            
            // 세션 오류 또는 세션이 없는 경우
            if (sessionError || !session || !session.access_token) {
                console.error('세션 오류:', sessionError || '세션이 없습니다');
                error = '로그인이 필요합니다';
                goto('/login?redirect=/usage');
                return;
            }
            
            // 사용자 ID 확인
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                error = '사용자 정보를 찾을 수 없습니다';
                goto('/login?redirect=/usage');
                return;
            }
            
            console.log(`사용량 데이터 로드 시작: 사용자=${user.id}, 뷰=${currentView}, 기간=${selectedPeriod}일`);
            
            // 날짜 범위 계산
            const endDate = new Date();
            const startDate = new Date(endDate);
            startDate.setDate(endDate.getDate() - selectedPeriod);
            
            let result;
            
            // 데이터 직접 쿼리 - API 대신 supabase 인스턴스 사용
            switch (currentView) {
                case 'summary':
                    // 일별 요약 데이터 조회
                    const { data: summaryData, error: summaryError } = await supabase
                        .from('daily_usage_summary')
                        .select('*')
                        .eq('user_id', user.id)
                        .gte('usage_date', startDate.toISOString().split('T')[0])
                        .lte('usage_date', endDate.toISOString().split('T')[0])
                        .order('usage_date', { ascending: false });
                    
                    if (summaryError) {
                        throw new Error(`일별 요약 조회 오류: ${summaryError.message}`);
                    }
                    
                    // 총합 계산
                    const totals = summaryData.reduce((acc, day) => ({
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
                    
                    result = {
                        dailySummaries: summaryData,
                        totals: {
                            ...totals,
                            totalCostUSD: (totals.totalCostCents / 100).toFixed(4),
                            averageCostPerConversation: (averageCostPerConversation / 100).toFixed(4),
                            averageConversationDuration: Math.round(averageConversationDuration * 100) / 100
                        },
                        period: {
                            startDate: startDate.toISOString().split('T')[0],
                            endDate: endDate.toISOString().split('T')[0],
                            days: summaryData.length
                        }
                    };
                    break;
                
                case 'detailed':
                    // 상세 사용량 데이터 조회
                    const { data: detailedData, error: detailedError } = await supabase
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
                        .eq('user_id', user.id)
                        .gte('created_at', startDate.toISOString())
                        .lte('created_at', endDate.toISOString())
                        .order('created_at', { ascending: false })
                        .limit(1000);
                    
                    if (detailedError) {
                        throw new Error(`상세 사용량 조회 오류: ${detailedError.message}`);
                    }
                    
                    // 모델별 통계 계산
                    const modelStats = detailedData.reduce((acc, record) => {
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
                    
                    result = {
                        records: detailedData,
                        modelStats,
                        totalRecords: detailedData.length
                    };
                    break;
                
                case 'conversations':
                    // 대화별 사용량 데이터 조회
                    const { data: conversationsData, error: conversationsError } = await supabase
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
                        .eq('user_id', user.id)
                        .gte('started_at', startDate.toISOString())
                        .lte('started_at', endDate.toISOString())
                        .order('started_at', { ascending: false });
                    
                    if (conversationsError) {
                        throw new Error(`대화별 사용량 조회 오류: ${conversationsError.message}`);
                    }
                    
                    // 각 대화별 통계 계산
                    const conversationsWithStats = conversationsData.map(conversation => {
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
                    
                    result = {
                        conversations: conversationsWithStats,
                        totalConversations: conversationsWithStats.length
                    };
                    break;
                
                default:
                    throw new Error(`알 수 없는 뷰 타입: ${currentView}`);
            }
            
            usageData = result;
            console.log(`사용량 데이터 로드 완료: ${currentView} 뷰`);
            
        } catch (err) {
            console.error('사용량 데이터 로드 오류:', err);
            error = err.message;
        } finally {
            loading = false;
        }
    }

    // 뷰 변경
    async function changeView(view) {
        if (view !== currentView) {
            currentView = view;
            await loadUsageData();
        }
    }

    // 기간 변경
    async function changePeriod(period) {
        if (period !== selectedPeriod) {
            selectedPeriod = period;
            await loadUsageData();
        }
    }

    // 비용 포맷팅
    function formatCost(cents) {
        return `$${(cents / 100).toFixed(4)}`;
    }

    // 토큰 수 포맷팅
    function formatTokens(tokens) {
        return UsageTracker.formatTokenCount(tokens);
    }

    // 날짜 포맷팅
    function formatDate(dateStr) {
        return new Date(dateStr).toLocaleDateString('ko-KR');
    }

    // 시간 포맷팅
    function formatDuration(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        if (hours > 0) {
            return `${hours}시간 ${mins}분`;
        }
        return `${mins}분`;
    }
</script>

<svelte:head>
    <title>API 사용량 관리 - AI 영어회화</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 py-8">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <!-- 헤더 -->
        <div class="mb-8">
            <h1 class="text-3xl font-bold text-gray-900 mb-2">API 사용량 관리</h1>
            <p class="text-gray-600">OpenAI API 사용량과 비용을 확인하고 관리하세요.</p>
        </div>

        <!-- 컨트롤 패널 -->
        <div class="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <!-- 뷰 선택 -->
                <div class="flex space-x-1 bg-gray-100 rounded-lg p-1">
                    {#each viewOptions as option}
                        <button
                            class="px-4 py-2 rounded-md text-sm font-medium transition-colors {
                                currentView === option.value 
                                    ? 'bg-white text-blue-700 shadow-sm' 
                                    : 'text-gray-500 hover:text-gray-700'
                            }"
                            on:click={() => changeView(option.value)}
                        >
                            <span class="mr-2">{option.icon}</span>
                            {option.label}
                        </button>
                    {/each}
                </div>

                <!-- 기간 선택 -->
                <div class="flex items-center space-x-4">
                    <label class="text-sm font-medium text-gray-700">기간:</label>
                    <select 
                        bind:value={selectedPeriod}
                        on:change={() => changePeriod(selectedPeriod)}
                        class="rounded-md border-gray-300 text-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                        {#each periodOptions as option}
                            <option value={option.value}>{option.label}</option>
                        {/each}
                    </select>
                    <button
                        on:click={loadUsageData}
                        class="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                        disabled={loading}
                    >
                        {loading ? '로딩...' : '새로고침'}
                    </button>
                </div>
            </div>
        </div>

        <!-- 비용 추정 섹션 -->
        <div class="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h2 class="text-lg font-medium text-gray-900 mb-4">대화 비용 추정</h2>
            <p class="text-sm text-gray-600 mb-4">일반적인 대화 기준 1분당 예상 비용입니다. 실제 비용은 대화의 길이, 복잡성, 말하는 속도에 따라 달라질 수 있습니다.</p>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- GPT-4o 비용 -->
                <div class="border rounded-lg p-4 bg-blue-50">
                    <div class="flex items-center mb-3">
                        <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                            <span class="text-xl">🧠</span>
                        </div>
                        <h3 class="text-lg font-medium text-gray-900">GPT-4o 모델</h3>
                    </div>
                    
                    <div class="space-y-2 mb-4">
                        <div class="flex justify-between">
                            <span class="text-sm text-gray-600">음성 입력 (약 {costEstimates.gpt4o.audioInput.tokens}토큰):</span>
                            <span class="text-sm font-medium">${costEstimates.gpt4o.audioInput.cost.toFixed(4)} (약 {Math.round(costEstimates.gpt4o.audioInput.cost * 1350)}원)</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-sm text-gray-600">음성 출력 (약 {costEstimates.gpt4o.audioOutput.tokens}토큰):</span>
                            <span class="text-sm font-medium">${costEstimates.gpt4o.audioOutput.cost.toFixed(4)} (약 {Math.round(costEstimates.gpt4o.audioOutput.cost * 1350)}원)</span>
                        </div>
                        <div class="h-px bg-gray-200 my-2"></div>
                        <div class="flex justify-between">
                            <span class="text-sm font-medium">1분당 총 예상 비용:</span>
                            <span class="text-sm font-bold text-blue-800">${costEstimates.gpt4o.totalCost.toFixed(4)} (약 {Math.round(costEstimates.gpt4o.totalCost * 1350)}원)</span>
                        </div>
                    </div>
                    
                    <div class="text-xs text-gray-500">
                        * 가격: 텍스트 입력 $5/1M토큰, 음성 입력 $100/1M토큰, 텍스트 출력 $20/1M토큰, 음성 출력 $200/1M토큰
                    </div>
                </div>
                
                <!-- GPT-4o-mini 비용 -->
                <div class="border rounded-lg p-4 bg-green-50">
                    <div class="flex items-center mb-3">
                        <div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                            <span class="text-xl">🤖</span>
                        </div>
                        <h3 class="text-lg font-medium text-gray-900">GPT-4o-mini 모델</h3>
                    </div>
                    
                    <div class="space-y-2 mb-4">
                        <div class="flex justify-between">
                            <span class="text-sm text-gray-600">음성 입력 (약 {costEstimates.gpt4oMini.audioInput.tokens}토큰):</span>
                            <span class="text-sm font-medium">${costEstimates.gpt4oMini.audioInput.cost.toFixed(4)} (약 {Math.round(costEstimates.gpt4oMini.audioInput.cost * 1350)}원)</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-sm text-gray-600">음성 출력 (약 {costEstimates.gpt4oMini.audioOutput.tokens}토큰):</span>
                            <span class="text-sm font-medium">${costEstimates.gpt4oMini.audioOutput.cost.toFixed(4)} (약 {Math.round(costEstimates.gpt4oMini.audioOutput.cost * 1350)}원)</span>
                        </div>
                        <div class="h-px bg-gray-200 my-2"></div>
                        <div class="flex justify-between">
                            <span class="text-sm font-medium">1분당 총 예상 비용:</span>
                            <span class="text-sm font-bold text-green-800">${costEstimates.gpt4oMini.totalCost.toFixed(4)} (약 {Math.round(costEstimates.gpt4oMini.totalCost * 1350)}원)</span>
                        </div>
                    </div>
                    
                    <div class="text-xs text-gray-500">
                        * 가격: 텍스트 입력 $0.15/1M토큰, 음성 입력 $10/1M토큰, 텍스트 출력 $0.60/1M토큰, 음성 출력 $60/1M토큰
                    </div>
                </div>
            </div>
            
            <div class="mt-4 text-sm text-gray-500 bg-yellow-50 p-3 rounded-md">
                <p class="font-medium text-yellow-800">💡 비용 절감 팁</p>
                <ul class="list-disc pl-5 mt-1 space-y-1">
                    <li>가격이 저렴한 GPT-4o-mini 모델을 사용하면 약 75-80% 비용 절감 가능</li>
                    <li>중요하지 않은 대화는 짧게 유지하여 토큰 사용량 줄이기</li>
                    <li>동일한 주제에 대해 새 대화를 시작하는 것보다 기존 대화를 계속 이어가는 것이 더 효율적</li>
                </ul>
            </div>
        </div>

        <!-- 에러 메시지 -->
        {#if error}
            <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div class="flex">
                    <div class="ml-3">
                        <h3 class="text-sm font-medium text-red-800">오류가 발생했습니다</h3>
                        <p class="mt-1 text-sm text-red-700">{error}</p>
                    </div>
                </div>
            </div>
        {/if}

        <!-- 로딩 상태 -->
        {#if loading}
            <div class="flex justify-center items-center py-12">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span class="ml-3 text-gray-600">데이터를 불러오는 중...</span>
            </div>
        {:else if usageData}
            <!-- 요약 뷰 -->
            {#if currentView === 'summary'}
                <!-- 총 사용량 카드 -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div class="bg-white rounded-lg shadow-sm border p-6">
                        <div class="flex items-center">
                            <div class="flex-shrink-0">
                                <div class="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                                    💰
                                </div>
                            </div>
                            <div class="ml-4">
                                <p class="text-sm font-medium text-gray-500">총 비용</p>
                                <p class="text-2xl font-bold text-gray-900">{usageData.totals.totalCostUSD}</p>
                            </div>
                        </div>
                    </div>

                    <div class="bg-white rounded-lg shadow-sm border p-6">
                        <div class="flex items-center">
                            <div class="flex-shrink-0">
                                <div class="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                                    🔤
                                </div>
                            </div>
                            <div class="ml-4">
                                <p class="text-sm font-medium text-gray-500">총 토큰</p>
                                <p class="text-2xl font-bold text-gray-900">
                                    {formatTokens(usageData.totals.totalInputTokens + usageData.totals.totalOutputTokens)}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div class="bg-white rounded-lg shadow-sm border p-6">
                        <div class="flex items-center">
                            <div class="flex-shrink-0">
                                <div class="w-8 h-8 bg-purple-100 rounded-md flex items-center justify-center">
                                    💬
                                </div>
                            </div>
                            <div class="ml-4">
                                <p class="text-sm font-medium text-gray-500">총 대화</p>
                                <p class="text-2xl font-bold text-gray-900">{usageData.totals.totalConversations}</p>
                            </div>
                        </div>
                    </div>

                    <div class="bg-white rounded-lg shadow-sm border p-6">
                        <div class="flex items-center">
                            <div class="flex-shrink-0">
                                <div class="w-8 h-8 bg-orange-100 rounded-md flex items-center justify-center">
                                    ⏱️
                                </div>
                            </div>
                            <div class="ml-4">
                                <p class="text-sm font-medium text-gray-500">총 시간</p>
                                <p class="text-2xl font-bold text-gray-900">
                                    {formatDuration(usageData.totals.totalUsageTimeMinutes)}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 일별 사용량 표 -->
                <div class="bg-white rounded-lg shadow-sm border overflow-hidden">
                    <div class="px-6 py-4 border-b border-gray-200">
                        <h2 class="text-lg font-medium text-gray-900">일별 사용량</h2>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">날짜</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">비용</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">토큰</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">대화 수</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">사용 시간</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">평균 대화시간</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                                {#each usageData.dailySummaries as day}
                                    <tr class="hover:bg-gray-50">
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {formatDate(day.usage_date)}
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {formatCost(day.total_cost_cents)}
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {formatTokens(day.total_input_tokens + day.total_output_tokens)}
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {day.total_conversations}
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {formatDuration(day.total_usage_time_minutes)}
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {formatDuration(day.average_conversation_duration_minutes)}
                                        </td>
                                    </tr>
                                {/each}
                            </tbody>
                        </table>
                    </div>
                </div>

            <!-- 상세 뷰 -->
            {:else if currentView === 'detailed'}
                <!-- 모델별 통계 -->
                <div class="bg-white rounded-lg shadow-sm border p-6 mb-6">
                    <h2 class="text-lg font-medium text-gray-900 mb-4">모델별 사용량</h2>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {#each Object.entries(usageData.modelStats) as [model, stats]}
                            <div class="bg-gray-50 rounded-lg p-4">
                                <h3 class="font-medium text-gray-900 mb-2">{model}</h3>
                                <div class="space-y-1 text-sm text-gray-600">
                                    <div>비용: {formatCost(stats.totalCost)}</div>
                                    <div>토큰: {formatTokens(stats.totalTokens)}</div>
                                    <div>API 호출: {stats.totalCalls}회</div>
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>

                <!-- 상세 기록 -->
                <div class="bg-white rounded-lg shadow-sm border overflow-hidden">
                    <div class="px-6 py-4 border-b border-gray-200">
                        <h2 class="text-lg font-medium text-gray-900">상세 사용량 기록</h2>
                        <p class="text-sm text-gray-500">총 {usageData.totalRecords}개 기록</p>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">시간</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">대화</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">모델</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">이벤트</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">토큰</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">비용</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                                {#each usageData.records as record}
                                    <tr class="hover:bg-gray-50">
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {new Date(record.created_at).toLocaleString('ko-KR')}
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {record.conversation_records?.title || 'N/A'}
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {record.model_name}
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {record.event_type}
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {formatTokens(record.total_tokens)}
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {formatCost(record.total_cost_cents)}
                                        </td>
                                    </tr>
                                {/each}
                            </tbody>
                        </table>
                    </div>
                </div>

            <!-- 대화별 뷰 -->
            {:else if currentView === 'conversations'}
                <div class="bg-white rounded-lg shadow-sm border overflow-hidden">
                    <div class="px-6 py-4 border-b border-gray-200">
                        <h2 class="text-lg font-medium text-gray-900">대화별 사용량</h2>
                        <p class="text-sm text-gray-500">총 {usageData.totalConversations}개 대화</p>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">제목</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">시작 시간</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">지속 시간</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">토큰</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">비용</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">분당 비용</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">API 호출</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                                {#each usageData.conversations as conversation}
                                    <tr class="hover:bg-gray-50">
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {conversation.title}
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {new Date(conversation.started_at).toLocaleString('ko-KR')}
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {formatDuration(conversation.duration_minutes || 0)}
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {formatTokens(conversation.usage_stats.totalTokens)}
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            ${conversation.usage_stats.totalCostUSD}
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            ${conversation.usage_stats.costPerMinute}/분
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {conversation.usage_stats.apiCalls}회
                                        </td>
                                    </tr>
                                {/each}
                            </tbody>
                        </table>
                    </div>
                </div>
            {/if}
        {:else}
            <div class="text-center py-12">
                <div class="text-gray-500 mb-4">📊</div>
                <p class="text-gray-600">사용량 데이터가 없습니다.</p>
                <p class="text-sm text-gray-500">AI와 대화를 시작하면 사용량이 기록됩니다.</p>
            </div>
        {/if}
    </div>
</div>