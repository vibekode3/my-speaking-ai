<!-- src/routes/+layout.svelte -->
<script>
	import '../app.css';
	import { onMount } from 'svelte';
	import { initAuth, user } from '$lib/stores/auth.js';
	import { signOut } from '$lib/auth.js';
	import { goto } from '$app/navigation';
	
	let { children } = $props();

	// 인증 상태 초기화
	onMount(() => {
		initAuth();
	});

	async function handleSignOut() {
		const result = await signOut();
		if (result.success) {
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
			
			<div class="flex items-center space-x-4">
				{#if $user}
					<span class="text-sm text-gray-700">
						안녕하세요, {$user.email}님
					</span>
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
		</div>
	</div>
</nav>

<!-- 메인 콘텐츠 -->
<main>
	{@render children()}
</main>
