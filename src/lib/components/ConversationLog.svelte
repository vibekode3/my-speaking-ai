<script>
	export let messages = [];
	
	let activeTab = 'conversation'; // 'conversation' 또는 'system'
	
	// 메시지를 타입별로 필터링
	$: conversationMessages = messages.filter(msg => 
		msg.speaker === '나' || msg.speaker === 'AI 선생님'
	);
	
	$: systemMessages = messages.filter(msg => 
		msg.speaker === '시스템'
	);
	
	function clearMessages() {
		messages = [];
	}
	
	function clearConversationMessages() {
		messages = messages.filter(msg => msg.speaker === '시스템');
	}
	
	function clearSystemMessages() {
		messages = messages.filter(msg => msg.speaker !== '시스템');
	}
</script>

<div class="bg-white rounded-lg shadow-lg p-6">
	<div class="flex justify-between items-center mb-4">
		<h3 class="text-lg font-semibold text-gray-800">대화 기록</h3>
		{#if messages.length > 0}
			<button
				on:click={clearMessages}
				class="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm"
			>
				전체 지우기
			</button>
		{/if}
	</div>
	
	<!-- 탭 네비게이션 -->
	<div class="flex border-b border-gray-200 mb-4">
		<button
			class="px-4 py-2 text-sm font-medium border-b-2 transition-colors {activeTab === 'conversation' 
				? 'border-blue-500 text-blue-600' 
				: 'border-transparent text-gray-500 hover:text-gray-700'}"
			on:click={() => activeTab = 'conversation'}
		>
			음성 대화 ({conversationMessages.length})
		</button>
		<button
			class="px-4 py-2 text-sm font-medium border-b-2 transition-colors {activeTab === 'system' 
				? 'border-blue-500 text-blue-600' 
				: 'border-transparent text-gray-500 hover:text-gray-700'}"
			on:click={() => activeTab = 'system'}
		>
			시스템 메시지 ({systemMessages.length})
		</button>
	</div>
	
	<!-- 탭별 클리어 버튼 -->
	<div class="flex justify-end mb-3">
		{#if activeTab === 'conversation' && conversationMessages.length > 0}
			<button
				on:click={clearConversationMessages}
				class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
			>
				음성 대화 지우기
			</button>
		{:else if activeTab === 'system' && systemMessages.length > 0}
			<button
				on:click={clearSystemMessages}
				class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
			>
				시스템 메시지 지우기
			</button>
		{/if}
	</div>
	
	<!-- 탭 컨텐츠 -->
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
				{#each conversationMessages as message}
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
								<span class="text-xs text-gray-500">{message.timestamp || new Date().toLocaleTimeString()}</span>
							</div>
							<div class="bg-gray-50 rounded-lg p-3">
								<p class="text-gray-700 leading-relaxed">{message.message}</p>
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
								<span class="font-semibold text-gray-800">{message.speaker}</span>
								<span class="text-xs text-gray-500">{message.timestamp || new Date().toLocaleTimeString()}</span>
							</div>
							<div class="bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r-lg">
								<p class="text-gray-700 leading-relaxed">{message.message}</p>
							</div>
						</div>
					</div>
				{/each}
			{/if}
		{/if}
	</div>
</div> 