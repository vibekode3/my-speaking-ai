// src/lib/components/RealtimeEventHandler.js
import { StateManager } from './handlers/StateManager.js';
import { UserSpeechHandler } from './handlers/UserSpeechHandler.js';
import { AIResponseHandler } from './handlers/AIResponseHandler.js';
import { SessionEventHandler } from './handlers/SessionEventHandler.js';

export class RealtimeEventHandler {
	constructor(debugLogger, eventDispatcher) {
		this.debugLogger = debugLogger;
		this.dispatch = eventDispatcher;
		
		// 분리된 핸들러들 초기화
		this.stateManager = new StateManager(debugLogger);
		this.userSpeechHandler = new UserSpeechHandler(debugLogger, eventDispatcher);
		this.aiResponseHandler = new AIResponseHandler(debugLogger, eventDispatcher);
		this.sessionEventHandler = new SessionEventHandler(debugLogger, eventDispatcher);
	}

	// 사용량 추적기 설정
	setUsageTracker(usageTracker) {
		this.aiResponseHandler.setUsageTracker(usageTracker);
	}

	updateConnectionState(isConnected, isDisconnecting) {
		this.stateManager.updateConnectionState(isConnected, isDisconnecting);
	}

	updateSpeakingState(isSpeaking) {
		return this.stateManager.updateSpeakingState(isSpeaking);
	}

	getSpeakingState() {
		return this.stateManager.getSpeakingState();
	}

	resetBlockState() {
		this.stateManager.resetBlockState();
		this.userSpeechHandler.resetTranscript();
		this.aiResponseHandler.resetResponse();
	}

	handleRealtimeEvent(event, dataChannel) {
		// 상태 체크를 더 상세하게 로깅
		const blockReasons = this.stateManager.getBlockReasons(dataChannel);
		
		if (blockReasons.length > 0) {
			this.debugLogger('🚫 이벤트 처리 차단됨', {
				차단_이유: blockReasons,
				forceBlocked: this.stateManager.forceBlocked,
				isDisconnecting: this.stateManager.isDisconnecting,
				isConnected: this.stateManager.isConnected,
				hasDataChannel: !!dataChannel,
				dataChannelState: dataChannel?.readyState
			});
			return;
		}

		try {
			const realtimeEvent = JSON.parse(event.data);
			
			if (this.stateManager.isBlocked()) {
				this.debugLogger('🚫 이벤트 파싱 후 차단됨', {
					type: realtimeEvent.type,
					eventId: realtimeEvent.event_id
				});
				return;
			}
			
			// 모든 이벤트를 상세하게 로깅
			this.debugLogger('📨 실시간 이벤트 수신', {
				type: realtimeEvent.type,
				eventId: realtimeEvent.event_id,
				fullEvent: realtimeEvent // 전체 이벤트 데이터 포함
			});

			// 음성-텍스트 변환 관련 이벤트 강조 표시
			if (realtimeEvent.type.includes('transcription') || realtimeEvent.type.includes('audio_transcript')) {
				console.log('🔥 [음성→텍스트 변환 이벤트 감지]', {
					이벤트_타입: realtimeEvent.type,
					이벤트_ID: realtimeEvent.event_id,
					전체_이벤트: realtimeEvent
				});
			}

			this._routeEvent(realtimeEvent);
		} catch (err) {
			this.debugLogger('💥 이벤트 파싱 오류', {
				error: err.message,
				rawData: event.data
			});
		}
	}

	_routeEvent(realtimeEvent) {
		switch (realtimeEvent.type) {
			// 대화 아이템 생성
			case 'conversation.item.created':
				this.aiResponseHandler.handleConversationItemCreated(realtimeEvent, this.stateManager);
				break;
			
			// 사용자 음성 인식 관련
			case 'conversation.item.input_audio_transcription.completed':
				this.userSpeechHandler.handleInputAudioTranscriptionCompleted(realtimeEvent, this.stateManager);
				break;
			
			case 'conversation.item.input_audio_transcription.delta':
				this.userSpeechHandler.handleInputAudioTranscriptionDelta(realtimeEvent, this.stateManager);
				break;
			
			case 'input_audio_buffer.committed':
				this.userSpeechHandler.handleInputAudioBufferCommitted(realtimeEvent, this.stateManager);
				break;
			
			// AI 응답 관련
			case 'response.created':
				this.aiResponseHandler.handleResponseCreated(realtimeEvent, this.stateManager);
				break;
			
			case 'response.audio_transcript.delta':
				this.aiResponseHandler.handleAudioTranscriptDelta(realtimeEvent, this.stateManager);
				break;
			
			case 'response.audio_transcript.done':
				this.aiResponseHandler.handleAudioTranscriptDone(realtimeEvent, this.stateManager);
				break;
			
			case 'response.done':
				this.aiResponseHandler.handleResponseDone(realtimeEvent, this.stateManager);
				break;
			
			// 세션 관련 이벤트
			case 'session.created':
			case 'session.updated':
				this.sessionEventHandler.handleSessionEvent(realtimeEvent, this.stateManager);
				break;
			
			// 입력 오디오 버퍼 관련
			case 'input_audio_buffer.cleared':
				this.sessionEventHandler.handleInputAudioBufferEvent(realtimeEvent, this.stateManager);
				break;
			
			// 오류 처리
			case 'error':
				this.sessionEventHandler.handleError(realtimeEvent, this.stateManager);
				break;
			
			// 기타 이벤트
			default:
				this.sessionEventHandler.handleUnknownEvent(realtimeEvent, this.stateManager);
				break;
		}
	}

	sendEvent(event, webRTCManager) {
		if (this.stateManager.isBlocked()) {
			this.debugLogger('🚫 이벤트 전송 차단됨', {
				eventType: event.type,
				forceBlocked: this.stateManager.forceBlocked,
				isDisconnecting: this.stateManager.isDisconnecting,
				isConnected: this.stateManager.isConnected
			});
			return false;
		}

		return webRTCManager.sendDataChannelMessage(event);
	}

	// 하위 호환성을 위한 속성 접근자들
	get isConnected() {
		return this.stateManager.isConnected;
	}

	get isDisconnecting() {
		return this.stateManager.isDisconnecting;
	}

	get isSpeaking() {
		return this.stateManager.isSpeaking;
	}

	get forceBlocked() {
		return this.stateManager.forceBlocked;
	}
} 