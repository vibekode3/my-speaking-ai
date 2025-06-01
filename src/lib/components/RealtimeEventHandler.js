export class RealtimeEventHandler {
	constructor(debugLogger, eventDispatcher) {
		this.debugLogger = debugLogger;
		this.dispatch = eventDispatcher;
		this.isConnected = false;
		this.isDisconnecting = false;
		this.isSpeaking = false;
		this.forceBlocked = false;
		this.currentAIResponse = ''; // AI 응답 누적용
		this.currentUserTranscript = ''; // 사용자 음성 인식 누적용
	}

	updateConnectionState(isConnected, isDisconnecting) {
		const previousState = {
			isConnected: this.isConnected,
			isDisconnecting: this.isDisconnecting,
			forceBlocked: this.forceBlocked
		};
		
		this.isConnected = isConnected;
		this.isDisconnecting = isDisconnecting;
		
		if (isDisconnecting) {
			this.forceBlocked = true;
			this.isSpeaking = false;
			this.debugLogger('🚫 이벤트 핸들러 강제 차단 활성화');
		} else if (isConnected) {
			this.forceBlocked = false;
			this.debugLogger('✅ 이벤트 핸들러 차단 해제');
		}
		
		const newState = {
			isConnected: this.isConnected,
			isDisconnecting: this.isDisconnecting,
			forceBlocked: this.forceBlocked
		};
		
		this.debugLogger('🔄 연결 상태 업데이트', {
			이전_상태: previousState,
			새로운_상태: newState,
			변경사항: {
				isConnected: previousState.isConnected !== newState.isConnected,
				isDisconnecting: previousState.isDisconnecting !== newState.isDisconnecting,
				forceBlocked: previousState.forceBlocked !== newState.forceBlocked
			}
		});
	}

	updateSpeakingState(isSpeaking) {
		if (this.forceBlocked) {
			this.isSpeaking = false;
			return false;
		}
		
		this.isSpeaking = isSpeaking;
		return this.isSpeaking;
	}

	handleRealtimeEvent(event, dataChannel) {
		// 상태 체크를 더 상세하게 로깅
		const blockReasons = [];
		if (this.forceBlocked) blockReasons.push('forceBlocked=true');
		if (this.isDisconnecting) blockReasons.push('isDisconnecting=true');
		if (!this.isConnected) blockReasons.push('isConnected=false');
		if (!dataChannel) blockReasons.push('dataChannel=null');
		if (dataChannel && dataChannel.readyState !== 'open') blockReasons.push(`dataChannelState=${dataChannel.readyState}`);
		
		if (blockReasons.length > 0) {
			this.debugLogger('🚫 이벤트 처리 차단됨', {
				차단_이유: blockReasons,
				forceBlocked: this.forceBlocked,
				isDisconnecting: this.isDisconnecting,
				isConnected: this.isConnected,
				hasDataChannel: !!dataChannel,
				dataChannelState: dataChannel?.readyState
			});
			return;
		}

		try {
			const realtimeEvent = JSON.parse(event.data);
			
			if (this.forceBlocked || this.isDisconnecting) {
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

			switch (realtimeEvent.type) {
				// 대화 아이템 생성
				case 'conversation.item.created':
					this.handleConversationItemCreated(realtimeEvent);
					break;
				
				// 사용자 음성 인식 완료
				case 'conversation.item.input_audio_transcription.completed':
					this.handleInputAudioTranscriptionCompleted(realtimeEvent);
					break;
				
				// 사용자 음성 인식 스트리밍
				case 'conversation.item.input_audio_transcription.delta':
					this.handleInputAudioTranscriptionDelta(realtimeEvent);
					break;
				
				// AI 응답 시작
				case 'response.created':
					this.handleResponseCreated(realtimeEvent);
					break;
				
				// AI 응답 텍스트 스트리밍
				case 'response.audio_transcript.delta':
					this.handleAudioTranscriptDelta(realtimeEvent);
					break;
				
				// AI 응답 텍스트 완료
				case 'response.audio_transcript.done':
					this.handleAudioTranscriptDone(realtimeEvent);
					break;
				
				// 응답 완료
				case 'response.done':
					this.handleResponseDone(realtimeEvent);
					break;
				
				// 오류 처리
				case 'error':
					this.handleError(realtimeEvent);
					break;
				
				// 세션 관련 이벤트
				case 'session.created':
				case 'session.updated':
					this.debugLogger('📋 세션 이벤트', { type: realtimeEvent.type });
					break;
				
				// 입력 오디오 버퍼 관련
				case 'input_audio_buffer.committed':
					this.handleInputAudioBufferCommitted(realtimeEvent);
					break;
				case 'input_audio_buffer.cleared':
					this.debugLogger('📋 오디오 버퍼 이벤트', { type: realtimeEvent.type });
					break;
				
				default:
					this.debugLogger('📋 기타 이벤트', { 
						type: realtimeEvent.type,
						data: realtimeEvent 
					});
					break;
			}
		} catch (err) {
			this.debugLogger('💥 이벤트 파싱 오류', {
				error: err.message,
				rawData: event.data
			});
		}
	}

	handleConversationItemCreated(realtimeEvent) {
		if (this.forceBlocked || this.isDisconnecting) {
			this.debugLogger('🚫 conversation.item.created 이벤트 차단됨');
			return;
		}
		
		const item = realtimeEvent.item;
		this.debugLogger('📝 대화 아이템 생성됨', {
			type: item.type,
			role: item.role,
			status: item.status
		});
		
		// 사용자 메시지인 경우 (role: 'user')
		if (item.type === 'message' && item.role === 'user') {
			// 사용자 메시지는 transcription 완료 이벤트에서 처리
			console.log('👤🎤 [사용자 음성 인식 시작]', {
				아이템_ID: item.id,
				상태: item.status,
				전체_데이터: item
			});
			this.debugLogger('👤 사용자 메시지 아이템 생성됨');
		}
		
		// AI 응답 시작인 경우 (role: 'assistant')
		if (item.type === 'message' && item.role === 'assistant') {
			this.isSpeaking = true;
			this.currentAIResponse = '';
			this.dispatch('speaking', true);
			console.log('🤖🎤 [AI 음성 응답 시작]', {
				아이템_ID: item.id,
				상태: item.status,
				전체_데이터: item
			});
			this.debugLogger('🗣️ AI 응답 시작');
		}
	}

	handleInputAudioTranscriptionCompleted(realtimeEvent) {
		if (this.forceBlocked || this.isDisconnecting) {
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

	handleInputAudioTranscriptionDelta(realtimeEvent) {
		if (this.forceBlocked || this.isDisconnecting) {
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

	handleResponseCreated(realtimeEvent) {
		if (this.forceBlocked || this.isDisconnecting) {
			this.debugLogger('🚫 response.created 이벤트 차단됨');
			return;
		}
		
		this.debugLogger('🚀 AI 응답 생성 시작', {
			responseId: realtimeEvent.response?.id
		});
		this.currentAIResponse = '';
	}

	handleAudioTranscriptDelta(realtimeEvent) {
		if (this.forceBlocked || this.isDisconnecting) {
			this.debugLogger('🚫 audio_transcript.delta 이벤트 차단됨');
			return;
		}
		
		if (realtimeEvent.delta) {
			this.currentAIResponse += realtimeEvent.delta;
			
			// AI 응답 실시간 스트리밍 콘솔 로그
			console.log('🤖📝 [AI 음성→텍스트 실시간]', {
				새로운_단어: realtimeEvent.delta,
				현재까지_누적: this.currentAIResponse,
				이벤트_데이터: realtimeEvent
			});
			
			this.debugLogger('📝 AI 응답 텍스트 스트리밍', { 
				delta: realtimeEvent.delta,
				accumulated: this.currentAIResponse 
			});
		}
	}

	handleAudioTranscriptDone(realtimeEvent) {
		if (this.forceBlocked || this.isDisconnecting) {
			this.debugLogger('🚫 audio_transcript.done 이벤트 차단됨');
			return;
		}
		
		const finalTranscript = realtimeEvent.transcript || this.currentAIResponse;
		
		// 콘솔에 명확하게 표시
		console.log('🤖➡️📝 [AI 음성→텍스트 완료]', {
			원본_음성_데이터: realtimeEvent,
			최종_텍스트: finalTranscript,
			누적된_텍스트: this.currentAIResponse,
			타임스탬프: new Date().toLocaleTimeString()
		});
		
		if (finalTranscript && finalTranscript.trim()) {
			this.dispatch('message', {
				speaker: 'AI 선생님',
				message: finalTranscript,
				timestamp: new Date().toLocaleTimeString()
			});
			this.debugLogger('✅ AI 응답 텍스트 완료', { 
				transcript: finalTranscript 
			});
			
			// 추가 콘솔 로그
			console.log('✅ [AI 응답 확정]', `"${finalTranscript}"`);
		}
		
		// 응답 텍스트는 완료되었지만 오디오는 계속 재생 중일 수 있음
	}

	handleResponseDone(realtimeEvent) {
		if (this.forceBlocked || this.isDisconnecting) {
			this.debugLogger('🚫 response.done 이벤트 차단됨');
			return;
		}
		
		this.isSpeaking = false;
		this.dispatch('speaking', false);
		
		console.log('🤖🏁 [AI 응답 완전히 완료 - 음성+텍스트 모두 끝남]', {
			응답_ID: realtimeEvent.response?.id,
			상태: realtimeEvent.response?.status,
			전체_응답_데이터: realtimeEvent.response,
			완료_시간: new Date().toLocaleTimeString()
		});
		
		this.debugLogger('🏁 AI 응답 완전히 완료', {
			responseId: realtimeEvent.response?.id,
			status: realtimeEvent.response?.status
		});
		
		// 응답 초기화
		this.currentAIResponse = '';
	}

	handleError(realtimeEvent) {
		this.debugLogger('❌ Realtime API 오류', realtimeEvent.error);
		const error = `API 오류: ${realtimeEvent.error?.message || '알 수 없는 오류'}`;
		this.dispatch('error', error);
	}

	sendEvent(event, webRTCManager) {
		if (this.forceBlocked || this.isDisconnecting || !this.isConnected) {
			this.debugLogger('🚫 이벤트 전송 차단됨', {
				eventType: event.type,
				forceBlocked: this.forceBlocked,
				isDisconnecting: this.isDisconnecting,
				isConnected: this.isConnected
			});
			return false;
		}

		return webRTCManager.sendDataChannelMessage(event);
	}

	getSpeakingState() {
		if (this.forceBlocked) {
			return false;
		}
		return this.isSpeaking;
	}

	resetBlockState() {
		this.forceBlocked = false;
		this.isSpeaking = false;
		this.currentAIResponse = '';
		this.currentUserTranscript = '';
		this.debugLogger('🔄 이벤트 핸들러 차단 상태 초기화');
	}

	handleInputAudioBufferCommitted(realtimeEvent) {
		if (this.forceBlocked || this.isDisconnecting) {
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
} 