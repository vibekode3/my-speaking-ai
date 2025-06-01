<script>
	import { createEventDispatcher } from 'svelte';
	
	const dispatch = createEventDispatcher();
	
	export let debugLogs = [];
	export let error = null;
	export let connectionStatus = null;
	export let showDebugPanel = false;
	
	function clearDebugLogs() {
		dispatch('clear-logs');
	}
	
	function downloadDebugLogs() {
		const debugData = {
			timestamp: new Date().toISOString(),
			logs: debugLogs,
			connectionStatus,
			systemInfo: {
				userAgent: navigator.userAgent,
				platform: navigator.platform,
				language: navigator.language,
				cookieEnabled: navigator.cookieEnabled,
				onLine: navigator.onLine
			}
		};
		
		const blob = new Blob([JSON.stringify(debugData, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `debug-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}
</script>

{#if showDebugPanel}
	<div class="bg-white rounded-lg shadow-lg p-6 mb-8">
		<div class="flex justify-between items-center mb-4">
			<h3 class="text-lg font-semibold text-gray-800">디버그 정보</h3>
			<div class="flex gap-2">
				<button
					on:click={clearDebugLogs}
					class="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm"
				>
					로그 지우기
				</button>
				<button
					on:click={downloadDebugLogs}
					class="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
				>
					로그 다운로드
				</button>
			</div>
		</div>
		
		{#if error}
			<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
				<strong>오류:</strong> {error}
			</div>
		{/if}
		
		<!-- 실시간 연결 상태 -->
		{#if connectionStatus}
			<div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
				<h4 class="font-semibold text-blue-800 mb-2">실시간 연결 상태</h4>
				<div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
					<div>
						<span class="text-gray-600">WebRTC:</span>
						<span class="font-mono ml-1 {connectionStatus.pcState === 'connected' ? 'text-green-600' : connectionStatus.pcState === 'closed' ? 'text-red-600' : 'text-yellow-600'}">{connectionStatus.pcState}</span>
					</div>
					<div>
						<span class="text-gray-600">데이터채널:</span>
						<span class="font-mono ml-1 {connectionStatus.dataChannelState === 'open' ? 'text-green-600' : connectionStatus.dataChannelState === 'closed' ? 'text-red-600' : 'text-yellow-600'}">{connectionStatus.dataChannelState}</span>
					</div>
					<div>
						<span class="text-gray-600">마이크:</span>
						<span class="font-mono ml-1 {connectionStatus.localStreamActive ? 'text-green-600' : 'text-red-600'}">{connectionStatus.localStreamActive ? '활성' : '비활성'}</span>
					</div>
					<div>
						<span class="text-gray-600">연결시간:</span>
						<span class="font-mono ml-1">{Math.round(connectionStatus.connectionDuration / 1000)}초</span>
					</div>
				</div>
			</div>
		{/if}
		
		<div class="bg-gray-100 rounded-lg p-4 max-h-96 overflow-y-auto">
			{#if debugLogs.length === 0}
				<p class="text-gray-500 text-center">디버그 로그가 없습니다.</p>
			{:else}
				{#each debugLogs as log}
					<div class="mb-2 text-sm">
						<span class="text-gray-500">[{log.timestamp}]</span>
						<span class="font-mono">{log.message}</span>
						{#if log.data}
							<details class="mt-1">
								<summary class="cursor-pointer text-blue-600 hover:text-blue-800">상세 정보</summary>
								<pre class="bg-white p-2 rounded mt-1 text-xs overflow-x-auto">{JSON.stringify(log.data, null, 2)}</pre>
							</details>
						{/if}
					</div>
				{/each}
			{/if}
		</div>
	</div>
{/if} 