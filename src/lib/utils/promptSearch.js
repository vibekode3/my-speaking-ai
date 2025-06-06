import { searchPrompts } from '../stores/userPrompts.js';

// 검색 상태 관리 클래스
export class PromptSearchManager {
	constructor() {
		this.searchTerm = '';
		this.searchResults = [];
		this.isSearching = false;
	}

	// 검색 실행
	async performSearch(searchTerm) {
		this.searchTerm = searchTerm;
		
		if (!searchTerm.trim()) {
			this.searchResults = [];
			this.isSearching = false;
			return this.searchResults;
		}
		
		try {
			this.isSearching = true;
			this.searchResults = await searchPrompts(searchTerm.trim());
			return this.searchResults;
		} catch (error) {
			console.error('검색 오류:', error);
			this.searchResults = [];
			return this.searchResults;
		} finally {
			this.isSearching = false;
		}
	}

	// 검색 결과 초기화
	clearSearch() {
		this.searchTerm = '';
		this.searchResults = [];
		this.isSearching = false;
	}

	// 표시할 프롬프트 목록 반환 (검색 결과 또는 전체 목록)
	getDisplayPrompts(allPrompts) {
		return this.searchResults.length > 0 ? this.searchResults : allPrompts;
	}
} 