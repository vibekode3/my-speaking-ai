<!-- src/lib/components/ConversationLog.svelte -->
<script>
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase';
	import { user } from '$lib/stores/auth.js';
	import { currentConversation } from '$lib/stores/conversation.js';
	import { UsageTracker } from '$lib/utils/usageTracker.js';
	
	export let messages = [];
	
	let activeTab = 'conversation'; // 'conversation' 또는 'system'
	
	// 메시지를 타입별로 필터링
	$: conversationMessages = messages.filter(msg => 
		msg.speaker === '나' || msg.speaker === 'AI 선생님'
	);
	
	$: systemMessages = messages.filter(msg => 
		msg.speaker === '시스템'
	);
	
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

<div class="conversation-log">
	<!-- 탭 네비게이션 -->
	<div class="flex border-b border-gray-200 mb-4">
		<button 
			class="px-4 py-2 text-sm font-medium border-b-2 transition-colors
				{activeTab === 'conversation' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}"
			on:click={() => activeTab = 'conversation'}
		>
			🎤 음성 대화 ({conversationMessages.length})
		</button>
		<button 
			class="px-4 py-2 text-sm font-medium border-b-2 transition-colors
				{activeTab === 'system' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}"
			on:click={() => activeTab = 'system'}
		>
			⚙️ 시스템 메시지 ({systemMessages.length})
		</button>
	</div>

	<!-- 대화 내용 -->
	<div class="space-y-4 max-h-96 overflow-y-auto">
		{#if activeTab === 'conversation'}
			{#if conversationMessages.length === 0}
				<div class="text-center py-8">
					<div class="text-4xl mb-2">🎤</div>
					<p class="text-gray-500">
						아직 음성 대화가 없습니다.<br>
						AI와 연결하여 영어 대화를 시작해보세요!
					</p>
				</div>
			{:else}
				{#each conversationMessages as message, index}
					{@const usage = getUsageForMessage(message)}
					<div class="flex gap-3">
						<div class="flex-shrink-0">
							{#if message.speaker === '나'}
								<div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
									<span class="text-white text-sm font-semibold">나</span>
								</div>
							{:else}
								<div class="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
									<span class="text-white text-xs font-semibold">AI</span>
								</div>
							{/if}
						</div>
						<div class="flex-1">
							<div class="flex items-center gap-2 mb-1">
								<span class="font-semibold text-gray-800">{message.speaker}</span>
								<span class="text-xs text-gray-500">{formatTimestamp(message.timestamp)}</span>
								
								<!-- 모델 정보 표시 (AI 응답에만) -->
								{#if usage}
									<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
										🤖 {getModelDisplayName(usage.model_name)}
									</span>
								{/if}
							</div>
							
							<div class="bg-gray-50 rounded-lg p-3">
								<p class="text-gray-700 leading-relaxed">{message.message}</p>
								
								<!-- 사용량 정보 (AI 응답에만) -->
								{#if usage}
									<div class="mt-3 pt-3 border-t border-gray-200">
										<div class="flex flex-wrap gap-4 text-xs text-gray-600">
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
			{/if}

		{:else if activeTab === 'system'}
			{#if systemMessages.length === 0}
				<div class="text-center py-8">
					<div class="text-4xl mb-2">⚙️</div>
					<p class="text-gray-500">
						시스템 메시지가 없습니다.
					</p>
				</div>
			{:else}
				{#each systemMessages as message}
					<div class="flex gap-3">
						<div class="flex-shrink-0">
							<div class="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center">
								<span class="text-white text-xs font-semibold">⚙️</span>
							</div>
						</div>
						<div class="flex-1">
							<div class="flex items-center gap-2 mb-1">
								<span class="font-semibold text-gray-600">{message.speaker}</span>
								<span class="text-xs text-gray-500">{formatTimestamp(message.timestamp)}</span>
							</div>
							<div class="bg-gray-100 rounded-lg p-3">
								<p class="text-gray-600 text-sm leading-relaxed">{message.message}</p>
							</div>
						</div>
					</div>
				{/each}
			{/if}
		{/if}
	</div>
</div>

<style>
	.conversation-log {
		min-height: 200px;
	}
</style> 