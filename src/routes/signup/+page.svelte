<!-- src/routes/signup/+page.svelte -->
<script>
  import { signUp } from '$lib/auth.js';
  import { goto } from '$app/navigation';
  import { user } from '$lib/stores/auth.js';
  import { onMount } from 'svelte';

  let email = '';
  let password = '';
  let confirmPassword = '';
  let loading = false;
  let error = '';
  let success = false;
  let showPassword = false;
  let showConfirmPassword = false;

  // 비밀번호 일치 여부 확인
  $: passwordsMatch = password && confirmPassword && password === confirmPassword;
  $: passwordsDontMatch = password && confirmPassword && password !== confirmPassword;
  $: showPasswordStatus = confirmPassword.length > 0;

  // 이미 로그인된 사용자는 홈으로 리다이렉트
  onMount(() => {
    const unsubscribe = user.subscribe(($user) => {
      if ($user) {
        goto('/');
      }
    });
    return unsubscribe;
  });

  async function handleSubmit() {
    if (!email || !password || !confirmPassword) {
      error = '모든 필드를 입력해주세요.';
      return;
    }

    if (password !== confirmPassword) {
      error = '비밀번호가 일치하지 않습니다.';
      return;
    }

    if (password.length < 6) {
      error = '비밀번호는 최소 6자 이상이어야 합니다.';
      return;
    }

    loading = true;
    error = '';

    const result = await signUp(email, password);

    if (result.success) {
      success = true;
      // 회원가입 성공 후 확인 이메일 안내
    } else {
      error = result.error;
    }

    loading = false;
  }

  function togglePasswordVisibility() {
    showPassword = !showPassword;
  }

  function toggleConfirmPasswordVisibility() {
    showConfirmPassword = !showConfirmPassword;
  }
</script>

<svelte:head>
  <title>회원가입 - My Speaking AI</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
  <div class="max-w-md w-full space-y-8">
    <div>
      <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
        새 계정을 만드세요
      </h2>
      <p class="mt-2 text-center text-sm text-gray-600">
        또는
        <a href="/login" class="font-medium text-indigo-600 hover:text-indigo-500">
          기존 계정으로 로그인하세요
        </a>
      </p>
    </div>

    {#if success}
      <div class="bg-green-50 border border-green-200 rounded-md p-4">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-green-800">
              회원가입이 완료되었습니다!
            </h3>
            <div class="mt-2 text-sm text-green-700">
              <p>이메일로 전송된 확인 링크를 클릭하여 계정을 활성화해주세요.</p>
            </div>
            <div class="mt-4">
              <a href="/login" class="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                로그인 페이지로 이동 →
              </a>
            </div>
          </div>
        </div>
      </div>
    {:else}
      <form class="mt-8 space-y-6" on:submit|preventDefault={handleSubmit}>
        <div class="space-y-4">
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700">이메일 주소</label>
            <input
              id="email"
              name="email"
              type="email"
              autocomplete="email"
              required
              bind:value={email}
              class="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              placeholder="이메일 주소를 입력하세요"
            />
          </div>
          
          <div>
            <label for="password" class="block text-sm font-medium text-gray-700">비밀번호</label>
            <div class="mt-1 relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autocomplete="new-password"
                required
                bind:value={password}
                class="appearance-none relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="비밀번호 (최소 6자)"
              />
              <button
                type="button"
                class="absolute inset-y-0 right-0 pr-3 flex items-center"
                on:click={togglePasswordVisibility}
              >
                {#if showPassword}
                  <!-- 눈 감은 아이콘 (비밀번호 보임) -->
                  <svg class="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                {:else}
                  <!-- 눈 뜬 아이콘 (비밀번호 숨김) -->
                  <svg class="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                {/if}
              </button>
            </div>
            <!-- 비밀번호 강도 표시 -->
            {#if password.length > 0}
              <div class="mt-1 text-xs">
                {#if password.length < 6}
                  <span class="text-red-600">비밀번호는 최소 6자 이상이어야 합니다</span>
                {:else}
                  <span class="text-green-600">✓ 비밀번호 길이가 적절합니다</span>
                {/if}
              </div>
            {/if}
          </div>
          
          <div>
            <label for="confirm-password" class="block text-sm font-medium text-gray-700">비밀번호 확인</label>
            <div class="mt-1 relative">
              <input
                id="confirm-password"
                name="confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                autocomplete="new-password"
                required
                bind:value={confirmPassword}
                class="appearance-none relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm {passwordsDontMatch ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : passwordsMatch ? 'border-green-300 focus:border-green-500 focus:ring-green-500' : ''}"
                placeholder="비밀번호를 다시 입력하세요"
              />
              <button
                type="button"
                class="absolute inset-y-0 right-0 pr-3 flex items-center"
                on:click={toggleConfirmPasswordVisibility}
              >
                {#if showConfirmPassword}
                  <!-- 눈 감은 아이콘 (비밀번호 보임) -->
                  <svg class="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                {:else}
                  <!-- 눈 뜬 아이콘 (비밀번호 숨김) -->
                  <svg class="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                {/if}
              </button>
            </div>
            <!-- 비밀번호 일치 여부 표시 -->
            {#if showPasswordStatus}
              <div class="mt-1 text-xs flex items-center">
                {#if passwordsMatch}
                  <svg class="h-4 w-4 text-green-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span class="text-green-600">비밀번호가 일치합니다</span>
                {:else if passwordsDontMatch}
                  <svg class="h-4 w-4 text-red-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span class="text-red-600">비밀번호가 일치하지 않습니다</span>
                {/if}
              </div>
            {/if}
          </div>
        </div>

        {#if error}
          <div class="text-red-600 text-sm text-center">
            {error}
          </div>
        {/if}

        <div>
          <button
            type="submit"
            disabled={loading || passwordsDontMatch || password.length < 6}
            class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {#if loading}
              <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              가입 중...
            {:else}
              회원가입
            {/if}
          </button>
        </div>
      </form>
    {/if}
  </div>
</div> 