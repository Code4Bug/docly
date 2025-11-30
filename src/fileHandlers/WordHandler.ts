import { type TiptapDocument, type Comment as TiptapComment, type ImageInfo } from '../converters/WordToTiptapConverter';
import { WordXmlParser } from './WordXmlParser';
import { WordXmlGenerator } from './WordXmlGenerator';
import { DocxFileHandler } from './DocxFileHandler';
import { ErrorHandler, ErrorType, ErrorSeverity } from '../utils/ErrorHandler';
import { ImageProcessor } from '../utils/ImageProcessor';
import { TiptapToHtmlConverter } from '../converters/TiptapToHtmlConverter';

/**
 * Word文档处理器 - 重构版
 * 
 * 按照Linus的哲学重构：
 * 1. 单一职责 - 只负责协调三个专门的类
 * 2. 消除复杂性 - 每个方法只做一件事
 * 3. 好品味 - 没有特殊情况，统一的数据流
 */
export class WordHandler {
  private parser: WordXmlParser;
  private generator: WordXmlGenerator;
  private fileHandler: DocxFileHandler;

  constructor() {
    this.parser = new WordXmlParser();
    this.generator = new WordXmlGenerator();
    this.fileHandler = new DocxFileHandler();
  }

  // === 导入方法 ===

  /**
   * 导入Word文档为TiptapDocument (推荐格式)
   */
  async importToTiptap(file: File): Promise<TiptapDocument & { importWarnings?: string[]; importErrors?: string[] }> {
    const importResult = {
      warnings: [] as string[],
      errors: [] as string[]
    };

    try {
      console.log('开始导入Word文档，文件名:', file.name);
      
      // 文件基本验证
      const fileValidation = this.validateImportFile(file);
      if (!fileValidation.isValid) {
        importResult.errors.push(`文件验证失败: ${fileValidation.error}`);
        throw new Error(fileValidation.error!);
      }
      
      const { documentXml, numberingXml, commentsXml, relationshipsXml, images } = await this.fileHandler.readDocxFile(file);
      console.log('成功读取Word文档文件，包含批注:', !!commentsXml, '，包含图片:', Object.keys(images || {}).length);
      
      // 解析主文档内容
      let tiptapDocument: TiptapDocument;
      try {
        tiptapDocument = this.parser.parseToTiptap(documentXml, numberingXml);
        console.log('主文档解析完成，内容节点数:', tiptapDocument.content?.length || 0);
        
        // 处理图片数据
        let processedImages: ImageInfo[] = [];
        if (images && Object.keys(images).length > 0 && relationshipsXml) {
          try {
            console.log('开始处理图片数据...');
            const imageRelationships = ImageProcessor.parseImageRelationships(relationshipsXml);
            console.log('解析到的图片关系:', imageRelationships);
            
            processedImages = ImageProcessor.processImages(tiptapDocument, imageRelationships, images);
            console.log('图片处理完成，共处理', processedImages.length, '个图片');
            
            if (processedImages.length > 0) {
              importResult.warnings.push(`成功处理 ${processedImages.length} 个图片`);
            }
          } catch (imageError) {
            console.error('处理图片数据失败:', imageError);
            importResult.warnings.push('图片处理失败，文档中的图片可能无法正确显示');
          }
        }
        
        // 将处理后的图片信息添加到文档中
        if (processedImages.length > 0) {
          tiptapDocument.images = processedImages;
        }
        
        // 验证主文档内容
        if (!tiptapDocument.content || tiptapDocument.content.length === 0) {
          importResult.warnings.push('文档内容为空，可能是空白文档或解析出现问题');
        }
      } catch (documentError) {
        const errorMsg = `主文档解析失败: ${documentError instanceof Error ? documentError.message : '未知错误'}`;
        importResult.errors.push(errorMsg);
        throw new Error(errorMsg);
      }
      
      // 解析批注数据（如果存在）
      let comments: TiptapComment[] = [];
      let commentParsingSuccessful = true;
      
      if (commentsXml) {
        try {
          console.log('开始解析批注数据...');
          comments = this.parser.parseComments(commentsXml, documentXml);
          console.log('批注解析完成，共找到', comments.length, '条批注');
          
          // 验证批注数据质量
          const commentValidation = this.validateParsedComments(comments);
          if (commentValidation.warnings.length > 0) {
            importResult.warnings.push(...commentValidation.warnings);
          }
          if (commentValidation.errors.length > 0) {
            importResult.errors.push(...commentValidation.errors);
          }
          
          // 记录每条批注的基本信息用于调试
          comments.forEach((comment, index) => {
            console.log(`批注 ${index + 1}: ID=${comment.id}, 作者=${comment.author}, 内容长度=${comment.content.length}`);
          });
          
          // 检查是否有批注解析失败
          const failedComments = comments.filter(c => c.author === '解析错误' || c.content === '批注解析失败');
          if (failedComments.length > 0) {
            commentParsingSuccessful = false;
            importResult.warnings.push(`${failedComments.length} 条批注解析失败，已使用默认值替代`);
          }
          
        } catch (commentError) {
          commentParsingSuccessful = false;
          const errorMsg = `批注解析过程发生错误: ${commentError instanceof Error ? commentError.message : '未知错误'}`;
          importResult.errors.push(errorMsg);
          console.error('解析批注时发生错误:', commentError);
          importResult.warnings.push('批注解析失败，但主文档导入将继续进行');
          // 批注解析失败不应该影响主文档导入
          comments = [];
        }
      } else {
        console.log('文档中未找到批注数据');
        importResult.warnings.push('文档中未包含批注数据');
      }
      
      // 将批注数据集成到TiptapDocument中
      if (comments.length > 0) {
        tiptapDocument.comments = comments;
        console.log('批注数据已成功集成到TiptapDocument中');
        
        // 提供批注导入状态反馈
        if (commentParsingSuccessful) {
          importResult.warnings.push(`成功导入 ${comments.length} 条批注`);
        } else {
          importResult.warnings.push(`部分批注导入成功，共 ${comments.length} 条批注（包含 ${comments.filter(c => c.author === '解析错误').length} 条解析失败的批注）`);
        }
      } else if (commentsXml) {
        importResult.warnings.push('文档包含批注文件但未能解析出有效批注');
      }
      
      // 生成导入摘要
      const importSummary = this.generateImportSummary(tiptapDocument, comments, importResult);
      console.log('Word文档导入完成:', importSummary);
      
      // 将警告和错误信息附加到返回结果中
      const result = tiptapDocument as TiptapDocument & { importWarnings?: string[]; importErrors?: string[] };
      if (importResult.warnings.length > 0) {
        result.importWarnings = importResult.warnings;
      }
      if (importResult.errors.length > 0) {
        result.importErrors = importResult.errors;
      }
      
      return result;
    } catch (error) {
      const errorMsg = `导入Word文档失败: ${error instanceof Error ? error.message : '未知错误'}`;
      importResult.errors.push(errorMsg);
      console.error('导入Word文档失败:', error);
      console.error('错误详情:', error instanceof Error ? error.stack : '未知错误类型');
      
      // 即使失败也要提供详细的错误信息
      const enhancedError = new Error(errorMsg);
      (enhancedError as any).importWarnings = importResult.warnings;
      (enhancedError as any).importErrors = importResult.errors;
      throw enhancedError;
    }
  }

  /**
   * 导入Word文档为HTML
   */
  async importToHtml(file: File): Promise<string> {
    try {
      const tiptapDoc = await this.importToTiptap(file);
      return this.convertTiptapToHtml(tiptapDoc);
    } catch (error) {
      console.error('导入为HTML失败:', error);
      throw new Error(`导入失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  // === 导出方法 ===

  /**
   * 从TiptapDocument导出Word文档 (推荐)
   * 现在支持批注数据导出
   */
  async exportFromTiptapJson(tiptapDoc: TiptapDocument, filename: string = 'document'): Promise<{ blob: Blob; name: string }> {
    try {
      console.log('开始导出Word文档，包含批注数量:', tiptapDoc.comments?.length || 0);
      
      // 生成主文档XML
      const wordXml = this.generator.generateFromTiptap(tiptapDoc);
      
      // 生成批注XML（如果存在批注数据）
      let commentsXml: string | undefined;
      if (tiptapDoc.comments && tiptapDoc.comments.length > 0) {
        console.log('生成批注XML文件...');
        commentsXml = this.generator.generateCommentsXml(tiptapDoc.comments);
        console.log('批注XML生成完成');
      }
      
      // 生成包含批注的完整Word文档
      const blob = await this.fileHandler.generateDocxFileWithComments(wordXml, commentsXml);
      
      console.log('Word文档导出完成，文件大小:', Math.round(blob.size / 1024), 'KB');
      return { blob, name: `${filename}.docx` };
    } catch (error) {
      console.error('从Tiptap导出失败:', error);
      throw new Error(`导出失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 从HTML导出Word文档
   */
  async exportFromHtml(html: string, filename: string = 'document'): Promise<{ blob: Blob; name: string }> {
    try {
      const wordXml = this.generator.generateFromHtml(html);
      const blob = await this.fileHandler.generateDocxFile(wordXml);
      return { blob, name: `${filename}.docx` };
    } catch (error) {
      console.error('从HTML导出失败:', error);
      throw new Error(`导出失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  // === 批注处理 ===

  /**
   * 解析Word文档中的批注
   */
  async parseComments(file: File): Promise<TiptapComment[]> {
    try {
      console.log('开始解析Word文档批注，文件名:', file.name);
      const { documentXml, commentsXml } = await this.fileHandler.readDocxFile(file);
      
      if (!commentsXml) {
        console.log('文档中未找到comments.xml文件');
        return [];
      }
      
      console.log('找到comments.xml文件，开始解析批注内容');
      const comments = this.parser.parseComments(commentsXml, documentXml);
      console.log('批注解析完成，共解析出', comments.length, '条批注');
      
      return comments;
    } catch (error) {
      console.error('解析批注失败:', error);
      console.error('错误详情:', error instanceof Error ? error.stack : '未知错误类型');
      // 返回空数组而不是抛出错误，确保不影响主要功能
      return [];
    }
  }

  // === 私有辅助方法 ===

  /**
   * 验证导入文件
   */
  private validateImportFile(file: File): { isValid: boolean; error?: string } {
    if (!file) {
      ErrorHandler.logError(
        ErrorType.FILE_VALIDATION,
        ErrorSeverity.ERROR,
        '未选择文件',
        'validateImportFile',
        '请选择一个有效的Word文档文件'
      );
      return { isValid: false, error: '未选择文件' };
    }
    
    if (!file.name) {
      ErrorHandler.logError(
        ErrorType.FILE_VALIDATION,
        ErrorSeverity.ERROR,
        '文件名无效',
        `file object: ${typeof file}`,
        '请确保选择的是有效文件'
      );
      return { isValid: false, error: '文件名无效' };
    }
    
    // 检查文件扩展名
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.docx')) {
      ErrorHandler.logError(
        ErrorType.FILE_VALIDATION,
        ErrorSeverity.ERROR,
        '不支持的文件格式',
        `文件名: ${file.name}`,
        '请选择 .docx 格式的Word文档'
      );
      return { isValid: false, error: '仅支持 .docx 格式的Word文件' };
    }
    
    // 检查文件大小（限制为50MB）
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      const fileSizeMB = Math.round(file.size / 1024 / 1024);
      ErrorHandler.logError(
        ErrorType.FILE_VALIDATION,
        ErrorSeverity.ERROR,
        '文件大小超过限制',
        `文件大小: ${fileSizeMB}MB, 限制: 50MB`,
        '请选择较小的文件或压缩文档内容'
      );
      return { isValid: false, error: `文件大小超过限制（${fileSizeMB}MB > 50MB）` };
    }
    
    // 检查文件是否为空
    if (file.size === 0) {
      ErrorHandler.logError(
        ErrorType.FILE_VALIDATION,
        ErrorSeverity.ERROR,
        '文件为空',
        `文件名: ${file.name}`,
        '请选择包含内容的Word文档'
      );
      return { isValid: false, error: '文件为空' };
    }
    
    // 文件验证通过
    ErrorHandler.logError(
      ErrorType.FILE_VALIDATION,
      ErrorSeverity.INFO,
      '文件验证通过',
      `文件: ${file.name}, 大小: ${Math.round(file.size / 1024)}KB`
    );
    
    return { isValid: true };
  }

  /**
   * 验证解析后的批注数据
   */
  private validateParsedComments(comments: TiptapComment[]): { warnings: string[]; errors: string[] } {
    // 使用ErrorHandler的验证功能
    const validationResult = ErrorHandler.validateCommentData(comments);
    
    const warnings: string[] = [];
    const errors: string[] = [];
    
    if (!validationResult.isValid) {
      errors.push('批注数据验证失败');
    }
    
    // 统计各种批注状态
    let validComments = 0;
    let emptyContentComments = 0;
    let missingAuthorComments = 0;
    let invalidTimestampComments = 0;
    let missingRangeTextComments = 0;
    let errorComments = 0;
    
    if (Array.isArray(comments)) {
      comments.forEach((comment, index) => {
        // 检查基本结构
        if (!comment || typeof comment !== 'object') {
          ErrorHandler.logError(
            ErrorType.DATA_VALIDATION,
            ErrorSeverity.ERROR,
            `批注 ${index + 1} 数据结构无效`,
            `index: ${index}, type: ${typeof comment}`,
            '跳过此批注的处理'
          );
          errors.push(`批注 ${index + 1} 数据结构无效`);
          return;
        }
        
        // 检查必要字段
        if (!comment.id) {
          ErrorHandler.logError(
            ErrorType.DATA_VALIDATION,
            ErrorSeverity.ERROR,
            `批注 ${index + 1} 缺少ID`,
            `comment object keys: ${Object.keys(comment).join(', ')}`,
            '此批注将无法正确显示'
          );
          errors.push(`批注 ${index + 1} 缺少ID`);
          return;
        }
        
        // 检查内容
        if (!comment.content || comment.content.trim().length === 0) {
          emptyContentComments++;
          ErrorHandler.logError(
            ErrorType.DATA_VALIDATION,
            ErrorSeverity.WARNING,
            `批注 ${comment.id} 内容为空`,
            `author: ${comment.author}`,
            '将显示为空批注'
          );
        } else if (comment.content === '批注解析失败') {
          errorComments++;
          ErrorHandler.logError(
            ErrorType.COMMENT_PARSING,
            ErrorSeverity.WARNING,
            `批注 ${comment.id} 解析失败`,
            `原始解析错误`,
            '检查原始文档格式'
          );
        }
        
        // 检查作者
        if (!comment.author || comment.author === '解析错误' || comment.author === '未知作者') {
          missingAuthorComments++;
          ErrorHandler.logError(
            ErrorType.DATA_VALIDATION,
            ErrorSeverity.WARNING,
            `批注 ${comment.id} 缺少作者信息`,
            `current author: ${comment.author}`,
            '将显示默认作者名称'
          );
        }
        
        // 检查时间戳
        if (!comment.timestamp || isNaN(comment.timestamp) || comment.timestamp <= 0) {
          invalidTimestampComments++;
          ErrorHandler.logError(
            ErrorType.DATA_VALIDATION,
            ErrorSeverity.WARNING,
            `批注 ${comment.id} 时间戳无效`,
            `timestamp: ${comment.timestamp}`,
            '将使用当前时间'
          );
        }
        
        // 检查范围文本
        if (!comment.range?.text || comment.range.text.trim().length === 0) {
          missingRangeTextComments++;
          ErrorHandler.logError(
            ErrorType.DATA_VALIDATION,
            ErrorSeverity.INFO,
            `批注 ${comment.id} 缺少关联的原文文本`,
            `range: ${JSON.stringify(comment.range)}`,
            '批注仍可正常显示'
          );
        }
        
        if (comment.content !== '批注解析失败' && comment.author !== '解析错误') {
          validComments++;
        }
      });
    }
    
    // 生成警告信息
    if (emptyContentComments > 0) {
      warnings.push(`${emptyContentComments} 条批注内容为空`);
    }
    
    if (missingAuthorComments > 0) {
      warnings.push(`${missingAuthorComments} 条批注缺少作者信息`);
    }
    
    if (invalidTimestampComments > 0) {
      warnings.push(`${invalidTimestampComments} 条批注时间戳无效`);
    }
    
    if (missingRangeTextComments > 0) {
      warnings.push(`${missingRangeTextComments} 条批注缺少关联的原文文本`);
    }
    
    if (errorComments > 0) {
      warnings.push(`${errorComments} 条批注解析失败，已使用默认值`);
    }
    
    // 生成摘要
    const successRate = comments.length > 0 ? Math.round((validComments / comments.length) * 100) : 0;
    if (successRate < 100) {
      warnings.push(`批注解析成功率: ${successRate}% (${validComments}/${comments.length})`);
    }
    
    // 记录验证摘要
    ErrorHandler.logError(
      ErrorType.DATA_VALIDATION,
      successRate >= 80 ? ErrorSeverity.INFO : ErrorSeverity.WARNING,
      `批注数据验证完成: ${validationResult.summary}`,
      `总计: ${comments.length}, 有效: ${validComments}, 问题: ${comments.length - validComments}`,
      successRate < 80 ? '建议检查原始文档格式' : undefined
    );
    
    return { warnings, errors };
  }

  /**
   * 生成导入摘要
   */
  private generateImportSummary(
    document: TiptapDocument, 
    comments: TiptapComment[], 
    importResult: { warnings: string[]; errors: string[] }
  ): string {
    const parts: string[] = [];
    
    // 文档内容摘要
    const contentNodes = document.content?.length || 0;
    parts.push(`文档节点: ${contentNodes}`);
    
    // 批注摘要
    if (comments.length > 0) {
      const validComments = comments.filter(c => c.author !== '解析错误' && c.content !== '批注解析失败').length;
      parts.push(`批注: ${validComments}/${comments.length}`);
    } else {
      parts.push('批注: 0');
    }
    
    // 警告和错误摘要
    if (importResult.warnings.length > 0) {
      parts.push(`警告: ${importResult.warnings.length}`);
    }
    
    if (importResult.errors.length > 0) {
      parts.push(`错误: ${importResult.errors.length}`);
    }
    
    return parts.join(', ');
  }

  private convertTiptapToHtml(tiptapDoc: TiptapDocument): string {
    const htmlConverter = new TiptapToHtmlConverter();
    return htmlConverter.convertToHtml(tiptapDoc);
  }


}