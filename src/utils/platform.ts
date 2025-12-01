/**
 * 平台检测工具
 * 用于检测操作系统并返回相应的快捷键修饰符
 */

/**
 * 检测是否为 macOS 系统
 * @returns {boolean} 是否为 macOS
 */
export function isMacOS(): boolean {
  return navigator.platform.toUpperCase().indexOf('MAC') >= 0 || 
         navigator.userAgent.toUpperCase().indexOf('MAC') >= 0;
}

/**
 * 检测是否为 Windows 系统
 * @returns {boolean} 是否为 Windows
 */
export function isWindows(): boolean {
  return navigator.platform.toUpperCase().indexOf('WIN') >= 0;
}

/**
 * 检测是否为 Linux 系统
 * @returns {boolean} 是否为 Linux
 */
export function isLinux(): boolean {
  return navigator.platform.toUpperCase().indexOf('LINUX') >= 0;
}

/**
 * 获取当前系统的主修饰键
 * @returns {string} 'Cmd' for macOS, 'Ctrl' for others
 */
export function getPrimaryModifierKey(): string {
  return isMacOS() ? 'Cmd' : 'Ctrl';
}

/**
 * 获取当前系统的修饰键显示文本
 * @returns {string} '⌘' for macOS, 'Ctrl' for others
 */
export function getModifierKeyDisplay(): string {
  return isMacOS() ? '⌘' : 'Ctrl';
}

/**
 * 格式化快捷键显示文本
 * @param {string} shortcut - 快捷键组合，如 'Ctrl+S' 或 'Cmd+S'
 * @returns {string} 格式化后的快捷键显示文本
 */
export function formatShortcutDisplay(shortcut: string): string {
  if (!shortcut) return '';
  
  const isMac = isMacOS();
  
  // 替换修饰键，使用更大更清晰的符号
  let formatted = shortcut
    .replace(/Ctrl/g, isMac ? '⌘' : 'Ctrl')
    .replace(/Cmd/g, isMac ? '⌘' : 'Ctrl')
    .replace(/Alt/g, isMac ? '⌥' : 'Alt')
    .replace(/Shift/g, isMac ? '⇧' : 'Shift')
    .replace(/Meta/g, isMac ? '⌘' : 'Win');
  
  // 在 macOS 上使用更紧凑的显示格式，并添加适当的间距
  if (isMac) {
    formatted = formatted.replace(/\+/g, ' ');
  }
  
  return formatted;
}

/**
 * 根据当前系统生成快捷键组合
 * @param {string} key - 主键，如 'S', 'O', 'E'
 * @param {object} modifiers - 修饰键配置
 * @returns {string} 完整的快捷键组合
 */
export function generateShortcut(
  key: string, 
  modifiers: {
    ctrl?: boolean;
    alt?: boolean;
    shift?: boolean;
    meta?: boolean;
  } = { ctrl: true }
): string {
  const parts: string[] = [];
  const primaryKey = getPrimaryModifierKey();
  
  if (modifiers.ctrl || modifiers.meta) {
    parts.push(primaryKey);
  }
  
  if (modifiers.alt) {
    parts.push('Alt');
  }
  
  if (modifiers.shift) {
    parts.push('Shift');
  }
  
  parts.push(key.toUpperCase());
  
  return parts.join('+');
}

/**
 * 获取系统信息
 * @returns {object} 系统信息对象
 */
export function getSystemInfo() {
  return {
    platform: navigator.platform,
    userAgent: navigator.userAgent,
    isMacOS: isMacOS(),
    isWindows: isWindows(),
    isLinux: isLinux(),
    primaryModifierKey: getPrimaryModifierKey(),
    modifierKeyDisplay: getModifierKeyDisplay()
  };
}