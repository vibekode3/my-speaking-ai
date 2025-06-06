<!-- src/lib/components/ConversationDetails.svelte -->
<script>
    import PromptInfo from './PromptInfo.svelte';
    import AISettings from './AISettings.svelte';
    import VoiceConversation from './VoiceConversation.svelte';
    import SystemMessages from './SystemMessages.svelte';
    
    export let conversation;
    
    // 메시지 타입별 필터링
    function getConversationMessages(messages) {
        return messages.filter(msg => 
            msg.speaker === '나' || msg.speaker === 'AI 선생님'
        );
    }
    
    function getSystemMessages(messages) {
        return messages.filter(msg => msg.speaker === '시스템');
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
</script>

<div class="p-4 border-t border-gray-200">
    <!-- 프롬프트 정보 -->
    {#if getPromptInfo(conversation)}
        <PromptInfo 
            promptInfo={getPromptInfo(conversation)} 
            customPrompt={conversation.custom_prompt} 
        />
    {/if}
    
    <!-- AI 설정 정보 (기존 코드 유지) -->
    {#if conversation.ai_settings && !getPromptInfo(conversation)}
        <AISettings aiSettings={conversation.ai_settings} />
    {/if}
    
    <!-- 음성 대화 -->
    {#if getConversationMessages(conversation.messages).length > 0}
        <VoiceConversation 
            messages={getConversationMessages(conversation.messages)} 
            conversationId={conversation.id}
        />
    {/if}
    
    <!-- 시스템 메시지 -->
    {#if getSystemMessages(conversation.messages).length > 0}
        <SystemMessages messages={getSystemMessages(conversation.messages)} />
    {/if}
</div> 