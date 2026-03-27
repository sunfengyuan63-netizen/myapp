// 工具函数

// 格式化日期
export function formatDate(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// 格式化日期时间
export function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return `${formatDate(dateStr)} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

// 状态文本映射
export function getStatusText(status) {
  const map = {
    'draft': '草稿',
    'submitted': '待审核',
    'reviewing': '审核中',
    'approved': '已通过',
    'rejected': '已退回',
    'archived': '已归档'
  };
  return map[status] || status;
}

// 状态徽章样式
export function getStatusBadgeClass(status) {
  const map = {
    'draft': 'badge-warning',
    'submitted': 'badge-info',
    'reviewing': 'badge-info',
    'approved': 'badge-success',
    'rejected': 'badge-danger',
    'archived': 'badge-success'
  };
  return map[status] || 'badge-muted';
}

// 检查结果状态文本
export function getResultStatusText(status) {
  const map = {
    'pass': '无问题',
    'not_applicable': '不涉及',
    'problem': '有问题',
    'rectified': '已整改'
  };
  return map[status] || '-';
}

// 检查结果状态样式
export function getResultStatusClass(status) {
  const map = {
    'pass': 'text-success',
    'not_applicable': 'text-muted',
    'problem': 'text-danger',
    'rectified': 'text-info'
  };
  return map[status] || '';
}

// 文件大小格式化
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 防抖函数
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// 节流函数
export function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// 生成唯一ID
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 复制到剪贴板
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Copy failed:', err);
    return false;
  }
}

// 下载文件
export function downloadFile(url, filename) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// 检查是否为移动设备
export function isMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// 获取URL参数
export function getUrlParam(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

// 设置URL参数
export function setUrlParam(name, value) {
  const url = new URL(window.location);
  url.searchParams.set(name, value);
  window.history.pushState({}, '', url);
}

// 移除URL参数
export function removeUrlParam(name) {
  const url = new URL(window.location);
  url.searchParams.delete(name);
  window.history.pushState({}, '', url);
}
