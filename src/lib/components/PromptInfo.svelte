<!-- src/lib/components/PromptInfo.svelte -->
<script>
	export let promptInfo;
	export let customPrompt = null;
	
	// 프롬프트 타입별 이모지
	function getPromptTypeEmoji(type) {
		const emojiMap = {
			friendly: '😊',
			strict: '😤',
			business: '💼',
			casual: '🎉',
			custom: '✏️'
		};
		return emojiMap[type] || '🤖';
	}
	
	// promptInfo 안전성 체크
	$: safePromptInfo = promptInfo || {};
	$: promptName = safePromptInfo.name || '알 수 없는 프롬프트';
	$: promptType = safePromptInfo.type || safePromptInfo.template_type || 'custom';
	$: promptDescription = safePromptInfo.description || '';
</script>

{#if safePromptInfo && Object.keys(safePromptInfo).length > 0}
	<div class="mb-6">
		<h5 class="font-medium text-gray-700 mb-3">📝 사용된 프롬프트</h5>
		<div class="bg-purple-50 border border-purple-200 rounded-lg p-4">
			<div class="grid grid-cols-1 gap-3">
				<div class="flex justify-between items-center">
					<span class="text-sm font-medium text-gray-700">프롬프트:</span>
					<span class="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
						{getPromptTypeEmoji(promptType)} {promptName}
					</span>
				</div>
				{#if promptDescription}
					<div>
						<span class="text-sm font-medium text-gray-700 block mb-1">설명:</span>
						<p class="text-sm text-gray-600">{promptDescription}</p>
					</div>
				{/if}
				{#if customPrompt}
					<div>
						<span class="text-sm font-medium text-gray-700 block mb-2">프롬프트 내용:</span>
						<div class="bg-white border border-purple-200 rounded p-3 max-h-32 overflow-y-auto">
							<p class="text-sm text-gray-600 whitespace-pre-wrap">{customPrompt}</p>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<!-- 도움말 -->
<div class="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
	<div class="text-sm text-blue-800">
		<div class="font-medium mb-1">💡 프롬프트 관리 팁</div>
		<ul class="text-xs space-y-1 list-disc list-inside">
			<li>자주 사용하는 프롬프트는 즐겨찾기로 설정하세요</li>
			<li>프롬프트를 복제하여 수정하면 새로운 변형을 쉽게 만들 수 있습니다</li>
			<li>검색 기능으로 원하는 프롬프트를 빠르게 찾을 수 있습니다</li>
			<li>사용 횟수에 따라 자동으로 정렬되어 자주 쓰는 것이 위에 나타납니다</li>
		</ul>
	</div>
</div> 