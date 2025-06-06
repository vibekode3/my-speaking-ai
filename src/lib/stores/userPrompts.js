import { writable } from 'svelte/store';
import { supabase } from '../supabase.js';

// 사용자 프롬프트 목록
export const userPrompts = writable([]);

// 로딩 상태
export const promptsLoading = writable(false);

// 선택된 프롬프트
export const selectedPrompt = writable(null);

// 즐겨찾기 프롬프트만 필터링
export const favoritePrompts = writable([]);

// 사용자 프롬프트 목록 로드
export async function loadUserPrompts() {
    try {
        promptsLoading.set(true);

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            userPrompts.set([]);
            favoritePrompts.set([]);
            return;
        }

        const { data, error } = await supabase
            .from('user_prompts')
            .select('*')
            .eq('user_id', user.id)
            .order('is_favorite', { ascending: false })
            .order('usage_count', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) throw error;

        const prompts = data || [];
        userPrompts.set(prompts);
        favoritePrompts.set(prompts.filter(p => p.is_favorite));
        
        return prompts;
    } catch (error) {
        console.error('프롬프트 로드 오류:', error);
        userPrompts.set([]);
        favoritePrompts.set([]);
        throw error;
    } finally {
        promptsLoading.set(false);
    }
}

// 새 프롬프트 생성
export async function createPrompt(promptData) {
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            throw new Error('사용자 인증이 필요합니다.');
        }

        const newPrompt = {
            user_id: user.id,
            name: promptData.name,
            description: promptData.description || '',
            prompt_content: promptData.prompt_content,
            template_type: promptData.template_type || 'custom',
            is_favorite: promptData.is_favorite || false
        };

        const { data, error } = await supabase
            .from('user_prompts')
            .insert(newPrompt)
            .select()
            .single();

        if (error) throw error;

        // 목록 새로고침
        await loadUserPrompts();
        
        return data;
    } catch (error) {
        console.error('프롬프트 생성 오류:', error);
        throw error;
    }
}

// 프롬프트 업데이트
export async function updatePrompt(promptId, updates) {
    try {
        const { data, error } = await supabase
            .from('user_prompts')
            .update(updates)
            .eq('id', promptId)
            .select()
            .single();

        if (error) throw error;

        // 목록 새로고침
        await loadUserPrompts();
        
        return data;
    } catch (error) {
        console.error('프롬프트 업데이트 오류:', error);
        throw error;
    }
}

// 프롬프트 삭제
export async function deletePrompt(promptId) {
    try {
        const { error } = await supabase
            .from('user_prompts')
            .delete()
            .eq('id', promptId);

        if (error) throw error;

        // 목록에서 제거
        userPrompts.update(prompts => prompts.filter(p => p.id !== promptId));
        favoritePrompts.update(prompts => prompts.filter(p => p.id !== promptId));
        
        // 선택된 프롬프트가 삭제된 경우 초기화
        selectedPrompt.update(current => current?.id === promptId ? null : current);
        
    } catch (error) {
        console.error('프롬프트 삭제 오류:', error);
        throw error;
    }
}

// 즐겨찾기 토글
export async function toggleFavorite(promptId, isFavorite) {
    try {
        await updatePrompt(promptId, { is_favorite: isFavorite });
    } catch (error) {
        console.error('즐겨찾기 토글 오류:', error);
        throw error;
    }
}

// 프롬프트 사용 (사용 횟수 증가)
export async function usePrompt(promptId) {
    try {
        // RPC 함수를 사용하여 usage_count 증가
        const { error } = await supabase.rpc('increment_prompt_usage', {
            prompt_id: promptId
        });

        if (error) throw error;
        
        // 목록 새로고침 (사용 횟수 순서 업데이트)
        await loadUserPrompts();
        
    } catch (error) {
        console.error('프롬프트 사용 업데이트 오류:', error);
        
        // RPC 함수가 없는 경우 대안 방법 시도
        try {
            // 현재 usage_count를 가져와서 1 증가시키기
            const { data: currentPrompt, error: fetchError } = await supabase
                .from('user_prompts')
                .select('usage_count')
                .eq('id', promptId)
                .single();
                
            if (fetchError) throw fetchError;
            
            const { error: updateError } = await supabase
                .from('user_prompts')
                .update({ 
                    usage_count: (currentPrompt.usage_count || 0) + 1,
                    last_used_at: new Date().toISOString()
                })
                .eq('id', promptId);
                
            if (updateError) throw updateError;
            
            // 목록 새로고침
            await loadUserPrompts();
            
        } catch (fallbackError) {
            console.error('프롬프트 사용 업데이트 대안 방법 실패:', fallbackError);
            throw fallbackError;
        }
    }
}

// 기본 프롬프트 템플릿 생성 (신규 사용자용)
export async function createDefaultPrompts() {
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            throw new Error('사용자 인증이 필요합니다.');
        }

        // 이미 기본 프롬프트가 있는지 확인
        const { data: existing, error: checkError } = await supabase
            .from('user_prompts')
            .select('id')
            .eq('user_id', user.id)
            .eq('is_default', true)
            .limit(1);

        if (checkError) throw checkError;
        
        if (existing && existing.length > 0) {
            console.log('기본 프롬프트가 이미 존재합니다.');
            return;
        }

        // 기본 프롬프트 생성 함수 호출
        const { error } = await supabase.rpc('insert_default_prompts_for_user', {
            target_user_id: user.id
        });

        if (error) throw error;

        // 목록 새로고침
        await loadUserPrompts();
        
    } catch (error) {
        console.error('기본 프롬프트 생성 오류:', error);
        throw error;
    }
}

// 프롬프트 검색
export async function searchPrompts(searchTerm) {
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            throw new Error('사용자 인증이 필요합니다.');
        }

        const { data, error } = await supabase
            .from('user_prompts')
            .select('*')
            .eq('user_id', user.id)
            .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,prompt_content.ilike.%${searchTerm}%`)
            .order('usage_count', { ascending: false });

        if (error) throw error;

        return data || [];
    } catch (error) {
        console.error('프롬프트 검색 오류:', error);
        throw error;
    }
}

// 프롬프트 복제
export async function duplicatePrompt(promptId, newName) {
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            throw new Error('사용자 인증이 필요합니다.');
        }

        // 원본 프롬프트 가져오기
        const { data: original, error: fetchError } = await supabase
            .from('user_prompts')
            .select('*')
            .eq('id', promptId)
            .eq('user_id', user.id)
            .single();

        if (fetchError) throw fetchError;

        // 복제된 프롬프트 생성
        const duplicatedPrompt = {
            user_id: user.id,
            name: newName || `${original.name} (복사본)`,
            description: original.description,
            prompt_content: original.prompt_content,
            template_type: 'custom',
            is_favorite: false,
            is_default: false
        };

        const { data, error } = await supabase
            .from('user_prompts')
            .insert(duplicatedPrompt)
            .select()
            .single();

        if (error) throw error;

        // 목록 새로고침
        await loadUserPrompts();
        
        return data;
    } catch (error) {
        console.error('프롬프트 복제 오류:', error);
        throw error;
    }
} 