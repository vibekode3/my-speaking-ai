<!-- src/lib/components/PromptList.svelte -->
<script>
	import { createEventDispatcher } from 'svelte';
	import PromptCard from './PromptCard.svelte';
	
	const dispatch = createEventDispatcher();
	
	export let prompts = [];
	export let selectedPromptId = null;
	export let isLoading = false;
	export let isConnected = false;
	export let searchTerm = '';
	
	function handleCardEvent(event, eventType) {
		dispatch(eventType, event.detail);
	}
</script>

<!-- 프롬프트 목록 -->
{#if isLoading}
	<div class="flex justify-center items-center py-8">
		<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
	</div>
{:else if prompts.length === 0}
	<div class="text-center py-8">
		<div class="text-4xl mb-2">📝</div>
		<p class="text-gray-500">
			{searchTerm ? '검색 결과가 없습니다.' : '저장된 프롬프트가 없습니다.'}
		</p>
	</div>
{:else}
	<div class="space-y-3 max-h-96 overflow-y-auto">
		{#each prompts as prompt (prompt.id)}
			<PromptCard
				{prompt}
				isSelected={selectedPromptId === prompt.id}
				{isConnected}
				on:select={(e) => handleCardEvent(e, 'select')}
				on:edit={(e) => handleCardEvent(e, 'edit')}
				on:toggle-favorite={(e) => handleCardEvent(e, 'toggle-favorite')}
				on:duplicate={(e) => handleCardEvent(e, 'duplicate')}
				on:delete={(e) => handleCardEvent(e, 'delete')}
			/>
		{/each}
	</div>
{/if} 