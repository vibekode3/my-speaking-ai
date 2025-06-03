<!-- src/routes/+page.svelte -->
<script>
	import RealtimeAgent from '$lib/components/RealtimeAgent.svelte';
	import AIAvatar from '$lib/components/AIAvatar.svelte';
	import StatusIndicator from '$lib/components/StatusIndicator.svelte';
	import ConversationLog from '$lib/components/ConversationLog.svelte';
	import ConversationHistory from '$lib/components/ConversationHistory.svelte';
	import ConversationManager from '$lib/components/ConversationManager.svelte';
	import ConnectionController from '$lib/components/ConnectionController.svelte';
	import DebugPanel from '$lib/components/DebugPanel.svelte';
	import { user, loading, initAuth } from '$lib/stores/auth.js';
	import { onMount } from 'svelte';

	let realtimeAgent;
	let conversationManager;
	let isConnected = false;
	let isConnecting = false;
	let isSpeaking = false;
	let isDisconnecting = false;
	let error = null;
	let messages = [];
	let debugLogs = [];
	let showDebugPanel = false;
	let showHistory = false;
	let connectionStatus = null;

	// 인증 초기화
	onMount(() => {
		initAuth();
	});

	// 대화 로그에 메시지 추가
	function addToLog(speaker, message) {
		const newMessage = {
			speaker,
			message,
			timestamp: new Date().toLocaleTimeString()
		};
		messages = [...messages, newMessage];
		
		// 대화 매니저에도 메시지 추가 (데이터베이스 저장)
		if (conversationManager) {
			conversationManager.addMessage(speaker, message);
		}
	}

	// 대화 기록 지우기 (현재 세션만)
	function clearLog() {
		messages = [];
	}

	// 이벤트 핸들러들
	function handleConnected() {
		console.log('Connected to AI');
	}

	function handleDisconnected() {
		console.log('Disconnected from AI');
		isDisconnecting = false;
	}

	function handleMessage(event) {
		// 이미 timestamp가 있는 경우 그대로 사용, 없으면 추가
		const messageWithTimestamp = {
			...event.detail,
			timestamp: event.detail.timestamp || new Date().toLocaleTimeString()
		};
		messages = [...messages, messageWithTimestamp];
		
		// 대화 매니저에도 메시지 추가 (데이터베이스 저장)
		if (conversationManager) {
			conversationManager.addMessage(messageWithTimestamp.speaker, messageWithTimestamp.message);
		}
	}

	function handleSpeaking(event) {
		console.log('AI speaking:', event.detail);
	}

	function handleError(event) {
		console.error('Agent error:', event.detail);
		error = event.detail;
		isDisconnecting = false;
	}

	function handleDebug(event) {
		debugLogs = [event.detail, ...debugLogs].slice(0, 50); // 최근 50개만 유지
	}

	// ConnectionController 이벤트 핸들러들
	function handleConnectionLog(event) {
		const messageWithTimestamp = {
			speaker: event.detail.speaker,
			message: event.detail.message,
			timestamp: new Date().toLocaleTimeString()
		};
		messages = [...messages, messageWithTimestamp];
		
		// 대화 매니저에도 메시지 추가
		if (conversationManager) {
			conversationManager.addMessage(messageWithTimestamp.speaker, messageWithTimestamp.message);
		}
	}

	function handleConnectionError(event) {
		error = event.detail;
	}

	function handleToggleDebug() {
		showDebugPanel = !showDebugPanel;
	}

	// DebugPanel 이벤트 핸들러들
	function handleClearLogs() {
		debugLogs = [];
	}

	// ConversationManager 이벤트 핸들러들
	function handleConversationStarted(event) {
		console.log('Conversation started:', event.detail);
	}

	function handleConversationEnded(event) {
		console.log('Conversation ended');
	}

	function handleConversationError(event) {
		error = event.detail;
	}

	// 탭 전환
	function toggleHistoryView() {
		showHistory = !showHistory;
	}
</script>

<svelte:head>
	<title>실시간 영어회화 AI</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
	<div class="max-w-6xl mx-auto">
		<!-- 헤더 -->
		<div class="text-center mb-8">
			<h1 class="text-4xl font-bold text-gray-800 mb-2">실시간 영어회화 AI</h1>
			<p class="text-gray-600">OpenAI Realtime API로 자연스러운 영어 대화를 연습해보세요</p>
		</div>
		
		{#if $loading}
			<!-- 로딩 상태 -->
			<div class="flex justify-center items-center py-12">
				<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
			</div>
		{:else if !$user}
			<!-- 비로그인 상태 -->
			<div class="max-w-2xl mx-auto">
				<div class="bg-white rounded-lg shadow-lg p-8 text-center">
					<div class="text-6xl mb-6">🎤</div>
					<h2 class="text-2xl font-bold text-gray-800 mb-4">영어회화 AI에 오신 것을 환영합니다!</h2>
					<p class="text-gray-600 mb-6">
						AI와 실시간으로 영어 대화를 나누고, 대화 기록을 저장하여 학습 진도를 확인할 수 있습니다.
					</p>
					<div class="space-y-4">
						<a
							href="/login"
							class="w-full bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors inline-block"
						>
							로그인하여 시작하기
						</a>
						<a
							href="/signup"
							class="w-full border border-blue-500 text-blue-500 hover:bg-blue-50 px-6 py-3 rounded-lg font-semibold transition-colors inline-block"
						>
							회원가입
						</a>
					</div>
				</div>
			</div>
		{:else}
			<!-- 로그인한 사용자 - AI 기능 -->
			<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<!-- 메인 대화 영역 -->
				<div class="lg:col-span-2 space-y-6">
					<!-- 대화 세션 관리 -->
					<ConversationManager
						bind:this={conversationManager}
						{isConnected}
						{isConnecting}
						on:conversation-started={handleConversationStarted}
						on:conversation-ended={handleConversationEnded}
						on:error={handleConversationError}
					/>

					<!-- AI 아바타 -->
					<AIAvatar {isConnected} {isSpeaking} />
					
					<!-- 상태 표시 -->
					<StatusIndicator {isConnected} {isConnecting} {isSpeaking} {isDisconnecting} {connectionStatus} />
					
					<!-- 연결 컨트롤러 -->
					<ConnectionController
						{realtimeAgent}
						{isConnected}
						{isConnecting}
						{isDisconnecting}
						{connectionStatus}
						on:log={handleConnectionLog}
						on:error={handleConnectionError}
						on:toggle-debug={handleToggleDebug}
					/>
					
					<!-- 디버그 패널 -->
					<DebugPanel
						{debugLogs}
						{error}
						{connectionStatus}
						{showDebugPanel}
						on:clear-logs={handleClearLogs}
					/>
				</div>

				<!-- 사이드바 - 대화 기록 -->
				<div class="space-y-6">
					<!-- 탭 네비게이션 -->
					<div class="bg-white rounded-lg shadow p-4">
						<div class="flex border-b border-gray-200">
							<button
								class="px-4 py-2 text-sm font-medium border-b-2 transition-colors {!showHistory 
									? 'border-blue-500 text-blue-600' 
									: 'border-transparent text-gray-500 hover:text-gray-700'}"
								on:click={() => showHistory = false}
							>
								현재 대화
							</button>
							<button
								class="px-4 py-2 text-sm font-medium border-b-2 transition-colors {showHistory 
									? 'border-blue-500 text-blue-600' 
									: 'border-transparent text-gray-500 hover:text-gray-700'}"
								on:click={() => showHistory = true}
							>
								대화 기록
							</button>
						</div>
					</div>

					{#if !showHistory}
						<!-- 현재 대화 로그 -->
						<ConversationLog {messages} />
					{:else}
						<!-- 저장된 대화 기록 -->
						<ConversationHistory />
					{/if}
				</div>
			</div>
			
			<!-- 실시간 에이전트 컴포넌트 -->
			<RealtimeAgent
				bind:this={realtimeAgent}
				bind:isConnected
				bind:isConnecting
				bind:isSpeaking
				bind:isDisconnecting
				bind:error
				on:connected={handleConnected}
				on:disconnected={handleDisconnected}
				on:speaking={handleSpeaking}
				on:message={handleMessage}
				on:debug={handleDebug}
				on:error={handleError}
			/>
		{/if}
	</div>
</div>
