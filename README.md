# AI 영어회화 선생님 🎤

OpenAI Realtime API를 사용한 실시간 영어 회화 학습 애플리케이션입니다.

## 🚀 기능

- **실시간 음성 대화**: WebRTC를 통한 초저지연 음성 통신
- **AI 영어 선생님**: 발음과 문법을 교정해주는 친절한 AI
- **대화 기록**: 학습 진도를 추적할 수 있는 대화 히스토리
- **현대적인 UI**: 직관적이고 아름다운 사용자 인터페이스

## 🛠 설치 및 설정

### 1. 프로젝트 클론
```bash
git clone <repository-url>
cd my-speaking-ai
```

### 2. 의존성 설치
```bash
npm install
```

### 3. 환경 변수 설정
프로젝트 루트에 `.env` 파일을 생성하고 다음 내용을 추가하세요:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

**OpenAI API 키 발급 방법:**
1. [OpenAI Platform](https://platform.openai.com/)에 로그인
2. API Keys 섹션으로 이동
3. "Create new secret key" 클릭
4. 생성된 키를 복사하여 `.env` 파일에 붙여넣기

### 4. 개발 서버 실행
```bash
npm run dev
```

브라우저에서 `http://localhost:5173`으로 접속하세요.

## 📁 프로젝트 구조

```
src/
├── lib/
│   └── components/
│       ├── RealtimeAgent.svelte    # WebRTC 연결 및 실시간 통신 로직
│       ├── AIAvatar.svelte         # AI 아바타 및 상태 표시
│       ├── StatusIndicator.svelte  # 연결 상태 표시
│       └── ConversationLog.svelte  # 대화 기록 표시
├── routes/
│   ├── api/
│   │   └── session/
│   │       └── +server.js          # OpenAI ephemeral token 생성 API
│   └── +page.svelte                # 메인 페이지
└── app.html
```

## 🎯 사용 방법

1. **연결하기**: "AI 선생님과 연결하기" 버튼 클릭
2. **권한 허용**: 브라우저에서 마이크 사용 권한 허용
3. **대화 시작**: 연결되면 자유롭게 영어로 말하기
4. **피드백 받기**: AI가 발음과 문법을 교정해줍니다

## 🔧 기술 스택

- **Frontend**: Svelte 5, TailwindCSS
- **Backend**: SvelteKit API Routes
- **AI**: OpenAI Realtime API (gpt-4o-realtime-preview)
- **통신**: WebRTC, WebSocket
- **배포**: Vercel (권장)

## 📝 주요 컴포넌트

### RealtimeAgent.svelte
- WebRTC 연결 관리
- OpenAI Realtime API 통신
- 음성 스트림 처리
- 이벤트 디스패칭

### AIAvatar.svelte
- AI 상태 시각화
- 말하기/듣기 애니메이션
- 연결 상태 표시

### ConversationLog.svelte
- 대화 기록 표시
- 메시지 타임스탬프
- 대화 기록 관리

## 🚨 주의사항

- **HTTPS 필요**: WebRTC는 HTTPS 환경에서만 작동합니다
- **마이크 권한**: 브라우저에서 마이크 사용 권한이 필요합니다
- **API 비용**: OpenAI Realtime API 사용 시 비용이 발생합니다

## 🔒 보안

- API 키는 서버 사이드에서만 사용
- 클라이언트에는 ephemeral token만 전달
- 환경 변수로 민감한 정보 관리

## 📄 라이선스

MIT License
