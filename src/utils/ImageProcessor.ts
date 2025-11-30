import { ImageInfo } from '../converters/WordToTiptapConverter';

/**
 * 图片处理工具类
 */
export class ImageProcessor {
  
  /**
   * 从关系XML中解析图片关系映射
   * @param relationshipsXml - 关系XML内容
   * @returns 关系ID到文件名的映射
   */
  static parseImageRelationships(relationshipsXml: string): { [relationshipId: string]: string } {
    const relationships: { [relationshipId: string]: string } = {};
    
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(relationshipsXml, 'text/xml');
      
      const relationshipElements = doc.querySelectorAll('Relationship');
      relationshipElements.forEach(rel => {
        const id = rel.getAttribute('Id');
        const type = rel.getAttribute('Type');
        const target = rel.getAttribute('Target');
        
        // 检查是否为图片关系
        if (id && type && target && type.includes('image')) {
          // 提取文件名（去掉路径前缀）
          const filename = target.split('/').pop() || target;
          relationships[id] = filename;
        }
      });
      
      console.log('解析到的图片关系映射:', relationships);
    } catch (error) {
      console.error('解析关系XML失败:', error);
    }
    
    return relationships;
  }

  /**
   * 处理图片数据，将关系ID映射到实际的图片数据
   * @param tiptapDoc - Tiptap文档
   * @param imageRelationships - 关系ID到文件名的映射
   * @param imageData - 图片数据映射
   * @returns 处理后的图片信息数组
   */
  static processImages(
    tiptapDoc: any,
    imageRelationships: { [relationshipId: string]: string },
    imageData: { [filename: string]: { data: string; mimeType: string; filename: string } }
  ): ImageInfo[] {
    const images: ImageInfo[] = [];
    
    // 递归遍历文档内容，查找图片节点
    const processNode = (node: any) => {
      if (node.type === 'image' && node.attrs?.relationshipId) {
        const relationshipId = node.attrs.relationshipId;
        const filename = imageRelationships[relationshipId];
        
        console.log(`发现图片节点: relationshipId=${relationshipId}, filename=${filename}`);
        console.log('当前节点 src:', node.attrs.src);
        console.log('可用的图片文件:', Object.keys(imageData));
        
        if (filename && imageData[filename]) {
          const imgData = imageData[filename];
          
          console.log(`找到匹配的图片数据: ${filename}, 数据长度: ${imgData.data.length}`);
          
          // 创建图片信息
          const imageInfo: ImageInfo = {
            id: `img_${images.length + 1}`,
            relationshipId,
            filename,
            data: imgData.data,
            mimeType: imgData.mimeType,
            width: node.attrs.width,
            height: node.attrs.height
          };
          
          images.push(imageInfo);
          
          // 更新节点的src属性为base64数据
          node.attrs.src = imgData.data;
          
          console.log(`✓ 图片处理成功: ${filename}, 新的 src 长度: ${imgData.data.length}`);
        } else {
          console.warn(`✗ 未找到图片数据: relationshipId=${relationshipId}, filename=${filename}`);
          console.warn('图片关系映射:', imageRelationships);
          console.warn('可用图片数据:', Object.keys(imageData));
        }
      }
      
      // 递归处理子节点
      if (node.content && Array.isArray(node.content)) {
        node.content.forEach(processNode);
      }
    };
    
    // 处理文档内容
    if (tiptapDoc.content && Array.isArray(tiptapDoc.content)) {
      tiptapDoc.content.forEach(processNode);
    }
    
    return images;
  }

  /**
   * 为HTML渲染生成图片标签
   * @param imageNode - 图片节点
   * @returns HTML img标签字符串
   */
  static generateImageHtml(imageNode: any): string {
    const attrs = imageNode.attrs || {};
    const src = attrs.src || '';
    const alt = attrs.alt || '';
    const width = attrs.width ? ` width="${attrs.width}"` : '';
    const height = attrs.height ? ` height="${attrs.height}"` : '';
    
    return `<img src="${src}" alt="${alt}"${width}${height} style="max-width: 100%; height: auto;" />`;
  }
}