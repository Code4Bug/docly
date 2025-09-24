import { ref } from 'vue';
import { WordHandler } from '../fileHandlers/WordHandler';

/**
 * 文件处理组合式函数
 * 提供文件导入、导出等功能
 */
export function useFileHandler() {
  // 响应式数据
  const isExporting = ref(false);
  const isImporting = ref(false);
  const wordHandler = ref<WordHandler>();

  /**
   * 初始化文件处理器
   */
  const initFileHandler = (): void => {
    wordHandler.value = new WordHandler();
  };

  /**
   * 导入文件
   * @param {File} file - 要导入的文件
   * @returns {Promise<any>} 编辑器数据
   */
  const importFile = async (file: File): Promise<any> => {
    if (!wordHandler.value) {
      initFileHandler();
    }
    
    isImporting.value = true;
    try {
      const editorData = await wordHandler.value!.import(file);
      return editorData;
    } catch (error) {
      Console.error('文件导入失败:', error);
      throw error;
    } finally {
      isImporting.value = false;
    }
  };

  /**
   * 导出文件
   * @param {any} editorData - 编辑器数据
   * @returns {Promise<{blob: Blob; name: string}>} 导出的文件对象
   */
  const exportFile = async (editorData: any): Promise<{blob: Blob; name: string}> => {
    if (!wordHandler.value) {
      initFileHandler();
    }
    
    isExporting.value = true;
    try {
      const fileResult = await wordHandler.value!.export(editorData);
      return fileResult;
    } catch (error) {
      Console.error('文件导出失败:', error);
      throw error;
    } finally {
      isExporting.value = false;
    }
  };

  /**
   * 处理文件选择
   * @param {Event} event - 文件选择事件
   * @returns {Promise<any | null>} 编辑器数据或null
   */
  const handleFileSelect = async (event: Event): Promise<any | null> => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    
    if (!file) {
      return null;
    }
    
    try {
      const editorData = await importFile(file);
      // 清空input值，允许重复选择同一文件
      target.value = '';
      return editorData;
    } catch (error) {
      target.value = '';
      throw error;
    }
  };

  /**
   * 触发文件选择对话框
   * @param {HTMLInputElement} fileInput - 文件输入元素
   */
  const triggerFileSelect = (fileInput: HTMLInputElement): void => {
    fileInput.click();
  };

  /**
   * 验证文件类型
   * @param {File} file - 要验证的文件
   * @param {string[]} allowedTypes - 允许的文件类型
   * @returns {boolean} 是否为允许的文件类型
   */
  const validateFileType = (file: File, allowedTypes: string[] = ['.docx', '.doc']): boolean => {
    const fileName = file.name.toLowerCase();
    return allowedTypes.some(type => fileName.endsWith(type));
  };

  /**
   * 格式化文件大小
   * @param {number} bytes - 字节数
   * @returns {string} 格式化后的文件大小
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 初始化
  initFileHandler();

  return {
    isExporting,
    isImporting,
    wordHandler,
    importFile,
    exportFile,
    handleFileSelect,
    triggerFileSelect,
    validateFileType,
    formatFileSize,
    initFileHandler
  };
}