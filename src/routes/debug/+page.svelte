<!-- src/routes/debug/+page.svelte -->
<script>
  import { onMount } from 'svelte';
  import { user } from '$lib/stores/auth.js';
  import { 
    checkOnboardingStatus, 
    getUserProfile, 
    getUserAgreements,
    getAllCurrentPolicies 
  } from '$lib/onboarding.js';
  import { goto } from '$app/navigation';

  let onboardingStatus = null;
  let userProfile = null;
  let userAgreements = [];
  let policies = [];
  let loading = false;
  let error = '';

  onMount(() => {
    const unsubscribe = user.subscribe(($user) => {
      if (!$user) {
        goto('/login');
        return;
      }
      loadDebugInfo();
    });
    return unsubscribe;
  });

  async function loadDebugInfo() {
    if (!$user) return;
    
    loading = true;
    error = '';
    
    try {
      // 온보딩 상태 확인
      const statusResult = await checkOnboardingStatus($user.id);
      if (statusResult.success) {
        onboardingStatus = statusResult.data;
      }

      // 사용자 프로필 확인
      const profileResult = await getUserProfile($user.id);
      if (profileResult.success) {
        userProfile = profileResult.data;
      }

      // 사용자 동의 내역 확인
      const agreementsResult = await getUserAgreements($user.id);
      if (agreementsResult.success) {
        userAgreements = agreementsResult.data;
      }

      // 정책 목록 확인
      const policiesResult = await getAllCurrentPolicies();
      if (policiesResult.success) {
        policies = policiesResult.data;
      }

    } catch (err) {
      error = '정보를 불러오는 중 오류가 발생했습니다: ' + err.message;
    }
    
    loading = false;
  }

  function resetOnboarding() {
    if (confirm('정말로 온보딩 상태를 초기화하시겠습니까?')) {
      // 실제로는 데이터베이스에서 해당 사용자의 온보딩 데이터를 삭제해야 합니다
      alert('온보딩 초기화는 데이터베이스에서 직접 수행해야 합니다.');
    }
  }

  function goToOnboarding() {
    goto('/onboarding');
  }
</script>

<svelte:head>
  <title>온보딩 디버그 - My Speaking AI</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
  <div class="max-w-4xl mx-auto">
    <div class="bg-white shadow overflow-hidden sm:rounded-lg">
      <div class="px-4 py-5 sm:px-6">
        <h3 class="text-lg leading-6 font-medium text-gray-900">온보딩 디버그 정보</h3>
        <p class="mt-1 max-w-2xl text-sm text-gray-500">
          현재 사용자의 온보딩 상태와 관련 정보를 확인할 수 있습니다.
        </p>
        <div class="mt-4 flex space-x-3">
          <button
            on:click={loadDebugInfo}
            disabled={loading}
            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? '새로고침 중...' : '새로고침'}
          </button>
          <button
            on:click={goToOnboarding}
            class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            온보딩 페이지로 이동
          </button>
          <button
            on:click={() => goto('/profile')}
            class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            프로필 페이지로 이동
          </button>
        </div>
      </div>

      {#if error}
        <div class="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
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

      <div class="border-t border-gray-200">
        <dl>
          <!-- 온보딩 상태 -->
          <div class="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt class="text-sm font-medium text-gray-500">온보딩 상태</dt>
            <dd class="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
              {#if onboardingStatus}
                <div class="space-y-2">
                  <div class="flex items-center">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {onboardingStatus.has_profile ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                      프로필: {onboardingStatus.has_profile ? '완료' : '미완료'}
                    </span>
                  </div>
                  <div class="flex items-center">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {onboardingStatus.privacy_agreed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                      개인정보처리방침: {onboardingStatus.privacy_agreed ? '동의' : '미동의'}
                    </span>
                  </div>
                  <div class="flex items-center">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {onboardingStatus.terms_agreed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                      서비스 이용약관: {onboardingStatus.terms_agreed ? '동의' : '미동의'}
                    </span>
                  </div>
                  <div class="flex items-center">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {onboardingStatus.onboarding_complete ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                      전체 온보딩: {onboardingStatus.onboarding_complete ? '완료' : '미완료'}
                    </span>
                  </div>
                </div>
              {:else}
                <span class="text-gray-500">로딩 중...</span>
              {/if}
            </dd>
          </div>

          <!-- 사용자 프로필 -->
          <div class="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt class="text-sm font-medium text-gray-500">사용자 프로필</dt>
            <dd class="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
              {#if userProfile}
                <div class="space-y-1">
                  <p><strong>이름:</strong> {userProfile.full_name}</p>
                  <p><strong>전화번호:</strong> {userProfile.phone_number}</p>
                  <p><strong>프로필 완성:</strong> {userProfile.profile_completed ? '예' : '아니오'}</p>
                  <p><strong>생성일:</strong> {new Date(userProfile.created_at).toLocaleString()}</p>
                  <p><strong>수정일:</strong> {new Date(userProfile.updated_at).toLocaleString()}</p>
                  <p class="mt-3 text-indigo-600">
                    <a href="/profile" class="hover:underline">📝 사용자 프로필 관리 페이지에서 정보를 수정할 수 있습니다.</a>
                  </p>
                </div>
              {:else}
                <span class="text-gray-500">프로필 정보 없음</span>
              {/if}
            </dd>
          </div>

          <!-- 동의 내역 -->
          <div class="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt class="text-sm font-medium text-gray-500">동의 내역</dt>
            <dd class="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
              {#if userAgreements.length > 0}
                <div class="space-y-3">
                  {#each userAgreements as agreement}
                    <div class="border border-gray-200 rounded-md p-3">
                      <p><strong>유형:</strong> {agreement.agreement_type}</p>
                      <p><strong>버전:</strong> {agreement.agreement_version}</p>
                      <p><strong>동의 여부:</strong> {agreement.agreed ? '동의' : '미동의'}</p>
                      {#if agreement.agreed_at}
                        <p><strong>동의 시간:</strong> {new Date(agreement.agreed_at).toLocaleString()}</p>
                      {/if}
                      {#if agreement.ip_address}
                        <p><strong>IP 주소:</strong> {agreement.ip_address}</p>
                      {/if}
                    </div>
                  {/each}
                </div>
              {:else}
                <span class="text-gray-500">동의 내역 없음</span>
              {/if}
            </dd>
          </div>

          <!-- 정책 목록 -->
          <div class="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt class="text-sm font-medium text-gray-500">현재 정책</dt>
            <dd class="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
              {#if policies.length > 0}
                <div class="space-y-2">
                  {#each policies as policy}
                    <div class="flex items-center space-x-2">
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {policy.policy_type} v{policy.version}
                      </span>
                      <span class="text-gray-600">{policy.title}</span>
                    </div>
                  {/each}
                </div>
              {:else}
                <span class="text-gray-500">정책 정보 없음</span>
              {/if}
            </dd>
          </div>

          <!-- 사용자 정보 -->
          <div class="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt class="text-sm font-medium text-gray-500">사용자 정보</dt>
            <dd class="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
              {#if $user}
                <div class="space-y-1">
                  <p><strong>ID:</strong> {$user.id}</p>
                  <p><strong>이메일:</strong> {$user.email}</p>
                  <p><strong>이메일 확인:</strong> {$user.email_confirmed_at ? '완료' : '미완료'}</p>
                  <p><strong>생성일:</strong> {new Date($user.created_at).toLocaleString()}</p>
                </div>
              {:else}
                <span class="text-gray-500">사용자 정보 없음</span>
              {/if}
            </dd>
          </div>
        </dl>
      </div>

      <!-- 온보딩 초기화 섹션 -->
      <div class="bg-red-50 px-4 py-5 sm:px-6 border-t border-red-200">
        <h4 class="text-md font-medium text-red-900 mb-2">위험 구역</h4>
        <p class="text-sm text-red-700 mb-4">
          아래 작업은 개발/테스트 목적으로만 사용하세요.
        </p>
        <div class="space-y-2">
          <p class="text-sm text-red-600">
            온보딩 상태를 초기화하려면 데이터베이스에서 다음 SQL을 실행하세요:
          </p>
          <div class="bg-gray-900 text-green-400 p-3 rounded text-sm font-mono">
            <div>-- 사용자 프로필 삭제</div>
            <div>DELETE FROM user_profiles WHERE user_id = '{$user?.id}';</div>
            <div class="mt-2">-- 사용자 동의 내역 삭제</div>
            <div>DELETE FROM user_agreements WHERE user_id = '{$user?.id}';</div>
            <div class="mt-2">-- 사용자 프롬프트 삭제 (선택사항)</div>
            <div>DELETE FROM user_prompts WHERE user_id = '{$user?.id}';</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div> 