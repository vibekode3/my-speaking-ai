// src/routes/api/session/+server.js
import { json } from '@sveltejs/kit';
import { OPENAI_API_KEY } from '$env/static/private';

export async function POST() {
	try {
		console.log('🚀 Session API 호출됨');
		
		// 환경 변수 확인 - 여러 방법으로 시도
		let apiKey = OPENAI_API_KEY || process.env.OPENAI_API_KEY;
		
		// dotenv를 직접 로드해보기 (fallback)
		if (!apiKey) {
			try {
				// Node.js에서 직접 .env 파일 읽기
				const fs = await import('fs');
				const path = await import('path');
				const envPath = path.resolve(process.cwd(), '.env');
				
				if (fs.existsSync(envPath)) {
					const envContent = fs.readFileSync(envPath, 'utf8');
					const envLines = envContent.split('\n');
					
					for (const line of envLines) {
						const [key, ...valueParts] = line.split('=');
						if (key?.trim() === 'OPENAI_API_KEY') {
							apiKey = valueParts.join('=').trim();
							// 따옴표 제거
							if ((apiKey.startsWith('"') && apiKey.endsWith('"')) || 
								(apiKey.startsWith("'") && apiKey.endsWith("'"))) {
								apiKey = apiKey.slice(1, -1);
							}
							console.log('✅ .env 파일에서 직접 API 키 로드됨');
							break;
						}
					}
				}
			} catch (envError) {
				console.log('⚠️ .env 파일 직접 읽기 실패:', envError.message);
			}
		}
		
		if (!apiKey) {
			console.error('❌ OPENAI_API_KEY 환경 변수가 설정되지 않았습니다');
			return json({ 
				error: 'OPENAI_API_KEY가 설정되지 않았습니다. .env 파일을 확인해주세요.',
				debug: {
					hasApiKey: false,
					hasStaticPrivate: !!OPENAI_API_KEY,
					hasProcessEnv: !!process.env.OPENAI_API_KEY,
					nodeEnv: process.env.NODE_ENV,
					cwd: process.cwd(),
					envKeys: Object.keys(process.env).filter(key => key.includes('OPENAI')),
					allEnvKeysCount: Object.keys(process.env).length,
					suggestions: [
						'1. .env 파일이 프로젝트 루트에 있는지 확인',
						'2. .env 파일에 OPENAI_API_KEY=your_key_here 형식으로 작성되었는지 확인',
						'3. 서버를 재시작했는지 확인 (npm run dev)',
						'4. .env 파일에 공백이나 따옴표가 없는지 확인',
						'5. .env 파일 권한 확인 (읽기 가능한지)',
						'6. .gitignore에 .env가 있어도 파일은 존재해야 함'
					]
				}
			}, { status: 500 });
		}
		
		console.log('✅ API 키 확인됨 (길이:', apiKey.length, ')');
		
		const requestBody = {
			model: 'gpt-4o-realtime-preview-2024-12-17',
			voice: 'alloy',
			instructions: `You are a helpful English conversation teacher. 
			- Speak naturally and clearly
			- Correct pronunciation and grammar mistakes gently
			- Provide encouraging feedback
			- Keep conversations engaging and educational
			- Ask follow-up questions to continue the conversation
			- Speak at a moderate pace suitable for language learners`
		};
		
		console.log('📤 OpenAI API 요청 시작...');
		console.log('요청 URL:', 'https://api.openai.com/v1/realtime/sessions');
		console.log('요청 모델:', requestBody.model);
		
		const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${apiKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(requestBody)
		});
		
		console.log('📥 OpenAI API 응답 상태:', response.status);
		console.log('응답 헤더:', Object.fromEntries(response.headers.entries()));
		
		if (!response.ok) {
			const errorText = await response.text();
			console.error('❌ OpenAI API 오류 응답:', errorText);
			
			let errorMessage = `OpenAI API 오류 (${response.status})`;
			let debugInfo = {
				status: response.status,
				statusText: response.statusText,
				headers: Object.fromEntries(response.headers.entries()),
				body: errorText
			};
			
			// 일반적인 오류 메시지 제공
			switch (response.status) {
				case 401:
					errorMessage = 'API 키가 유효하지 않습니다. OpenAI API 키를 확인해주세요.';
					break;
				case 403:
					errorMessage = 'API 접근 권한이 없습니다. OpenAI 계정과 결제 정보를 확인해주세요.';
					break;
				case 429:
					errorMessage = 'API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.';
					break;
				case 500:
					errorMessage = 'OpenAI 서버 오류입니다. 잠시 후 다시 시도해주세요.';
					break;
			}
			
			return json({ 
				error: errorMessage,
				debug: debugInfo
			}, { status: response.status });
		}
		
		const data = await response.json();
		console.log('✅ OpenAI API 응답 성공');
		console.log('응답 데이터 키:', Object.keys(data));
		
		// client_secret 확인
		if (!data.client_secret || !data.client_secret.value) {
			console.error('❌ client_secret이 응답에 없습니다:', data);
			return json({ 
				error: 'OpenAI API 응답에 client_secret이 없습니다.',
				debug: { responseData: data }
			}, { status: 500 });
		}
		
		console.log('✅ ephemeral token 생성 완료');
		return json(data);
		
	} catch (error) {
		console.error('💥 Session API 예외 발생:', error);
		return json({ 
			error: `서버 오류: ${error.message}`,
			debug: {
				name: error.name,
				message: error.message,
				stack: error.stack
			}
		}, { status: 500 });
	}
} 