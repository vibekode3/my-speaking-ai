<!-- src/lib/components/PromptSearchBar.svelte -->
<script>
	import { createEventDispatcher } from 'svelte';
	
	const dispatch = createEventDispatcher();
	
	export let searchTerm = '';
	export let isSearching = false;
	export let isConnected = false;
	
	let searchTimeout;
	
	// 검색 디바운스
	$: if (searchTerm) {
		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => {
			dispatch('search', { searchTerm });
		}, 300);
	} else {
		clearTimeout(searchTimeout);
		dispatch('search', { searchTerm: '' });
	}
	
	function toggleCreateForm() {
		dispatch('toggle-create');
	}
</script>

<!-- 검색 및 액션 버튼 -->
<div class="flex gap-2 mb-4">
	<div class="flex-1 relative">
		<input
			type="text"
			bind:value={searchTerm}
			placeholder="프롬프트 검색..."
			class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
			disabled={isConnected}
		/>
		<div class="absolute left-3 top-2.5 text-gray-400">
			🔍
		</div>
		{#if isSearching}
			<div class="absolute right-3 top-2.5">
				<div class="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
			</div>
		{/if}
	</div>
	<button
		on:click={toggleCreateForm}
		disabled={isConnected}
		class="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors"
	>
		새 프롬프트
	</button>
</div> 