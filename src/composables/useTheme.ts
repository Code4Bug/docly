import { ref, computed, onMounted, onUnmounted } from 'vue';

/**
 * 主题管理组合式函数
 * 提供主题切换、系统主题检测等功能
 */
export function useTheme() {
  // 响应式数据
  const isDarkMode = ref(false);
  const systemThemeQuery = ref<MediaQueryList | null>(null);

  /**
   * 检测系统主题变化
   * @returns {MediaQueryList | null} 媒体查询对象
   */
  const detectSystemTheme = (): MediaQueryList | null => {
    if (window.matchMedia) {
      const query = window.matchMedia('(prefers-color-scheme: dark)');
      isDarkMode.value = query.matches;
      return query;
    }
    return null;
  };

  /**
   * 处理系统主题变化
   * @param {MediaQueryListEvent} e - 媒体查询事件
   */
  const handleThemeChange = (e: MediaQueryListEvent): void => {
    isDarkMode.value = e.matches;
  };

  /**
   * 切换主题
   */
  const toggleTheme = (): void => {
    isDarkMode.value = !isDarkMode.value;
  };

  /**
   * 设置主题
   * @param {boolean} dark - 是否为暗色主题
   */
  const setTheme = (dark: boolean): void => {
    isDarkMode.value = dark;
  };

  // 计算属性
  const isDarkTheme = computed(() => isDarkMode.value);
  const themeClass = computed(() => isDarkMode.value ? 'dark' : 'light');

  // 生命周期钩子
  onMounted(() => {
    systemThemeQuery.value = detectSystemTheme();
    if (systemThemeQuery.value) {
      systemThemeQuery.value.addEventListener('change', handleThemeChange);
    }
  });

  onUnmounted(() => {
    if (systemThemeQuery.value) {
      systemThemeQuery.value.removeEventListener('change', handleThemeChange);
    }
  });

  return {
    isDarkMode,
    isDarkTheme,
    themeClass,
    toggleTheme,
    setTheme,
    detectSystemTheme,
    handleThemeChange
  };
}