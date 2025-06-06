import { supabase } from './supabase.js';

// 온보딩 상태 캐싱
const onboardingCache = {
  data: null,
  timestamp: 0,
  ttl: 60000 // 1분 캐시
};

// 사용자 온보딩 상태 확인
export async function checkOnboardingStatus(userId) {
  try {
    // 캐시 확인
    const now = Date.now();
    if (
      onboardingCache.data && 
      onboardingCache.data.userId === userId && 
      now - onboardingCache.timestamp < onboardingCache.ttl
    ) {
      console.log('온보딩 상태 캐시 사용:', userId);
      return { 
        success: true, 
        data: onboardingCache.data,
        cached: true
      };
    }
    
    console.log('온보딩 상태 확인 시작:', userId);
    const { data, error } = await supabase.rpc('check_user_onboarding_status', {
      target_user_id: userId
    });
    
    if (error) {
      console.error('온보딩 상태 확인 RPC 에러:', error);
      
      // 캐시가 있다면 캐시된 데이터를 반환 (만료되었더라도)
      if (onboardingCache.data && onboardingCache.data.userId === userId) {
        console.log('RPC 에러 - 만료된 캐시 사용');
        return {
          success: true,
          data: onboardingCache.data,
          cached: true,
          stale: true
        };
      }
      
      // 기본값 반환
      console.log('RPC 에러 - 기본값 사용');
      const defaultData = {
        userId,
        has_profile: false,
        privacy_agreed: false,
        terms_agreed: false,
        onboarding_complete: false
      };
      return { success: true, data: defaultData, default: true };
    }
    
    const result = data[0] || {
      userId,
      has_profile: false,
      privacy_agreed: false,
      terms_agreed: false,
      onboarding_complete: false
    };
    
    console.log('온보딩 상태 결과:', result);
    
    // 캐시 업데이트
    onboardingCache.data = { ...result, userId };
    onboardingCache.timestamp = now;
    
    return { 
      success: true, 
      data: result
    };
  } catch (error) {
    console.error('온보딩 상태 확인 실패:', error);
    
    // 캐시가 있다면 캐시된 데이터를 반환 (만료되었더라도)
    if (onboardingCache.data && onboardingCache.data.userId === userId) {
      console.log('캐치 블록 - 캐시 사용');
      return {
        success: true,
        data: onboardingCache.data,
        cached: true,
        stale: true
      };
    }
    
    // 기본값 반환
    console.log('캐치 블록 - 기본값 사용');
    const defaultData = {
      userId,
      has_profile: false,
      privacy_agreed: false,
      terms_agreed: false,
      onboarding_complete: false
    };
    return { success: true, data: defaultData, default: true };
  }
}

// 정책 내용 가져오기
export async function getPolicyContent(policyType) {
  try {
    const { data, error } = await supabase
      .from('policy_versions')
      .select('*')
      .eq('policy_type', policyType)
      .eq('is_current', true)
      .single();
    
    if (error) throw error;
    
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// 모든 현재 정책 가져오기
export async function getAllCurrentPolicies() {
  try {
    const { data, error } = await supabase
      .from('policy_versions')
      .select('*')
      .eq('is_current', true)
      .order('policy_type');
    
    if (error) throw error;
    
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// 사용자 프로필 정보 가져오기
export async function getUserProfile(userId) {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116는 레코드가 없을 때의 에러
      throw error;
    }
    
    return { 
      success: true, 
      data: data || null 
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// 사용자 동의 정보 가져오기
export async function getUserAgreements(userId) {
  try {
    const { data, error } = await supabase
      .from('user_agreements')
      .select('*')
      .eq('user_id', userId);
    
    if (error) throw error;
    
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// 클라이언트 정보 가져오기 (IP 주소와 User Agent)
function getClientInfo() {
  return {
    userAgent: navigator.userAgent,
    // IP 주소는 서버에서 처리하므로 null로 전달
    ipAddress: null
  };
}

// 온보딩 완료 처리
export async function completeOnboarding(userId, profileData) {
  try {
    const clientInfo = getClientInfo();
    
    const { data, error } = await supabase.rpc('complete_user_onboarding', {
      target_user_id: userId,
      user_full_name: profileData.fullName,
      user_phone: profileData.phoneNumber,
      user_ip: clientInfo.ipAddress,
      user_agent_string: clientInfo.userAgent
    });
    
    if (error) throw error;
    
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// 개별 동의 처리 (필요시 사용)
export async function recordAgreement(userId, agreementType, agreed = true) {
  try {
    const clientInfo = getClientInfo();
    
    // 현재 정책 버전 가져오기
    const policyResult = await getPolicyContent(agreementType);
    if (!policyResult.success) {
      throw new Error('정책 정보를 가져올 수 없습니다.');
    }
    
    const agreementData = {
      user_id: userId,
      agreement_type: agreementType,
      agreement_version: policyResult.data.version,
      agreed: agreed,
      agreed_at: agreed ? new Date().toISOString() : null,
      ip_address: clientInfo.ipAddress,
      user_agent: clientInfo.userAgent
    };
    
    const { data, error } = await supabase
      .from('user_agreements')
      .upsert(agreementData, {
        onConflict: 'user_id,agreement_type'
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// 사용자 프로필 업데이트
export async function updateUserProfile(userId, profileData) {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert({
        user_id: userId,
        full_name: profileData.fullName,
        phone_number: profileData.phoneNumber,
        profile_completed: true
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// 동의 철회 (필요시 사용)
export async function revokeAgreement(userId, agreementType) {
  try {
    const { data, error } = await supabase
      .from('user_agreements')
      .update({
        agreed: false,
        agreed_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('agreement_type', agreementType)
      .select()
      .single();
    
    if (error) throw error;
    
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// 프로필 완성 여부 확인
export async function isProfileComplete(userId) {
  try {
    const statusResult = await checkOnboardingStatus(userId);
    if (!statusResult.success) {
      return { success: false, error: statusResult.error };
    }
    
    return { 
      success: true, 
      isComplete: statusResult.data.onboarding_complete 
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
} 