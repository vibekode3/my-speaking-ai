export class SessionEventHandler {
	constructor(debugLogger, eventDispatcher) {
		this.debugLogger = debugLogger;
		this.dispatch = eventDispatcher;
	}

	handleSessionEvent(realtimeEvent, stateManager) {
		if (stateManager.isBlocked()) {
			this.debugLogger('🚫 세션 이벤트 차단됨', { type: realtimeEvent.type });
			return;
		}

		this.debugLogger('📋 세션 이벤트', { type: realtimeEvent.type });
	}

	handleInputAudioBufferEvent(realtimeEvent, stateManager) {
		if (stateManager.isBlocked()) {
			this.debugLogger('🚫 오디오 버퍼 이벤트 차단됨', { type: realtimeEvent.type });
			return;
		}

		this.debugLogger('📋 오디오 버퍼 이벤트', { type: realtimeEvent.type });
	}

	handleError(realtimeEvent, stateManager) {
		this.debugLogger('❌ Realtime API 오류', realtimeEvent.error);
		const error = `API 오류: ${realtimeEvent.error?.message || '알 수 없는 오류'}`;
		this.dispatch('error', error);
	}

	handleUnknownEvent(realtimeEvent, stateManager) {
		if (stateManager.isBlocked()) {
			this.debugLogger('🚫 기타 이벤트 차단됨', { type: realtimeEvent.type });
			return;
		}

		this.debugLogger('📋 기타 이벤트', { 
			type: realtimeEvent.type,
			data: realtimeEvent 
		});
	}
} 