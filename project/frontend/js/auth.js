import { supabase } from './supabase.js';

// 检查用户是否已登录
export async function checkAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// 获取当前用户信息
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  
  const { data: role } = await supabase
    .from('user_roles')
    .select('is_admin, role_type')
    .eq('user_id', user.id)
    .single();
  
  return {
    ...user,
    profile,
    isAdmin: role?.is_admin || false,
    roleType: role?.role_type || 'field_supervisor', // 'manager' 或 'field_supervisor'
    isManager: role?.role_type === 'manager',
    isFieldSupervisor: role?.role_type === 'field_supervisor'
  };
}

// 登录
export async function signIn(username, password) {
  const email = `${username}@creo4u.com`;
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (error) throw error;
  return data;
}

// 注册（支持角色选择）
export async function signUp(username, password, displayName, companyName, roleType = 'field_supervisor') {
  const email = `${username}@creo4u.com`;
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });
  
  if (error) throw error;
  
  // 创建用户档案
  const { error: profileError } = await supabase
    .from('user_profiles')
    .insert({
      id: data.user.id,
      username,
      display_name: displayName,
      company_name: companyName
    });
  
  if (profileError) throw profileError;
  
  // 更新用户角色类型（如果不是首个用户，触发器会设置默认值，这里需要更新）
  // 首个用户会被触发器自动设置为 manager
  const { data: existingRole } = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_id', data.user.id)
    .single();
  
  if (existingRole && !existingRole.is_admin) {
    // 非首个用户，更新角色类型
    await supabase
      .from('user_roles')
      .update({ role_type: roleType })
      .eq('user_id', data.user.id);
  }
  
  return data;
}

// 登出
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// 验证用户名格式
export function validateUsername(username) {
  const regex = /^[a-zA-Z0-9_-]+$/;
  return regex.test(username) && username.length >= 3 && username.length <= 20;
}
