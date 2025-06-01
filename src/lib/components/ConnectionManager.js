export class ConnectionManager {
	constructor(debugLogger) {
		this.debugLogger = debugLogger;
		this.connectionId = null;
		this.connectionStartTime = null;
		this.forceDisconnectTimeout = null;
	}

	generateConnectionId() {
		this.connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
		this.connectionStartTime = Date.now();
		return this.connectionId;
	}

	async requestEphemeralToken() {
		this.debugLogger('📤 서버에 토큰 요청 중...');
		const tokenResponse = await fetch('/api/session', {
			method: 'POST'
		});
		
		this.debugLogger('📥 서버 응답 받음', {
			status: tokenResponse.status,
			statusText: tokenResponse.statusText,
			headers: Object.fromEntries(tokenResponse.headers.entries())
		});
		
		if (!tokenResponse.ok) {
			const errorData = await tokenResponse.json();
			this.debugLogger('❌ 서버 토큰 요청 실패', errorData);
			throw new Error(errorData.error || `서버 오류: ${tokenResponse.status}`);
		}
		
		const data = await tokenResponse.json();
		this.debugLogger('✅ 토큰 응답 성공', {
			hasClientSecret: !!data.client_secret,
			hasValue: !!data.client_secret?.value,
			tokenLength: data.client_secret?.value?.length
		});
		
		if (!data.client_secret?.value) {
			throw new Error('서버에서 유효한 토큰을 받지 못했습니다.');
		}
		
		return data.client_secret.value;
	}

	async exchangeSDP(offer, ephemeralKey) {
		const baseUrl = 'https://api.openai.com/v1/realtime';
		const model = 'gpt-4o-realtime-preview-2024-12-17';
		
		this.debugLogger('📤 OpenAI Realtime API에 SDP 전송 중...', {
			url: `${baseUrl}?model=${model}`,
			offerType: offer.type,
			sdpLength: offer.sdp.length
		});
		
		const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
			method: 'POST',
			body: offer.sdp,
			headers: {
				'Authorization': `Bearer ${ephemeralKey}`,
				'Content-Type': 'application/sdp'
			}
		});
		
		this.debugLogger('📥 OpenAI SDP 응답', {
			status: sdpResponse.status,
			statusText: sdpResponse.statusText,
			headers: Object.fromEntries(sdpResponse.headers.entries())
		});
		
		if (!sdpResponse.ok) {
			const errorText = await sdpResponse.text();
			this.debugLogger('❌ SDP 교환 실패', { status: sdpResponse.status, error: errorText });
			throw new Error(`SDP 교환 실패: ${sdpResponse.status} - ${errorText}`);
		}
		
		const answerSdp = await sdpResponse.text();
		return answerSdp;
	}

	createSessionConfig() {
		return {
			type: 'session.update',
			session: {
				turn_detection: {
					type: 'server_vad',
					threshold: 0.5,
					prefix_padding_ms: 300,
					silence_duration_ms: 500
				},
				input_audio_format: 'pcm16',
				output_audio_format: 'pcm16',
				voice: 'alloy',
				input_audio_transcription: {
					model: 'gpt-4o-transcribe',
					prompt: 'This is an English conversation practice session. Expect English words and phrases.',
					language: 'en'
				},
				instructions: `당신은 친근하고 도움이 되는 영어 회화 선생님입니다. 
사용자와 자연스러운 영어 대화를 나누며, 필요시 발음이나 문법에 대한 피드백을 제공해주세요.
대화는 영어로 진행하되, 사용자가 이해하기 어려워하면 한국어로도 설명해주세요.`,
				modalities: ['text', 'audio'],
				temperature: 0.8
			}
		};
	}

	validateConnectionState(webRTCManager, isConnected, isConnecting) {
		const webRTCState = webRTCManager.getConnectionState();
		const state = {
			...webRTCState,
			isConnectedFlag: isConnected,
			isConnectingFlag: isConnecting,
			connectionId: this.connectionId,
			connectionDuration: this.connectionStartTime ? Date.now() - this.connectionStartTime : 0
		};
		
		this.debugLogger('🔍 연결 상태 검증', state);
		return state;
	}

	setForceDisconnectTimeout(callback, timeoutMs = 5000) {
		this.forceDisconnectTimeout = setTimeout(callback, timeoutMs);
	}

	clearForceDisconnectTimeout() {
		if (this.forceDisconnectTimeout) {
			clearTimeout(this.forceDisconnectTimeout);
			this.forceDisconnectTimeout = null;
		}
	}

	reset() {
		this.clearForceDisconnectTimeout();
		this.connectionId = null;
		this.connectionStartTime = null;
	}

	getConnectionInfo() {
		return {
			connectionId: this.connectionId,
			connectionStartTime: this.connectionStartTime,
			connectionDuration: this.connectionStartTime ? Date.now() - this.connectionStartTime : 0
		};
	}
} 