import JSZip from 'jszip';

/**
 * DOCX 文件处理器
 * 专门负责.docx文件的读写操作
 */
export class DocxFileHandler {

  /**
   * 读取.docx文件内容
   */
  async readDocxFile(file: File): Promise<{ 
    documentXml: string; 
    commentsXml?: string; 
    numberingXml?: string;
    relationshipsXml?: string;
    images?: { [key: string]: { data: string; mimeType: string; filename: string } };
  }> {
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(file);
    
    // 读取主文档
    const documentFile = zipContent.file('word/document.xml');
    if (!documentFile) {
      throw new Error('无效的Word文档：缺少document.xml');
    }
    
    const documentXml = await documentFile.async('text');
    
    // 读取批注（可选）
    let commentsXml: string | undefined;
    const commentsFile = zipContent.file('word/comments.xml');
    if (commentsFile) {
      commentsXml = await commentsFile.async('text');
    }

    // 读取编号定义（可选）
    let numberingXml: string | undefined;
    const numberingFile = zipContent.file('word/numbering.xml');
    if (numberingFile) {
      numberingXml = await numberingFile.async('text');
    }

    // 读取关系文件
    let relationshipsXml: string | undefined;
    const relationshipsFile = zipContent.file('word/_rels/document.xml.rels');
    if (relationshipsFile) {
      relationshipsXml = await relationshipsFile.async('text');
    }

    // 读取图片文件
    const images: { [key: string]: { data: string; mimeType: string; filename: string } } = {};
    const mediaFolder = zipContent.folder('word/media');
    if (mediaFolder) {
      const mediaFiles = mediaFolder.filter((relativePath, file) => {
        return !file.dir && /\.(png|jpg|jpeg|gif|bmp|svg)$/i.test(relativePath);
      });

      for (const mediaFile of mediaFiles) {
        try {
          const filename = mediaFile.name.split('/').pop() || '';
          const extension = filename.split('.').pop()?.toLowerCase() || '';
          
          // 确定MIME类型
          const mimeTypeMap: { [key: string]: string } = {
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'gif': 'image/gif',
            'bmp': 'image/bmp',
            'svg': 'image/svg+xml'
          };
          
          const mimeType = mimeTypeMap[extension] || 'image/png';
          
          // 读取图片数据并转换为base64
          const imageData = await mediaFile.async('base64');
          
          images[filename] = {
            data: `data:${mimeType};base64,${imageData}`,
            mimeType,
            filename
          };
          
          console.log(`读取图片: ${filename}, 类型: ${mimeType}, 大小: ${imageData.length} bytes`);
        } catch (error) {
          console.error(`读取图片文件 ${mediaFile.name} 失败:`, error);
        }
      }
    }

    return { documentXml, commentsXml, numberingXml, relationshipsXml, images };
  }

  /**
   * 生成.docx文件
   */
  async generateDocxFile(wordContent: string): Promise<Blob> {
    const zip = new JSZip();
    
    // 添加基本结构文件
    await this.addDocxStructureFiles(zip, wordContent);
    
    // 生成ZIP文件
    return await zip.generateAsync({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });
  }

  /**
   * 生成包含图片和批注的完整.docx文件
   */
  async generateDocxFileWithImagesAndComments(
    wordContent: string, 
    commentsXml?: string, 
    images?: { [relationshipId: string]: { data: string; mimeType: string; filename: string } }
  ): Promise<Blob> {
    const zip = new JSZip();
    
    // 添加基本结构文件（不包含图片关系，稍后单独处理）
    await this.addDocxStructureFiles(zip, wordContent, !!commentsXml, !!images);
    
    // 如果有图片数据，需要重新生成包含图片关系的 document.xml.rels
    if (images && Object.keys(images).length > 0) {
      console.log('添加图片文件到Word文档...');
      const mediaFolder = zip.folder('word')!.folder('media')!;
      
      // 添加图片文件
      Object.entries(images).forEach(([relationshipId, imageInfo]) => {
        // 从 base64 数据中提取实际的图片数据
        console.log(`处理图片数据: ${imageInfo.filename}`);
        console.log(`原始数据长度: ${imageInfo.data.length}`);
        console.log(`数据前缀: ${imageInfo.data.substring(0, 50)}`);
        
        const base64Data = imageInfo.data.split(',')[1] || imageInfo.data;
        console.log(`提取的base64数据长度: ${base64Data.length}`);
        console.log(`base64数据前缀: ${base64Data.substring(0, 50)}`);
        
        mediaFolder.file(imageInfo.filename, base64Data, { base64: true });
        console.log(`添加图片: ${imageInfo.filename}, 关系ID: ${relationshipId}`);
      });
      
      // 重新生成包含图片关系的 document.xml.rels
      const documentRelsXml = this.generateDocumentRelsWithImages(!!commentsXml, images);
      zip.folder('word')!.folder('_rels')!.file('document.xml.rels', documentRelsXml);
      
      console.log('生成的 document.xml.rels 内容:');
      console.log(documentRelsXml);
      console.log('图片文件添加完成');
    }
    
    // 如果有批注数据，添加批注文件
    if (commentsXml) {
      console.log('添加批注文件到Word文档...');
      zip.folder('word')!.file('comments.xml', commentsXml);
      console.log('批注文件添加完成');
    }
    
    // 生成ZIP文件
    return await zip.generateAsync({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });
  }

  /**
   * 生成包含批注的.docx文件
   */
  async generateDocxFileWithComments(wordContent: string, commentsXml?: string): Promise<Blob> {
    const zip = new JSZip();
    
    // 添加基本结构文件
    await this.addDocxStructureFiles(zip, wordContent, !!commentsXml);
    
    // 如果有批注数据，添加批注文件
    if (commentsXml) {
      console.log('添加批注文件到Word文档...');
      zip.folder('word')!.file('comments.xml', commentsXml);
      console.log('批注文件添加完成');
    }
    
    // 生成ZIP文件
    return await zip.generateAsync({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });
  }

  // === 私有方法 ===

  private async addDocxStructureFiles(zip: any, wordContent: string, hasComments: boolean = false, hasImages: boolean = false): Promise<void> {
    // [Content_Types].xml - 根据是否有批注和图片调整内容类型
    zip.file('[Content_Types].xml', this.getContentTypesXml(hasComments, hasImages));
    
    // _rels/.rels
    zip.folder('_rels')!.file('.rels', this.getRelsXml());
    
    // word/_rels/document.xml.rels - 根据是否有批注和图片调整关系文件
    zip.folder('word')!.folder('_rels')!.file('document.xml.rels', this.getDocumentRelsXml(hasComments, hasImages, wordContent));
    
    // word/document.xml
    zip.folder('word')!.file('document.xml', wordContent);
    
    // word/styles.xml
    zip.folder('word')!.file('styles.xml', this.getStylesXml());
    
    // word/settings.xml
    zip.folder('word')!.file('settings.xml', this.getSettingsXml());
    
    // word/fontTable.xml
    zip.folder('word')!.file('fontTable.xml', this.getFontTableXml());
    
    // word/numbering.xml - 根据内容生成最小化的编号定义，提升一致性
    zip.folder('word')!.file('numbering.xml', this.getNumberingXmlForContent(wordContent));
  }

  private getContentTypesXml(hasComments: boolean = false, hasImages: boolean = false): string {
    let contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
  <Override PartName="/word/fontTable.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml"/>
  <Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>`;
    
    // 如果有批注，添加批注内容类型
    if (hasComments) {
      contentTypes += `
  <Override PartName="/word/comments.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml"/>`;
    }
    
    // 如果有图片，添加图片内容类型
    if (hasImages) {
      contentTypes += `
  <Default Extension="png" ContentType="image/png"/>
  <Default Extension="jpg" ContentType="image/jpeg"/>
  <Default Extension="jpeg" ContentType="image/jpeg"/>
  <Default Extension="gif" ContentType="image/gif"/>
  <Default Extension="bmp" ContentType="image/bmp"/>`;
    }
    
    contentTypes += `
</Types>`;
    
    return contentTypes;
  }

  private getRelsXml(): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;
  }

  private getDocumentRelsXml(hasComments: boolean = false, hasImages: boolean = false, wordContent?: string): string {
    let relationships = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable" Target="fontTable.xml"/>
  <Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>`;
    
    let nextRId = 5;
    
    // 如果有批注，添加批注关系
    if (hasComments) {
      relationships += `
  <Relationship Id="rId${nextRId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments" Target="comments.xml"/>`;
      nextRId++;
    }
    
    // 如果有图片，添加图片关系
    if (hasImages && wordContent) {
      const imageRelationships = this.extractImageRelationshipsFromContent(wordContent);
      // 这里需要从外部传入实际的图片关系映射
      // 暂时跳过，将在 generateDocxFileWithImagesAndComments 中处理
    }
    
    relationships += `
</Relationships>`;
    
    return relationships;
  }

  private getStylesXml(): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:eastAsia="宋体" w:hAnsi="Calibri" w:cs="Times New Roman"/>
        <w:sz w:val="22"/>
        <w:szCs w:val="22"/>
        <w:lang w:val="en-US" w:eastAsia="zh-CN" w:bidi="ar-SA"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:after="160" w:line="259" w:lineRule="auto"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
  <w:latentStyles w:defLockedState="0" w:defUIPriority="99" w:defSemiHidden="0" w:defUnhideWhenUsed="0" w:defQFormat="0" w:count="376"/>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:keepNext/>
      <w:keepLines/>
      <w:spacing w:before="240" w:after="0"/>
      <w:outlineLvl w:val="0"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:asciiTheme="majorHAnsi" w:eastAsiaTheme="majorEastAsia" w:hAnsiTheme="majorHAnsi" w:cstheme="majorBidi"/>
      <w:color w:val="2F5496" w:themeColor="accent1" w:themeShade="BF"/>
      <w:sz w:val="32"/>
      <w:szCs w:val="32"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="CommentText">
    <w:name w:val="comment text"/>
    <w:basedOn w:val="Normal"/>
    <w:link w:val="CommentTextChar"/>
    <w:semiHidden/>
    <w:rsid w:val="00000000"/>
    <w:pPr>
      <w:spacing w:after="0" w:line="240" w:lineRule="auto"/>
    </w:pPr>
    <w:rPr>
      <w:sz w:val="20"/>
      <w:szCs w:val="20"/>
    </w:rPr>
  </w:style>
  <w:style w:type="character" w:styleId="CommentReference">
    <w:name w:val="comment reference"/>
    <w:semiHidden/>
    <w:rsid w:val="00000000"/>
    <w:rPr>
      <w:sz w:val="16"/>
      <w:szCs w:val="16"/>
    </w:rPr>
  </w:style>
  <w:style w:type="character" w:styleId="CommentTextChar">
    <w:name w:val="批注文本 字符"/>
    <w:basedOn w:val="DefaultParagraphFont"/>
    <w:link w:val="CommentText"/>
    <w:semiHidden/>
    <w:rsid w:val="00000000"/>
    <w:rPr>
      <w:sz w:val="20"/>
      <w:szCs w:val="20"/>
    </w:rPr>
  </w:style>
</w:styles>`;
  }

  private getSettingsXml(): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:zoom w:percent="100"/>
  <w:defaultTabStop w:val="708"/>
  <w:characterSpacingControl w:val="doNotCompress"/>
  <w:compat>
    <w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/>
  </w:compat>
</w:settings>`;
  }

  private getFontTableXml(): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:fonts xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:font w:name="Calibri">
    <w:panose1 w:val="020F0502020204030204"/>
    <w:charset w:val="00"/>
    <w:family w:val="swiss"/>
    <w:pitch w:val="variable"/>
    <w:sig w:usb0="E00002FF" w:usb1="4000ACFF" w:usb2="00000001" w:usb3="00000000" w:csb0="0000019F" w:csb1="00000000"/>
  </w:font>
  <w:font w:name="宋体">
    <w:altName w:val="SimSun"/>
    <w:panose1 w:val="02010600030101010101"/>
    <w:charset w:val="86"/>
    <w:family w:val="auto"/>
    <w:pitch w:val="variable"/>
    <w:sig w:usb0="00000003" w:usb1="288F0000" w:usb2="00000016" w:usb3="00000000" w:csb0="00040001" w:csb1="00000000"/>
  </w:font>
</w:fonts>`;
  }

  // 根据文档内容选择性输出编号定义，减少不必要的样式并与正文一致
  private getNumberingXmlForContent(wordContent: string): string {
    const usesOrdered = /<w:numId[^>]*w:val="1"|<numId[^>]*val="1"/i.test(wordContent);
    const usesBullet = /<w:numId[^>]*w:val="2"|<numId[^>]*val="2"/i.test(wordContent);

    const header = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">`;
    const footer = `\n</w:numbering>`;

    const parts: string[] = [];

    if (usesOrdered) {
      parts.push(`
  <w:abstractNum w:abstractNumId="0">
    <w:nsid w:val="2DD860C0"/>
    <w:multiLevelType w:val="hybridMultilevel"/>
    <w:tmpl w:val="0409001D"/>
    <w:lvl w:ilvl="0" w:tplc="04090001">
      <w:start w:val="1"/>
      <w:numFmt w:val="decimal"/>
      <w:lvlText w:val="%1."/>
      <w:lvlJc w:val="left"/>
      <w:pPr>
        <w:ind w:left="720" w:hanging="360"/>
      </w:pPr>
    </w:lvl>
  </w:abstractNum>
  <w:num w:numId="1">
    <w:abstractNumId w:val="0"/>
  </w:num>`);
    }

    if (usesBullet) {
      parts.push(`
  <w:abstractNum w:abstractNumId="1">
    <w:nsid w:val="2DD860C1"/>
    <w:multiLevelType w:val="hybridMultilevel"/>
    <w:tmpl w:val="0409001F"/>
    <w:lvl w:ilvl="0" w:tplc="04090001">
      <w:start w:val="1"/>
      <w:numFmt w:val="bullet"/>
      <w:lvlText w:val="·"/>
      <w:lvlJc w:val="left"/>
      <w:pPr>
        <w:ind w:left="720" w:hanging="360"/>
      </w:pPr>
    </w:lvl>
  </w:abstractNum>
  <w:num w:numId="2">
    <w:abstractNumId w:val="1"/>
  </w:num>`);
    }

    // 若正文没有列表，返回一个空的 numbering 文件以保持结构完整
    return header + parts.join("\n") + footer;
  }

  /**
   * 生成包含图片关系的 document.xml.rels 文件
   */
  private generateDocumentRelsWithImages(
    hasComments: boolean, 
    images: { [relationshipId: string]: { data: string; mimeType: string; filename: string } }
  ): string {
    let relationships = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable" Target="fontTable.xml"/>
  <Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>`;
    
    let nextRId = 5;
    
    // 如果有批注，添加批注关系
    if (hasComments) {
      relationships += `
  <Relationship Id="rId${nextRId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments" Target="comments.xml"/>`;
      nextRId++;
    }
    
    // 添加图片关系
    Object.entries(images).forEach(([relationshipId, imageInfo]) => {
      console.log(`生成图片关系: Id="${relationshipId}", Target="media/${imageInfo.filename}"`);
      relationships += `
  <Relationship Id="${relationshipId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${imageInfo.filename}"/>`;
    });
    
    relationships += `
</Relationships>`;
    
    return relationships;
  }

  /**
   * 从 Word 内容中提取图片关系映射
   * 需要与实际的图片数据匹配
   */
  private extractImageRelationshipsFromContent(wordContent: string): Map<string, string> {
    const relationships = new Map<string, string>();
    
    // 使用正则表达式查找所有的图片引用
    const imagePattern = /<a:blip[^>]*r:embed="([^"]+)"/g;
    let match;
    
    while ((match = imagePattern.exec(wordContent)) !== null) {
      const relationshipId = match[1];
      // 这里暂时设置为空，将在调用时根据实际图片数据设置正确的文件名
      relationships.set(relationshipId, '');
    }
    
    return relationships;
  }
}