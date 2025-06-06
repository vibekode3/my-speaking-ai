<!-- src/routes/+layout.svelte -->
<script>
	import '../app.css';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { initAuth, user } from '$lib/stores/auth.js';
	import { checkOnboardingStatus } from '$lib/onboarding.js';
	import { signOut } from '$lib/auth.js';
	import { goto } from '$app/navigation';
	
	let { children } = $props();
	let onboardingChecked = $state(false);
	let isCheckingOnboarding = $state(false);
	let lastCheckedPath = $state('');
	let lastCheckedUserId = $state('');
	let showContinueButton = $state(false);
	let isMobileMenuOpen = $state(false);

	// 인증 상태 초기화
	onMount(() => {
		initAuth();
	});

	// 사용자 변경 또는 페이지 변경 시 온보딩 확인
	$effect(() => {
		const currentPath = $page.url.pathname;
		const currentUserId = $user?.id || '';
		
		// 사용자가 변경되거나 페이지가 변경된 경우
		if (
			$user && 
			(currentUserId !== lastCheckedUserId || currentPath !== lastCheckedPath) &&
			!isCheckingOnboarding &&
			!onboardingChecked // 이미 체크가 완료된 경우 재체크하지 않음
		) {
			console.log('온보딩 체크 시작:', { currentPath, currentUserId, lastCheckedPath, lastCheckedUserId });
			lastCheckedPath = currentPath;
			lastCheckedUserId = currentUserId;
			checkUserOnboarding();
		}
		
		// 온보딩 예외 경로에서는 즉시 체크 완료로 설정
		const exemptPaths = ['/onboarding', '/login', '/signup', '/forgot-password', '/debug', '/profile'];
		if (exemptPaths.includes(currentPath) && !onboardingChecked) {
			console.log('예외 경로 - 온보딩 체크 즉시 완료:', currentPath);
			onboardingChecked = true;
			isCheckingOnboarding = false;
		}
	});

	// 사용자가 로그아웃하면 상태 초기화
	$effect(() => {
		if (!$user) {
			onboardingChecked = false;
			isCheckingOnboarding = false;
			lastCheckedPath = '';
			lastCheckedUserId = '';
			showContinueButton = false;
			console.log('사용자 로그아웃 - 온보딩 상태 초기화');
		}
	});

	// 체크 시작 시 타이머 설정
	$effect(() => {
		if (isCheckingOnboarding) {
			showContinueButton = false;
			setTimeout(() => {
				if (isCheckingOnboarding) {
					showContinueButton = true;
				}
			}, 3000);
		}
	});

	async function checkUserOnboarding() {
		if (!$user) {
			console.log('사용자가 없음 - 온보딩 체크 중단');
			onboardingChecked = true;
			isCheckingOnboarding = false;
			return;
		}

		isCheckingOnboarding = true;
		console.log('온보딩 상태 확인 시작:', $user.id);
		
		// 타임아웃 설정
		const timeoutPromise = new Promise((_, reject) => {
			setTimeout(() => {
				reject(new Error('온보딩 상태 확인 시간 초과'));
			}, 5000); // 5초 타임아웃
		});
		
		try {
			// race를 사용하여 타임아웃 적용
			const result = await Promise.race([
				checkOnboardingStatus($user.id),
				timeoutPromise
			]);
			
			console.log('온보딩 상태 결과:', result);
			
			if (result.success) {
				if (!result.data.onboarding_complete) {
					console.log('온보딩 미완료 - 온보딩 페이지로 리다이렉트');
					isCheckingOnboarding = false;
					goto('/onboarding');
					return;
				} else {
					console.log('온보딩 완료 - 정상 진행');
				}
			} else {
				console.error('온보딩 상태 확인 실패:', result.error);
				// 오류 발생 시 사용자 경험을 위해 일단 진행
			}
		} catch (error) {
			console.error('온보딩 상태 확인 중 오류:', error);
			// 타임아웃이나 오류 발생 시 사용자 경험을 위해 일단 진행
		} finally {
			// 무조건 상태 업데이트
			onboardingChecked = true;
			isCheckingOnboarding = false;
		}
	}

	async function handleSignOut() {
		const result = await signOut();
		if (result.success) {
			console.log('로그아웃 완료');
			goto('/');
		}
	}
</script>

<!-- 네비게이션 바 -->
<nav class="bg-white shadow-sm border-b">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
		<div class="flex justify-between h-16">
			<div class="flex items-center">
				<a href="/" class="text-xl font-bold text-gray-900">
					My Speaking AI
				</a>
			</div>
			
			<div class="hidden md:flex items-center space-x-4">
				{#if $user}
					<span class="text-sm text-gray-700 truncate max-w-[180px]">
						안녕하세요, {$user.email}님
					</span>
					<a
						href="/profile"
						class="text-sm text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md font-medium transition-colors"
					>
						내 프로필
					</a>
					<a
						href="/usage"
						class="text-sm text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md font-medium transition-colors"
					>
						사용량 통계 📊
					</a>
					<button
						on:click={handleSignOut}
						class="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-2 rounded-md text-sm font-medium transition-colors"
					>
						로그아웃
					</button>
				{:else}
					<a
						href="/login"
						class="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
					>
						로그인
					</a>
					<a
						href="/signup"
						class="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
					>
						회원가입
					</a>
				{/if}
			</div>
			
			<!-- 모바일 메뉴 버튼 -->
			<div class="md:hidden flex items-center">
				<button 
					on:click={() => isMobileMenuOpen = !isMobileMenuOpen}
					class="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
				>
					<span class="sr-only">메뉴 열기</span>
					<!-- 햄버거 아이콘 -->
					<svg class="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
					</svg>
				</button>
			</div>
		</div>
	</div>
	
	<!-- 모바일 메뉴 -->
	{#if isMobileMenuOpen}
		<div class="md:hidden border-t border-gray-200">
			<div class="pt-2 pb-3 space-y-1">
				{#if $user}
					<div class="px-4 py-2 text-sm text-gray-700 truncate">
						안녕하세요, {$user.email}님
					</div>
					<a
						href="/profile"
						class="block px-4 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
					>
						내 프로필
					</a>
					<a
						href="/usage"
						class="block px-4 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
					>
						사용량 통계 📊
					</a>
					<button
						on:click={handleSignOut}
						class="block w-full text-left px-4 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
					>
						로그아웃
					</button>
				{:else}
					<a
						href="/login"
						class="block px-4 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
					>
						로그인
					</a>
					<a
						href="/signup"
						class="block px-4 py-2 text-base font-medium text-indigo-600 hover:text-indigo-800 hover:bg-gray-50"
					>
						회원가입
					</a>
				{/if}
			</div>
		</div>
	{/if}
</nav>

<!-- 메인 콘텐츠 -->
<main>
	{#if isCheckingOnboarding}
		<!-- 온보딩 상태 확인 중 로딩 표시 -->
		<div class="min-h-screen flex items-center justify-center bg-gray-50">
			<div class="text-center">
				<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
				<p class="mt-4 text-sm text-gray-600">사용자 정보를 확인하는 중...</p>
				
				{#if showContinueButton}
					<button
						on:click={() => {
							onboardingChecked = true;
							isCheckingOnboarding = false;
							console.log('사용자가 수동으로 진행 선택');
						}}
						class="mt-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md text-sm transition-colors"
					>
						계속 진행하기
					</button>
				{/if}
			</div>
		</div>
	{:else}
		{@render children()}
	{/if}
</main>
