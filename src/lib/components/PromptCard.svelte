<!-- src/lib/components/PromptCard.svelte -->
<script>
	import { createEventDispatcher } from 'svelte';
	
	const dispatch = createEventDispatcher();
	
	export let prompt;
	export let isSelected = false;
	export let isConnected = false;
	
	function handleSelect() {
		dispatch('select', prompt);
	}
	
	function handleEdit() {
		dispatch('edit', prompt);
	}
	
	function handleToggleFavorite() {
		dispatch('toggle-favorite', prompt);
	}
	
	function handleDuplicate() {
		dispatch('duplicate', prompt);
	}
	
	function handleDelete() {
		dispatch('delete', prompt);
	}
</script>

<!-- 프롬프트 카드 -->
<div class="border border-gray-200 rounded-lg p-4 {isSelected ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50'}">
	<div class="flex justify-between items-start mb-2">
		<div class="flex-1 min-w-0">
			<div class="flex items-center gap-2 mb-1">
				<h5 class="font-medium text-gray-800 truncate">{prompt.name}</h5>
				{#if prompt.is_favorite}
					<span class="text-yellow-500">⭐</span>
				{/if}
				{#if prompt.is_default}
					<span class="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">기본</span>
				{/if}
			</div>
			{#if prompt.description}
				<p class="text-sm text-gray-600 mb-2">{prompt.description}</p>
			{/if}
			<div class="flex items-center gap-4 text-xs text-gray-500">
				<span>사용 {prompt.usage_count}회</span>
				{#if prompt.last_used_at}
					<span>최근 사용: {new Date(prompt.last_used_at).toLocaleDateString()}</span>
				{/if}
			</div>
		</div>
		<div class="flex items-center gap-1 ml-4">
			<!-- 즐겨찾기 토글 -->
			<button
				on:click={handleToggleFavorite}
				disabled={isConnected}
				class="p-1 text-gray-400 hover:text-yellow-500 transition-colors"
				title={prompt.is_favorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
			>
				{prompt.is_favorite ? '⭐' : '☆'}
			</button>
			
			<!-- 편집 -->
			<button
				on:click={handleEdit}
				disabled={isConnected}
				class="p-1 text-gray-400 hover:text-blue-500 transition-colors"
				title="편집"
			>
				✏️
			</button>
			
			<!-- 복제 -->
			<button
				on:click={handleDuplicate}
				disabled={isConnected}
				class="p-1 text-gray-400 hover:text-green-500 transition-colors"
				title="복제"
			>
				📋
			</button>
			
			<!-- 삭제 -->
			{#if !prompt.is_default}
				<button
					on:click={handleDelete}
					disabled={isConnected}
					class="p-1 text-gray-400 hover:text-red-500 transition-colors"
					title="삭제"
				>
					🗑️
				</button>
			{/if}
		</div>
	</div>
	
	<!-- 프롬프트 내용 미리보기 -->
	<div class="bg-gray-50 border border-gray-200 rounded p-3 mb-3 max-h-20 overflow-y-auto">
		<p class="text-sm text-gray-700 whitespace-pre-wrap">{prompt.prompt_content.substring(0, 150)}{prompt.prompt_content.length > 150 ? '...' : ''}</p>
	</div>
	
	<!-- 선택 버튼 -->
	<button
		on:click={handleSelect}
		disabled={isConnected || isSelected}
		class="w-full px-4 py-2 {isSelected 
			? 'bg-blue-500 text-white' 
			: 'bg-gray-100 hover:bg-gray-200 text-gray-700'} 
		rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
	>
		{isSelected ? '선택됨' : '이 프롬프트 사용하기'}
	</button>
</div> 