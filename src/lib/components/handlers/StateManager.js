export class StateManager {
	constructor(debugLogger) {
		this.debugLogger = debugLogger;
		this.isConnected = false;
		this.isDisconnecting = false;
		this.isSpeaking = false;
		this.forceBlocked = false;
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

	getSpeakingState() {
		if (this.forceBlocked) {
			return false;
		}
		return this.isSpeaking;
	}

	resetBlockState() {
		this.forceBlocked = false;
		this.isSpeaking = false;
		this.debugLogger('🔄 이벤트 핸들러 차단 상태 초기화');
	}

	isBlocked() {
		return this.forceBlocked || this.isDisconnecting || !this.isConnected;
	}

	getBlockReasons(dataChannel) {
		const blockReasons = [];
		if (this.forceBlocked) blockReasons.push('forceBlocked=true');
		if (this.isDisconnecting) blockReasons.push('isDisconnecting=true');
		if (!this.isConnected) blockReasons.push('isConnected=false');
		if (!dataChannel) blockReasons.push('dataChannel=null');
		if (dataChannel && dataChannel.readyState !== 'open') blockReasons.push(`dataChannelState=${dataChannel.readyState}`);
		
		return blockReasons;
	}
} 