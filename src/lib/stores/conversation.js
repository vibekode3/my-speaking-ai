import { writable } from 'svelte/store';
import { supabase } from '../supabase.js';

// 현재 대화 세션
export const currentConversation = writable({
    id: null,
    messages: [],
    startTime: null,
    title: '영어회화 기록',
    aiSettings: null,
    promptId: null
});

// 대화 기록 목록
export const conversationHistory = writable([]);

// 로딩 상태
export const conversationLoading = writable(false);

// 현재 대화 세션 시작
export async function startNewConversation(aiSettings = null, promptId = null) {
    try {
        conversationLoading.set(true);
        
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            throw new Error('사용자 인증이 필요합니다.');
        }

        const newConversation = {
            user_id: user.id,
            title: `영어회화 기록 - ${new Date().toLocaleDateString()}`,
            messages: [],
            started_at: new Date().toISOString(),
            ai_settings: aiSettings || {},
            prompt_template: aiSettings?.template || 'friendly',
            custom_prompt: aiSettings?.customPrompt || ''
            // prompt_id는 일시적으로 비활성화 (데이터베이스 스키마 문제로 인해)
        };

        const { data, error } = await supabase
            .from('conversation_records')
            .insert(newConversation)
            .select()
            .single();

        if (error) throw error;

        currentConversation.set({
            id: data.id,
            messages: [],
            startTime: new Date(),
            title: data.title,
            aiSettings: data.ai_settings,
            promptId: promptId // 메모리에서만 유지
        });

        return data.id;
    } catch (error) {
        console.error('대화 시작 오류:', error);
        throw error;
    } finally {
        conversationLoading.set(false);
    }
}

// 현재 대화에 메시지 추가
export async function addMessageToCurrentConversation(speaker, message, usageInfo = null) {
    try {
        currentConversation.update(conv => {
            const newMessage = {
                speaker,
                message,
                timestamp: new Date().toISOString(),
                ...(usageInfo && { usage: usageInfo }) // 사용량 정보가 있으면 추가
            };
            
            return {
                ...conv,
                messages: [...conv.messages, newMessage]
            };
        });

        // 데이터베이스에 메시지 업데이트
        const conv = await new Promise(resolve => {
            currentConversation.subscribe(value => resolve(value))();
        });

        if (conv.id) {
            await updateConversationInDB(conv.id, conv.messages);
        }
    } catch (error) {
        console.error('메시지 추가 오류:', error);
    }
}

// 현재 대화 종료
export async function endCurrentConversation() {
    try {
        const conv = await new Promise(resolve => {
            currentConversation.subscribe(value => resolve(value))();
        });

        if (conv.id && conv.startTime) {
            const endTime = new Date();
            const durationMinutes = Math.round((endTime - conv.startTime) / (1000 * 60));

            const { error } = await supabase
                .from('conversation_records')
                .update({
                    ended_at: endTime.toISOString(),
                    duration_minutes: durationMinutes,
                    messages: conv.messages
                })
                .eq('id', conv.id);

            if (error) throw error;
        }

        // 현재 대화 초기화
        currentConversation.set({
            id: null,
            messages: [],
            startTime: null,
            title: '영어회화 기록',
            aiSettings: null,
            promptId: null
        });

        // 대화 기록 목록 새로고침
        await loadConversationHistory();
    } catch (error) {
        console.error('대화 종료 오류:', error);
        throw error;
    }
}

// 데이터베이스에 대화 업데이트
async function updateConversationInDB(conversationId, messages) {
    try {
        const { error } = await supabase
            .from('conversation_records')
            .update({ messages })
            .eq('id', conversationId);

        if (error) throw error;
    } catch (error) {
        console.error('대화 업데이트 오류:', error);
    }
}

// 대화 기록 목록 로드
export async function loadConversationHistory() {
    try {
        conversationLoading.set(true);

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            conversationHistory.set([]);
            return;
        }

        // 대화 기록 가져오기 (프롬프트 조인 비활성화)
        const { data, error } = await supabase
            .from('conversation_records')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(50); // 최근 50개만 로드

        if (error) throw error;

        conversationHistory.set(data || []);
    } catch (error) {
        console.error('대화 기록 로드 오류:', error);
        conversationHistory.set([]);
    } finally {
        conversationLoading.set(false);
    }
}

// 특정 대화 기록 삭제
export async function deleteConversation(conversationId) {
    try {
        const { error } = await supabase
            .from('conversation_records')
            .delete()
            .eq('id', conversationId);

        if (error) throw error;

        // 목록에서 제거
        conversationHistory.update(history => 
            history.filter(conv => conv.id !== conversationId)
        );
    } catch (error) {
        console.error('대화 삭제 오류:', error);
        throw error;
    }
}

// 대화 제목 업데이트
export async function updateConversationTitle(conversationId, newTitle) {
    try {
        const { error } = await supabase
            .from('conversation_records')
            .update({ title: newTitle })
            .eq('id', conversationId);

        if (error) throw error;

        // 현재 대화가 업데이트 대상이면 제목 변경
        currentConversation.update(conv => {
            if (conv.id === conversationId) {
                return { ...conv, title: newTitle };
            }
            return conv;
        });

        // 기록 목록에서도 제목 변경
        conversationHistory.update(history =>
            history.map(conv =>
                conv.id === conversationId ? { ...conv, title: newTitle } : conv
            )
        );
    } catch (error) {
        console.error('제목 업데이트 오류:', error);
        throw error;
    }
} 