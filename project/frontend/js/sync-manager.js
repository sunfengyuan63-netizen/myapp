/**
 * 同步管理模块
 * 负责检测网络状态、自动同步、手动同步等功能
 */

import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase.js';
import {
  initOfflineDB,
  getPendingTasks,
  getPendingResults,
  getPendingEvidence,
  updateTaskSyncStatus,
  updateResultSyncStatus,
  updateEvidenceSyncStatus,
  saveSyncHistory,
  getSyncHistory,
  getPendingSyncStats,
  clearSyncedData,
  getOfflineTaskByLocalId,
  cacheData,
  getCachedData
} from './offline-storage.js';

// 同步状态
export const SYNC_STATUS = {
  SYNCED: 'synced',       // 已同步
  PENDING: 'pending',     // 待同步
  SYNCING: 'syncing',     // 同步中
  FAILED: 'failed'        // 同步失败
};

// 网络状态
let isOnline = navigator.onLine;
let syncInProgress = false;
let syncStatusListeners = [];
let networkStatusListeners = [];

/**
 * 初始化同步管理器
 */
export async function initSyncManager() {
  // 初始化离线数据库
  await initOfflineDB();
  
  // 监听网络状态变化
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  // 初始检查网络状态
  isOnline = navigator.onLine;
  
  // 如果在线，尝试自动同步
  if (isOnline) {
    // 延迟执行，等待页面完全加载
    setTimeout(() => {
      autoSync();
    }, 2000);
  }
  
  console.log('[SyncManager] 初始化完成，网络状态:', isOnline ? '在线' : '离线');
  
  return { isOnline };
}

/**
 * 处理网络恢复
 */
async function handleOnline() {
  console.log('[SyncManager] 网络已恢复');
  isOnline = true;
  notifyNetworkStatusChange(true);
  
  // 自动同步
  await autoSync();
}

/**
 * 处理网络断开
 */
function handleOffline() {
  console.log('[SyncManager] 网络已断开');
  isOnline = false;
  notifyNetworkStatusChange(false);
}

/**
 * 获取当前网络状态
 */
export function getNetworkStatus() {
  return isOnline;
}

/**
 * 检查网络连接（实际测试）
 */
export async function checkNetworkConnection() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'apikey': SUPABASE_ANON_KEY
      }
    });
    
    clearTimeout(timeoutId);
    isOnline = response.ok;
    return isOnline;
  } catch (error) {
    isOnline = false;
    return false;
  }
}

/**
 * 自动同步
 */
export async function autoSync() {
  if (!isOnline || syncInProgress) {
    return { success: false, reason: !isOnline ? 'offline' : 'sync_in_progress' };
  }
  
  const stats = await getPendingSyncStats();
  if (stats.total === 0) {
    return { success: true, synced: 0 };
  }
  
  console.log('[SyncManager] 开始自动同步，待同步数据:', stats);
  return await performSync('auto');
}

/**
 * 手动同步
 */
export async function manualSync() {
  if (syncInProgress) {
    return { success: false, reason: 'sync_in_progress' };
  }
  
  // 先检查网络
  const online = await checkNetworkConnection();
  if (!online) {
    return { success: false, reason: 'offline' };
  }
  
  console.log('[SyncManager] 开始手动同步');
  return await performSync('manual');
}

/**
 * 执行同步
 */
async function performSync(syncType) {
  if (syncInProgress) return { success: false, reason: 'sync_in_progress' };
  
  syncInProgress = true;
  notifySyncStatusChange(SYNC_STATUS.SYNCING);
  
  const startTime = Date.now();
  const syncDetails = [];
  let itemsSynced = 0;
  let itemsFailed = 0;
  
  try {
    // 1. 同步任务
    const taskResult = await syncTasks();
    syncDetails.push({ type: 'tasks', ...taskResult });
    itemsSynced += taskResult.synced;
    itemsFailed += taskResult.failed;
    
    // 2. 同步检查结果
    const resultResult = await syncResults();
    syncDetails.push({ type: 'results', ...resultResult });
    itemsSynced += resultResult.synced;
    itemsFailed += resultResult.failed;
    
    // 3. 同步佐证资料
    const evidenceResult = await syncEvidence();
    syncDetails.push({ type: 'evidence', ...evidenceResult });
    itemsSynced += evidenceResult.synced;
    itemsFailed += evidenceResult.failed;
    
    const duration = Date.now() - startTime;
    const status = itemsFailed === 0 ? 'success' : (itemsSynced > 0 ? 'partial' : 'failed');
    
    // 保存同步历史
    await saveSyncHistory({
      syncType,
      status,
      itemsSynced,
      itemsFailed,
      details: syncDetails,
      duration
    });
    
    // 同步到服务器的同步历史
    if (itemsSynced > 0) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('sync_history').insert({
            user_id: user.id,
            sync_type: syncType,
            sync_status: status,
            items_synced: itemsSynced,
            items_failed: itemsFailed,
            sync_details: syncDetails,
            started_at: new Date(startTime).toISOString()
          });
        }
      } catch (e) {
        console.warn('[SyncManager] 保存服务器同步历史失败:', e);
      }
    }
    
    // 清理已同步的数据
    if (itemsSynced > 0) {
      await clearSyncedData();
    }
    
    console.log(`[SyncManager] 同步完成: ${itemsSynced} 成功, ${itemsFailed} 失败, 耗时 ${duration}ms`);
    
    notifySyncStatusChange(itemsFailed === 0 ? SYNC_STATUS.SYNCED : SYNC_STATUS.PENDING);
    
    return {
      success: itemsFailed === 0,
      synced: itemsSynced,
      failed: itemsFailed,
      duration,
      details: syncDetails
    };
    
  } catch (error) {
    console.error('[SyncManager] 同步失败:', error);
    notifySyncStatusChange(SYNC_STATUS.FAILED);
    
    await saveSyncHistory({
      syncType,
      status: 'failed',
      itemsSynced,
      itemsFailed,
      details: [{ error: error.message }],
      duration: Date.now() - startTime
    });
    
    return {
      success: false,
      error: error.message,
      synced: itemsSynced,
      failed: itemsFailed
    };
    
  } finally {
    syncInProgress = false;
  }
}

/**
 * 同步任务
 */
async function syncTasks() {
  const pendingTasks = await getPendingTasks();
  let synced = 0;
  let failed = 0;
  
  for (const task of pendingTasks) {
    try {
      await updateTaskSyncStatus(task.localId, 'syncing');
      
      // 生成任务编号
      const { data: taskNumber } = await supabase.rpc('generate_task_number');
      
      // 创建任务
      const { data, error } = await supabase
        .from('inspection_tasks')
        .insert({
          task_number: taskNumber,
          inspector_name: task.inspectorName,
          company_name: task.companyName,
          project_name: task.projectName,
          inspection_date: task.inspectionDate,
          status: task.status,
          total_items: task.totalItems,
          completed_items: task.completedItems,
          problem_items: task.problemItems,
          created_by: task.createdBy
        })
        .select()
        .single();
      
      if (error) throw error;
      
      await updateTaskSyncStatus(task.localId, 'synced', data.id);
      synced++;
      
      // 记录操作日志
      await supabase.from('operation_logs').insert({
        task_id: data.id,
        operator_name: task.inspectorName,
        operation_type: 'create',
        operation_detail: '离线创建任务（已同步）'
      });
      
    } catch (error) {
      console.error('[SyncManager] 同步任务失败:', task.localId, error);
      await updateTaskSyncStatus(task.localId, 'failed');
      failed++;
    }
  }
  
  return { synced, failed, total: pendingTasks.length };
}

/**
 * 同步检查结果
 */
async function syncResults() {
  const pendingResults = await getPendingResults();
  let synced = 0;
  let failed = 0;
  
  for (const result of pendingResults) {
    try {
      await updateResultSyncStatus(result.localId, 'syncing');
      
      // 获取服务器端任务ID
      let taskId = result.taskServerId;
      if (!taskId && result.taskLocalId) {
        const task = await getOfflineTaskByLocalId(result.taskLocalId);
        taskId = task?.serverId;
      }
      
      if (!taskId) {
        console.warn('[SyncManager] 无法找到任务ID，跳过结果同步:', result.localId);
        failed++;
        continue;
      }
      
      // 检查是否已存在
      const { data: existing } = await supabase
        .from('inspection_results')
        .select('id')
        .eq('task_id', taskId)
        .eq('item_id', result.itemId)
        .single();
      
      let data;
      if (existing) {
        // 更新
        const { data: updated, error } = await supabase
          .from('inspection_results')
          .update({
            status: result.status,
            rectification_measure: result.rectificationMeasure,
            rectification_date: result.rectificationDate,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
          .select()
          .single();
        
        if (error) throw error;
        data = updated;
      } else {
        // 插入
        const { data: inserted, error } = await supabase
          .from('inspection_results')
          .insert({
            task_id: taskId,
            item_id: result.itemId,
            status: result.status,
            rectification_measure: result.rectificationMeasure,
            rectification_date: result.rectificationDate
          })
          .select()
          .single();
        
        if (error) throw error;
        data = inserted;
      }
      
      await updateResultSyncStatus(result.localId, 'synced', data.id);
      synced++;
      
    } catch (error) {
      console.error('[SyncManager] 同步检查结果失败:', result.localId, error);
      await updateResultSyncStatus(result.localId, 'failed');
      failed++;
    }
  }
  
  return { synced, failed, total: pendingResults.length };
}

/**
 * 同步佐证资料
 */
async function syncEvidence() {
  const pendingEvidence = await getPendingEvidence();
  let synced = 0;
  let failed = 0;
  
  for (const evidence of pendingEvidence) {
    try {
      await updateEvidenceSyncStatus(evidence.localId, 'syncing');
      
      // 获取服务器端结果ID
      let resultId = evidence.resultServerId;
      // 如果没有服务器端结果ID，需要先确保结果已同步
      if (!resultId) {
        console.warn('[SyncManager] 无法找到结果ID，跳过佐证资料同步:', evidence.localId);
        failed++;
        continue;
      }
      
      // 将 Base64 转换为 Blob
      let fileBlob;
      if (typeof evidence.fileData === 'string' && evidence.fileData.startsWith('data:')) {
        const response = await fetch(evidence.fileData);
        fileBlob = await response.blob();
      } else if (evidence.fileData instanceof Blob) {
        fileBlob = evidence.fileData;
      } else {
        throw new Error('无效的文件数据格式');
      }
      
      // 生成存储路径
      const ext = evidence.fileName.split('.').pop();
      const storagePath = `${resultId}/${Date.now()}.${ext}`;
      
      // 上传到 Storage
      const { error: uploadError } = await supabase.storage
        .from('evidence-files')
        .upload(storagePath, fileBlob, {
          contentType: evidence.mimeType
        });
      
      if (uploadError) throw uploadError;
      
      // 保存文件记录
      const { data, error: dbError } = await supabase
        .from('evidence_files')
        .insert({
          result_id: resultId,
          file_name: evidence.fileName,
          file_type: evidence.fileType,
          file_size: evidence.fileSize,
          storage_path: storagePath
        })
        .select()
        .single();
      
      if (dbError) throw dbError;
      
      await updateEvidenceSyncStatus(evidence.localId, 'synced', data.id);
      synced++;
      
    } catch (error) {
      console.error('[SyncManager] 同步佐证资料失败:', evidence.localId, error);
      await updateEvidenceSyncStatus(evidence.localId, 'failed');
      failed++;
    }
  }
  
  return { synced, failed, total: pendingEvidence.length };
}

/**
 * 获取当前同步状态
 */
export async function getCurrentSyncStatus() {
  const stats = await getPendingSyncStats();
  
  if (syncInProgress) {
    return SYNC_STATUS.SYNCING;
  }
  
  if (stats.total === 0) {
    return SYNC_STATUS.SYNCED;
  }
  
  return SYNC_STATUS.PENDING;
}

/**
 * 获取同步历史
 */
export async function getLocalSyncHistory(limit = 20) {
  return await getSyncHistory(limit);
}

/**
 * 获取服务器同步历史
 */
export async function getServerSyncHistory(limit = 20) {
  try {
    const { data, error } = await supabase
      .from('sync_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[SyncManager] 获取服务器同步历史失败:', error);
    return [];
  }
}

// ==================== 事件监听 ====================

/**
 * 添加同步状态变化监听器
 */
export function addSyncStatusListener(callback) {
  syncStatusListeners.push(callback);
  return () => {
    syncStatusListeners = syncStatusListeners.filter(cb => cb !== callback);
  };
}

/**
 * 添加网络状态变化监听器
 */
export function addNetworkStatusListener(callback) {
  networkStatusListeners.push(callback);
  return () => {
    networkStatusListeners = networkStatusListeners.filter(cb => cb !== callback);
  };
}

/**
 * 通知同步状态变化
 */
function notifySyncStatusChange(status) {
  syncStatusListeners.forEach(callback => {
    try {
      callback(status);
    } catch (e) {
      console.error('[SyncManager] 同步状态监听器错误:', e);
    }
  });
}

/**
 * 通知网络状态变化
 */
function notifyNetworkStatusChange(online) {
  networkStatusListeners.forEach(callback => {
    try {
      callback(online);
    } catch (e) {
      console.error('[SyncManager] 网络状态监听器错误:', e);
    }
  });
}

// ==================== 数据缓存 ====================

/**
 * 缓存检查类别和检查项
 */
export async function cacheInspectionData() {
  try {
    // 缓存类别
    const { data: categories } = await supabase
      .from('inspection_categories')
      .select('*')
      .order('sort_order');
    
    if (categories) {
      await cacheData('inspection_categories', categories, 24 * 60); // 24小时
    }
    
    // 缓存检查项
    const { data: items } = await supabase
      .from('inspection_items')
      .select('*')
      .order('sequence_number');
    
    if (items) {
      await cacheData('inspection_items', items, 24 * 60);
    }
    
    // 缓存公司列表
    const { data: companies } = await supabase
      .from('companies')
      .select('*')
      .order('sort_order');
    
    if (companies) {
      await cacheData('companies', companies, 24 * 60);
    }
    
    console.log('[SyncManager] 检查数据已缓存');
    return true;
  } catch (error) {
    console.error('[SyncManager] 缓存检查数据失败:', error);
    return false;
  }
}

/**
 * 获取缓存的检查类别
 */
export async function getCachedCategories() {
  return await getCachedData('inspection_categories');
}

/**
 * 获取缓存的检查项
 */
export async function getCachedItems() {
  return await getCachedData('inspection_items');
}

/**
 * 获取缓存的公司列表
 */
export async function getCachedCompanies() {
  return await getCachedData('companies');
}

/**
 * 检查是否正在同步
 */
export function isSyncing() {
  return syncInProgress;
}
