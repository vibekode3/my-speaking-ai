<!-- src/lib/components/StatusIndicator.svelte -->
<script>
	export let isConnecting = false;
	export let isConnected = false;
	export let isSpeaking = false;
	export let isDisconnecting = false;
	export let connectionStatus = null;
</script>

<div class="text-center mb-8">
	{#if isDisconnecting}
		<div class="inline-flex items-center bg-orange-100 text-orange-700 px-6 py-3 rounded-full">
			<div class="w-3 h-3 bg-orange-500 rounded-full animate-pulse mr-3"></div>
			<span class="font-medium">연결 해제 중... API 통신을 안전하게 종료하고 있습니다</span>
		</div>
	{:else if isConnecting}
		<div class="inline-flex items-center bg-yellow-100 text-yellow-700 px-6 py-3 rounded-full">
			<div class="w-3 h-3 bg-yellow-500 rounded-full animate-pulse mr-3"></div>
			<span class="font-medium">AI 선생님에게 연결 중...</span>
		</div>
	{:else if isConnected}
		{#if isSpeaking}
			<div class="inline-flex items-center bg-green-100 text-green-700 px-6 py-3 rounded-full">
				<div class="w-3 h-3 bg-green-500 rounded-full animate-pulse mr-3"></div>
				<span class="font-medium">AI 선생님이 말하고 있습니다...</span>
			</div>
		{:else}
			<div class="inline-flex items-center bg-blue-100 text-blue-700 px-6 py-3 rounded-full">
				<div class="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
				<span class="font-medium">대화 준비 완료 - 자유롭게 말해보세요!</span>
			</div>
		{/if}
	{:else}
		<div class="inline-flex items-center bg-gray-100 text-gray-600 px-6 py-3 rounded-full">
			<div class="w-3 h-3 bg-gray-400 rounded-full mr-3"></div>
			<span class="font-medium">연결 대기 중 - 모든 API 통신이 중단된 상태</span>
		</div>
	{/if}
	
	<!-- 연결 상태 상세 정보 (디버깅용) -->
	{#if connectionStatus}
		<div class="mt-4 text-xs text-gray-500">
			<details class="inline-block">
				<summary class="cursor-pointer hover:text-gray-700">연결 상태 상세 정보</summary>
				<div class="mt-2 p-3 bg-gray-50 rounded-lg text-left max-w-md mx-auto">
					<div class="grid grid-cols-2 gap-2 text-xs">
						<div>WebRTC: <span class="font-mono {connectionStatus.pcState === 'connected' ? 'text-green-600' : connectionStatus.pcState === 'closed' ? 'text-red-600' : 'text-yellow-600'}">{connectionStatus.pcState}</span></div>
						<div>ICE: <span class="font-mono {connectionStatus.pcIceState === 'connected' ? 'text-green-600' : connectionStatus.pcIceState === 'closed' ? 'text-red-600' : 'text-yellow-600'}">{connectionStatus.pcIceState}</span></div>
						<div>데이터채널: <span class="font-mono {connectionStatus.dataChannelState === 'open' ? 'text-green-600' : connectionStatus.dataChannelState === 'closed' ? 'text-red-600' : 'text-yellow-600'}">{connectionStatus.dataChannelState}</span></div>
						<div>마이크: <span class="font-mono {connectionStatus.localStreamActive ? 'text-green-600' : 'text-red-600'}">{connectionStatus.localStreamActive ? '활성' : '비활성'}</span></div>
						<div>오디오트랙: <span class="font-mono">{connectionStatus.localStreamTracks}개</span></div>
						<div>연결시간: <span class="font-mono">{Math.round(connectionStatus.connectionDuration / 1000)}초</span></div>
					</div>
					{#if connectionStatus.connectionId}
						<div class="mt-2 pt-2 border-t border-gray-200">
							<div class="text-xs text-gray-400">연결 ID: <span class="font-mono">{connectionStatus.connectionId}</span></div>
						</div>
					{/if}
				</div>
			</details>
		</div>
	{/if}
</div> 