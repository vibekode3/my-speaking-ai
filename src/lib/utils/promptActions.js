import { 
    createPrompt, 
    updatePrompt, 
    deletePrompt, 
    toggleFavorite, 
    duplicatePrompt,
    usePrompt 
} from '../stores/userPrompts.js';

// 새 프롬프트 저장
export async function saveNewPrompt(promptData) {
    try {
        const created = await createPrompt(promptData);
        return created;
    } catch (error) {
        console.error('프롬프트 저장 오류:', error);
        throw new Error('프롬프트 저장에 실패했습니다: ' + error.message);
    }
}

// 프롬프트 편집 저장
export async function saveEditPrompt(promptId, promptData) {
    try {
        const updated = await updatePrompt(promptId, promptData);
        return updated;
    } catch (error) {
        console.error('프롬프트 편집 오류:', error);
        throw new Error('프롬프트 편집에 실패했습니다: ' + error.message);
    }
}

// 프롬프트 삭제
export async function removePrompt(promptData) {
    try {
        if (!confirm('정말로 이 프롬프트를 삭제하시겠습니까?')) {
            return false;
        }
        
        await deletePrompt(promptData.id);
        return true;
    } catch (error) {
        console.error('프롬프트 삭제 오류:', error);
        throw new Error('프롬프트 삭제에 실패했습니다: ' + error.message);
    }
}

// 즐겨찾기 토글
export async function togglePromptFavorite(promptData) {
    try {
        const newFavoriteStatus = !promptData.is_favorite;
        await toggleFavorite(promptData.id, newFavoriteStatus);
    } catch (error) {
        console.error('즐겨찾기 토글 오류:', error);
        throw new Error('즐겨찾기 설정에 실패했습니다: ' + error.message);
    }
}

// 프롬프트 복제 (이름 입력 포함)
export async function duplicatePromptWithName(promptData) {
    try {
        const newName = prompt('복제할 프롬프트의 이름을 입력하세요:', `${promptData.name} (복사본)`);
        
        if (!newName || !newName.trim()) {
            return null; // 사용자가 취소했거나 빈 이름을 입력
        }
        
        const duplicated = await duplicatePrompt(promptData.id, newName.trim());
        return duplicated;
    } catch (error) {
        console.error('프롬프트 복제 오류:', error);
        throw new Error('프롬프트 복제에 실패했습니다: ' + error.message);
    }
}

// 프롬프트 선택 및 사용
export async function selectAndUsePrompt(prompt, dispatch, setters) {
    try {
        // 사용 횟수 증가
        await usePrompt(prompt.id);
        
        // 상태 업데이트
        setters.setSelectedPrompt(prompt);
        setters.setCurrentPromptId(prompt.id);
        setters.setCustomPrompt(prompt.prompt_content);
        
        // 부모 컴포넌트에 프롬프트 선택 이벤트 전달
        dispatch('prompt-selected', {
            prompt,
            content: prompt.prompt_content
        });
        
    } catch (error) {
        console.error('프롬프트 선택 오류:', error);
        // 에러가 발생해도 선택은 계속 진행 (사용 횟수 업데이트만 실패)
        setters.setSelectedPrompt(prompt);
        setters.setCurrentPromptId(prompt.id);
        setters.setCustomPrompt(prompt.prompt_content);
        
        dispatch('prompt-selected', {
            prompt,
            content: prompt.prompt_content
        });
    }
} 