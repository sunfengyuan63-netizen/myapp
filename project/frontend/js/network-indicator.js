/**
 * 网络状态和同步状态指示器组件
 */

import {
  initSyncManager,
  getNetworkStatus,
  getCurrentSyncStatus,
  manualSync,
  addSyncStatusListener,
  addNetworkStatusListener,
  SYNC_STATUS,
  isSyncing
} from './sync-manager.js';
import { getPendingSyncStats } from './offline-storage.js';

// 状态文本映射
const STATUS_TEXT = {
  [SYNC_STATUS.SYNCED]: '已同步',
  [SYNC_STATUS.PENDING]: '待同步',
  [SYNC_STATUS.SYNCING]: '同步中',
  [SYNC_STATUS.FAILED]: '同步失败'
};

// 状态颜色映射
const STATUS_COLORS = {
  [SYNC_STATUS.SYNCED]: 'bg-success',
  [SYNC_STATUS.PENDING]: 'bg-warning',
  [SYNC_STATUS.SYNCING]: 'bg-info',
  [SYNC_STATUS.FAILED]: 'bg-danger'
};

let indicatorElement = null;
let isInitialized = false;

/**
 * 创建网络状态指示器
 */
export async function createNetworkIndicator(containerId = null) {
  if (isInitialized) return;
  
  // 初始化同步管理器
  await initSyncManager();
  
  // 创建指示器元素
  indicatorElement = document.createElement('div');
  indicatorElement.id = 'networkIndicator';
  indicatorElement.className = 'network-indicator';
  indicatorElement.innerHTML = getIndicatorHTML();
  
  // 添加样式
  addIndicatorStyles();
  
  // 添加到页面
  if (containerId) {
    const container = document.getElementById(containerId);
    if (container) {
      container.appendChild(indicatorElement);
    }
  } else {
    document.body.appendChild(indicatorElement);
  }
  
  // 绑定事件
  bindEvents();
  
  // 监听状态变化
  addNetworkStatusListener(updateNetworkStatus);
  addSyncStatusListener(updateSyncStatus);
  
  // 初始更新
  await updateIndicator();
  
  isInitialized = true;
  
  return indicatorElement;
}

/**
 * 获取指示器HTML
 */
function getIndicatorHTML() {
  return `
    <div class="indicator-content" data-node-id="b7556ea6-29b2-11f1-be13-122a9cb60781">
      <div class="indicator-main" id="indicatorMain" data-node-id="b75552fe-29b2-11f1-be13-122a9cb60781">
        <div class="indicator-icon" id="indicatorIcon" data-node-id="b75568fc-29b2-11f1-be13-122a9cb60781">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" data-node-id="b7556280-29b2-11f1-be13-122a9cb60781">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" data-node-id="b7557cca-29b2-11f1-be13-122a9cb60781"></path>
          </svg>
        </div>
        <div class="indicator-text" data-node-id="b7555c4a-29b2-11f1-be13-122a9cb60781">
          <span id="networkStatusText" class="network-status" data-node-id="b7555448-29b2-11f1-be13-122a9cb60781">在线</span>
          <span class="separator" data-node-id="b755551a-29b2-11f1-be13-122a9cb60781">·</span>
          <span id="syncStatusText" class="sync-status" data-node-id="b755763a-29b2-11f1-be13-122a9cb60781">已同步</span>
        </div>
        <div class="indicator-badge" id="pendingBadge" style="display: none;" data-node-id="b755772a-29b2-11f1-be13-122a9cb60781">
          <span id="pendingCount" data-node-id="b75555d8-29b2-11f1-be13-122a9cb60781">0</span>
        </div>
        <button class="indicator-expand" id="indicatorExpand" data-node-id="b75580c6-29b2-11f1-be13-122a9cb60781">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" data-node-id="b7555696-29b2-11f1-be13-122a9cb60781">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" data-node-id="b7556366-29b2-11f1-be13-122a9cb60781"></path>
          </svg>
        </button>
      </div>
      
      <div class="indicator-panel" id="indicatorPanel" data-node-id="b7555d08-29b2-11f1-be13-122a9cb60781">
        <div class="panel-header" data-node-id="b7555754-29b2-11f1-be13-122a9cb60781">
          <h4 data-node-id="b7556442-29b2-11f1-be13-122a9cb60781">同步状态</h4>
          <button class="panel-close" id="panelClose" data-node-id="b7555812-29b2-11f1-be13-122a9cb60781">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" data-node-id="b75558da-29b2-11f1-be13-122a9cb60781">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" data-node-id="b7557da6-29b2-11f1-be13-122a9cb60781"></path>
            </svg>
          </button>
        </div>
        
        <div class="panel-body" data-node-id="b75569d8-29b2-11f1-be13-122a9cb60781">
          <!-- 网络状态 -->
          <div class="status-section" data-node-id="b7555dc6-29b2-11f1-be13-122a9cb60781">
            <div class="status-row" data-node-id="b755781a-29b2-11f1-be13-122a9cb60781">
              <span class="status-label" data-node-id="b7556a96-29b2-11f1-be13-122a9cb60781">网络状态</span>
              <span id="panelNetworkStatus" class="status-value online" data-node-id="b7558198-29b2-11f1-be13-122a9cb60781">
                <span class="status-dot" data-node-id="b75559b6-29b2-11f1-be13-122a9cb60781"></span>
                <span data-node-id="b7556f78-29b2-11f1-be13-122a9cb60781">在线</span>
              </span>
            </div>
            <div class="status-row" data-node-id="b7557e6e-29b2-11f1-be13-122a9cb60781">
              <span class="status-label" data-node-id="b7555aa6-29b2-11f1-be13-122a9cb60781">同步状态</span>
              <span id="panelSyncStatus" class="status-value synced" data-node-id="b755650a-29b2-11f1-be13-122a9cb60781">
                <span class="status-dot" data-node-id="b7557054-29b2-11f1-be13-122a9cb60781"></span>
                <span data-node-id="b7555e98-29b2-11f1-be13-122a9cb60781">已同步</span>
              </span>
            </div>
          </div>
          
          <!-- 待同步统计 -->
          <div class="pending-section" id="pendingSection" data-node-id="b75565d2-29b2-11f1-be13-122a9cb60781">
            <h5 data-node-id="b755713a-29b2-11f1-be13-122a9cb60781">待同步数据</h5>
            <div class="pending-stats" data-node-id="b7555f56-29b2-11f1-be13-122a9cb60781">
              <div class="pending-item" data-node-id="b755669a-29b2-11f1-be13-122a9cb60781">
                <span class="pending-count" id="pendingTasks" data-node-id="b7556b68-29b2-11f1-be13-122a9cb60781">0</span>
                <span class="pending-label" data-node-id="b7557216-29b2-11f1-be13-122a9cb60781">任务</span>
              </div>
              <div class="pending-item" data-node-id="b7556c30-29b2-11f1-be13-122a9cb60781">
                <span class="pending-count" id="pendingResults" data-node-id="b7557950-29b2-11f1-be13-122a9cb60781">0</span>
                <span class="pending-label" data-node-id="b7558288-29b2-11f1-be13-122a9cb60781">检查结果</span>
              </div>
              <div class="pending-item" data-node-id="b75572e8-29b2-11f1-be13-122a9cb60781">
                <span class="pending-count" id="pendingEvidence" data-node-id="b755601e-29b2-11f1-be13-122a9cb60781">0</span>
                <span class="pending-label" data-node-id="b7555b78-29b2-11f1-be13-122a9cb60781">佐证资料</span>
              </div>
            </div>
          </div>
          
          <!-- 离线模式提示 -->
          <div class="offline-notice" id="offlineNotice" style="display: none;" data-node-id="b7556d02-29b2-11f1-be13-122a9cb60781">
            <div class="notice-icon" data-node-id="b7556762-29b2-11f1-be13-122a9cb60781">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" data-node-id="b7557400-29b2-11f1-be13-122a9cb60781">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" data-node-id="b7558350-29b2-11f1-be13-122a9cb60781"></path>
              </svg>
            </div>
            <div class="notice-content" data-node-id="b75560e6-29b2-11f1-be13-122a9cb60781">
              <p class="notice-title" data-node-id="b7557a2c-29b2-11f1-be13-122a9cb60781">离线模式</p>
              <p class="notice-text" data-node-id="b7557afe-29b2-11f1-be13-122a9cb60781">部分功能受限：无法提交审核、无法查看他人记录</p>
            </div>
          </div>
          
          <!-- 操作按钮 -->
          <div class="panel-actions" data-node-id="b7558418-29b2-11f1-be13-122a9cb60781">
            <button class="btn-sync" id="btnManualSync" data-node-id="b75561b8-29b2-11f1-be13-122a9cb60781">
              <svg class="w-4 h-4 sync-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" data-node-id="b75584ea-29b2-11f1-be13-122a9cb60781">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" data-node-id="b7557f2c-29b2-11f1-be13-122a9cb60781"></path>
              </svg>
              <span data-node-id="b7557ffe-29b2-11f1-be13-122a9cb60781">立即同步</span>
            </button>
            <button class="btn-history" id="btnSyncHistory" data-node-id="b7556dca-29b2-11f1-be13-122a9cb60781">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" data-node-id="b75574dc-29b2-11f1-be13-122a9cb60781">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" data-node-id="b7556834-29b2-11f1-be13-122a9cb60781"></path>
              </svg>
              <span data-node-id="b7557bee-29b2-11f1-be13-122a9cb60781">同步历史</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * 添加指示器样式
 */
function addIndicatorStyles() {
  if (document.getElementById('networkIndicatorStyles')) return;
  
  const style = document.createElement('style');
  style.id = 'networkIndicatorStyles';
  style.textContent = `
    .network-indicator {
      position: fixed;
      bottom: 1rem;
      right: 1rem;
      z-index: 1000;
      font-family: 'Noto Sans SC', sans-serif;
    }
    
    .indicator-content {
      position: relative;
    }
    
    .indicator-main {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      background: var(--bg-card, #1A1A2E);
      border: 1px solid var(--border, #333355);
      border-radius: 24px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .indicator-main:hover {
      border-color: var(--primary, #FF6B00);
      box-shadow: 0 4px 20px rgba(255, 107, 0, 0.2);
    }
    
    .indicator-main.offline {
      border-color: var(--danger, #E63946);
    }
    
    .indicator-main.syncing {
      border-color: var(--info, #3498DB);
    }
    
    .indicator-icon {
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--success, #2ECC71);
    }
    
    .indicator-main.offline .indicator-icon {
      color: var(--danger, #E63946);
    }
    
    .indicator-main.syncing .indicator-icon {
      color: var(--info, #3498DB);
      animation: pulse 1.5s infinite;
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    
    .indicator-text {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.8rem;
      color: var(--text-secondary, #A0A0B8);
    }
    
    .indicator-text .separator {
      color: var(--text-muted, #6B6B80);
    }
    
    .network-status.offline {
      color: var(--danger, #E63946);
    }
    
    .sync-status.pending {
      color: var(--warning, #F39C12);
    }
    
    .sync-status.syncing {
      color: var(--info, #3498DB);
    }
    
    .sync-status.failed {
      color: var(--danger, #E63946);
    }
    
    .indicator-badge {
      min-width: 18px;
      height: 18px;
      padding: 0 5px;
      background: var(--warning, #F39C12);
      border-radius: 9px;
      font-size: 0.7rem;
      font-weight: 600;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .indicator-expand {
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: none;
      border: none;
      color: var(--text-muted, #6B6B80);
      cursor: pointer;
      transition: transform 0.2s ease;
    }
    
    .indicator-expand.expanded {
      transform: rotate(180deg);
    }
    
    .indicator-panel {
      position: absolute;
      bottom: calc(100% + 0.5rem);
      right: 0;
      width: 320px;
      background: var(--bg-card, #1A1A2E);
      border: 1px solid var(--border, #333355);
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      display: none;
      overflow: hidden;
    }
    
    .indicator-panel.open {
      display: block;
      animation: slideUp 0.2s ease;
    }
    
    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.875rem 1rem;
      border-bottom: 1px solid var(--border, #333355);
    }
    
    .panel-header h4 {
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--text-primary, #FFFFFF);
      margin: 0;
    }
    
    .panel-close {
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: none;
      border: none;
      color: var(--text-muted, #6B6B80);
      cursor: pointer;
      border-radius: 6px;
      transition: all 0.2s ease;
    }
    
    .panel-close:hover {
      background: var(--bg-elevated, #252542);
      color: var(--text-primary, #FFFFFF);
    }
    
    .panel-body {
      padding: 1rem;
    }
    
    .status-section {
      margin-bottom: 1rem;
    }
    
    .status-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem 0;
    }
    
    .status-label {
      font-size: 0.85rem;
      color: var(--text-muted, #6B6B80);
    }
    
    .status-value {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.85rem;
      font-weight: 500;
    }
    
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--success, #2ECC71);
    }
    
    .status-value.offline .status-dot {
      background: var(--danger, #E63946);
    }
    
    .status-value.pending .status-dot {
      background: var(--warning, #F39C12);
    }
    
    .status-value.syncing .status-dot {
      background: var(--info, #3498DB);
      animation: pulse 1s infinite;
    }
    
    .status-value.failed .status-dot {
      background: var(--danger, #E63946);
    }
    
    .pending-section {
      background: var(--bg-elevated, #252542);
      border-radius: 8px;
      padding: 0.875rem;
      margin-bottom: 1rem;
    }
    
    .pending-section h5 {
      font-size: 0.8rem;
      font-weight: 500;
      color: var(--text-muted, #6B6B80);
      margin: 0 0 0.75rem 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .pending-stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.5rem;
    }
    
    .pending-item {
      text-align: center;
    }
    
    .pending-count {
      display: block;
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--warning, #F39C12);
    }
    
    .pending-label {
      font-size: 0.75rem;
      color: var(--text-muted, #6B6B80);
    }
    
    .offline-notice {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.875rem;
      background: rgba(230, 57, 70, 0.1);
      border: 1px solid rgba(230, 57, 70, 0.3);
      border-radius: 8px;
      margin-bottom: 1rem;
    }
    
    .notice-icon {
      color: var(--danger, #E63946);
      flex-shrink: 0;
    }
    
    .notice-title {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--danger, #E63946);
      margin: 0 0 0.25rem 0;
    }
    
    .notice-text {
      font-size: 0.8rem;
      color: var(--text-secondary, #A0A0B8);
      margin: 0;
      line-height: 1.4;
    }
    
    .panel-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
    }
    
    .btn-sync, .btn-history {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.375rem;
      padding: 0.625rem;
      border: none;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .btn-sync {
      background: linear-gradient(135deg, var(--primary, #FF6B00) 0%, #CC5500 100%);
      color: white;
    }
    
    .btn-sync:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(255, 107, 0, 0.3);
    }
    
    .btn-sync:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    .btn-sync.syncing .sync-icon {
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    
    .btn-history {
      background: var(--bg-elevated, #252542);
      color: var(--text-secondary, #A0A0B8);
      border: 1px solid var(--border, #333355);
    }
    
    .btn-history:hover {
      background: var(--border, #333355);
      color: var(--text-primary, #FFFFFF);
    }
    
    /* 移动端适配 */
    @media (max-width: 640px) {
      .network-indicator {
        bottom: 4.5rem;
        right: 0.75rem;
      }
      
      .indicator-panel {
        width: calc(100vw - 1.5rem);
        right: 0;
      }
      
      .indicator-text {
        display: none;
      }
    }
  `;
  
  document.head.appendChild(style);
}

/**
 * 绑定事件
 */
function bindEvents() {
  const main = document.getElementById('indicatorMain');
  const expand = document.getElementById('indicatorExpand');
  const panel = document.getElementById('indicatorPanel');
  const close = document.getElementById('panelClose');
  const syncBtn = document.getElementById('btnManualSync');
  const historyBtn = document.getElementById('btnSyncHistory');
  
  // 展开/收起面板
  main.addEventListener('click', (e) => {
    if (e.target.closest('.indicator-expand')) return;
    togglePanel();
  });
  
  expand.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePanel();
  });
  
  close.addEventListener('click', () => {
    closePanel();
  });
  
  // 点击外部关闭
  document.addEventListener('click', (e) => {
    if (!indicatorElement.contains(e.target)) {
      closePanel();
    }
  });
  
  // 手动同步
  syncBtn.addEventListener('click', async () => {
    if (isSyncing()) return;
    
    syncBtn.disabled = true;
    syncBtn.classList.add('syncing');
    syncBtn.querySelector('span').textContent = '同步中...';
    
    try {
      const result = await manualSync();
      
      if (result.success) {
        showSyncToast(`同步成功：${result.synced} 项数据已上传`, 'success');
      } else if (result.reason === 'offline') {
        showSyncToast('当前处于离线状态，无法同步', 'error');
      } else if (result.reason === 'sync_in_progress') {
        showSyncToast('同步正在进行中，请稍候', 'warning');
      } else {
        showSyncToast(`同步完成：${result.synced} 成功，${result.failed} 失败`, 'warning');
      }
    } catch (error) {
      showSyncToast('同步失败：' + error.message, 'error');
    } finally {
      syncBtn.disabled = false;
      syncBtn.classList.remove('syncing');
      syncBtn.querySelector('span').textContent = '立即同步';
      await updateIndicator();
    }
  });
  
  // 查看同步历史
  historyBtn.addEventListener('click', () => {
    closePanel();
    showSyncHistoryModal();
  });
}

/**
 * 切换面板
 */
function togglePanel() {
  const panel = document.getElementById('indicatorPanel');
  const expand = document.getElementById('indicatorExpand');
  
  if (panel.classList.contains('open')) {
    closePanel();
  } else {
    panel.classList.add('open');
    expand.classList.add('expanded');
    updatePanelContent();
  }
}

/**
 * 关闭面板
 */
function closePanel() {
  const panel = document.getElementById('indicatorPanel');
  const expand = document.getElementById('indicatorExpand');
  
  panel.classList.remove('open');
  expand.classList.remove('expanded');
}

/**
 * 更新指示器
 */
async function updateIndicator() {
  const isOnline = getNetworkStatus();
  const syncStatus = await getCurrentSyncStatus();
  const stats = await getPendingSyncStats();
  
  updateNetworkStatus(isOnline);
  updateSyncStatus(syncStatus);
  updatePendingBadge(stats.total);
}

/**
 * 更新网络状态显示
 */
function updateNetworkStatus(isOnline) {
  const main = document.getElementById('indicatorMain');
  const networkText = document.getElementById('networkStatusText');
  const panelStatus = document.getElementById('panelNetworkStatus');
  const offlineNotice = document.getElementById('offlineNotice');
  const syncBtn = document.getElementById('btnManualSync');
  
  if (isOnline) {
    main.classList.remove('offline');
    networkText.textContent = '在线';
    networkText.classList.remove('offline');
    panelStatus.className = 'status-value online';
    panelStatus.querySelector('span:last-child').textContent = '在线';
    offlineNotice.style.display = 'none';
    syncBtn.disabled = false;
  } else {
    main.classList.add('offline');
    networkText.textContent = '离线';
    networkText.classList.add('offline');
    panelStatus.className = 'status-value offline';
    panelStatus.querySelector('span:last-child').textContent = '离线';
    offlineNotice.style.display = 'flex';
    syncBtn.disabled = true;
  }
}

/**
 * 更新同步状态显示
 */
function updateSyncStatus(status) {
  const main = document.getElementById('indicatorMain');
  const syncText = document.getElementById('syncStatusText');
  const panelStatus = document.getElementById('panelSyncStatus');
  
  syncText.textContent = STATUS_TEXT[status] || '未知';
  syncText.className = `sync-status ${status}`;
  
  panelStatus.className = `status-value ${status}`;
  panelStatus.querySelector('span:last-child').textContent = STATUS_TEXT[status] || '未知';
  
  if (status === SYNC_STATUS.SYNCING) {
    main.classList.add('syncing');
  } else {
    main.classList.remove('syncing');
  }
}

/**
 * 更新待同步数量徽章
 */
function updatePendingBadge(count) {
  const badge = document.getElementById('pendingBadge');
  const countEl = document.getElementById('pendingCount');
  
  if (count > 0) {
    badge.style.display = 'flex';
    countEl.textContent = count > 99 ? '99+' : count;
  } else {
    badge.style.display = 'none';
  }
}

/**
 * 更新面板内容
 */
async function updatePanelContent() {
  const stats = await getPendingSyncStats();
  
  document.getElementById('pendingTasks').textContent = stats.tasks;
  document.getElementById('pendingResults').textContent = stats.results;
  document.getElementById('pendingEvidence').textContent = stats.evidence;
  
  const pendingSection = document.getElementById('pendingSection');
  pendingSection.style.display = stats.total > 0 ? 'block' : 'none';
}

/**
 * 显示同步提示
 */
function showSyncToast(message, type = 'success') {
  // 使用全局 showToast 如果存在
  if (typeof window.showToast === 'function') {
    window.showToast(message, type);
    return;
  }
  
  // 否则创建简单提示
  const toast = document.createElement('div');
  toast.className = `sync-toast sync-toast-${type}`;
  toast.innerHTML = `
    <span data-node-id="b7559f16-29b2-11f1-be13-122a9cb60781">${type === 'success' ? '✓' : type === 'error' ? '✕' : '⚠'}</span>
    <span data-node-id="b755a18c-29b2-11f1-be13-122a9cb60781">${message}</span>
  `;
  
  // 添加样式
  toast.style.cssText = `
    position: fixed;
    top: 1rem;
    right: 1rem;
    padding: 0.875rem 1.25rem;
    background: var(--bg-card, #1A1A2E);
    border: 1px solid var(--border, #333355);
    border-left: 4px solid ${type === 'success' ? 'var(--success, #2ECC71)' : type === 'error' ? 'var(--danger, #E63946)' : 'var(--warning, #F39C12)'};
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
    color: var(--text-primary, #FFFFFF);
    z-index: 2000;
    animation: slideIn 0.3s ease;
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/**
 * 显示同步历史模态框
 */
async function showSyncHistoryModal() {
  // 导入同步历史
  const { getLocalSyncHistory, getServerSyncHistory } = await import('./sync-manager.js');
  
  const [localHistory, serverHistory] = await Promise.all([
    getLocalSyncHistory(10),
    getServerSyncHistory(10)
  ]);
  
  // 合并并排序
  const allHistory = [
    ...localHistory.map(h => ({ ...h, source: 'local' })),
    ...serverHistory.map(h => ({
      syncTime: h.created_at,
      syncType: h.sync_type,
      status: h.sync_status,
      itemsSynced: h.items_synced,
      itemsFailed: h.items_failed,
      source: 'server'
    }))
  ].sort((a, b) => new Date(b.syncTime) - new Date(a.syncTime)).slice(0, 20);
  
  // 创建模态框
  const modal = document.createElement('div');
  modal.className = 'sync-history-modal';
  modal.innerHTML = `
    <div class="modal-overlay" onclick="this.parentElement.remove()" data-node-id="b75592b4-29b2-11f1-be13-122a9cb60781">
      <div class="modal-content" onclick="event.stopPropagation()" data-node-id="b7559714-29b2-11f1-be13-122a9cb60781">
        <div class="modal-header" data-node-id="b75595a2-29b2-11f1-be13-122a9cb60781">
          <h3 data-node-id="b7558eb8-29b2-11f1-be13-122a9cb60781">同步历史记录</h3>
          <button class="modal-close" onclick="this.closest('.sync-history-modal').remove()" data-node-id="b7559d40-29b2-11f1-be13-122a9cb60781">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" data-node-id="b755993a-29b2-11f1-be13-122a9cb60781">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" data-node-id="b7558f94-29b2-11f1-be13-122a9cb60781"></path>
            </svg>
          </button>
        </div>
        <div class="modal-body" data-node-id="b7559bba-29b2-11f1-be13-122a9cb60781">
          ${allHistory.length === 0 ? `
            <div class="empty-state" data-node-id="b755b5e6-29b2-11f1-be13-122a9cb60781" data-node-id="b7559368-29b2-11f1-be13-122a9cb60781">
              <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" data-node-id="b755b76c-29b2-11f1-be13-122a9cb60781" data-node-id="b75599f8-29b2-11f1-be13-122a9cb60781">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" data-node-id="b755b848-29b2-11f1-be13-122a9cb60781" data-node-id="b75597c8-29b2-11f1-be13-122a9cb60781"></path>
              </svg>
              <p data-node-id="b755b6a4-29b2-11f1-be13-122a9cb60781" data-node-id="b7559070-29b2-11f1-be13-122a9cb60781">暂无同步记录</p>
            </div>
          ` : `
            <div class="history-list" data-node-id="b755a538-29b2-11f1-be13-122a9cb60781" data-node-id="b7559124-29b2-11f1-be13-122a9cb60781">
              ${allHistory.map(h => `
                <div class="history-item ${h.status}" data-node-id="b755ae8e-29b2-11f1-be13-122a9cb60781" data-node-id="b755a880-29b2-11f1-be13-122a9cb60781" data-node-id="b7559afc-29b2-11f1-be13-122a9cb60781">
                  <div class="history-icon" data-node-id="b755b276-29b2-11f1-be13-122a9cb60781" data-node-id="b755a790-29b2-11f1-be13-122a9cb60781" data-node-id="b7559886-29b2-11f1-be13-122a9cb60781">
                    ${h.status === 'success' ? '✓' : h.status === 'partial' ? '⚠' : '✕'}
                  </div>
                  <div class="history-content" data-node-id="b755b0dc-29b2-11f1-be13-122a9cb60781" data-node-id="b755a5f6-29b2-11f1-be13-122a9cb60781" data-node-id="b75594e4-29b2-11f1-be13-122a9cb60781">
                    <div class="history-main" data-node-id="b755b1ae-29b2-11f1-be13-122a9cb60781" data-node-id="b755a93e-29b2-11f1-be13-122a9cb60781" data-node-id="b7559c6e-29b2-11f1-be13-122a9cb60781">
                      <span class="history-type" data-node-id="b755af4c-29b2-11f1-be13-122a9cb60781" data-node-id="b755aa1a-29b2-11f1-be13-122a9cb60781" data-node-id="b7559656-29b2-11f1-be13-122a9cb60781">${h.syncType === 'auto' ? '自动同步' : '手动同步'}</span>
                      <span class="history-result" data-node-id="b755b00a-29b2-11f1-be13-122a9cb60781" data-node-id="b755aaf6-29b2-11f1-be13-122a9cb60781" data-node-id="b7559426-29b2-11f1-be13-122a9cb60781">
                        ${h.itemsSynced} 成功${h.itemsFailed > 0 ? `，${h.itemsFailed} 失败` : ''}
                      </span>
                    </div>
                    <div class="history-time" data-node-id="b755b33e-29b2-11f1-be13-122a9cb60781" data-node-id="b755a6be-29b2-11f1-be13-122a9cb60781" data-node-id="b75591ec-29b2-11f1-be13-122a9cb60781">${formatDateTime(h.syncTime)}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>
    </div>
  `;
  
  // 添加样式
  const style = document.createElement('style');
  style.textContent = `
    .sync-history-modal .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
      padding: 1rem;
    }
    
    .sync-history-modal .modal-content {
      background: var(--bg-card, #1A1A2E);
      border: 1px solid var(--border, #333355);
      border-radius: 16px;
      width: 100%;
      max-width: 480px;
      max-height: 80vh;
      overflow: hidden;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    }
    
    .sync-history-modal .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--border, #333355);
    }
    
    .sync-history-modal .modal-header h3 {
      font-size: 1.1rem;
      font-weight: 600;
      margin: 0;
    }
    
    .sync-history-modal .modal-close {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: none;
      border: none;
      color: var(--text-muted, #6B6B80);
      cursor: pointer;
      border-radius: 8px;
      transition: all 0.2s ease;
    }
    
    .sync-history-modal .modal-close:hover {
      background: var(--bg-elevated, #252542);
      color: var(--text-primary, #FFFFFF);
    }
    
    .sync-history-modal .modal-body {
      padding: 1rem;
      max-height: 60vh;
      overflow-y: auto;
    }
    
    .sync-history-modal .empty-state {
      text-align: center;
      padding: 2rem;
      color: var(--text-muted, #6B6B80);
    }
    
    .sync-history-modal .empty-state svg {
      margin: 0 auto 1rem;
      opacity: 0.5;
    }
    
    .sync-history-modal .history-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    
    .sync-history-modal .history-item {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.75rem;
      background: var(--bg-elevated, #252542);
      border-radius: 8px;
    }
    
    .sync-history-modal .history-icon {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.85rem;
      flex-shrink: 0;
    }
    
    .sync-history-modal .history-item.success .history-icon {
      background: rgba(46, 204, 113, 0.2);
      color: var(--success, #2ECC71);
    }
    
    .sync-history-modal .history-item.partial .history-icon {
      background: rgba(243, 156, 18, 0.2);
      color: var(--warning, #F39C12);
    }
    
    .sync-history-modal .history-item.failed .history-icon {
      background: rgba(230, 57, 70, 0.2);
      color: var(--danger, #E63946);
    }
    
    .sync-history-modal .history-content {
      flex: 1;
      min-width: 0;
    }
    
    .sync-history-modal .history-main {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }
    
    .sync-history-modal .history-type {
      font-size: 0.9rem;
      font-weight: 500;
    }
    
    .sync-history-modal .history-result {
      font-size: 0.8rem;
      color: var(--text-secondary, #A0A0B8);
    }
    
    .sync-history-modal .history-time {
      font-size: 0.75rem;
      color: var(--text-muted, #6B6B80);
      margin-top: 0.25rem;
    }
  `;
  
  modal.appendChild(style);
  document.body.appendChild(modal);
}

/**
 * 格式化日期时间
 */
function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  
  // 1分钟内
  if (diff < 60000) {
    return '刚刚';
  }
  
  // 1小时内
  if (diff < 3600000) {
    return `${Math.floor(diff / 60000)} 分钟前`;
  }
  
  // 今天
  if (date.toDateString() === now.toDateString()) {
    return `今天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }
  
  // 昨天
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `昨天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }
  
  // 其他
  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

// 导出
export { updateIndicator };
