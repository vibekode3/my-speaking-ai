// src/lib/utils/promptFormManager.js

// 폼 데이터 초기값
const defaultFormData = {
	name: '',
	description: '',
	prompt_content: '',
	is_favorite: false
};

// 프롬프트 폼 관리 클래스
export class PromptFormManager {
	constructor() {
		this.showCreateForm = false;
		this.showEditForm = false;
		this.editingPrompt = null;
		this.newPromptData = { ...defaultFormData };
		this.editPromptData = { ...defaultFormData };
	}

	// 새 프롬프트 생성 폼 토글
	toggleCreateForm() {
		this.showCreateForm = !this.showCreateForm;
		this.showEditForm = false;
		if (this.showCreateForm) {
			this.resetNewPromptForm();
		}
	}

	// 새 프롬프트 폼 초기화
	resetNewPromptForm() {
		this.newPromptData = { ...defaultFormData };
	}

	// 새 프롬프트 생성 취소
	cancelCreateForm() {
		this.showCreateForm = false;
		this.resetNewPromptForm();
	}

	// 편집 폼 시작
	startEditForm(prompt) {
		this.editingPrompt = prompt;
		this.editPromptData = {
			name: prompt.name,
			description: prompt.description,
			prompt_content: prompt.prompt_content,
			is_favorite: prompt.is_favorite
		};
		this.showEditForm = true;
		this.showCreateForm = false;
	}

	// 편집 폼 취소
	cancelEditForm() {
		this.showEditForm = false;
		this.editingPrompt = null;
		this.editPromptData = { ...defaultFormData };
	}

	// 폼 상태 반환
	getFormState() {
		return {
			showCreateForm: this.showCreateForm,
			showEditForm: this.showEditForm,
			editingPrompt: this.editingPrompt,
			newPromptData: this.newPromptData,
			editPromptData: this.editPromptData
		};
	}
} 