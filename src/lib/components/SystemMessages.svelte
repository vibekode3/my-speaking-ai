<!-- src/lib/components/SystemMessages.svelte -->
<script>
    export let messages;
</script>

<div>
    <h5 class="font-medium text-gray-700 mb-3">⚙️ 시스템 메시지</h5>
    <div class="space-y-2 max-h-48 overflow-y-auto">
        {#each messages as message}
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