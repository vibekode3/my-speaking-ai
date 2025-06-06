<!-- src/lib/components/ConversationHistoryHeader.svelte -->
<script>
    import { createEventDispatcher } from 'svelte';
    
    const dispatch = createEventDispatcher();
    
    export let isLoading = false;
    
    function handleRefresh() {
        dispatch('refresh');
    }
</script>

<div class="flex justify-between items-center mb-6">
    <h3 class="text-xl font-semibold text-gray-800">대화 기록</h3>
    <button
        on:click={handleRefresh}
        class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
        disabled={isLoading}
    >
        {#if isLoading}
            새로고침 중...
        {:else}
            새로고침
        {/if}
    </button>
</div> 