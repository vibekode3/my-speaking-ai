export class UserSpeechHandler {
	constructor(debugLogger, eventDispatcher) {
		this.debugLogger = debugLogger;
		this.dispatch = eventDispatcher;
		this.currentUserTranscript = ''; // 사용자 음성 인식 누적용
	}

	handleInputAudioBufferCommitted(realtimeEvent, stateManager) {
		if (stateManager.isBlocked()) {
			this.debugLogger('🚫 input_audio_buffer.committed 이벤트 차단됨');
			return;
		}
		
		console.log('🎤💾 [사용자 음성 버퍼 커밋됨 - 음성 인식 준비]', {
			아이템_ID: realtimeEvent.item_id,
			이전_아이템_ID: realtimeEvent.previous_item_id,
			전체_이벤트: realtimeEvent
		});
		
		this.debugLogger('📝 오디오 버퍼 커밋됨', {
			itemId: realtimeEvent.item_id,
			previousItemId: realtimeEvent.previous_item_id
		});
		
		// 사용자가 말하기 시작했음을 표시
		this.currentUserTranscript = '';
	}

	handleInputAudioTranscriptionDelta(realtimeEvent, stateManager) {
		if (stateManager.isBlocked()) {
			this.debugLogger('🚫 input_audio_transcription.delta 이벤트 차단됨');
			return;
		}
		
		if (realtimeEvent.delta) {
			this.currentUserTranscript += realtimeEvent.delta;
			
			// 실시간 스트리밍 콘솔 로그
			console.log('🎤📝 [사용자 음성→텍스트 실시간]', {
				새로운_단어: realtimeEvent.delta,
				현재까지_누적: this.currentUserTranscript,
				이벤트_데이터: realtimeEvent
			});
			
			this.debugLogger('📝 사용자 음성 인식 스트리밍', { 
				delta: realtimeEvent.delta,
				accumulated: this.currentUserTranscript 
			});
		}
	}

	handleInputAudioTranscriptionCompleted(realtimeEvent, stateManager) {
		if (stateManager.isBlocked()) {
			this.debugLogger('🚫 input_audio_transcription.completed 이벤트 차단됨');
			return;
		}
		
		const finalTranscript = realtimeEvent.transcript || this.currentUserTranscript;
		
		// 콘솔에 명확하게 표시
		console.log('🎤➡️📝 [사용자 음성→텍스트 완료]', {
			원본_음성_데이터: realtimeEvent,
			최종_텍스트: finalTranscript,
			누적된_텍스트: this.currentUserTranscript,
			타임스탬프: new Date().toLocaleTimeString()
		});
		
		if (finalTranscript && finalTranscript.trim()) {
			this.dispatch('message', {
				speaker: '나',
				message: finalTranscript,
				timestamp: new Date().toLocaleTimeString()
			});
			this.debugLogger('👤 사용자 음성 인식 완료', { 
				transcript: finalTranscript 
			});
			
			// 추가 콘솔 로그
			console.log('✅ [사용자 발언 확정]', `"${finalTranscript}"`);
		}
		
		// 사용자 음성 인식 초기화
		this.currentUserTranscript = '';
	}

	resetTranscript() {
		this.currentUserTranscript = '';
	}
} 