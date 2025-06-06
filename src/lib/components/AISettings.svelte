<!-- src/lib/components/AISettings.svelte -->
<script>
    export let aiSettings;
    
    // 날짜 포맷팅
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
</script>

<div class="mb-6">
    <h5 class="font-medium text-gray-700 mb-3">🤖 AI 설정</h5>
    <div class="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div class="grid grid-cols-1 gap-3">
            <div class="flex justify-between items-center">
                <span class="text-sm font-medium text-gray-700">선생님 유형:</span>
                <span class="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                    {aiSettings.templateName || '기본'}
                </span>
            </div>
            {#if aiSettings.customPrompt}
                <div>
                    <span class="text-sm font-medium text-gray-700 block mb-2">커스텀 프롬프트:</span>
                    <div class="bg-white border border-purple-200 rounded p-3 max-h-32 overflow-y-auto">
                        <p class="text-sm text-gray-600 whitespace-pre-wrap">{aiSettings.customPrompt}</p>
                    </div>
                </div>
            {/if}
            {#if aiSettings.updatedAt}
                <div class="flex justify-between items-center text-xs text-gray-500">
                    <span>설정 업데이트:</span>
                    <span>{formatDate(aiSettings.updatedAt)}</span>
                </div>
            {/if}
        </div>
    </div>
</div> 