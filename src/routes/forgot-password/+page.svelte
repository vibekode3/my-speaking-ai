<!-- src/routes/forgot-password/+page.svelte -->
<script>
  import { sendMagicLink } from '$lib/auth.js';
  import { goto } from '$app/navigation';
  import { user } from '$lib/stores/auth.js';
  import { onMount } from 'svelte';

  let email = '';
  let loading = false;
  let error = '';
  let success = false;

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
    if (!email) {
      error = '이메일 주소를 입력해주세요.';
      return;
    }

    loading = true;
    error = '';

    const result = await sendMagicLink(email);

    if (result.success) {
      success = true;
    } else {
      error = result.error;
    }

    loading = false;
  }
</script>

<svelte:head>
  <title>매직링크 로그인 - My Speaking AI</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
  <div class="max-w-md w-full space-y-8">
    <div>
      <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
        매직링크로 로그인
      </h2>
      <p class="mt-2 text-center text-sm text-gray-600">
        가입하신 이메일 주소를 입력하시면 로그인 링크를 보내드립니다. 
        <br>로그인 후 비밀번호를 변경하세요.
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
              로그인 링크가 전송되었습니다!
            </h3>
            <div class="mt-2 text-sm text-green-700">
              <p>이메일을 확인하여 로그인 링크를 클릭해주세요. 링크로 로그인 한 후 비밀번호를 변경하실 수 있습니다.</p>
            </div>
            <div class="mt-4">
              <a href="/login" class="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                로그인 페이지로 돌아가기 →
              </a>
            </div>
          </div>
        </div>
      </div>
    {:else}
      <form class="mt-8 space-y-6" on:submit|preventDefault={handleSubmit}>
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

        {#if error}
          <div class="text-red-600 text-sm text-center">
            {error}
          </div>
        {/if}

        <div>
          <button
            type="submit"
            disabled={loading}
            class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {#if loading}
              <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              전송 중...
            {:else}
              로그인 링크 전송
            {/if}
          </button>
        </div>

        <div class="text-center">
          <a href="/login" class="text-sm font-medium text-indigo-600 hover:text-indigo-500">
            로그인 페이지로 돌아가기
          </a>
        </div>
      </form>
    {/if}
  </div>
</div> 