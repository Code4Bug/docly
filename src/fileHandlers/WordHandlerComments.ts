import type { Comment } from '../types';

/**
 * 从解析的文档对象中提取批注数据
 * @param document - docx-preview 解析的文档对象
 * @returns 批注数组
 */
export function extractCommentsFromDocument(document: any): Comment[] {
  const comments: Comment[] = [];
  
  try {
    // 从文档的 commentsPart 中获取批注数据
    const commentsPart = document.commentsPart;
    if (!commentsPart || !commentsPart.comments) {
      console.log('文档中没有找到批注数据');
      return comments;
    }
    
    console.log('找到批注部分，批注数量:', commentsPart.comments.length);
    
    // 遍历所有批注
    for (const comment of commentsPart.comments) {
      try {
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
        
        const commentObj: Comment = {
          id: comment.id || `comment_${Date.now()}_${Math.random()}`,
          author: comment.author || '未知作者',
          content: content || '空批注',
          timestamp: timestamp,
          user: comment.author || '未知作者', // 添加必需的 user 字段
          range: {
            startOffset: 0,
            endOffset: 0,
            text: content || '空批注'
          }
        };
        
        comments.push(commentObj);
        console.log('提取批注:', {
          id: commentObj.id,
          author: commentObj.author,
          content: commentObj.content.substring(0, 50) + (commentObj.content.length > 50 ? '...' : '')
        });
        
      } catch (error) {
        console.error('处理单个批注时出错:', error, comment);
      }
    }
    
  } catch (error) {
    console.error('提取批注数据时出错:', error);
  }
  
  return comments;
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
      // 如果有文本内容
      if (child.text) {
        text += child.text;
      }
      // 如果有子元素，递归处理
      if (child.children && Array.isArray(child.children)) {
        text += extractTextFromCommentChildren(child.children);
      }
      // 处理段落等结构
      if (child.type === 'paragraph' || child.type === 'run') {
        if (child.children) {
          text += extractTextFromCommentChildren(child.children);
        }
      }
    }
  }
  
  return text.trim();
}