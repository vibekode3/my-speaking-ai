import {
	loadUserPrompts,
	createDefaultPrompts
} from '../stores/userPrompts.js';

// 프롬프트 초기화 관련 함수들
export async function initializePrompts(userPrompts, favoritePrompts, selectPromptCallback) {
	try {
		await loadUserPrompts();
		
		// 기본 프롬프트가 없으면 생성
		if (userPrompts.length === 0) {
			await createDefaultPrompts();
		}
		
		// 기본 프롬프트 선택 (즐겨찾기 중 첫 번째 또는 전체 중 첫 번째)
		if (userPrompts.length > 0) {
			const defaultPrompt = favoritePrompts.length > 0 
				? favoritePrompts[0] 
				: userPrompts[0];
			selectPromptCallback(defaultPrompt);
		}
		
		return true;
	} catch (error) {
		console.error('프롬프트 초기화 오류:', error);
		return false;
	}
}

// 프롬프트 삭제 후 처리
export function handlePromptDeletionFallback(deletedPromptId, currentSelectedPrompt, userPrompts, selectPromptCallback) {
	// 삭제된 프롬프트가 현재 선택된 경우 다른 프롬프트 선택
	if (currentSelectedPrompt?.id === deletedPromptId && userPrompts.length > 0) {
		selectPromptCallback(userPrompts[0]);
	}
}

// 프롬프트 편집 후 처리
export function handlePromptEditUpdate(editedPromptId, currentSelectedPrompt, userPrompts, selectPromptCallback) {
	// 현재 선택된 프롬프트가 편집된 경우 업데이트
	if (currentSelectedPrompt?.id === editedPromptId) {
		const updatedPrompt = userPrompts.find(p => p.id === editedPromptId);
		if (updatedPrompt) {
			selectPromptCallback(updatedPrompt);
		}
	}
} 