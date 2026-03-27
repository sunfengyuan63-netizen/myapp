/**
 * 离线存储管理模块 - 使用 IndexedDB
 * 支持离线创建检查任务、执行检查、暂存佐证资料
 */

const DB_NAME = 'InspectionOfflineDB';
const DB_VERSION = 1;

// 数据库存储结构
const STORES = {
  TASKS: 'offline_tasks',           // 离线创建的任务
  RESULTS: 'offline_results',       // 离线检查结果
  EVIDENCE: 'offline_evidence',     // 离线佐证资料（图片/视频）
  SYNC_QUEUE: 'sync_queue',         // 同步队列
  CACHE: 'data_cache',              // 缓存数据（类别、检查项等）
  SYNC_HISTORY: 'sync_history'      // 本地同步历史
};

let db = null;

/**
 * 初始化 IndexedDB
 */
export async function initOfflineDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => {
      console.error('IndexedDB 打开失败:', request.error);
      reject(request.error);
    };
    
    request.onsuccess = () => {
      db = request.result;
      console.log('IndexedDB 初始化成功');
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      
      // 离线任务存储
      if (!database.objectStoreNames.contains(STORES.TASKS)) {
        const taskStore = database.createObjectStore(STORES.TASKS, { keyPath: 'localId' });
        taskStore.createIndex('status', 'syncStatus', { unique: false });
        taskStore.createIndex('createdAt', 'createdAt', { unique: false });
        taskStore.createIndex('serverId', 'serverId', { unique: false });
      }
      
      // 离线检查结果存储
      if (!database.objectStoreNames.contains(STORES.RESULTS)) {
        const resultStore = database.createObjectStore(STORES.RESULTS, { keyPath: 'localId' });
        resultStore.createIndex('taskLocalId', 'taskLocalId', { unique: false });
        resultStore.createIndex('syncStatus', 'syncStatus', { unique: false });
        resultStore.createIndex('itemId', 'itemId', { unique: false });
      }
      
      // 离线佐证资料存储
      if (!database.objectStoreNames.contains(STORES.EVIDENCE)) {
        const evidenceStore = database.createObjectStore(STORES.EVIDENCE, { keyPath: 'localId' });
        evidenceStore.createIndex('resultLocalId', 'resultLocalId', { unique: false });
        evidenceStore.createIndex('syncStatus', 'syncStatus', { unique: false });
      }
      
      // 同步队列
      if (!database.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const queueStore = database.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id', autoIncrement: true });
        queueStore.createIndex('type', 'type', { unique: false });
        queueStore.createIndex('priority', 'priority', { unique: false });
        queueStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
      
      // 数据缓存
      if (!database.objectStoreNames.contains(STORES.CACHE)) {
        const cacheStore = database.createObjectStore(STORES.CACHE, { keyPath: 'key' });
        cacheStore.createIndex('expiry', 'expiry', { unique: false });
      }
      
      // 同步历史
      if (!database.objectStoreNames.contains(STORES.SYNC_HISTORY)) {
        const historyStore = database.createObjectStore(STORES.SYNC_HISTORY, { keyPath: 'id', autoIncrement: true });
        historyStore.createIndex('syncTime', 'syncTime', { unique: false });
        historyStore.createIndex('status', 'status', { unique: false });
      }
    };
  });
}

/**
 * 确保数据库已初始化
 */
async function ensureDB() {
  if (!db) {
    await initOfflineDB();
  }
  return db;
}

/**
 * 生成本地唯一ID
 */
export function generateLocalId() {
  return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ==================== 离线任务操作 ====================

/**
 * 保存离线任务
 */
export async function saveOfflineTask(task) {
  const database = await ensureDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.TASKS], 'readwrite');
    const store = transaction.objectStore(STORES.TASKS);
    
    const taskData = {
      localId: task.localId || generateLocalId(),
      serverId: task.serverId || null,
      taskNumber: task.taskNumber || `OFFLINE-${Date.now()}`,
      inspectorName: task.inspectorName,
      companyName: task.companyName,
      projectName: task.projectName,
      inspectionDate: task.inspectionDate,
      status: task.status || 'draft',
      totalItems: task.totalItems || 60,
      completedItems: task.completedItems || 0,
      problemItems: task.problemItems || 0,
      syncStatus: task.syncStatus || 'pending', // pending, syncing, synced, failed
      createdAt: task.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: task.createdBy
    };
    
    const request = store.put(taskData);
    request.onsuccess = () => resolve(taskData);
    request.onerror = () => reject(request.error);
  });
}

/**
 * 获取所有离线任务
 */
export async function getOfflineTasks() {
  const database = await ensureDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.TASKS], 'readonly');
    const store = transaction.objectStore(STORES.TASKS);
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * 获取待同步的任务
 */
export async function getPendingTasks() {
  const database = await ensureDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.TASKS], 'readonly');
    const store = transaction.objectStore(STORES.TASKS);
    const index = store.index('status');
    const request = index.getAll('pending');
    
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * 根据本地ID获取任务
 */
export async function getOfflineTaskByLocalId(localId) {
  const database = await ensureDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.TASKS], 'readonly');
    const store = transaction.objectStore(STORES.TASKS);
    const request = store.get(localId);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * 更新任务同步状态
 */
export async function updateTaskSyncStatus(localId, syncStatus, serverId = null) {
  const database = await ensureDB();
  return new Promise(async (resolve, reject) => {
    const task = await getOfflineTaskByLocalId(localId);
    if (!task) {
      reject(new Error('任务不存在'));
      return;
    }
    
    task.syncStatus = syncStatus;
    if (serverId) task.serverId = serverId;
    task.updatedAt = new Date().toISOString();
    
    const transaction = database.transaction([STORES.TASKS], 'readwrite');
    const store = transaction.objectStore(STORES.TASKS);
    const request = store.put(task);
    
    request.onsuccess = () => resolve(task);
    request.onerror = () => reject(request.error);
  });
}

/**
 * 删除已同步的任务
 */
export async function deleteSyncedTask(localId) {
  const database = await ensureDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.TASKS], 'readwrite');
    const store = transaction.objectStore(STORES.TASKS);
    const request = store.delete(localId);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ==================== 离线检查结果操作 ====================

/**
 * 保存离线检查结果
 */
export async function saveOfflineResult(result) {
  const database = await ensureDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.RESULTS], 'readwrite');
    const store = transaction.objectStore(STORES.RESULTS);
    
    const resultData = {
      localId: result.localId || generateLocalId(),
      serverId: result.serverId || null,
      taskLocalId: result.taskLocalId,
      taskServerId: result.taskServerId || null,
      itemId: result.itemId,
      status: result.status,
      rectificationMeasure: result.rectificationMeasure || null,
      rectificationDate: result.rectificationDate || null,
      syncStatus: result.syncStatus || 'pending',
      createdAt: result.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const request = store.put(resultData);
    request.onsuccess = () => resolve(resultData);
    request.onerror = () => reject(request.error);
  });
}

/**
 * 获取任务的所有离线检查结果
 */
export async function getOfflineResultsByTask(taskLocalId) {
  const database = await ensureDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.RESULTS], 'readonly');
    const store = transaction.objectStore(STORES.RESULTS);
    const index = store.index('taskLocalId');
    const request = index.getAll(taskLocalId);
    
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * 获取待同步的检查结果
 */
export async function getPendingResults() {
  const database = await ensureDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.RESULTS], 'readonly');
    const store = transaction.objectStore(STORES.RESULTS);
    const index = store.index('syncStatus');
    const request = index.getAll('pending');
    
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * 更新检查结果同步状态
 */
export async function updateResultSyncStatus(localId, syncStatus, serverId = null) {
  const database = await ensureDB();
  return new Promise(async (resolve, reject) => {
    const transaction = database.transaction([STORES.RESULTS], 'readwrite');
    const store = transaction.objectStore(STORES.RESULTS);
    const getRequest = store.get(localId);
    
    getRequest.onsuccess = () => {
      const result = getRequest.result;
      if (!result) {
        reject(new Error('检查结果不存在'));
        return;
      }
      
      result.syncStatus = syncStatus;
      if (serverId) result.serverId = serverId;
      result.updatedAt = new Date().toISOString();
      
      const putRequest = store.put(result);
      putRequest.onsuccess = () => resolve(result);
      putRequest.onerror = () => reject(putRequest.error);
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

// ==================== 离线佐证资料操作 ====================

/**
 * 保存离线佐证资料（图片/视频）
 */
export async function saveOfflineEvidence(evidence) {
  const database = await ensureDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.EVIDENCE], 'readwrite');
    const store = transaction.objectStore(STORES.EVIDENCE);
    
    const evidenceData = {
      localId: evidence.localId || generateLocalId(),
      serverId: evidence.serverId || null,
      resultLocalId: evidence.resultLocalId,
      resultServerId: evidence.resultServerId || null,
      fileName: evidence.fileName,
      fileType: evidence.fileType, // 'image' or 'video'
      fileSize: evidence.fileSize,
      fileData: evidence.fileData, // Base64 或 Blob
      mimeType: evidence.mimeType,
      syncStatus: evidence.syncStatus || 'pending',
      createdAt: evidence.createdAt || new Date().toISOString()
    };
    
    const request = store.put(evidenceData);
    request.onsuccess = () => resolve(evidenceData);
    request.onerror = () => reject(request.error);
  });
}

/**
 * 获取检查结果的所有离线佐证资料
 */
export async function getOfflineEvidenceByResult(resultLocalId) {
  const database = await ensureDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.EVIDENCE], 'readonly');
    const store = transaction.objectStore(STORES.EVIDENCE);
    const index = store.index('resultLocalId');
    const request = index.getAll(resultLocalId);
    
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * 获取待同步的佐证资料
 */
export async function getPendingEvidence() {
  const database = await ensureDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.EVIDENCE], 'readonly');
    const store = transaction.objectStore(STORES.EVIDENCE);
    const index = store.index('syncStatus');
    const request = index.getAll('pending');
    
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * 更新佐证资料同步状态
 */
export async function updateEvidenceSyncStatus(localId, syncStatus, serverId = null) {
  const database = await ensureDB();
  return new Promise(async (resolve, reject) => {
    const transaction = database.transaction([STORES.EVIDENCE], 'readwrite');
    const store = transaction.objectStore(STORES.EVIDENCE);
    const getRequest = store.get(localId);
    
    getRequest.onsuccess = () => {
      const evidence = getRequest.result;
      if (!evidence) {
        reject(new Error('佐证资料不存在'));
        return;
      }
      
      evidence.syncStatus = syncStatus;
      if (serverId) evidence.serverId = serverId;
      
      const putRequest = store.put(evidence);
      putRequest.onsuccess = () => resolve(evidence);
      putRequest.onerror = () => reject(putRequest.error);
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

/**
 * 删除已同步的佐证资料
 */
export async function deleteSyncedEvidence(localId) {
  const database = await ensureDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.EVIDENCE], 'readwrite');
    const store = transaction.objectStore(STORES.EVIDENCE);
    const request = store.delete(localId);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ==================== 数据缓存操作 ====================

/**
 * 缓存数据
 */
export async function cacheData(key, data, expiryMinutes = 60) {
  const database = await ensureDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.CACHE], 'readwrite');
    const store = transaction.objectStore(STORES.CACHE);
    
    const cacheItem = {
      key,
      data,
      expiry: Date.now() + (expiryMinutes * 60 * 1000),
      cachedAt: new Date().toISOString()
    };
    
    const request = store.put(cacheItem);
    request.onsuccess = () => resolve(cacheItem);
    request.onerror = () => reject(request.error);
  });
}

/**
 * 获取缓存数据
 */
export async function getCachedData(key) {
  const database = await ensureDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.CACHE], 'readonly');
    const store = transaction.objectStore(STORES.CACHE);
    const request = store.get(key);
    
    request.onsuccess = () => {
      const item = request.result;
      if (!item) {
        resolve(null);
        return;
      }
      
      // 检查是否过期
      if (item.expiry < Date.now()) {
        // 删除过期数据
        const deleteTransaction = database.transaction([STORES.CACHE], 'readwrite');
        deleteTransaction.objectStore(STORES.CACHE).delete(key);
        resolve(null);
        return;
      }
      
      resolve(item.data);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * 清除所有缓存
 */
export async function clearCache() {
  const database = await ensureDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.CACHE], 'readwrite');
    const store = transaction.objectStore(STORES.CACHE);
    const request = store.clear();
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ==================== 同步历史操作 ====================

/**
 * 保存同步历史记录
 */
export async function saveSyncHistory(history) {
  const database = await ensureDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.SYNC_HISTORY], 'readwrite');
    const store = transaction.objectStore(STORES.SYNC_HISTORY);
    
    const historyData = {
      syncTime: history.syncTime || new Date().toISOString(),
      syncType: history.syncType, // 'auto', 'manual'
      status: history.status, // 'success', 'partial', 'failed'
      itemsSynced: history.itemsSynced || 0,
      itemsFailed: history.itemsFailed || 0,
      details: history.details || [],
      duration: history.duration || 0
    };
    
    const request = store.add(historyData);
    request.onsuccess = () => {
      historyData.id = request.result;
      resolve(historyData);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * 获取同步历史记录
 */
export async function getSyncHistory(limit = 20) {
  const database = await ensureDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.SYNC_HISTORY], 'readonly');
    const store = transaction.objectStore(STORES.SYNC_HISTORY);
    const index = store.index('syncTime');
    const request = index.openCursor(null, 'prev');
    
    const results = [];
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor && results.length < limit) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

// ==================== 统计信息 ====================

/**
 * 获取待同步数据统计
 */
export async function getPendingSyncStats() {
  const [tasks, results, evidence] = await Promise.all([
    getPendingTasks(),
    getPendingResults(),
    getPendingEvidence()
  ]);
  
  return {
    tasks: tasks.length,
    results: results.length,
    evidence: evidence.length,
    total: tasks.length + results.length + evidence.length
  };
}

/**
 * 清除所有已同步的数据
 */
export async function clearSyncedData() {
  const database = await ensureDB();
  
  const clearStore = (storeName, statusField = 'syncStatus') => {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const index = store.index(statusField === 'syncStatus' ? 'syncStatus' : 'status');
      const request = index.openCursor(IDBKeyRange.only('synced'));
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  };
  
  await Promise.all([
    clearStore(STORES.TASKS),
    clearStore(STORES.RESULTS),
    clearStore(STORES.EVIDENCE)
  ]);
}

// 导出存储名称常量
export { STORES };
