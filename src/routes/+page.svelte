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
	import PromptCustomizer from '$lib/components/PromptCustomizer.svelte';
	import { user, loading, initAuth } from '$lib/stores/auth.js';
	import { currentConversation } from '$lib/stores/conversation.js';
	import { checkOnboardingStatus } from '$lib/onboarding.js';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	let realtimeAgent;
	let conversationManager;
	let isConnected = $state(false);
	let isConnecting = $state(false);
	let isSpeaking = $state(false);
	let isDisconnecting = $state(false);
	let error = $state(null);
	let messages = $state([]);
	let debugLogs = $state([]);
	let showDebugPanel = $state(false);
	let showHistory = $state(false);
	let showPromptCustomizer = $state(false);
	let connectionStatus = $state(null);
	let customPrompt = $state('');
	let promptId = $state(null);
	let promptName = $state('');

	// 인증 초기화
	onMount(() => {
		initAuth();
		console.log('메인 페이지 마운트됨');
	});

	// realtimeAgent 상태 추적
	$effect(() => {
		console.log('🔵 realtimeAgent 상태 변경:', realtimeAgent);
		console.log('🔵 현재 연결 상태들:', { isConnected, isConnecting, isSpeaking, isDisconnecting });
	});

	// 사용자 상태 변경 감지 및 온보딩 체크
	$effect(() => {
		if ($user && !$loading) {
			checkUserOnboardingStatus();
		}
	});

	async function checkUserOnboardingStatus() {
		try {
			console.log('메인 페이지에서 온보딩 상태 확인:', $user.id);
			
			// 타임아웃 설정
			const timeoutPromise = new Promise((_, reject) => {
				setTimeout(() => {
					reject(new Error('온보딩 상태 확인 시간 초과'));
				}, 5000); // 5초 타임아웃
			});
			
			// race를 사용하여 타임아웃 적용
			const result = await Promise.race([
				checkOnboardingStatus($user.id),
				timeoutPromise
			]);
			
			if (result.success) {
				if (!result.data.onboarding_complete) {
					console.log('메인 페이지: 온보딩 미완료 - 리다이렉트');
					goto('/onboarding');
					return;
				}
				console.log('메인 페이지: 온보딩 완료 - 정상 진행');
			} else {
				console.error('메인 페이지: 온보딩 상태 확인 실패:', result.error);
				// 오류 발생 시에도 사용자 경험을 위해 정상 진행
			}
		} catch (error) {
			console.error('메인 페이지: 온보딩 체크 중 오류:', error);
			// 타임아웃이나 오류 발생 시에도 정상 진행
		}
	}

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
		isConnected = true;
		isConnecting = false;
	}

	function handleDisconnected() {
		console.log('Disconnected from AI');
		isConnected = false;
		isConnecting = false;
		isDisconnecting = false;
	}
	
	function handleConnecting() {
		console.log('Connecting to AI');
		isConnecting = true;
		isConnected = false;
		isDisconnecting = false;
	}
	
	function handleDisconnecting() {
		console.log('Disconnecting from AI');
		isDisconnecting = true;
		isConnected = false;
		isConnecting = false;
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

	// 사용량 정보가 포함된 메시지 처리
	function handleMessageWithUsage(event) {
		const { message, usage } = event.detail;
		
		// 화면에 표시할 메시지에 사용량 정보 추가
		const messageWithUsage = {
			...message,
			usage: usage
		};
		
		// 기존 메시지 중에서 같은 AI 메시지가 있다면 사용량 정보를 추가
		const lastMessageIndex = messages.findLastIndex(
			msg => msg.speaker === 'AI 선생님' && msg.message === message.message && msg.timestamp === message.timestamp
		);
		
		if (lastMessageIndex !== -1) {
			// 기존 메시지에 사용량 정보 추가
			messages[lastMessageIndex] = { ...messages[lastMessageIndex], usage: usage };
			messages = [...messages]; // 반응성 트리거
		}
		
		// 대화 매니저에 사용량 정보와 함께 저장
		if (conversationManager) {
			conversationManager.addMessage(message.speaker, message.message, usage);
		}
		
		console.log('💾 [사용량 정보가 포함된 메시지 처리 완료]', {
			메시지: message.message,
			사용량: usage
		});
	}

	function handleSpeaking(event) {
		console.log('AI speaking:', event.detail);
		isSpeaking = event.detail;
	}

	function handleError(event) {
		console.error('Agent error:', event.detail);
		error = event.detail;
		isDisconnecting = false;
		isConnecting = false;
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

	// PromptCustomizer 이벤트 핸들러
	function handlePromptUpdated(event) {
		customPrompt = event.detail.prompt;
		promptId = event.detail.promptId || null;
		promptName = event.detail.promptName || '';
		console.log('프롬프트 업데이트됨:', {
			prompt: customPrompt,
			promptId,
			promptName
		});
		
		// 연결 중이면 알림 메시지 표시
		if (isConnected) {
			const messageWithTimestamp = {
				speaker: '시스템',
				message: `🔄 프롬프트가 "${promptName}"로 업데이트되었습니다. 다음 연결 시 새로운 설정이 적용됩니다.`,
				timestamp: new Date().toLocaleTimeString()
			};
			messages = [...messages, messageWithTimestamp];
			
			if (conversationManager) {
				conversationManager.addMessage(messageWithTimestamp.speaker, messageWithTimestamp.message);
			}
		}
	}

	// 탭 전환
	function toggleHistoryView() {
		console.log('대화 기록 탭 클릭, 현재 상태:', { showHistory, showPromptCustomizer });
		showHistory = !showHistory;
		showPromptCustomizer = false;
		console.log('대화 기록 탭 변경 후:', { showHistory, showPromptCustomizer });
	}
	
	function togglePromptCustomizer() {
		console.log('프롬프트 관리 탭 클릭, 현재 상태:', { showHistory, showPromptCustomizer });
		showPromptCustomizer = !showPromptCustomizer;
		showHistory = false;
		console.log('프롬프트 관리 탭 변경 후:', { showHistory, showPromptCustomizer });
	}

	function selectCurrentTab() {
		console.log('현재 대화 탭 클릭, 현재 상태:', { showHistory, showPromptCustomizer });
		showHistory = false;
		showPromptCustomizer = false;
		console.log('현재 대화 탭 변경 후:', { showHistory, showPromptCustomizer });
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
			<!-- 실시간 에이전트 컴포넌트 (먼저 마운트해야 bind:this가 설정됨) -->
			<RealtimeAgent
				bind:this={realtimeAgent}
				{customPrompt}
				conversationId={$currentConversation.id}
				on:connecting={handleConnecting}
				on:connected={handleConnected}
				on:disconnecting={handleDisconnecting}
				on:disconnected={handleDisconnected}
				on:speaking={handleSpeaking}
				on:message={handleMessage}
				on:message-with-usage={handleMessageWithUsage}
				on:debug={handleDebug}
				on:error={handleError}
			/>
			
			<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<!-- 메인 대화 영역 -->
				<div class="lg:col-span-2 space-y-6">
					<!-- 대화 세션 관리 -->
					<ConversationManager
						bind:this={conversationManager}
						{isConnected}
						{isConnecting}
						{customPrompt}
						{promptId}
						{promptName}
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
								class="px-4 py-2 text-sm font-medium border-b-2 transition-colors {!showHistory && !showPromptCustomizer
									? 'border-blue-500 text-blue-600' 
									: 'border-transparent text-gray-500 hover:text-gray-700'}"
								on:click={selectCurrentTab}
							> 
								현재 대화
							</button>
							<button
								class="px-4 py-2 text-sm font-medium border-b-2 transition-colors {showHistory 
									? 'border-blue-500 text-blue-600' 
									: 'border-transparent text-gray-500 hover:text-gray-700'}"
								on:click={toggleHistoryView}
							>
								대화 기록
							</button>
							<button
								class="px-4 py-2 text-sm font-medium border-b-2 transition-colors {showPromptCustomizer 
									? 'border-blue-500 text-blue-600' 
									: 'border-transparent text-gray-500 hover:text-gray-700'}"
								on:click={togglePromptCustomizer}
							>
								프롬프트 관리
							</button>
						</div>
					</div>

					{#if showPromptCustomizer}
						<!-- 프롬프트 관리 -->
						<PromptCustomizer 
							{isConnected}
							{customPrompt}
							on:prompt-updated={handlePromptUpdated}
						/>
						{console.log('프롬프트 관리 컴포넌트 렌더링')}
					{:else if showHistory}
						<!-- 저장된 대화 기록 -->
						<ConversationHistory />
						{console.log('대화 기록 컴포넌트 렌더링')}
					{:else}
						<!-- 현재 대화 로그 -->
						<ConversationLog {messages} />
						{console.log('현재 대화 로그 컴포넌트 렌더링')}
					{/if}
				</div>
			</div>
		{/if}
	</div>
</div>
