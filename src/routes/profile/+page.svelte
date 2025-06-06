<!-- src/routes/profile/+page.svelte -->
<script>
  import { onMount } from 'svelte';
  import { user } from '$lib/stores/auth.js';
  import { 
    getUserProfile, 
    getUserAgreements,
    updateUserProfile,
    getPolicyContent
  } from '$lib/onboarding.js';
  import { goto } from '$app/navigation';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';

  let userProfile = null;
  let userAgreements = [];
  let loading = true;
  let error = '';
  let successMessage = '';
  
  // 폼 상태 관리
  let isEditing = false;
  let formData = {
    fullName: '',
    phoneNumber: ''
  };
  
  // 정책 모달 상태 관리
  let showPolicyModal = false;
  let currentPolicy = null;
  let loadingPolicy = false;
  let policyError = '';

  onMount(() => {
    const unsubscribe = user.subscribe(($user) => {
      if (!$user) {
        goto('/login');
        return;
      }
      loadProfileData($user.id);
    });
    return unsubscribe;
  });

  async function loadProfileData(userId) {
    loading = true;
    error = '';
    
    try {
      // 사용자 프로필 가져오기
      const profileResult = await getUserProfile(userId);
      if (profileResult.success) {
        userProfile = profileResult.data;
        
        // 폼 데이터 초기화
        if (userProfile) {
          formData = {
            fullName: userProfile.full_name,
            phoneNumber: userProfile.phone_number
          };
        }
      }

      // 사용자 동의 내역 가져오기
      const agreementsResult = await getUserAgreements(userId);
      if (agreementsResult.success) {
        userAgreements = agreementsResult.data;
      }
    } catch (err) {
      error = '정보를 불러오는 중 오류가 발생했습니다: ' + err.message;
    }
    
    loading = false;
  }

  function startEditing() {
    isEditing = true;
  }

  function cancelEdit() {
    // 수정 취소 시 원래 데이터로 복원
    if (userProfile) {
      formData = {
        fullName: userProfile.full_name,
        phoneNumber: userProfile.phone_number
      };
    }
    isEditing = false;
    error = '';
    successMessage = '';
  }

  async function saveProfile() {
    if (!$user) return;
    
    loading = true;
    error = '';
    successMessage = '';
    
    try {
      // 기본 유효성 검사
      if (!formData.fullName || formData.fullName.length < 2) {
        throw new Error('이름은 2자 이상 입력해주세요.');
      }
      
      if (!formData.phoneNumber || !/^[0-9+\-\s()]+$/.test(formData.phoneNumber)) {
        throw new Error('유효한 전화번호를 입력해주세요.');
      }
      
      // 프로필 업데이트
      const result = await updateUserProfile($user.id, formData);
      
      if (result.success) {
        userProfile = result.data;
        successMessage = '프로필이 성공적으로 업데이트되었습니다.';
        isEditing = false;
      } else {
        throw new Error(result.error || '프로필 업데이트에 실패했습니다.');
      }
    } catch (err) {
      error = err.message;
    }
    
    loading = false;
  }
  
  function formatDate(dateString) {
    if (!dateString) return '없음';
    return new Date(dateString).toLocaleString();
  }
  
  function getPolicyLabel(type) {
    switch(type) {
      case 'privacy_policy': return '개인정보처리방침';
      case 'terms_of_service': return '서비스 이용약관';
      default: return type;
    }
  }
  
  async function viewPolicyDetails(policyType) {
    loadingPolicy = true;
    policyError = '';
    currentPolicy = null;
    showPolicyModal = true;
    
    try {
      const result = await getPolicyContent(policyType);
      
      if (result.success && result.data) {
        currentPolicy = result.data;
      } else {
        throw new Error('정책 내용을 불러올 수 없습니다.');
      }
    } catch (err) {
      policyError = err.message;
    } finally {
      loadingPolicy = false;
    }
  }
  
  function closeModal() {
    showPolicyModal = false;
    currentPolicy = null;
  }

  // 모달이 열려있을 때 ESC로 닫기
  function handleKeydown(event) {
    if (event.key === 'Escape' && showPolicyModal) {
      closeModal();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="container mx-auto px-4 py-8 max-w-4xl">
  <div class="bg-white shadow-md rounded-lg overflow-hidden">
    <div class="px-6 py-4 bg-blue-600 text-white flex justify-between items-center">
      <h1 class="text-xl font-semibold">내 프로필</h1>
      {#if !isEditing && !loading}
        <button 
          class="bg-white text-blue-600 px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-50 transition"
          on:click={startEditing}
        >
          수정하기
        </button>
      {/if}
    </div>
    
    {#if loading}
      <div class="p-6 flex justify-center">
        <LoadingSpinner />
      </div>
    {:else if error}
      <div class="p-6">
        <div class="bg-red-50 text-red-800 p-3 rounded-md mb-4">
          {error}
        </div>
        <button 
          class="text-blue-600 hover:underline"
          on:click={() => loadProfileData($user.id)}
        >
          다시 시도하기
        </button>
      </div>
    {:else}
      {#if successMessage}
        <div class="px-6 pt-4">
          <div class="bg-green-50 text-green-800 p-3 rounded-md">
            {successMessage}
          </div>
        </div>
      {/if}
      
      <div class="p-6">
        <!-- 프로필 정보 폼 -->
        <div class="mb-8">
          <h2 class="text-lg font-medium text-gray-900 mb-4">기본 정보</h2>
          
          {#if isEditing}
            <form on:submit|preventDefault={saveProfile} class="space-y-4">
              <div>
                <label for="fullName" class="block text-sm font-medium text-gray-700 mb-1">이름</label>
                <input 
                  type="text" 
                  id="fullName" 
                  bind:value={formData.fullName} 
                  class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="이름을 입력하세요"
                />
              </div>
              
              <div>
                <label for="phoneNumber" class="block text-sm font-medium text-gray-700 mb-1">전화번호</label>
                <input 
                  type="text" 
                  id="phoneNumber" 
                  bind:value={formData.phoneNumber} 
                  class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="전화번호를 입력하세요"
                />
              </div>
              
              <div class="flex space-x-3 pt-2">
                <button 
                  type="submit" 
                  class="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition"
                  disabled={loading}
                >
                  저장하기
                </button>
                <button 
                  type="button" 
                  class="bg-gray-200 text-gray-800 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-300 transition"
                  on:click={cancelEdit}
                  disabled={loading}
                >
                  취소
                </button>
              </div>
            </form>
          {:else}
            <div class="border border-gray-200 rounded-md overflow-hidden">
              <dl class="divide-y divide-gray-200">
                <div class="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 bg-gray-50">
                  <dt class="text-sm font-medium text-gray-500">이메일</dt>
                  <dd class="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{$user ? $user.email : ''}</dd>
                </div>
                
                <div class="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt class="text-sm font-medium text-gray-500">이름</dt>
                  <dd class="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {userProfile ? userProfile.full_name : '정보 없음'}
                  </dd>
                </div>
                
                <div class="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 bg-gray-50">
                  <dt class="text-sm font-medium text-gray-500">전화번호</dt>
                  <dd class="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {userProfile ? userProfile.phone_number : '정보 없음'}
                  </dd>
                </div>
                
                <div class="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt class="text-sm font-medium text-gray-500">가입일</dt>
                  <dd class="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {$user ? formatDate($user.created_at) : ''}
                  </dd>
                </div>
                
                <div class="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 bg-gray-50">
                  <dt class="text-sm font-medium text-gray-500">최근 프로필 수정일</dt>
                  <dd class="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {userProfile ? formatDate(userProfile.updated_at) : '정보 없음'}
                  </dd>
                </div>
              </dl>
            </div>
          {/if}
        </div>
        
        <!-- 동의 내역 정보 -->
        <div>
          <h2 class="text-lg font-medium text-gray-900 mb-4">이용약관 동의 내역</h2>
          
          {#if userAgreements.length > 0}
            <div class="border border-gray-200 rounded-md overflow-hidden overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200 table-fixed">
                <thead class="bg-gray-50">
                  <tr>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[20%]">약관 종류</th>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[10%]">버전</th>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[15%]">동의 여부</th>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[35%]">동의 일시</th>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[20%]">내용 보기</th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  {#each userAgreements as agreement}
                    <tr>
                      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {getPolicyLabel(agreement.agreement_type)}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {agreement.agreement_version}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {#if agreement.agreed}
                          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            동의함
                          </span>
                        {:else}
                          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            동의 안함
                          </span>
                        {/if}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(agreement.agreed_at)}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          on:click={() => viewPolicyDetails(agreement.agreement_type)}
                          class="text-blue-600 hover:text-blue-800 hover:underline focus:outline-none"
                        >
                          내용 보기
                        </button>
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {:else}
            <p class="text-gray-500 text-sm">동의 내역이 없습니다.</p>
          {/if}
        </div>
      </div>
    {/if}
  </div>
</div>

<!-- 정책 내용 모달 -->
{#if showPolicyModal}
  <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity z-40" on:click={closeModal}></div>
  <div class="fixed inset-0 z-50 overflow-y-auto">
    <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
      <div 
        class="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-3xl"
        on:click|stopPropagation
      >
        <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <div class="sm:flex sm:items-start">
            <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
              {#if loadingPolicy}
                <div class="py-6 flex justify-center">
                  <LoadingSpinner />
                </div>
              {:else if policyError}
                <div class="bg-red-50 text-red-800 p-3 rounded-md my-4">
                  {policyError}
                </div>
              {:else if currentPolicy}
                <h3 class="text-lg font-medium leading-6 text-gray-900 mb-4">
                  {currentPolicy.title} (v{currentPolicy.version})
                </h3>
                <div class="mt-2 bg-gray-50 p-4 rounded-md max-h-[60vh] overflow-y-auto">
                  <div class="prose prose-sm max-w-none">
                    {#if currentPolicy.content}
                      <div class="whitespace-pre-wrap">
                        {currentPolicy.content}
                      </div>
                    {:else}
                      <p class="text-gray-500 italic">내용이 없습니다.</p>
                    {/if}
                  </div>
                </div>
                <div class="mt-3">
                  <p class="text-sm text-gray-500">
                    최종 업데이트: {formatDate(currentPolicy.updated_at)}
                  </p>
                </div>
              {/if}
            </div>
          </div>
        </div>
        <div class="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
          <button
            type="button"
            on:click={closeModal}
            class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  </div>
{/if} 