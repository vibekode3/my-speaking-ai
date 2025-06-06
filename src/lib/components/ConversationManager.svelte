<!-- src/lib/components/ConversationManager.svelte -->
<script>
    import { createEventDispatcher, onMount } from 'svelte';
    import { user } from '../stores/auth.js';
    import { 
        currentConversation, 
        startNewConversation, 
        addMessageToCurrentConversation, 
        endCurrentConversation 
    } from '../stores/conversation.js';
    import { selectedPrompt } from '../stores/userPrompts.js';
    
    const dispatch = createEventDispatcher();
    
    export let isConnected = false;
    export let isConnecting = false;
    export let customPrompt = '';
    export let promptTemplate = 'friendly';
    export let promptId = null;
    export let promptName = '';
    
    let conversationStatus = 'inactive'; // 'inactive', 'starting', 'active'
    
    // 프롬프트 템플릿 이름 매핑
    const templateNames = {
        friendly: '친근한 선생님',
        strict: '엄격한 선생님', 
        business: '비즈니스 전문가',
        casual: '캐주얼 친구',
        custom: '커스텀 설정'
    };
    
    // customPrompt에서 템플릿 유형 감지
    $: {
        if (customPrompt) {
            // 기본 템플릿과 일치하는지 확인
            const friendlyTemplate = `당신은 친근하고 도움이 되는 영어 회화 선생님입니다. 
사용자와 자연스러운 영어 대화를 나누며, 필요시 발음이나 문법에 대한 피드백을 제공해주세요.
대화는 영어로 진행하되, 사용자가 이해하기 어려워하면 한국어로도 설명해주세요.`;
            
            if (customPrompt.includes('친근하고 도움이 되는 영어 회화 선생님')) {
                promptTemplate = 'friendly';
            } else if (customPrompt.includes('엄격하지만 효과적인 영어 회화 선생님')) {
                promptTemplate = 'strict';
            } else if (customPrompt.includes('비즈니스 영어 전문 회화 선생님')) {
                promptTemplate = 'business';
            } else if (customPrompt.includes('편안하고 재미있는 영어 회화 친구')) {
                promptTemplate = 'casual';
            } else {
                promptTemplate = 'custom';
            }
        }
    }
    
    // 현재 대화 상태 모니터링
    $: {
        if ($currentConversation.id && isConnected) {
            conversationStatus = 'active';
        } else if ($currentConversation.id && !isConnected) {
            conversationStatus = 'inactive';
        } else {
            conversationStatus = 'inactive';
        }
    }
    
    // 연결 상태 변경 감지
    $: {
        if (isConnected && !$currentConversation.id && $user) {
            // 연결되었지만 대화 세션이 없는 경우 자동 시작
            handleStartConversation();
        } else if (!isConnected && $currentConversation.id) {
            // 연결이 끊어진 경우 대화 종료
            handleEndConversation();
        }
    }
    
    // 메시지 추가 처리
    export async function addMessage(speaker, message, usageInfo = null) {
        if ($currentConversation.id) {
            await addMessageToCurrentConversation(speaker, message, usageInfo);
        }
    }
    
    // 대화 시작
    async function handleStartConversation() {
        if (!$user) {
            dispatch('error', '대화를 시작하려면 로그인이 필요합니다.');
            return;
        }
        
        if (conversationStatus === 'starting') return;
        
        try {
            conversationStatus = 'starting';
            
            // AI 설정 정보 준비
            const aiSettings = {
                template: promptTemplate,
                templateName: promptName || templateNames[promptTemplate] || templateNames.friendly,
                customPrompt: customPrompt || '',
                updatedAt: new Date().toISOString()
            };
            
            const conversationId = await startNewConversation(aiSettings, promptId);
            
            dispatch('conversation-started', {
                conversationId,
                title: $currentConversation.title,
                aiSettings,
                promptId
            });
            
            // 시작 메시지에 AI 설정 정보 포함
            const settingMessage = `새로운 영어회화 세션이 시작되었습니다. AI 설정: ${aiSettings.templateName}`;
            await addMessageToCurrentConversation('시스템', settingMessage);
            
        } catch (error) {
            console.error('대화 시작 오류:', error);
            dispatch('error', '대화 시작 중 오류가 발생했습니다: ' + error.message);
            conversationStatus = 'inactive';
        }
    }
    
    // 대화 종료
    async function handleEndConversation() {
        if (!$currentConversation.id) return;
        
        try {
            // 종료 메시지 추가
            await addMessageToCurrentConversation('시스템', '영어회화 세션이 종료되었습니다.');
            
            await endCurrentConversation();
            
            dispatch('conversation-ended');
            conversationStatus = 'inactive';
            
        } catch (error) {
            console.error('대화 종료 오류:', error);
            dispatch('error', '대화 종료 중 오류가 발생했습니다: ' + error.message);
        }
    }
    
    // 수동 대화 시작/종료
    async function toggleConversation() {
        if ($currentConversation.id) {
            await handleEndConversation();
        } else {
            await handleStartConversation();
        }
    }
</script>

<div class="bg-white rounded-lg shadow p-4 mb-4">
    <div class="flex justify-between items-center">
        <div>
            <h4 class="font-medium text-gray-800">대화 세션</h4>
            <p class="text-sm text-gray-600">
                {#if conversationStatus === 'active'}
                    <span class="text-green-600">● 활성 세션: {$currentConversation.title}</span>
                {:else if conversationStatus === 'starting'}
                    <span class="text-yellow-600">● 세션 시작 중...</span>
                {:else}
                    <span class="text-gray-500">● 비활성</span>
                {/if}
            </p>
        </div>
        
        <div class="flex gap-2">
            {#if $user}
                {#if !isConnected && !isConnecting}
                    <button
                        on:click={toggleConversation}
                        disabled={conversationStatus === 'starting'}
                        class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
                    >
                        {#if conversationStatus === 'starting'}
                            시작 중...
                        {:else if $currentConversation.id}
                            세션 종료
                        {:else}
                            새 세션 시작
                        {/if}
                    </button>
                {/if}
                
                {#if $currentConversation.id}
                    <div class="text-xs text-gray-500 flex items-center">
                        세션 시간: {Math.floor((Date.now() - new Date($currentConversation.startTime || Date.now())) / 1000 / 60)}분
                    </div>
                {/if}
            {:else}
                <p class="text-sm text-gray-500">로그인 후 대화 기록을 저장할 수 있습니다.</p>
            {/if}
        </div>
    </div>
    
    {#if $currentConversation.id}
        <div class="mt-3 p-3 bg-blue-50 rounded-lg">
            <div class="flex justify-between items-center text-sm mb-2">
                <span class="text-blue-700">
                    📝 현재 메시지: {$currentConversation.messages.length}개
                </span>
                <span class="text-blue-600">
                    ID: {$currentConversation.id.slice(0, 8)}...
                </span>
            </div>
            {#if $currentConversation.aiSettings?.templateName}
                <div class="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                    🤖 AI 설정: {$currentConversation.aiSettings.templateName}
                </div>
            {/if}
            {#if promptName}
                <div class="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded mt-1">
                    📝 사용 프롬프트: {promptName}
                </div>
            {/if}
        </div>
    {/if}
</div> 