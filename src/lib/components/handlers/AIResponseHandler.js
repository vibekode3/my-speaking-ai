import { UsageTracker } from '$lib/utils/usageTracker.js';

export class AIResponseHandler {
	constructor(debugLogger, eventDispatcher) {
		this.debugLogger = debugLogger;
		this.dispatch = eventDispatcher;
		this.currentAIResponse = ''; // AI 응답 누적용
		this.usageTracker = null; // 사용량 추적기
		this.lastAIMessage = null; // 마지막 AI 메시지 저장
	}

	// 사용량 추적기 설정
	setUsageTracker(usageTracker) {
		this.usageTracker = usageTracker;
	}

	handleConversationItemCreated(realtimeEvent, stateManager) {
		if (stateManager.isBlocked()) {
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
			stateManager.updateSpeakingState(true);
			this.currentAIResponse = '';
			this.lastAIMessage = null; // 초기화
			this.dispatch('speaking', true);
			console.log('🤖🎤 [AI 음성 응답 시작]', {
				아이템_ID: item.id,
				상태: item.status,
				전체_데이터: item
			});
			this.debugLogger('🗣️ AI 응답 시작');
		}
	}

	handleResponseCreated(realtimeEvent, stateManager) {
		if (stateManager.isBlocked()) {
			this.debugLogger('🚫 response.created 이벤트 차단됨');
			return;
		}
		
		this.debugLogger('🚀 AI 응답 생성 시작', {
			responseId: realtimeEvent.response?.id
		});
		this.currentAIResponse = '';
		this.lastAIMessage = null; // 초기화
	}

	handleAudioTranscriptDelta(realtimeEvent, stateManager) {
		if (stateManager.isBlocked()) {
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

	handleAudioTranscriptDone(realtimeEvent, stateManager) {
		if (stateManager.isBlocked()) {
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
			const messageData = {
				speaker: 'AI 선생님',
				message: finalTranscript,
				timestamp: new Date().toLocaleTimeString()
			};
			
			// 메시지 저장 (나중에 사용량 정보가 추가될 예정)
			this.lastAIMessage = messageData;
			
			this.dispatch('message', messageData);
			this.debugLogger('✅ AI 응답 텍스트 완료', { 
				transcript: finalTranscript 
			});
			
			// 추가 콘솔 로그
			console.log('✅ [AI 응답 확정]', `"${finalTranscript}"`);
		}
		
		// 응답 텍스트는 완료되었지만 오디오는 계속 재생 중일 수 있음
	}

	async handleResponseDone(realtimeEvent, stateManager) {
		if (stateManager.isBlocked()) {
			this.debugLogger('🚫 response.done 이벤트 차단됨');
			return;
		}
		
		stateManager.updateSpeakingState(false);
		this.dispatch('speaking', false);
		
		console.log('🤖🏁 [AI 응답 완전히 완료 - 음성+텍스트 모두 끝남]', {
			응답_ID: realtimeEvent.response?.id,
			상태: realtimeEvent.response?.status,
			사용량_데이터: realtimeEvent.response?.usage,
			전체_응답_데이터: realtimeEvent.response,
			완료_시간: new Date().toLocaleTimeString()
		});
		
		this.debugLogger('🏁 AI 응답 완전히 완료', {
			responseId: realtimeEvent.response?.id,
			status: realtimeEvent.response?.status,
			usage: realtimeEvent.response?.usage
		});

		// 🔥 사용량 추적 - response.done 이벤트에서 토큰 사용량 기록
		if (this.usageTracker && realtimeEvent.response?.usage) {
			try {
				const result = await this.usageTracker.trackUsage(
					realtimeEvent.response, // 전체 응답 데이터 (usage 포함)
					'response.done',
					realtimeEvent.response?.model || 'gpt-4o-realtime-preview-2024-12-17'
				);

				if (result) {
					// 사용량 정보 구성
					const usageInfo = {
						model_name: realtimeEvent.response?.model || 'gpt-4o-realtime-preview-2024-12-17',
						input_tokens: result.usage.inputTokens,
						output_tokens: result.usage.outputTokens,
						input_text_tokens: result.usage.inputTextTokens,
						input_audio_tokens: result.usage.inputAudioTokens,
						output_text_tokens: result.usage.outputTextTokens,
						output_audio_tokens: result.usage.outputAudioTokens,
						total_cost_cents: result.costs.totalCostCents,
						response_id: realtimeEvent.response?.id
					};

					// 마지막 AI 메시지에 사용량 정보 추가하여 이벤트 발송
					if (this.lastAIMessage) {
						this.dispatch('message-with-usage', {
							message: this.lastAIMessage,
							usage: usageInfo
						});

						console.log('💾 [AI 메시지 + 사용량 정보 이벤트 발송]', {
							메시지: this.lastAIMessage.message,
							사용량: usageInfo
						});
					}

					// 기존 사용량 추적 이벤트도 유지
					this.dispatch('usage-tracked', {
						usage: result.usage,
						costs: result.costs,
						accumulated: result.accumulated,
						responseId: realtimeEvent.response?.id
					});

					// 사용량 정보를 메시지로 표시 (선택적)
					const costUSD = UsageTracker.centsToUSD(result.costs.totalCostCents);
					const inputTokens = UsageTracker.formatTokenCount(result.usage.inputTokens);
					const outputTokens = UsageTracker.formatTokenCount(result.usage.outputTokens);
					
					console.log('💰 [이번 응답 비용]', {
						비용: `$${costUSD}`,
						입력_토큰: inputTokens,
						출력_토큰: outputTokens,
						누적_비용: `$${UsageTracker.centsToUSD(result.accumulated.totalCostCents)}`
					});

					this.debugLogger('💰 사용량 추적 완료', {
						costUSD: `$${costUSD}`,
						inputTokens,
						outputTokens,
						accumulatedCost: `$${UsageTracker.centsToUSD(result.accumulated.totalCostCents)}`
					});
				}
			} catch (error) {
				console.error('💥 사용량 추적 실패:', error);
				this.debugLogger('💥 사용량 추적 실패', { error: error.message });
			}
		} else if (!realtimeEvent.response?.usage) {
			this.debugLogger('⚠️ 사용량 데이터가 없습니다', { response: realtimeEvent.response });
		}
		
		// 응답 초기화
		this.currentAIResponse = '';
		this.lastAIMessage = null;
	}

	resetResponse() {
		this.currentAIResponse = '';
		this.lastAIMessage = null;
	}
} 