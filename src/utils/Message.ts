/**
 * 显示消息提示
 * @param {string} text - 消息文本
 * @param {string} type - 消息类型 ('success' | 'error' | 'warning' | 'info')
 */
export const showMessage = (text: string, type: 'success' | 'error' | 'warning' | 'info' = 'info'): void => {
  // 清除之前的消息
  const existingMessages = document.querySelectorAll('.docly-message');
  existingMessages.forEach(msg => msg.remove());
  
  // 创建消息元素
  const messageEl = document.createElement('div');
  messageEl.className = `docly-message message-${type}`;
  messageEl.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 16px;
    border-radius: 6px;
    color: white;
    font-size: 14px;
    z-index: 9999;
    max-width: 300px;
    word-wrap: break-word;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transition: opacity 0.3s ease;
  `;
  
  // 根据类型设置背景色
  const colors = {
    success: '#52c41a',
    error: '#ff4d4f',
    warning: '#faad14',
    info: '#1890ff'
  };
  messageEl.style.backgroundColor = colors[type] || colors.info;
  messageEl.textContent = text;
  
  // 添加到页面
  document.body.appendChild(messageEl);
  
  // 3秒后自动移除
  setTimeout(() => {
    if (messageEl.parentNode) {
      messageEl.parentNode.removeChild(messageEl);
    }
  }, 3000);
};
