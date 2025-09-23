import type { Comment } from '../types';

/**
 * 安全地序列化对象，避免循环引用
 * @param obj - 要序列化的对象
 * @param maxDepth - 最大递归深度
 * @returns 序列化后的字符串
 */
function safeStringify(obj: any, maxDepth: number = 3): string {
  const seen = new WeakSet();
  
  const replacer = (key: string, value: any, depth: number = 0): any => {
    if (depth > maxDepth) {
      return '[Max Depth Reached]';
    }
    
    if (value !== null && typeof value === 'object') {
      if (seen.has(value)) {
        return '[Circular Reference]';
      }
      seen.add(value);
      
      // 对于对象，只保留关键属性
      if (Array.isArray(value)) {
        return value.slice(0, 3).map((item, index) => 
          replacer(`[${index}]`, item, depth + 1)
        );
      } else {
        const result: any = {};
        const keys = Object.keys(value).slice(0, 5); // 只取前5个属性
        for (const k of keys) {
          if (k !== 'parent' && k !== 'document') { // 跳过可能导致循环引用的属性
            result[k] = replacer(k, value[k], depth + 1);
          }
        }
        return result;
      }
    }
    
    return value;
  };
  
  try {
    return JSON.stringify(replacer('', obj, 0), null, 2);
  } catch (error) {
    return `[Serialization Error: ${error.message}]`;
  }
}

/**
 * 构建批注范围映射，将批注ID映射到对应的原始文本
 * @param body - 文档主体
 * @returns 批注ID到原始文本的映射
 */
function buildCommentRangeMap(body: any): Record<string, string> {
  const rangeMap: Record<string, string> = {};
  const processedCommentIds = new Set<string>(); // 跟踪已处理的批注ID，避免重复处理
  
  if (!body) {
    console.log('文档主体为空，无法构建批注范围映射');
    return rangeMap;
  }
  
  console.log('开始构建批注范围映射');
  console.log('文档主体基本信息:', {
    type: body.type,
    hasChildren: !!(body.children && body.children.length),
    childrenCount: body.children ? body.children.length : 0
  });
  
  try {
    // 递归遍历文档结构，查找commentRangeStart和commentRangeEnd标记
    const processElement = (element: any, path: string = 'root'): void => {
      if (!element) return;
      
      // 只记录关键信息，避免循环引用
      const elementInfo = {
        type: element.type,
        id: element.id || 'N/A',
        hasChildren: !!(element.children && element.children.length),
        text: element.type === 'text' ? element.text : undefined
      };
      
      // console.log(`处理元素 ${path}:`, elementInfo);
      
      // 如果是文本元素，记录文本
      if (element.type === 'text' && element.text) {
        console.log(`  发现文本: "${element.text}"`);
      }
      
      // 如果是批注范围开始标记
      if (element.type === 'commentRangeStart') {
        const commentId = element.id;
        console.log(`  发现批注范围开始标记: commentId=${commentId}`);
        if (commentId && !processedCommentIds.has(commentId)) {
          // 标记为已处理，避免重复处理
          processedCommentIds.add(commentId);
          
          // 开始收集这个批注的文本
          const commentText: string[] = [];
          const state = { collecting: false };
          collectCommentText(body, commentId, commentText, state);
          rangeMap[commentId] = commentText.join('').trim();
          console.log(`批注 ${commentId} 收集到的文本: "${rangeMap[commentId]}"`);
        } else if (commentId && processedCommentIds.has(commentId)) {
          console.log(`  批注 ${commentId} 已处理过，跳过重复处理`);
        }
      }
      
      // 递归处理子元素
      if (element.children && Array.isArray(element.children)) {
        element.children.forEach((child: any, index: number) => {
          processElement(child, `${path}.children[${index}]`);
        });
      }
    };
    
    processElement(body);
    console.log('批注范围映射构建完成:', rangeMap);
    console.log('已处理的批注ID数量:', processedCommentIds.size);
  } catch (error) {
    console.error('构建批注范围映射时出错:', error);
  }
  
  return rangeMap;
}

/**
 * 收集批注范围内的文本
 * @param element - 当前元素
 * @param commentId - 批注ID
 * @param textArray - 收集的文本数组
 * @param state - 收集状态对象
 * @returns 是否应该停止收集
 */
function collectCommentText(element: any, commentId: string, textArray: string[], state: { collecting: boolean } = { collecting: false }): boolean {
  if (!element) return false;
  
  // 如果遇到批注范围开始标记
  if (element.type === 'commentRangeStart' && element.id === commentId) {
    state.collecting = true;
    console.log(`开始收集批注 ${commentId} 的文本`);
  }
  
  // 如果遇到批注范围结束标记
  if (element.type === 'commentRangeEnd' && element.id === commentId) {
    state.collecting = false;
    console.log(`结束收集批注 ${commentId} 的文本，收集到: ${textArray.join('')}`);
    return true; // 停止收集
  }
  
  // 如果正在收集且是文本元素
  if (state.collecting && element.type === 'text' && element.text) {
    textArray.push(element.text);
    console.log(`收集到文本片段: "${element.text}"`);
  }
  
  // 递归处理子元素
  if (element.children && Array.isArray(element.children)) {
    for (const child of element.children) {
      const shouldStop = collectCommentText(child, commentId, textArray, state);
      if (shouldStop) return true;
    }
  }
  
  return false;
}

/**
 * 从解析的文档对象中提取批注数据
 * @param document - docx-preview 解析的文档对象
 * @returns 批注数组
 */
export function extractCommentsFromDocument(document: any): Comment[] {
  const comments: Comment[] = [];
  const processedCommentIds = new Set<string>(); // 跟踪已处理的批注ID，避免重复添加
  
  try {
    // 从文档的 commentsPart 中获取批注数据
    const commentsPart = document.commentsPart;
    if (!commentsPart || !commentsPart.comments) {
      console.log('文档中没有找到批注数据');
      return comments;
    }
    
    console.log('找到批注部分，批注数量:', commentsPart.comments.length);
    
    // 首先构建文档主体的批注范围映射
    const commentRangeMap = buildCommentRangeMap(document.documentPart?.body);
    console.log('构建的批注范围映射:', commentRangeMap);
    
    // 遍历所有批注
    for (const comment of commentsPart.comments) {
      try {
        // 检查是否已处理过此批注ID
        if (processedCommentIds.has(comment.id)) {
          console.log(`批注 ${comment.id} 已处理过，跳过重复处理`);
          continue;
        }
        
        // 标记为已处理
        processedCommentIds.add(comment.id);
        
        // 提取批注内容文本
        let content = '';
        if (comment.children && comment.children.length > 0) {
          // 递归提取所有文本内容
          content = extractTextFromCommentChildren(comment.children);
        }
        
        // 解析日期
        let timestamp = Date.now();
        if (comment.date) {
          const parsedDate = new Date(comment.date);
          if (!isNaN(parsedDate.getTime())) {
            timestamp = parsedDate.getTime();
          }
        }
        
        // 从批注范围映射中获取原始文本
        let rangeText = commentRangeMap[comment.id] || '';
        
        console.log(`批注 ${comment.id}:`);
        console.log(`  - 作者: ${comment.author}`);
        console.log(`  - 内容: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`);
        console.log(`  - 范围文本: "${rangeText}"`);
        
        // 如果没有找到范围文本，使用占位符
        if (!rangeText) {
          rangeText = '未找到选中文本';
          console.log(`  - 警告: 批注 ${comment.id} 未找到范围文本，使用占位符`);
        }

        const commentObj: Comment = {
          id: comment.id || `comment_${Date.now()}_${Math.random()}`,
          author: comment.author || '未知作者',
          content: content || '空批注',
          timestamp: timestamp,
          user: comment.author || '未知作者', // 添加必需的 user 字段
          range: {
            startOffset: 0,
            endOffset: rangeText.length,
            text: rangeText
          }
        };
        
        comments.push(commentObj);
        console.log('提取批注:', {
          id: commentObj.id,
          author: commentObj.author,
          content: commentObj.content.substring(0, 50) + (commentObj.content.length > 50 ? '...' : ''),
          rangeText: commentObj.range.text
        });
        
      } catch (error) {
        console.error('处理单个批注时出错:', error, comment);
      }
    }
    
    console.log(`批注提取完成: 总计处理 ${processedCommentIds.size} 个唯一批注，最终返回 ${comments.length} 个批注对象`);
    
  } catch (error) {
    console.error('提取批注数据时出错:', error);
  }
  
  return comments;
}

/**
 * 从文档主体中查找批注对应的原始文本
 * @param body - 文档主体
 * @param commentId - 批注ID
 * @returns 找到的原始文本
 */
function findCommentRangeText(body: any, commentId: string): string {
  if (!body || !commentId) return '';
  
  try {
    // 递归搜索文档结构，查找commentRangeStart和commentRangeEnd标记
    const searchInElement = (element: any): string => {
      if (!element) return '';
      
      // 检查当前元素是否是批注范围标记
      if (element.type === 'commentRangeStart' && element.id === commentId) {
        // 找到批注开始标记，需要继续查找到结束标记之间的文本
        return extractTextBetweenCommentMarkers(body, commentId);
      }
      
      // 递归搜索子元素
      if (element.children && Array.isArray(element.children)) {
        for (const child of element.children) {
          const result = searchInElement(child);
          if (result) return result;
        }
      }
      
      return '';
    };
    
    return searchInElement(body);
  } catch (error) {
    console.error('查找批注范围文本时出错:', error);
    return '';
  }
}

/**
 * 提取批注标记之间的文本
 * @param body - 文档主体
 * @param commentId - 批注ID
 * @returns 批注标记之间的文本
 */
function extractTextBetweenCommentMarkers(body: any, commentId: string): string {
  let isInCommentRange = false;
  let extractedText = '';
  
  const traverseElement = (element: any): void => {
    if (!element) return;
    
    // 检查批注范围开始
    if (element.type === 'commentRangeStart' && element.id === commentId) {
      isInCommentRange = true;
      return;
    }
    
    // 检查批注范围结束
    if (element.type === 'commentRangeEnd' && element.id === commentId) {
      isInCommentRange = false;
      return;
    }
    
    // 如果在批注范围内，提取文本
    if (isInCommentRange) {
      if (element.text) {
        extractedText += element.text;
      } else if (element.type === 'text' && element.children) {
        extractedText += extractTextFromCommentChildren(element.children);
      }
    }
    
    // 递归处理子元素
    if (element.children && Array.isArray(element.children)) {
      for (const child of element.children) {
        traverseElement(child);
      }
    }
  };
  
  traverseElement(body);
  return extractedText.trim();
}

/**
 * 从批注子元素中递归提取文本内容
 * @param children - 批注的子元素数组
 * @returns 提取的文本内容
 */
function extractTextFromCommentChildren(children: any[]): string {
  let text = '';
  
  for (const child of children) {
    if (typeof child === 'string') {
      text += child;
    } else if (child && typeof child === 'object') {
      // 如果有直接的文本内容
      if (child.text) {
        text += child.text;
      }
      
      // 如果有子元素，递归处理（避免重复处理）
      if (child.children && Array.isArray(child.children)) {
        text += extractTextFromCommentChildren(child.children);
      }
      // 注意：移除了对特定类型的重复处理，避免文本重复提取
    }
  }
  
  return text.trim();
}