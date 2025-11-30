import JSZip from 'jszip';

/**
 * DOCX 文件处理器
 * 专门负责.docx文件的读写操作
 */
export class DocxFileHandler {

  /**
   * 读取.docx文件内容
   */
  async readDocxFile(file: File): Promise<{ documentXml: string; commentsXml?: string; numberingXml?: string }> {
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

    return { documentXml, commentsXml, numberingXml };
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

  private async addDocxStructureFiles(zip: any, wordContent: string, hasComments: boolean = false): Promise<void> {
    // [Content_Types].xml - 根据是否有批注调整内容类型
    zip.file('[Content_Types].xml', this.getContentTypesXml(hasComments));
    
    // _rels/.rels
    zip.folder('_rels')!.file('.rels', this.getRelsXml());
    
    // word/_rels/document.xml.rels - 根据是否有批注调整关系文件
    zip.folder('word')!.folder('_rels')!.file('document.xml.rels', this.getDocumentRelsXml(hasComments));
    
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

  private getContentTypesXml(hasComments: boolean = false): string {
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

  private getDocumentRelsXml(hasComments: boolean = false): string {
    let relationships = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable" Target="fontTable.xml"/>
  <Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>`;
    
    // 如果有批注，添加批注关系
    if (hasComments) {
      relationships += `
  <Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments" Target="comments.xml"/>`;
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
}