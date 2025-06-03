<!-- src/lib/components/ConversationHistory.svelte -->
<script>
    import { onMount, createEventDispatcher } from 'svelte';
    import { conversationHistory, conversationLoading, loadConversationHistory, deleteConversation, updateConversationTitle } from '../stores/conversation.js';
    
    const dispatch = createEventDispatcher();
    
    let selectedConversation = null;
    let editingTitle = null;
    let editTitleValue = '';
    
    onMount(() => {
        loadConversationHistory();
    });
    
    // 대화 선택/펼치기
    function toggleConversation(conversation) {
        if (selectedConversation?.id === conversation.id) {
            selectedConversation = null;
        } else {
            selectedConversation = conversation;
        }
    }
    
    // 대화 삭제
    async function handleDeleteConversation(conversationId, event) {
        event.stopPropagation();
        
        if (confirm('이 대화 기록을 삭제하시겠습니까?')) {
            try {
                await deleteConversation(conversationId);
            } catch (error) {
                alert('삭제 중 오류가 발생했습니다: ' + error.message);
            }
        }
    }
    
    // 제목 편집 시작
    function startEditTitle(conversation, event) {
        event.stopPropagation();
        editingTitle = conversation.id;
        editTitleValue = conversation.title;
    }
    
    // 제목 편집 저장
    async function saveTitle(conversationId) {
        if (editTitleValue.trim()) {
            try {
                await updateConversationTitle(conversationId, editTitleValue.trim());
                editingTitle = null;
            } catch (error) {
                alert('제목 수정 중 오류가 발생했습니다: ' + error.message);
            }
        }
    }
    
    // 제목 편집 취소
    function cancelEditTitle() {
        editingTitle = null;
        editTitleValue = '';
    }
    
    // 메시지 타입별 필터링
    function getConversationMessages(messages) {
        return messages.filter(msg => 
            msg.speaker === '나' || msg.speaker === 'AI 선생님'
        );
    }
    
    function getSystemMessages(messages) {
        return messages.filter(msg => msg.speaker === '시스템');
    }
    
    // 대화 시간 포맷팅
    function formatDuration(minutes) {
        if (minutes < 60) {
            return `${minutes}분`;
        }
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return `${hours}시간 ${remainingMinutes}분`;
    }
    
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

<div class="bg-white rounded-lg shadow-lg p-6">
    <div class="flex justify-between items-center mb-6">
        <h3 class="text-xl font-semibold text-gray-800">대화 기록</h3>
        <button
            on:click={loadConversationHistory}
            class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
            disabled={$conversationLoading}
        >
            {#if $conversationLoading}
                새로고침 중...
            {:else}
                새로고침
            {/if}
        </button>
    </div>
    
    {#if $conversationLoading}
        <div class="flex justify-center items-center py-12">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
    {:else if $conversationHistory.length === 0}
        <div class="text-center py-12">
            <div class="text-4xl mb-4">📚</div>
            <p class="text-gray-500 mb-4">
                아직 저장된 대화 기록이 없습니다.<br>
                AI와 대화를 시작하면 자동으로 기록됩니다.
            </p>
        </div>
    {:else}
        <div class="space-y-4">
            {#each $conversationHistory as conversation (conversation.id)}
                <div class="border border-gray-200 rounded-lg overflow-hidden">
                    <!-- 대화 헤더 -->
                    <div
                        class="p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                        on:click={() => toggleConversation(conversation)}
                    >
                        <div class="flex justify-between items-start">
                            <div class="flex-1">
                                {#if editingTitle === conversation.id}
                                    <div class="flex gap-2" on:click|stopPropagation>
                                        <input
                                            bind:value={editTitleValue}
                                            class="flex-1 px-2 py-1 border border-gray-300 rounded"
                                            on:keydown={(e) => {
                                                if (e.key === 'Enter') saveTitle(conversation.id);
                                                if (e.key === 'Escape') cancelEditTitle();
                                            }}
                                            on:blur={() => saveTitle(conversation.id)}
                                            autofocus
                                        />
                                        <button
                                            on:click={() => saveTitle(conversation.id)}
                                            class="px-2 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                                        >
                                            저장
                                        </button>
                                        <button
                                            on:click={cancelEditTitle}
                                            class="px-2 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                                        >
                                            취소
                                        </button>
                                    </div>
                                {:else}
                                    <h4 class="font-medium text-gray-800 mb-1">{conversation.title}</h4>
                                {/if}
                                
                                <div class="flex flex-wrap gap-4 text-sm text-gray-600">
                                    <span>📅 {formatDate(conversation.created_at)}</span>
                                    <span>💬 {getConversationMessages(conversation.messages).length}개 메시지</span>
                                    {#if conversation.duration_minutes > 0}
                                        <span>⏱️ {formatDuration(conversation.duration_minutes)}</span>
                                    {/if}
                                </div>
                            </div>
                            
                            <div class="flex gap-2 ml-4">
                                <button
                                    on:click={(e) => startEditTitle(conversation, e)}
                                    class="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                                    title="제목 편집"
                                >
                                    ✏️
                                </button>
                                <button
                                    on:click={(e) => handleDeleteConversation(conversation.id, e)}
                                    class="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                    title="삭제"
                                >
                                    🗑️
                                </button>
                                <button class="p-1 text-gray-400">
                                    {selectedConversation?.id === conversation.id ? '🔽' : '▶️'}
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 대화 내용 (확장된 경우) -->
                    {#if selectedConversation?.id === conversation.id}
                        <div class="p-4 border-t border-gray-200">
                            <!-- 음성 대화 -->
                            {#if getConversationMessages(conversation.messages).length > 0}
                                <div class="mb-6">
                                    <h5 class="font-medium text-gray-700 mb-3">🎤 음성 대화</h5>
                                    <div class="space-y-3 max-h-96 overflow-y-auto">
                                        {#each getConversationMessages(conversation.messages) as message}
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
                                                            {new Date(message.timestamp).toLocaleTimeString()}
                                                        </span>
                                                    </div>
                                                    <div class="bg-gray-50 rounded-lg p-3">
                                                        <p class="text-gray-700 text-sm leading-relaxed">{message.message}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        {/each}
                                    </div>
                                </div>
                            {/if}
                            
                            <!-- 시스템 메시지 -->
                            {#if getSystemMessages(conversation.messages).length > 0}
                                <div>
                                    <h5 class="font-medium text-gray-700 mb-3">⚙️ 시스템 메시지</h5>
                                    <div class="space-y-2 max-h-48 overflow-y-auto">
                                        {#each getSystemMessages(conversation.messages) as message}
                                            <div class="bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r-lg">
                                                <div class="flex items-center gap-2 mb-1">
                                                    <span class="text-sm font-medium text-gray-700">{message.speaker}</span>
                                                    <span class="text-xs text-gray-500">
                                                        {new Date(message.timestamp).toLocaleTimeString()}
                                                    </span>
                                                </div>
                                                <p class="text-gray-700 text-sm">{message.message}</p>
                                            </div>
                                        {/each}
                                    </div>
                                </div>
                            {/if}
                        </div>
                    {/if}
                </div>
            {/each}
        </div>
    {/if}
</div> 