<!-- src/lib/components/ConversationHistory.svelte -->
<script>
    import { onMount } from 'svelte';
    import { conversationHistory, conversationLoading, loadConversationHistory, deleteConversation, updateConversationTitle } from '../stores/conversation.js';
    import ConversationHistoryHeader from './ConversationHistoryHeader.svelte';
    import ConversationListItem from './ConversationListItem.svelte';
    import EmptyState from './EmptyState.svelte';
    import LoadingSpinner from './LoadingSpinner.svelte';
    
    let selectedConversation = null;
    let editingTitle = null;
    let editTitleValue = '';
    
    onMount(() => {
        loadConversationHistory();
    });
    
    // 대화 선택/펼치기
    function handleToggleConversation(event) {
        const conversation = event.detail;
        if (selectedConversation?.id === conversation.id) {
            selectedConversation = null;
        } else {
            selectedConversation = conversation;
        }
    }
    
    // 대화 삭제
    async function handleDeleteConversation(event) {
        const { conversationId } = event.detail;
        
        if (confirm('이 대화 기록을 삭제하시겠습니까?')) {
            try {
                await deleteConversation(conversationId);
            } catch (error) {
                alert('삭제 중 오류가 발생했습니다: ' + error.message);
            }
        }
    }
    
    // 제목 편집 시작
    function handleStartEditTitle(event) {
        const conversation = event.detail;
        editingTitle = conversation.id;
        editTitleValue = conversation.title;
    }
    
    // 제목 편집 저장
    async function handleSaveTitle(event) {
        const { conversationId, title } = event.detail;
        if (title.trim()) {
            try {
                await updateConversationTitle(conversationId, title.trim());
                editingTitle = null;
            } catch (error) {
                alert('제목 수정 중 오류가 발생했습니다: ' + error.message);
            }
        }
    }
    
    // 제목 편집 취소
    function handleCancelEditTitle() {
        editingTitle = null;
        editTitleValue = '';
    }
    
    // 새로고침
    function handleRefresh() {
        loadConversationHistory();
    }
</script>

<div class="bg-white rounded-lg shadow-lg p-6">
    <ConversationHistoryHeader 
        isLoading={$conversationLoading}
        on:refresh={handleRefresh}
    />
    
    {#if $conversationLoading}
        <LoadingSpinner />
    {:else if $conversationHistory.length === 0}
        <EmptyState />
    {:else}
        <div class="space-y-4">
            {#each $conversationHistory as conversation (conversation.id)}
                <ConversationListItem
                    {conversation}
                    isSelected={selectedConversation?.id === conversation.id}
                    {editingTitle}
                    {editTitleValue}
                    on:toggle={handleToggleConversation}
                    on:delete={handleDeleteConversation}
                    on:startEdit={handleStartEditTitle}
                    on:saveTitle={handleSaveTitle}
                    on:cancelEdit={handleCancelEditTitle}
                />
            {/each}
        </div>
    {/if}
</div> 