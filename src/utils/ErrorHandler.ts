import { Console } from './Console';
import { showMessage } from './Message';

/**
 * 错误类型枚举
 */
export enum ErrorType {
  FILE_VALIDATION = 'file_validation',
  XML_PARSING = 'xml_parsing',
  COMMENT_PARSING = 'comment_parsing',
  DATA_VALIDATION = 'data_validation',
  IMPORT_PROCESS = 'import_process',
  UNKNOWN = 'unknown'
}

/**
 * 错误严重程度枚举
 */
export enum ErrorSeverity {
  INFO = 'info',
  WARNING = 'warn',
  ERROR = 'error',
  CRITICAL = 'critical'
}

/**
 * 错误详情接口
 */
export interface ErrorDetail {
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  context?: string;
  suggestion?: string;
  timestamp: number;
}

/**
 * 批注解析结果接口
 */
export interface CommentParsingResult {
  totalFound: number;
  successfullyParsed: number;
  failed: number;
  warnings: string[];
  errors: ErrorDetail[];
  partialLoss: boolean;
}

/**
 * 增强的错误处理和用户反馈系统
 */
export class ErrorHandler {
  private static errors: ErrorDetail[] = [];
  private static maxErrorHistory = 50;

  /**
   * 记录错误
   */
  static logError(
    type: ErrorType,
    severity: ErrorSeverity,
    message: string,
    context?: string,
    suggestion?: string
  ): ErrorDetail {
    const error: ErrorDetail = {
      type,
      severity,
      message,
      context,
      suggestion,
      timestamp: Date.now()
    };

    // 添加到错误历史
    this.errors.unshift(error);
    if (this.errors.length > this.maxErrorHistory) {
      this.errors = this.errors.slice(0, this.maxErrorHistory);
    }

    // 根据严重程度记录到控制台
    switch (severity) {
      case ErrorSeverity.INFO:
        Console.info(`[${type}] ${message}`, context ? `Context: ${context}` : '');
        break;
      case ErrorSeverity.WARNING:
        Console.warn(`[${type}] ${message}`, context ? `Context: ${context}` : '');
        break;
      case ErrorSeverity.ERROR:
      case ErrorSeverity.CRITICAL:
        Console.error(`[${type}] ${message}`, context ? `Context: ${context}` : '');
        break;
    }

    return error;
  }

  /**
   * 显示用户友好的错误消息
   */
  static showUserFriendlyError(error: ErrorDetail): void {
    let userMessage = this.getUserFriendlyMessage(error);
    
    if (error.suggestion) {
      userMessage += ` 建议: ${error.suggestion}`;
    }

    const messageType = this.getMessageType(error.severity);
    showMessage(userMessage, messageType);
  }

  /**
   * 获取用户友好的错误消息
   */
  private static getUserFriendlyMessage(error: ErrorDetail): string {
    const messageMap: Record<ErrorType, Record<string, string>> = {
      [ErrorType.FILE_VALIDATION]: {
        default: '文件验证失败',
        'size': '文件大小不符合要求',
        'format': '文件格式不支持',
        'empty': '文件为空或损坏'
      },
      [ErrorType.XML_PARSING]: {
        default: '文档结构解析失败',
        'invalid': '文档内部结构无效',
        'corrupted': '文档可能已损坏'
      },
      [ErrorType.COMMENT_PARSING]: {
        default: '批注数据处理出现问题',
        'missing': '部分批注数据缺失',
        'invalid': '批注格式不正确'
      },
      [ErrorType.DATA_VALIDATION]: {
        default: '数据验证失败',
        'incomplete': '数据不完整',
        'invalid': '数据格式无效'
      },
      [ErrorType.IMPORT_PROCESS]: {
        default: '导入过程中出现问题',
        'interrupted': '导入过程被中断',
        'timeout': '导入超时'
      },
      [ErrorType.UNKNOWN]: {
        default: '发生未知错误'
      }
    };

    const typeMessages = messageMap[error.type] || messageMap[ErrorType.UNKNOWN];
    
    // 尝试根据错误消息内容匹配更具体的消息
    for (const [key, message] of Object.entries(typeMessages)) {
      if (key !== 'default' && error.message.toLowerCase().includes(key)) {
        return message;
      }
    }

    return typeMessages.default;
  }

  /**
   * 获取消息类型
   */
  private static getMessageType(severity: ErrorSeverity): 'info' | 'warn' | 'error' | 'success' {
    switch (severity) {
      case ErrorSeverity.INFO:
        return 'info';
      case ErrorSeverity.WARNING:
        return 'warn';
      case ErrorSeverity.ERROR:
      case ErrorSeverity.CRITICAL:
        return 'error';
      default:
        return 'info';
    }
  }

  /**
   * 处理批注解析结果并提供用户反馈
   */
  static handleCommentParsingResult(result: CommentParsingResult): void {
    Console.info('=== 批注解析结果处理 ===');
    Console.info(`总计发现: ${result.totalFound} 条批注`);
    Console.info(`成功解析: ${result.successfullyParsed} 条批注`);
    Console.info(`解析失败: ${result.failed} 条批注`);

    // 计算成功率
    const successRate = result.totalFound > 0 
      ? Math.round((result.successfullyParsed / result.totalFound) * 100) 
      : 0;

    // 根据结果提供不同的用户反馈
    if (result.totalFound === 0) {
      showMessage('文档中未包含批注数据', 'info');
    } else if (successRate === 100) {
      showMessage(`成功导入 ${result.successfullyParsed} 条批注`, 'success');
    } else if (successRate >= 80) {
      showMessage(`批注导入基本成功 (${successRate}%)，${result.failed} 条批注可能存在问题`, 'warn');
    } else if (successRate >= 50) {
      showMessage(`部分批注导入成功 (${successRate}%)，建议检查文档格式`, 'warn');
      if (result.partialLoss) {
        setTimeout(() => {
          showMessage('部分批注数据可能丢失，请检查导入结果', 'warn');
        }, 2000);
      }
    } else {
      showMessage(`批注导入失败较多 (成功率: ${successRate}%)，请检查文档兼容性`, 'error');
      if (result.partialLoss) {
        setTimeout(() => {
          showMessage('大量批注数据丢失，建议使用其他方式处理文档', 'error');
        }, 2000);
      }
    }

    // 显示重要警告
    const criticalWarnings = result.warnings.filter(warning =>
      warning.includes('失败') || 
      warning.includes('丢失') || 
      warning.includes('错误')
    );

    if (criticalWarnings.length > 0) {
      setTimeout(() => {
        showMessage(`注意: ${criticalWarnings[0]}`, 'warn');
      }, 3000);
    }
  }

  /**
   * 生成错误报告
   */
  static generateErrorReport(): string {
    if (this.errors.length === 0) {
      return '无错误记录';
    }

    const report: string[] = [];
    report.push('=== 错误报告 ===');
    report.push(`总计错误数: ${this.errors.length}`);
    report.push('');

    // 按类型统计
    const typeStats = this.errors.reduce((stats, error) => {
      stats[error.type] = (stats[error.type] || 0) + 1;
      return stats;
    }, {} as Record<ErrorType, number>);

    report.push('错误类型统计:');
    Object.entries(typeStats).forEach(([type, count]) => {
      report.push(`  ${type}: ${count}`);
    });
    report.push('');

    // 最近的错误详情
    report.push('最近的错误 (最多10条):');
    this.errors.slice(0, 10).forEach((error, index) => {
      const time = new Date(error.timestamp).toLocaleString();
      report.push(`  ${index + 1}. [${error.severity}] ${error.type}: ${error.message}`);
      report.push(`     时间: ${time}`);
      if (error.context) {
        report.push(`     上下文: ${error.context}`);
      }
      if (error.suggestion) {
        report.push(`     建议: ${error.suggestion}`);
      }
      report.push('');
    });

    return report.join('\n');
  }

  /**
   * 清空错误历史
   */
  static clearErrorHistory(): void {
    this.errors = [];
    Console.info('错误历史已清空');
  }

  /**
   * 获取错误统计
   */
  static getErrorStats(): {
    total: number;
    byType: Record<ErrorType, number>;
    bySeverity: Record<ErrorSeverity, number>;
    recent: ErrorDetail[];
  } {
    const byType = this.errors.reduce((stats, error) => {
      stats[error.type] = (stats[error.type] || 0) + 1;
      return stats;
    }, {} as Record<ErrorType, number>);

    const bySeverity = this.errors.reduce((stats, error) => {
      stats[error.severity] = (stats[error.severity] || 0) + 1;
      return stats;
    }, {} as Record<ErrorSeverity, number>);

    return {
      total: this.errors.length,
      byType,
      bySeverity,
      recent: this.errors.slice(0, 5)
    };
  }

  /**
   * 验证批注数据完整性
   */
  static validateCommentData(comments: any[]): {
    isValid: boolean;
    issues: ErrorDetail[];
    summary: string;
  } {
    const issues: ErrorDetail[] = [];
    
    if (!Array.isArray(comments)) {
      const error = this.logError(
        ErrorType.DATA_VALIDATION,
        ErrorSeverity.ERROR,
        '批注数据不是有效的数组格式',
        'validateCommentData',
        '请检查数据源格式'
      );
      issues.push(error);
      return { isValid: false, issues, summary: '数据格式错误' };
    }

    let validCount = 0;
    let invalidCount = 0;

    comments.forEach((comment, index) => {
      if (!comment || typeof comment !== 'object') {
        const error = this.logError(
          ErrorType.DATA_VALIDATION,
          ErrorSeverity.WARNING,
          `批注 ${index + 1} 数据结构无效`,
          `index: ${index}`,
          '跳过此批注'
        );
        issues.push(error);
        invalidCount++;
        return;
      }

      // 检查必要字段
      const requiredFields = ['id', 'content', 'author', 'timestamp'];
      const missingFields = requiredFields.filter(field => !comment[field]);
      
      if (missingFields.length > 0) {
        const error = this.logError(
          ErrorType.DATA_VALIDATION,
          ErrorSeverity.WARNING,
          `批注 ${index + 1} 缺少必要字段: ${missingFields.join(', ')}`,
          `comment id: ${comment.id || 'unknown'}`,
          '将使用默认值填充'
        );
        issues.push(error);
      }

      // 检查数据质量
      if (comment.content === '批注解析失败' || comment.author === '解析错误') {
        const error = this.logError(
          ErrorType.COMMENT_PARSING,
          ErrorSeverity.WARNING,
          `批注 ${index + 1} 解析失败`,
          `comment id: ${comment.id}`,
          '检查原始文档格式'
        );
        issues.push(error);
        invalidCount++;
      } else {
        validCount++;
      }
    });

    const successRate = comments.length > 0 ? Math.round((validCount / comments.length) * 100) : 0;
    const summary = `${validCount}/${comments.length} 条批注有效 (${successRate}%)`;

    return {
      isValid: successRate >= 80,
      issues,
      summary
    };
  }
}