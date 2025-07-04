<!-- src/lib/components/RealtimeAgent.svelte -->
<script>
	import { createEventDispatcher, onMount } from 'svelte';
	import { WebRTCManager } from './WebRTCManager.js';
	import { RealtimeEventHandler } from './RealtimeEventHandler.js';
	import { ConnectionManager } from './ConnectionManager.js';
	import { UsageTracker } from '$lib/utils/usageTracker.js';
	
	const dispatch = createEventDispatcher();
	
	export let isConnected = false;
	export let isConnecting = false;
	export let isSpeaking = false;
	export let isDisconnecting = false;
	export let error = null;
	export let customPrompt = '';
	export let conversationId = null; // 현재 대화 ID
	
	let debugInfo = [];
	
	// 매니저 인스턴스들
	let webRTCManager;
	let eventHandler;
	let connectionManager;
	let usageTracker;
	
	// 디버그 로그 추가 함수
	function addDebugLog(message, data = null) {
		const timestamp = new Date().toLocaleTimeString();
		const logEntry = { timestamp, message, data };
		debugInfo = [logEntry, ...debugInfo].slice(0, 20); // 최근 20개만 유지
		console.log(`[${timestamp}] ${message}`, data || '');
		
		// 디버그 정보를 부모 컴포넌트로 전달
		dispatch('debug', logEntry);
	}
	
	// 매니저 초기화
	function initializeManagers() {
		webRTCManager = new WebRTCManager(addDebugLog);
		eventHandler = new RealtimeEventHandler(addDebugLog, dispatch);
		connectionManager = new ConnectionManager(addDebugLog);
		usageTracker = new UsageTracker();
		
		// 이벤트 핸들러에 사용량 추적기 설정
		eventHandler.setUsageTracker(usageTracker);
		
		// 사용량 추적 이벤트 리스닝
		eventHandler.aiResponseHandler.dispatch = (eventType, data) => {
			dispatch(eventType, data);
			
			// 사용량 추적 이벤트 처리
			if (eventType === 'usage-tracked') {
				handleUsageTracked(data);
			}
		};
	}
	
	// 사용량 추적 이벤트 핸들러
	function handleUsageTracked(data) {
		addDebugLog('📊 사용량 추적됨', {
			cost: `$${UsageTracker.centsToUSD(data.costs.totalCostCents)}`,
			inputTokens: UsageTracker.formatTokenCount(data.usage.inputTokens),
			outputTokens: UsageTracker.formatTokenCount(data.usage.outputTokens),
			accumulatedCost: `$${UsageTracker.centsToUSD(data.accumulated.totalCostCents)}`
		});
		
		// 부모 컴포넌트에 사용량 정보 전달
		dispatch('usage-update', data);
	}
	
	// 대화 ID 변경 감지
	$: if (conversationId && usageTracker) {
		usageTracker.startConversationSession(conversationId);
		addDebugLog('📊 사용량 추적 세션 시작', { conversationId });
	}
	
	// 예상치 못한 연결 끊김 처리
	function handleUnexpectedDisconnection() {
		if (!isDisconnecting) {
			addDebugLog('⚠️ 예상치 못한 연결 끊김 감지');
			isConnected = false;
			dispatch('disconnected');
			dispatch('message', {
				speaker: '시스템',
				message: '연결이 예상치 못하게 끊어졌습니다.',
				timestamp: new Date().toLocaleTimeString()
			});
		}
	}
	
	// 데이터 채널 이벤트 핸들러들
	function onDataChannelOpen() {
		addDebugLog('✅ 데이터 채널 열림');
		isConnected = true;
		isConnecting = false;
		
		// 🔥 중요: 이벤트 핸들러에게 연결 상태 업데이트 알림
		if (eventHandler) {
			eventHandler.updateConnectionState(true, false);
			addDebugLog('✅ 이벤트 핸들러 연결 상태 업데이트됨', {
				isConnected: true,
				isDisconnecting: false
			});
		}
		
		// 연결 완료 후 세션 시작
		const sessionConfig = connectionManager.createSessionConfig(customPrompt);
		addDebugLog('📤 세션 설정 전송', sessionConfig);
		eventHandler.sendEvent(sessionConfig, webRTCManager);
		
		// 오디오 입력 시작 (명시적으로)
		const startAudioEvent = {
			type: 'input_audio_buffer.clear'
		};
		addDebugLog('📤 오디오 버퍼 초기화', startAudioEvent);
		eventHandler.sendEvent(startAudioEvent, webRTCManager);
		
		dispatch('connected');
		dispatch('message', {
			speaker: '시스템',
			message: '영어 회화 AI에 연결되었습니다! 자유롭게 대화해보세요.',
			timestamp: new Date().toLocaleTimeString()
		});
		
		// 연결 상태 검증
		connectionManager.validateConnectionState(webRTCManager, isConnected, isConnecting);
	}
	
	function onDataChannelMessage(event) {
		eventHandler.handleRealtimeEvent(event, webRTCManager.dataChannel);
		// speaking 상태 동기화
		isSpeaking = eventHandler.getSpeakingState();
	}
	
	function onDataChannelClose() {
		addDebugLog('❌ 데이터 채널 닫힘');
		if (!isDisconnecting) {
			handleUnexpectedDisconnection();
		}
	}
	
	function onDataChannelError(event) {
		addDebugLog('❌ 데이터 채널 오류', event);
		if (!isDisconnecting) {
			handleUnexpectedDisconnection();
		}
	}
	
	// WebRTC 연결 초기화
	export async function connect() {
		try {
			isConnecting = true;
			error = null;
			
			// 🔥 연결 시작 이벤트 발생
			dispatch('connecting');
			
			const connectionId = connectionManager.generateConnectionId();
			addDebugLog('🚀 연결 시작', { connectionId });
			
			// 상태 업데이트 및 이벤트 핸들러 차단 상태 초기화
			if (eventHandler) {
				eventHandler.resetBlockState(); // 차단 상태 초기화
				// 연결 중 상태로 업데이트 (아직 연결되지 않았으므로 false, false)
				eventHandler.updateConnectionState(false, false);
				addDebugLog('🔄 이벤트 핸들러 초기 상태 설정', {
					isConnected: false,
					isDisconnecting: false,
					forceBlocked: false
				});
			}
			
			// 1. 서버에서 ephemeral token 가져오기
			const ephemeralKey = await connectionManager.requestEphemeralToken();
			
			// 2. WebRTC 연결 설정
			await webRTCManager.setupWebRTCConnection();
			webRTCManager.setupConnectionStateMonitoring(handleUnexpectedDisconnection);
			
			// 3. 오디오 요소 설정
			webRTCManager.setupAudioElement();
			
			// 4. 마이크 입력 추가
			await webRTCManager.setupMicrophone();
			
			// 5. 데이터 채널 설정
			webRTCManager.setupDataChannel(
				onDataChannelOpen,
				onDataChannelMessage,
				onDataChannelClose,
				onDataChannelError
			);
			
			// 6. WebRTC 연결 시작
			const offer = await webRTCManager.createOfferAndSetLocal();
			
			// 7. SDP 교환
			const answerSdp = await connectionManager.exchangeSDP(offer, ephemeralKey);
			await webRTCManager.setRemoteDescription(answerSdp);
			
		} catch (err) {
			addDebugLog('💥 연결 오류 발생', {
				name: err.name,
				message: err.message,
				stack: err.stack
			});
			
			error = `연결 실패: ${err.message}`;
			isConnecting = false;
			isConnected = false;
			
			// 연결 실패 시 정리
			await forceCleanup();
			
			dispatch('error', error);
		}
	}
	
	// 강제 정리 함수
	async function forceCleanup() {
		addDebugLog('🧹 강제 정리 시작');
		
		connectionManager.clearForceDisconnectTimeout();
		
		if (webRTCManager) {
			webRTCManager.cleanup();
		}
		
		// 사용량 추적 세션 종료
		if (usageTracker) {
			await usageTracker.endConversationSession();
			addDebugLog('📊 사용량 추적 세션 종료');
		}
		
		// 상태 초기화
		isConnected = false;
		isConnecting = false;
		isSpeaking = false;
		isDisconnecting = false;
		
		if (eventHandler) {
			eventHandler.updateConnectionState(false, false);
			eventHandler.updateSpeakingState(false);
			eventHandler.resetBlockState(); // 차단 상태도 초기화
		}
		
		connectionManager.reset();
		
		addDebugLog('✅ 강제 정리 완료');
	}
	
	// 연결 해제 (사용자가 버튼을 눌렀을 때)
	export async function disconnect() {
		if (isDisconnecting) {
			addDebugLog('⚠️ 이미 연결 해제 중입니다');
			return;
		}
		
		addDebugLog('🔌 연결 해제 시작 - 모든 통신 즉시 차단');
		
		// 1. 즉시 모든 상태를 해제 상태로 변경
		isDisconnecting = true;
		isConnected = false;
		isSpeaking = false;
		
		// 2. 이벤트 핸들러 상태 즉시 업데이트 (추가 이벤트 처리 차단)
		if (eventHandler) {
			eventHandler.updateConnectionState(false, true);
			eventHandler.updateSpeakingState(false);
		}
		
		// 3. WebRTC 강제 차단 (새로운 메서드 사용)
		if (webRTCManager) {
			webRTCManager.forceDisconnect();
		}
		
		// 4. 사용량 추적 세션 종료
		if (usageTracker) {
			await usageTracker.endConversationSession();
			addDebugLog('📊 사용량 추적 세션 종료됨');
		}
		
		// 5. 사용자에게 즉시 피드백
		dispatch('disconnected');
		dispatch('message', {
			speaker: '시스템',
			message: '🛑 연결 해제됨 - 모든 API 통신과 오디오가 즉시 중단되었습니다.',
			timestamp: new Date().toLocaleTimeString()
		});
		
		// 6. 강제 종료 타이머 설정 (3초로 단축)
		connectionManager.setForceDisconnectTimeout(async () => {
			addDebugLog('⏰ 강제 종료 타이머 실행됨');
			await forceCleanup();
			dispatch('message', {
				speaker: '시스템',
				message: '✅ 모든 리소스가 강제로 정리되었습니다.',
				timestamp: new Date().toLocaleTimeString()
			});
		}, 3000);
		
		try {
			// 7. 완전한 정리 수행
			await forceCleanup();
			
			addDebugLog('✅ 연결 해제 완료');
			dispatch('message', {
				speaker: '시스템',
				message: '✅ 연결이 완전히 종료되었습니다. 과금이 중단되었습니다.',
				timestamp: new Date().toLocaleTimeString()
			});
			
		} catch (error) {
			addDebugLog('💥 연결 해제 중 오류 발생', error);
			// 오류가 발생해도 강제 정리는 수행
			await forceCleanup();
			
			dispatch('error', `연결 해제 중 오류: ${error.message}`);
		}
	}
	
	// 현재 세션 사용량 조회
	export function getCurrentUsage() {
		return usageTracker ? usageTracker.getCurrentSessionUsage() : null;
	}
	
	// 연결 상태 확인 함수 (외부에서 호출 가능)
	export function getConnectionStatus() {
		if (!connectionManager || !webRTCManager) {
			return { error: '매니저가 초기화되지 않았습니다.' };
		}
		return connectionManager.validateConnectionState(webRTCManager, isConnected, isConnecting);
	}
	
	// 디버그 정보 내보내기
	export function getDebugInfo() {
		return debugInfo;
	}
	
	// 컴포넌트 정리
	onMount(() => {
		addDebugLog('🎬 RealtimeAgent 컴포넌트 마운트됨');
		initializeManagers();
		
		return async () => {
			addDebugLog('🎬 RealtimeAgent 컴포넌트 언마운트됨');
			await forceCleanup();
		};
	});
</script> 