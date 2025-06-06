<!-- src/lib/components/PromptCreateForm.svelte -->
<script>
	import { createEventDispatcher } from 'svelte';
	
	const dispatch = createEventDispatcher();
	
	export let isConnected = false;
	export let formData = {
		name: '',
		description: '',
		prompt_content: '',
		is_favorite: false
	};
	
	$: charCount = formData.prompt_content.length;
	
	function handleSave() {
		if (!formData.name.trim() || !formData.prompt_content.trim()) {
			alert('이름과 프롬프트 내용을 입력해주세요.');
			return;
		}
		dispatch('save', formData);
	}
	
	function handleCancel() {
		dispatch('cancel');
	}
</script>

<!-- 새 프롬프트 생성 폼 -->
<div class="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
	<h4 class="font-medium text-gray-700 mb-3">새 프롬프트 만들기</h4>
	<div class="space-y-3">
		<div>
			<label class="block text-sm font-medium text-gray-700 mb-1">이름 *</label>
			<input
				type="text"
				bind:value={formData.name}
				placeholder="프롬프트 이름을 입력하세요"
				class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
				maxlength="100"
				disabled={isConnected}
			/>
		</div>
		<div>
			<label class="block text-sm font-medium text-gray-700 mb-1">설명</label>
			<input
				type="text"
				bind:value={formData.description}
				placeholder="프롬프트에 대한 간단한 설명 (선택사항)"
				class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
				disabled={isConnected}
			/>
		</div>
		<div>
			<div class="flex justify-between items-center mb-1">
				<label class="block text-sm font-medium text-gray-700">프롬프트 내용 *</label>
				<span class="text-sm text-gray-500">{charCount}/2000자</span>
			</div>
			<textarea
				bind:value={formData.prompt_content}
				placeholder="AI 선생님의 성격과 교육 방식을 자세히 설명해주세요..."
				class="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
				maxlength="2000"
				disabled={isConnected}
			></textarea>
		</div>
		<div class="flex items-center">
			<input
				type="checkbox"
				bind:checked={formData.is_favorite}
				id="new-favorite"
				class="mr-2"
				disabled={isConnected}
			/>
			<label for="new-favorite" class="text-sm text-gray-700">즐겨찾기에 추가</label>
		</div>
	</div>
	<div class="flex gap-2 mt-4">
		<button
			on:click={handleSave}
			disabled={!formData.name.trim() || !formData.prompt_content.trim() || isConnected}
			class="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
		>
			저장하기
		</button>
		<button
			on:click={handleCancel}
			disabled={isConnected}
			class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
		>
			취소
		</button>
	</div>
</div> 