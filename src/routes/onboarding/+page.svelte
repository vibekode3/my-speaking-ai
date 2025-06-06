<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { user } from '$lib/stores/auth.js';
  import { 
    getAllCurrentPolicies, 
    completeOnboarding, 
    checkOnboardingStatus 
  } from '$lib/onboarding.js';

  let currentStep = 1;
  let loading = false;
  let error = '';
  let policies = [];
  
  // 사용자 정보
  let fullName = '';
  let phoneNumber = '';
  
  // 동의 상태
  let privacyAgreed = false;
  let termsAgreed = false;
  
  // 정책 내용 표시 상태
  let showPrivacyPolicy = false;
  let showTermsPolicy = false;
  
  let privacyPolicy = null;
  let termsPolicy = null;

  // 사용자가 로그인되어 있는지 확인
  onMount(async () => {
    const unsubscribe = user.subscribe(async ($user) => {
      if (!$user) {
        goto('/login');
        return;
      }
      
      // 이미 온보딩을 완료했는지 확인
      const statusResult = await checkOnboardingStatus($user.id);
      if (statusResult.success && statusResult.data.onboarding_complete) {
        goto('/');
        return;
      }
      
      // 정책 정보 로드
      await loadPolicies();
    });
    
    return unsubscribe;
  });

  async function loadPolicies() {
    try {
      const result = await getAllCurrentPolicies();
      if (result.success) {
        policies = result.data;
        privacyPolicy = policies.find(p => p.policy_type === 'privacy_policy');
        termsPolicy = policies.find(p => p.policy_type === 'terms_of_service');
      }
    } catch (err) {
      error = '정책 정보를 불러올 수 없습니다.';
    }
  }

  function nextStep() {
    if (currentStep === 1) {
      // 1단계: 정책 동의 확인
      if (!privacyAgreed || !termsAgreed) {
        error = '모든 약관에 동의해주세요.';
        return;
      }
    } else if (currentStep === 2) {
      // 2단계: 사용자 정보 입력 확인
      if (!fullName.trim() || !phoneNumber.trim()) {
        error = '모든 정보를 입력해주세요.';
        return;
      }
      
      if (fullName.trim().length < 2 || fullName.trim().length > 100) {
        error = '이름은 2자 이상 100자 이하로 입력해주세요.';
        return;
      }
      
      if (!/^[0-9+\-\s()]+$/.test(phoneNumber.trim())) {
        error = '유효한 전화번호 형식을 입력해주세요.';
        return;
      }
    }
    
    error = '';
    currentStep++;
  }

  function prevStep() {
    if (currentStep > 1) {
      currentStep--;
      error = '';
    }
  }

  async function completeOnboardingProcess() {
    if (!$user) return;
    
    loading = true;
    error = '';
    
    try {
      const profileData = {
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim()
      };
      
      const result = await completeOnboarding($user.id, profileData);
      
      if (result.success) {
        goto('/');
      } else {
        error = result.error || '온보딩 처리 중 오류가 발생했습니다.';
      }
    } catch (err) {
      error = '온보딩 처리 중 오류가 발생했습니다.';
    }
    
    loading = false;
  }

  function togglePrivacyPolicy() {
    showPrivacyPolicy = !showPrivacyPolicy;
  }

  function toggleTermsPolicy() {
    showTermsPolicy = !showTermsPolicy;
  }

  // 전화번호 형식 자동 조정
  function formatPhoneNumber(event) {
    let value = event.target.value.replace(/[^\d]/g, '');
    if (value.length <= 3) {
      phoneNumber = value;
    } else if (value.length <= 7) {
      phoneNumber = `${value.slice(0, 3)}-${value.slice(3)}`;
    } else if (value.length <= 11) {
      phoneNumber = `${value.slice(0, 3)}-${value.slice(3, 7)}-${value.slice(7)}`;
    } else {
      phoneNumber = `${value.slice(0, 3)}-${value.slice(3, 7)}-${value.slice(7, 11)}`;
    }
  }
</script>

<svelte:head>
  <title>서비스 이용을 위한 정보 입력 - My Speaking AI</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
  <div class="sm:mx-auto sm:w-full sm:max-w-md">
    <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
      서비스 이용을 위한 정보 입력
    </h2>
    <p class="mt-2 text-center text-sm text-gray-600">
      My Speaking AI 서비스 이용을 위해 몇 가지 정보가 필요합니다
    </p>
  </div>

  <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
    <!-- 진행 단계 표시 -->
    <div class="bg-white py-4 px-6 shadow sm:rounded-lg mb-6">
      <div class="flex justify-between items-center">
        <div class="flex space-x-4">
          <div class="flex items-center">
            <div class={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep >= 1 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              1
            </div>
            <span class="ml-2 text-sm font-medium text-gray-900">약관 동의</span>
          </div>
          <div class="flex items-center">
            <div class={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep >= 2 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              2
            </div>
            <span class="ml-2 text-sm font-medium text-gray-900">개인정보 입력</span>
          </div>
          <div class="flex items-center">
            <div class={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep >= 3 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              3
            </div>
            <span class="ml-2 text-sm font-medium text-gray-900">완료</span>
          </div>
        </div>
      </div>
    </div>

    <div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
      {#if error}
        <div class="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      {/if}

      {#if currentStep === 1}
        <!-- 1단계: 약관 동의 -->
        <div class="space-y-6">
          <div>
            <h3 class="text-lg font-medium text-gray-900 mb-4">서비스 이용약관 및 개인정보처리방침</h3>
            <p class="text-sm text-gray-600 mb-6">
              My Speaking AI 서비스 이용을 위해 다음 약관에 동의해주세요.
            </p>
          </div>

          <!-- 개인정보처리방침 -->
          <div class="border border-gray-200 rounded-md">
            <div class="p-4 bg-gray-50 border-b border-gray-200">
              <div class="flex items-center justify-between">
                <div class="flex items-center">
                  <input
                    id="privacy-agreement"
                    type="checkbox"
                    bind:checked={privacyAgreed}
                    class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label for="privacy-agreement" class="ml-3 text-sm font-medium text-gray-900">
                    개인정보처리방침 동의 (필수)
                  </label>
                </div>
                <button
                  type="button"
                  on:click={togglePrivacyPolicy}
                  class="text-sm text-indigo-600 hover:text-indigo-500"
                >
                  {showPrivacyPolicy ? '접기' : '보기'}
                </button>
              </div>
            </div>
            {#if showPrivacyPolicy && privacyPolicy}
              <div class="p-4 max-h-64 overflow-y-auto">
                <div class="prose prose-sm max-w-none">
                  {#each privacyPolicy.content.split('\n') as line}
                    {#if line.trim()}
                      {#if line.startsWith('##')}
                        <h2 class="text-lg font-semibold mt-4 mb-2">{line.replace('##', '').trim()}</h2>
                      {:else if line.startsWith('###')}
                        <h3 class="text-md font-medium mt-3 mb-2">{line.replace('###', '').trim()}</h3>
                      {:else if line.startsWith('-')}
                        <li class="ml-4">{line.replace('-', '').trim()}</li>
                      {:else}
                        <p class="mb-2">{line}</p>
                      {/if}
                    {/if}
                  {/each}
                </div>
              </div>
            {/if}
          </div>

          <!-- 서비스 이용약관 -->
          <div class="border border-gray-200 rounded-md">
            <div class="p-4 bg-gray-50 border-b border-gray-200">
              <div class="flex items-center justify-between">
                <div class="flex items-center">
                  <input
                    id="terms-agreement"
                    type="checkbox"
                    bind:checked={termsAgreed}
                    class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label for="terms-agreement" class="ml-3 text-sm font-medium text-gray-900">
                    서비스 이용약관 동의 (필수)
                  </label>
                </div>
                <button
                  type="button"
                  on:click={toggleTermsPolicy}
                  class="text-sm text-indigo-600 hover:text-indigo-500"
                >
                  {showTermsPolicy ? '접기' : '보기'}
                </button>
              </div>
            </div>
            {#if showTermsPolicy && termsPolicy}
              <div class="p-4 max-h-64 overflow-y-auto">
                <div class="prose prose-sm max-w-none">
                  {#each termsPolicy.content.split('\n') as line}
                    {#if line.trim()}
                      {#if line.startsWith('##')}
                        <h2 class="text-lg font-semibold mt-4 mb-2">{line.replace('##', '').trim()}</h2>
                      {:else if line.startsWith('###')}
                        <h3 class="text-md font-medium mt-3 mb-2">{line.replace('###', '').trim()}</h3>
                      {:else if line.startsWith('-')}
                        <li class="ml-4">{line.replace('-', '').trim()}</li>
                      {:else}
                        <p class="mb-2">{line}</p>
                      {/if}
                    {/if}
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        </div>

      {:else if currentStep === 2}
        <!-- 2단계: 개인정보 입력 -->
        <div class="space-y-6">
          <div>
            <h3 class="text-lg font-medium text-gray-900 mb-4">개인정보 입력</h3>
            <p class="text-sm text-gray-600 mb-6">
              서비스 이용을 위해 필요한 기본 정보를 입력해주세요.
            </p>
          </div>

          <div>
            <label for="fullName" class="block text-sm font-medium text-gray-700">
              이름 <span class="text-red-500">*</span>
            </label>
            <input
              id="fullName"
              type="text"
              bind:value={fullName}
              required
              class="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              placeholder="실명을 입력해주세요"
            />
          </div>

          <div>
            <label for="phoneNumber" class="block text-sm font-medium text-gray-700">
              전화번호 <span class="text-red-500">*</span>
            </label>
            <input
              id="phoneNumber"
              type="tel"
              bind:value={phoneNumber}
              on:input={formatPhoneNumber}
              required
              class="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              placeholder="010-1234-5678"
            />
          </div>

          <div class="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div class="flex">
              <div class="flex-shrink-0">
                <svg class="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                </svg>
              </div>
              <div class="ml-3">
                <p class="text-sm text-blue-700">
                  입력하신 정보는 서비스 제공 목적으로만 사용되며, 개인정보처리방침에 따라 안전하게 보호됩니다.
                </p>
              </div>
            </div>
          </div>
        </div>

      {:else if currentStep === 3}
        <!-- 3단계: 완료 -->
        <div class="text-center space-y-6">
          <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
            <svg class="h-8 w-8 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <div>
            <h3 class="text-lg font-medium text-gray-900 mb-2">모든 정보 입력이 완료되었습니다!</h3>
            <p class="text-sm text-gray-600">
              이제 My Speaking AI의 모든 기능을 이용하실 수 있습니다.
            </p>
          </div>

          <div class="bg-gray-50 rounded-md p-4">
            <div class="text-left space-y-2">
              <div class="flex justify-between">
                <span class="text-sm text-gray-600">이름:</span>
                <span class="text-sm font-medium text-gray-900">{fullName}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-sm text-gray-600">전화번호:</span>
                <span class="text-sm font-medium text-gray-900">{phoneNumber}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-sm text-gray-600">개인정보처리방침:</span>
                <span class="text-sm font-medium text-green-600">동의함</span>
              </div>
              <div class="flex justify-between">
                <span class="text-sm text-gray-600">서비스 이용약관:</span>
                <span class="text-sm font-medium text-green-600">동의함</span>
              </div>
            </div>
          </div>
        </div>
      {/if}

      <!-- 버튼 영역 -->
      <div class="mt-8 flex justify-between">
        <button
          type="button"
          on:click={prevStep}
          disabled={currentStep === 1}
          class="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          이전
        </button>

        {#if currentStep < 3}
          <button
            type="button"
            on:click={nextStep}
            class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            다음
          </button>
        {:else}
          <button
            type="button"
            on:click={completeOnboardingProcess}
            disabled={loading}
            class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
          >
            {loading ? '처리 중...' : '서비스 시작하기'}
          </button>
        {/if}
      </div>
    </div>
  </div>
</div> 