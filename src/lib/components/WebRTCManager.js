export class WebRTCManager {
	constructor(debugLogger) {
		this.debugLogger = debugLogger;
		this.pc = null;
		this.dataChannel = null;
		this.audioElement = null;
		this.localStream = null;
	}

	async setupWebRTCConnection() {
		this.debugLogger('🔗 WebRTC 연결 설정 중...');
		this.pc = new RTCPeerConnection();
		
		return this.pc;
	}

	setupConnectionStateMonitoring(onUnexpectedDisconnection) {
		if (!this.pc) return;

		this.pc.onconnectionstatechange = () => {
			this.debugLogger('🔗 WebRTC 연결 상태 변경', {
				connectionState: this.pc.connectionState,
				iceConnectionState: this.pc.iceConnectionState
			});
			
			if (this.pc.connectionState === 'disconnected' || this.pc.connectionState === 'failed') {
				this.debugLogger('❌ WebRTC 연결 끊어짐 감지');
				onUnexpectedDisconnection();
			}
		};

		this.pc.oniceconnectionstatechange = () => {
			this.debugLogger('🧊 ICE 연결 상태 변경', {
				iceConnectionState: this.pc.iceConnectionState
			});
		};
	}

	setupAudioElement() {
		this.audioElement = document.createElement('audio');
		this.audioElement.autoplay = true;
		this.audioElement.style.display = 'none';
		document.body.appendChild(this.audioElement);
		this.debugLogger('🔊 오디오 요소 생성됨');

		if (this.pc) {
			this.pc.ontrack = (event) => {
				this.debugLogger('📻 원격 오디오 트랙 수신됨', {
					streamCount: event.streams.length,
					trackKind: event.track.kind
				});
				this.audioElement.srcObject = event.streams[0];
			};
		}
	}

	async setupMicrophone() {
		this.debugLogger('🎤 마이크 권한 요청 중...');
		try {
			this.localStream = await navigator.mediaDevices.getUserMedia({ 
				audio: {
					echoCancellation: true,
					noiseSuppression: true,
					autoGainControl: true
				} 
			});
			
			this.debugLogger('✅ 마이크 접근 허용됨', {
				trackCount: this.localStream.getTracks().length,
				audioTrackEnabled: this.localStream.getAudioTracks()[0]?.enabled
			});

			if (this.pc) {
				const audioTrack = this.localStream.getAudioTracks()[0];
				this.pc.addTrack(audioTrack, this.localStream);
			}

			return this.localStream;
		} catch (micError) {
			this.debugLogger('❌ 마이크 접근 실패', micError);
			throw new Error('마이크 접근 권한이 필요합니다. 브라우저에서 마이크 사용을 허용해주세요.');
		}
	}

	setupDataChannel(onOpen, onMessage, onClose, onError) {
		if (!this.pc) return null;

		this.debugLogger('📡 데이터 채널 생성 중...');
		this.dataChannel = this.pc.createDataChannel('oai-events');
		
		this.dataChannel.onopen = onOpen;
		this.dataChannel.onmessage = onMessage;
		this.dataChannel.onclose = onClose;
		this.dataChannel.onerror = onError;

		return this.dataChannel;
	}

	async createOfferAndSetLocal() {
		if (!this.pc) throw new Error('PeerConnection이 설정되지 않았습니다.');

		this.debugLogger('🤝 WebRTC offer 생성 중...');
		const offer = await this.pc.createOffer();
		await this.pc.setLocalDescription(offer);
		
		return offer;
	}

	async setRemoteDescription(answerSdp) {
		if (!this.pc) throw new Error('PeerConnection이 설정되지 않았습니다.');

		const answer = {
			type: 'answer',
			sdp: answerSdp
		};
		
		this.debugLogger('🤝 원격 SDP 설정 중...', {
			answerType: answer.type,
			sdpLength: answer.sdp.length
		});
		
		await this.pc.setRemoteDescription(answer);
		this.debugLogger('✅ WebRTC 연결 완료');
	}

	sendDataChannelMessage(message) {
		if (this.dataChannel && this.dataChannel.readyState === 'open') {
			this.dataChannel.send(JSON.stringify(message));
			this.debugLogger('📤 이벤트 전송', { type: message.type });
			return true;
		} else {
			this.debugLogger('⚠️ 데이터 채널이 열려있지 않음', {
				hasDataChannel: !!this.dataChannel,
				readyState: this.dataChannel?.readyState
			});
			return false;
		}
	}

	stopMicrophone() {
		if (this.localStream) {
			this.localStream.getTracks().forEach(track => {
				track.stop();
				track.enabled = false;
				this.debugLogger('🎤 마이크 트랙 정지됨', { 
					trackId: track.id, 
					kind: track.kind,
					enabled: track.enabled
				});
			});
		}
	}

	pauseAudio() {
		if (this.audioElement) {
			try {
				this.audioElement.pause();
				this.audioElement.currentTime = 0;
				this.audioElement.srcObject = null;
				this.audioElement.src = '';
				
				this.audioElement.volume = 0;
				this.audioElement.muted = true;
				
				this.debugLogger('🔇 오디오 재생 완전히 중단됨');
			} catch (error) {
				this.debugLogger('⚠️ 오디오 중단 중 오류', error);
			}
		}
	}

	forceDisconnect() {
		this.debugLogger('🚫 WebRTC 강제 차단 시작');
		
		this.pauseAudio();
		
		this.stopMicrophone();
		
		if (this.dataChannel) {
			try {
				this.dataChannel.onmessage = null;
				this.dataChannel.onopen = null;
				this.dataChannel.onclose = null;
				this.dataChannel.onerror = null;
				
				if (this.dataChannel.readyState === 'open') {
					this.dataChannel.close();
				}
				this.debugLogger('🔒 데이터 채널 강제 차단됨');
			} catch (error) {
				this.debugLogger('⚠️ 데이터 채널 강제 차단 중 오류', error);
			}
		}
		
		if (this.pc) {
			try {
				this.pc.onconnectionstatechange = null;
				this.pc.oniceconnectionstatechange = null;
				this.pc.ontrack = null;
				
				this.pc.getSenders().forEach(sender => {
					try {
						this.pc.removeTrack(sender);
					} catch (e) {
						this.debugLogger('⚠️ sender 제거 중 오류', e);
					}
				});
				
				this.debugLogger('�� PeerConnection 강제 차단됨');
			} catch (error) {
				this.debugLogger('⚠️ PeerConnection 강제 차단 중 오류', error);
			}
		}
		
		this.debugLogger('✅ WebRTC 강제 차단 완료');
	}

	removeEventListeners() {
		if (this.pc) {
			this.pc.onconnectionstatechange = null;
			this.pc.oniceconnectionstatechange = null;
			this.pc.ontrack = null;
			this.debugLogger('🔗 PeerConnection 이벤트 리스너 제거됨');
		}

		if (this.dataChannel) {
			this.dataChannel.onmessage = null;
			this.dataChannel.onopen = null;
			this.dataChannel.onclose = null;
			this.dataChannel.onerror = null;
			this.debugLogger('📡 데이터 채널 이벤트 리스너 제거됨');
		}
	}

	cleanup() {
		// 로컬 스트림 정리
		if (this.localStream) {
			this.localStream.getTracks().forEach(track => {
				track.stop();
				this.debugLogger('🎤 오디오 트랙 정지됨', { 
					trackId: track.id, 
					kind: track.kind,
					enabled: track.enabled 
				});
			});
			this.localStream = null;
			this.debugLogger('✅ 로컬 스트림 정리됨');
		}

		// 데이터 채널 정리
		if (this.dataChannel) {
			try {
				this.removeEventListeners();
				
				if (this.dataChannel.readyState === 'open') {
					const disconnectEvent = {
						type: 'session.update',
						session: {
							turn_detection: null
						}
					};
					this.dataChannel.send(JSON.stringify(disconnectEvent));
					this.debugLogger('📤 종료 신호 전송됨');
				}
				this.dataChannel.close();
			} catch (error) {
				this.debugLogger('⚠️ 데이터 채널 종료 중 오류', error);
			}
			this.dataChannel = null;
			this.debugLogger('✅ 데이터 채널 정리됨');
		}

		// PeerConnection 정리
		if (this.pc) {
			try {
				this.pc.onconnectionstatechange = null;
				this.pc.oniceconnectionstatechange = null;
				this.pc.ontrack = null;
				
				this.pc.close();
				this.debugLogger('✅ PeerConnection 닫힘', {
					finalState: this.pc.connectionState,
					finalIceState: this.pc.iceConnectionState
				});
			} catch (error) {
				this.debugLogger('⚠️ PeerConnection 종료 중 오류', error);
			}
			this.pc = null;
		}

		// 오디오 요소 정리
		if (this.audioElement) {
			try {
				this.audioElement.pause();
				this.audioElement.srcObject = null;
				if (this.audioElement.parentNode) {
					this.audioElement.parentNode.removeChild(this.audioElement);
				}
				this.debugLogger('✅ 오디오 요소 제거됨');
			} catch (error) {
				this.debugLogger('⚠️ 오디오 요소 제거 중 오류', error);
			}
			this.audioElement = null;
		}
	}

	getConnectionState() {
		return {
			hasPC: !!this.pc,
			pcState: this.pc?.connectionState || 'null',
			pcIceState: this.pc?.iceConnectionState || 'null',
			hasDataChannel: !!this.dataChannel,
			dataChannelState: this.dataChannel?.readyState || 'null',
			hasLocalStream: !!this.localStream,
			localStreamActive: this.localStream?.active || false,
			localStreamTracks: this.localStream?.getTracks().length || 0,
			hasAudioElement: !!this.audioElement,
			audioElementConnected: !!this.audioElement?.srcObject
		};
	}
} 