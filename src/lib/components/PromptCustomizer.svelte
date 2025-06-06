<!-- src/lib/components/PromptCustomizer.svelte -->
<script>
	import { createEventDispatcher, onMount } from 'svelte';
	import { user } from '../stores/auth.js';
	import {
		userPrompts,
		promptsLoading,
		selectedPrompt,
		favoritePrompts
	} from '../stores/userPrompts.js';
	
	import PromptSearchBar from './PromptSearchBar.svelte';
	import PromptCreateForm from './PromptCreateForm.svelte';
	import PromptEditForm from './PromptEditForm.svelte';
	import PromptList from './PromptList.svelte';
	import PromptInfo from './PromptInfo.svelte';
	
	import { PromptSearchManager } from '../utils/promptSearch.js';
	import { PromptFormManager } from '../utils/promptFormManager.js';
	import { initializePrompts, handlePromptDeletionFallback, handlePromptEditUpdate } from '../utils/promptInitializer.js';
	import {
		saveNewPrompt,
		saveEditPrompt,
		removePrompt,
		togglePromptFavorite,
		duplicatePromptWithName,
		selectAndUsePrompt
	} from '../utils/promptActions.js';
	
	const dispatch = createEventDispatcher();
	
	export let isConnected = false;
	export let customPrompt = '';
	
	// 유틸리티 매니저 인스턴스들
	let searchManager = new PromptSearchManager();
	let formManager = new PromptFormManager();
	
	// 현재 선택된 프롬프트 ID
	let currentPromptId = null;
	
	// 컴포넌트 마운트 시 초기화
	onMount(async () => {
		if ($user) {
			await handleInitialization();
		}
	});
	
	// 사용자 변경 시 프롬프트 로드
	$: if ($user) {
		handleInitialization();
	}
	
	// 프롬프트 초기화
	async function handleInitialization() {
		await initializePrompts($userPrompts, $favoritePrompts, selectPrompt);
	}
	
	// 프롬프트 선택
	function selectPrompt(prompt) {
		const setters = {
			setSelectedPrompt: selectedPrompt.set,
			setCurrentPromptId: (id) => { currentPromptId = id; },
			setCustomPrompt: (content) => { customPrompt = content; }
		};
		
		selectAndUsePrompt(prompt, dispatch, setters);
	}
	
	// 검색 처리
	async function handleSearch(event) {
		await searchManager.performSearch(event.detail.searchTerm);
		// 반응성을 위해 강제 업데이트
		searchManager = searchManager;
	}
	
	// 새 프롬프트 생성 폼 토글
	function handleToggleCreate() {
		formManager.toggleCreateForm();
		formManager = formManager; // 반응성 트리거
	}
	
	// 새 프롬프트 저장
	async function handleCreateSave(event) {
		try {
			const created = await saveNewPrompt(event.detail);
			formManager.cancelCreateForm();
			formManager = formManager; // 반응성 트리거
			selectPrompt(created);
		} catch (error) {
			alert(error.message);
		}
	}
	
	// 새 프롬프트 생성 취소
	function handleCreateCancel() {
		formManager.cancelCreateForm();
		formManager = formManager; // 반응성 트리거
	}
	
	// 프롬프트 편집 시작
	function handleEditStart(event) {
		formManager.startEditForm(event.detail);
		formManager = formManager; // 반응성 트리거
	}
	
	// 프롬프트 편집 저장
	async function handleEditSave(event) {
		try {
			await saveEditPrompt(formManager.editingPrompt.id, event.detail);
			const editedPromptId = formManager.editingPrompt.id;
			formManager.cancelEditForm();
			formManager = formManager; // 반응성 트리거
			
			handlePromptEditUpdate(editedPromptId, $selectedPrompt, $userPrompts, selectPrompt);
		} catch (error) {
			alert(error.message);
		}
	}
	
	// 프롬프트 편집 취소
	function handleEditCancel() {
		formManager.cancelEditForm();
		formManager = formManager; // 반응성 트리거
	}
	
	// 프롬프트 삭제
	async function handleDelete(event) {
		try {
			const deleted = await removePrompt(event.detail);
			if (deleted) {
				handlePromptDeletionFallback(event.detail.id, $selectedPrompt, $userPrompts, selectPrompt);
			}
		} catch (error) {
			alert(error.message);
		}
	}
	
	// 즐겨찾기 토글
	async function handleToggleFavorite(event) {
		try {
			await togglePromptFavorite(event.detail);
		} catch (error) {
			alert(error.message);
		}
	}
	
	// 프롬프트 복제
	async function handleDuplicate(event) {
		try {
			const duplicated = await duplicatePromptWithName(event.detail);
			if (duplicated) {
				selectPrompt(duplicated);
			}
		} catch (error) {
			alert(error.message);
		}
	}
	
	// 프롬프트 선택
	function handleSelect(event) {
		selectPrompt(event.detail);
	}
	
	// 반응성 변수들
	$: formState = formManager.getFormState();
	$: displayPrompts = searchManager.getDisplayPrompts($userPrompts);
</script>

<div class="bg-white rounded-lg shadow-lg p-6">
	<div class="flex justify-between items-center mb-4">
		<h3 class="text-lg font-semibold text-gray-800">프롬프트 관리</h3>
		{#if isConnected}
			<div class="text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded">
				⚠️ 연결 중에는 변경사항이 다음 연결부터 적용됩니다
			</div>
		{/if}
	</div>
	
	<!-- 검색 및 액션 버튼 -->
	<PromptSearchBar
		searchTerm={searchManager.searchTerm}
		isSearching={searchManager.isSearching}
		{isConnected}
		on:search={handleSearch}
		on:toggle-create={handleToggleCreate}
	/>
	
	<!-- 새 프롬프트 생성 폼 -->
	{#if formState.showCreateForm}
		<PromptCreateForm
			{isConnected}
			formData={formState.newPromptData}
			on:save={handleCreateSave}
			on:cancel={handleCreateCancel}
		/>
	{/if}
	
	<!-- 프롬프트 편집 폼 -->
	{#if formState.showEditForm && formState.editingPrompt}
		<PromptEditForm
			{isConnected}
			editingPrompt={formState.editingPrompt}
			formData={formState.editPromptData}
			on:save={handleEditSave}
			on:cancel={handleEditCancel}
		/>
	{/if}
	
	<!-- 프롬프트 목록 -->
	<PromptList
		prompts={displayPrompts}
		selectedPromptId={currentPromptId}
		isLoading={$promptsLoading}
		{isConnected}
		searchTerm={searchManager.searchTerm}
		on:select={handleSelect}
		on:edit={handleEditStart}
		on:toggle-favorite={handleToggleFavorite}
		on:duplicate={handleDuplicate}
		on:delete={handleDelete}
	/>
	
	<!-- 현재 선택된 프롬프트 정보 및 도움말 -->
	<PromptInfo selectedPrompt={$selectedPrompt} />
</div> 