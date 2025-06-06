<!-- src/lib/components/VoiceConversation.svelte -->
<script>
    import { supabase } from '$lib/supabase';
    import { user } from '$lib/stores/auth.js';
    
    export let messages;
    export let conversationId = null; // 대화 ID 추가
    
    // 메시지에서 사용량 정보 직접 가져오기
    function getUsageForMessage(message) {
        // AI 응답 메시지이고 usage 정보가 있는 경우
        if (message.speaker === 'AI 선생님' && message.usage) {
            return message.usage;
        }
        return null;
    }
    
    // 모델명 표시용 포맷팅
    function getModelDisplayName(modelName) {
        if (!modelName) return 'Unknown';
        
        // 모델명 간소화
        const modelMap = {
            'gpt-4o-realtime-preview-2024-12-17': 'GPT-4o Realtime',
            'gpt-4o-realtime': 'GPT-4o Realtime',
            'gpt-4o': 'GPT-4o',
            'gpt-4o-mini': 'GPT-4o Mini',
            'gpt-3.5-turbo': 'GPT-3.5 Turbo'
        };
        
        return modelMap[modelName] || modelName;
    }
    
    // 토큰 수 포맷팅
    function formatTokens(tokens) {
        if (!tokens) return '0';
        return tokens.toLocaleString();
    }
    
    // 비용 포맷팅
    function formatCost(costCents) {
        if (!costCents) return '$0.00';
        return `$${(costCents / 100).toFixed(4)}`;
    }
    
    // 타임스탬프 포맷팅
    function formatTimestamp(timestamp) {
        if (!timestamp) return '';
        try {
            const date = new Date(timestamp);
            return date.toLocaleTimeString();
        } catch {
            return timestamp;
        }
    }
</script>

<div class="mb-6">
    <h5 class="font-medium text-gray-700 mb-3">🎤 음성 대화</h5>
    
    <div class="space-y-3 max-h-96 overflow-y-auto">
        {#each messages as message, index}
            {@const usage = getUsageForMessage(message)}
            <div class="flex gap-3">
                <div class="flex-shrink-0">
                    {#if message.speaker === '나'}
                        <div class="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                            <span class="text-white text-xs font-semibold">나</span>
                        </div>
                    {:else}
                        <div class="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                            <span class="text-white text-xs font-semibold">AI</span>
                        </div>
                    {/if}
                </div>
                <div class="flex-1">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="text-sm font-medium text-gray-700">{message.speaker}</span>
                        <span class="text-xs text-gray-500">
                            {formatTimestamp(message.timestamp)}
                        </span>
                        
                        <!-- 모델 정보 표시 (AI 응답에만) -->
                        {#if usage}
                            <span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                🤖 {getModelDisplayName(usage.model_name)}
                            </span>
                        {/if}
                    </div>
                    
                    <div class="bg-gray-50 rounded p-2">
                        <p class="text-sm text-gray-700 leading-relaxed">{message.message}</p>
                        
                        <!-- 사용량 정보 (AI 응답에만) -->
                        {#if usage}
                            <div class="mt-2 pt-2 border-t border-gray-200">
                                <div class="flex flex-wrap gap-3 text-xs text-gray-600">
                                    <div class="flex items-center gap-1">
                                        <span>📊</span>
                                        <span>입력: {formatTokens(usage.input_tokens)}</span>
                                        {#if usage.input_audio_tokens > 0}
                                            <span class="text-orange-600">(🎤 {formatTokens(usage.input_audio_tokens)})</span>
                                        {/if}
                                    </div>
                                    <div class="flex items-center gap-1">
                                        <span>📤</span>
                                        <span>출력: {formatTokens(usage.output_tokens)}</span>
                                        {#if usage.output_audio_tokens > 0}
                                            <span class="text-green-600">(🔊 {formatTokens(usage.output_audio_tokens)})</span>
                                        {/if}
                                    </div>
                                    <div class="flex items-center gap-1">
                                        <span>💰</span>
                                        <span>{formatCost(usage.total_cost_cents)}</span>
                                    </div>
                                </div>
                            </div>
                        {/if}
                    </div>
                </div>
            </div>
        {/each}
    </div>
</div> 