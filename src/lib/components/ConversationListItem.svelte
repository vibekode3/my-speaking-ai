<!-- src/lib/components/ConversationListItem.svelte -->
<script>
    import { createEventDispatcher } from 'svelte';
    import ConversationDetails from './ConversationDetails.svelte';
    
    const dispatch = createEventDispatcher();
    
    export let conversation;
    export let isSelected = false;
    export let editingTitle = null;
    export let editTitleValue = '';
    
    // 대화 선택/펼치기
    function toggleConversation() {
        dispatch('toggle', conversation);
    }
    
    // 대화 삭제
    function handleDeleteConversation(event) {
        event.stopPropagation();
        dispatch('delete', { conversationId: conversation.id, event });
    }
    
    // 제목 편집 시작
    function startEditTitle(event) {
        event.stopPropagation();
        dispatch('startEdit', conversation);
    }
    
    // 제목 편집 저장
    function saveTitle() {
        dispatch('saveTitle', { conversationId: conversation.id, title: editTitleValue });
    }
    
    // 제목 편집 취소
    function cancelEditTitle() {
        dispatch('cancelEdit');
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
    
    // 대화 시간 포맷팅
    function formatDuration(minutes) {
        if (minutes < 60) {
            return `${minutes}분`;
        }
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return `${hours}시간 ${remainingMinutes}분`;
    }
    
    // 메시지 타입별 필터링
    function getConversationMessages(messages) {
        return messages.filter(msg => 
            msg.speaker === '나' || msg.speaker === 'AI 선생님'
        );
    }
    
    // 프롬프트 정보 가져오기
    function getPromptInfo(conversation) {
        // user_prompts 조인 데이터가 있는 경우
        if (conversation.user_prompts) {
            return {
                name: conversation.user_prompts.name,
                description: conversation.user_prompts.description,
                type: conversation.user_prompts.template_type
            };
        }
        
        // ai_settings에서 정보 가져오기 (기본값)
        if (conversation.ai_settings?.templateName) {
            return {
                name: conversation.ai_settings.templateName,
                description: '',
                type: conversation.ai_settings.template || 'friendly'
            };
        }
        
        return null;
    }
    
    // 프롬프트 타입별 이모지
    function getPromptTypeEmoji(type) {
        const emojiMap = {
            friendly: '😊',
            strict: '🎯',
            business: '💼',
            casual: '🎉',
            custom: '✏️'
        };
        return emojiMap[type] || '🤖';
    }
</script>

<div class="border border-gray-200 rounded-lg overflow-hidden">
    <!-- 대화 헤더 -->
    <div
        class="p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
        on:click={toggleConversation}
    >
        <div class="flex justify-between items-start">
            <div class="flex-1">
                {#if editingTitle === conversation.id}
                    <div class="flex gap-2" on:click|stopPropagation>
                        <input
                            bind:value={editTitleValue}
                            class="flex-1 px-2 py-1 border border-gray-300 rounded"
                            on:keydown={(e) => {
                                if (e.key === 'Enter') saveTitle();
                                if (e.key === 'Escape') cancelEditTitle();
                            }}
                            on:blur={saveTitle}
                            autofocus
                        />
                        <button
                            on:click={saveTitle}
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
                
                <!-- 프롬프트 정보 표시 -->
                {#if getPromptInfo(conversation)}
                    {@const promptInfo = getPromptInfo(conversation)}
                    <div class="mt-2">
                        <span class="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                            {getPromptTypeEmoji(promptInfo.type)} {promptInfo.name}
                        </span>
                    </div>
                {/if}
            </div>
            
            <div class="flex gap-2 ml-4">
                <button
                    on:click={startEditTitle}
                    class="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                    title="제목 편집"
                >
                    ✏️
                </button>
                <button
                    on:click={handleDeleteConversation}
                    class="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    title="삭제"
                >
                    🗑️
                </button>
                <button class="p-1 text-gray-400">
                    {isSelected ? '🔽' : '▶️'}
                </button>
            </div>
        </div>
    </div>
    
    <!-- 대화 내용 (확장된 경우) -->
    {#if isSelected}
        <ConversationDetails {conversation} />
    {/if}
</div> 