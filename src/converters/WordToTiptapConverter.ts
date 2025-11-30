import { Console } from "../utils/Console";

/**
 * Tiptap 文档格式定义
 */
export interface TiptapDocument {
  type: "doc";
  content: TiptapNode[];
  comments?: Comment[];
}

export interface Comment {
  id: string;
  content: string;
  author: string;
  user: string;
  timestamp: number;
  range?: {
    startOffset: number;
    endOffset: number;
    text: string;
  };
}

export interface TiptapNode {
  type: string;
  attrs?: Record<string, any>;
  content?: TiptapNode[];
  text?: string;
  marks?: TiptapMark[];
}

export interface TiptapMark {
  type: string;
  attrs?: Record<string, any>;
}

/**
 * Word XML 到 Tiptap JSON 直接转换器
 * 消除中间适配层，实现单向数据流：Word XML → Tiptap JSON
 */
export class WordToTiptapConverter {
  private numberingTypeMap: Record<number, "bulletList" | "orderedList"> = {};

  constructor() {
    // TextStyleHandler 暂时保留，未来可能用于处理复杂的文本样式
    // this.textStyleHandler = new TextStyleHandler();
  }

  /**
   * 设置从 numbering.xml 解析得到的 numId → 列表类型 映射
   */
  setNumberingTypeMap(map: Record<number, "bulletList" | "orderedList">) {
    this.numberingTypeMap = map || {};
  }

  /**
   * 将 Word XML 直接转换为 Tiptap JSON 格式
   * @param xmlContent - Word 文档的 XML 内容
   * @returns Tiptap 文档格式
   */
  convertWordXmlToTiptapJson(xmlContent: string): TiptapDocument {
    try {
      Console.debug("开始将 Word XML 转换为 Tiptap JSON");

      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlContent, "text/xml");

      // 获取文档体中的所有直接子元素（段落和表格）
      const bodyElements = doc.querySelectorAll("w\\:body > *, body > *");
      const content: TiptapNode[] = [];

      // 用于跟踪列表状态
      let currentListType: "bulletList" | "orderedList" | null = null;
      let currentListItems: TiptapNode[] = [];

      bodyElements.forEach((element) => {
        const tagName = element.tagName.toLowerCase();
        
        if (tagName === "w:tbl" || tagName === "tbl") {
          // 处理表格
          Console.debug("发现表格元素，开始转换");
          
          // 结束当前列表（如果有）
          if (currentListType && currentListItems.length > 0) {
            content.push({
              type: currentListType,
              content: currentListItems,
            });
            currentListType = null;
            currentListItems = [];
          }
          
          const tableNode = this.convertWordTableToTiptapNode(element);
          if (tableNode) {
            content.push(tableNode);
          }
        } else if (tagName === "w:p" || tagName === "p") {
          // 处理段落（保持原有逻辑）
          const paragraphProps = element.querySelector("w\\:pPr, pPr");
          const numPr = paragraphProps?.querySelector("w\\:numPr, numPr");
          // 获取 numId，用于判断是否真的为列表。Word 中部分段落可能带有 <w:numPr> 但 numId=0，表示并非列表（常见于表格附近或样式切换后残留属性）。
          const numIdStr = numPr?.querySelector("w\\:numId, numId")?.getAttribute("w:val")
            || numPr?.querySelector("w\\:numId, numId")?.getAttribute("val")
            || null;
          const numId = numIdStr ? parseInt(numIdStr, 10) : 0;

          // 仅当 numId > 0 时才视为列表项
          if (numPr && numId > 0) {
            // 这是一个列表项
            const listType = this.determineListType(numPr);
            const listItem = this.convertParagraphToListItem(element);

            if (listItem) {
              if (currentListType === listType) {
                // 继续当前列表
                currentListItems.push(listItem);
              } else {
                // 结束当前列表，开始新列表
                if (currentListType && currentListItems.length > 0) {
                  content.push({
                    type: currentListType,
                    content: currentListItems,
                  });
                }
                currentListType = listType;
                currentListItems = [listItem];
              }
            }
          } else {
            // 不是列表项，结束当前列表
            if (currentListType && currentListItems.length > 0) {
              content.push({
                type: currentListType,
                content: currentListItems,
              });
              currentListType = null;
              currentListItems = [];
            }

            // 处理普通段落
            const node = this.convertParagraphToTiptapNode(element);
            if (node) {
              content.push(node);
            }
          }
        }
      });

      // 处理最后的列表
      if (currentListType && currentListItems.length > 0) {
        content.push({
          type: currentListType,
          content: currentListItems,
        });
      }

      // 如果没有内容，添加一个空段落
      if (content.length === 0) {
        content.push({
          type: "paragraph",
          content: [],
        });
      }

      const tiptapDoc: TiptapDocument = {
        type: "doc",
        content,
      };

      Console.debug(
        "Word XML 转换为 Tiptap JSON 完成，生成了",
        content.length,
        "个节点"
      );
      return tiptapDoc;
    } catch (error) {
      Console.error("Word XML 转换为 Tiptap JSON 时发生错误:", error);
      // 返回空文档而不是抛出错误
      return {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [],
          },
        ],
      };
    }
  }

  /**
   * 将 Word 段落转换为 Tiptap 节点
   * @param paragraph - Word 段落元素
   * @param index - 段落索引
   * @returns Tiptap 节点
   */
  private convertParagraphToTiptapNode(paragraph: Element): TiptapNode | null {
    // 检查段落样式，判断是否为标题
    const paragraphProps = paragraph.querySelector("w\\:pPr, pPr");
    const paragraphStyle = paragraphProps?.querySelector("w\\:pStyle, pStyle");
    const styleVal =
      paragraphStyle?.getAttribute("w:val") ||
      paragraphStyle?.getAttribute("val");

    // 提取段落级样式属性
    const paragraphAttrs = this.extractParagraphAttrs(paragraphProps);

    // 提取段落中的所有文本运行
    const runs = paragraph.querySelectorAll("w\\:r, r");
    const content: TiptapNode[] = [];

    runs.forEach((run) => {
      const textNodes = this.convertRunToTiptapNodes(run);
      content.push(...textNodes);
    });

    // 如果段落为空，不添加任何内容（Tiptap 会自动处理空段落）
    // Tiptap 不允许空的文本节点

    // 根据样式确定节点类型
    if (styleVal && styleVal.match(/heading|title|Heading|Title/i)) {
      // 提取标题级别
      const levelMatch = styleVal.match(/(\d+)/);
      const level = levelMatch ? Math.min(parseInt(levelMatch[1]), 6) : 1;

      return {
        type: "heading",
        attrs: { level, ...paragraphAttrs },
        content: content.length > 0 ? content : [{ type: "text", text: " " }],
      };
    }

    // 检查是否为列表项（仅当 numId>0 时）
    const numPr = paragraphProps?.querySelector("w\\:numPr, numPr");
    const numIdStr = numPr?.querySelector("w\\:numId, numId")?.getAttribute("w:val")
      || numPr?.querySelector("w\\:numId, numId")?.getAttribute("val")
      || null;
    const numId = numIdStr ? parseInt(numIdStr, 10) : 0;
    if (numPr && numId > 0) {
      return {
        type: "listItem",
        content: [
          {
            type: "paragraph",
            attrs: paragraphAttrs,
            content:
              content.length > 0 ? content : [{ type: "text", text: " " }],
          },
        ],
      };
    }

    // 默认为段落 - 如果没有内容，返回null让上层处理
    if (content.length === 0) {
      return null;
    }

    return {
      type: "paragraph",
      attrs: paragraphAttrs,
      content,
    };
  }

  /**
   * 将 Word 文本运行转换为 Tiptap 文本节点
   * @param run - Word 文本运行元素
   * @returns Tiptap 文本节点数组
   */
  private convertRunToTiptapNodes(run: Element): TiptapNode[] {
    const textElements = run.querySelectorAll("w\\:t, t");
    const runProps = run.querySelector("w\\:rPr, rPr");

    // 提取文本样式
    const marks = this.extractMarksFromRunProps(runProps);

    const nodes: TiptapNode[] = [];

    textElements.forEach((textEl) => {
      const text = textEl.textContent || "";
      if (text) {
        const textNode: TiptapNode = {
          type: "text",
          text,
        };

        if (marks.length > 0) {
          textNode.marks = marks;
        }

        nodes.push(textNode);
      }
    });

    return nodes;
  }

  /**
   * 从 Word 运行属性中提取 Tiptap 标记
   * @param runProps - Word 运行属性元素
   * @returns Tiptap 标记数组
   */
  /**
   * 提取段落级样式属性
   * @param paragraphProps - 段落属性元素
   * @returns 段落样式属性对象
   */
  private extractParagraphAttrs(
    paragraphProps: Element | null
  ): Record<string, any> {
    if (!paragraphProps) return {};

    const attrs: Record<string, any> = {};

    // 文本对齐
    const textAlign = paragraphProps.querySelector("w\\:jc, jc");
    if (textAlign) {
      const align =
        textAlign.getAttribute("w:val") || textAlign.getAttribute("val");
      if (align) {
        // Word 对齐值映射到 CSS 值
        const alignMap: Record<string, string> = {
          left: "left",
          center: "center",
          right: "right",
          both: "justify",
          distribute: "justify",
        };
        attrs.textAlign = alignMap[align] || align;
      }
    }

    // 字体大小（段落级别的默认字体大小）
    const fontSize = paragraphProps.querySelector("w\\:sz, sz");
    if (fontSize) {
      const size =
        fontSize.getAttribute("w:val") || fontSize.getAttribute("val");
      if (size) {
        // Word 中的字体大小是半点单位，需要除以2
        attrs.fontSize = `${parseInt(size) / 2}pt`;
      }
    }

    // 字体族（段落级别的默认字体）
    const fontFamily = paragraphProps.querySelector("w\\:rFonts, rFonts");
    if (fontFamily) {
      const font = this.extractFontFamilyByHint(fontFamily);
      if (font) {
        attrs.fontFamily = font;
      }
    }

    // 字体颜色（段落级别的默认颜色）
    const color = paragraphProps.querySelector("w\\:color, color");
    if (color) {
      const colorVal = color.getAttribute("w:val") || color.getAttribute("val");
      if (colorVal && colorVal !== "auto") {
        attrs.color = `#${colorVal}`;
      }
    }

    // 背景颜色
    const backgroundColor = paragraphProps.querySelector("w\\:shd, shd");
    if (backgroundColor) {
      const bgColor =
        backgroundColor.getAttribute("w:fill") ||
        backgroundColor.getAttribute("fill");
      if (bgColor && bgColor !== "auto") {
        attrs.backgroundColor = `#${bgColor}`;
      }
    }

    // 行间距
    const spacing = paragraphProps.querySelector("w\\:spacing, spacing");
    if (spacing) {
      const lineRule =
        spacing.getAttribute("w:lineRule") || spacing.getAttribute("lineRule");
      const line =
        spacing.getAttribute("w:line") || spacing.getAttribute("line");

      if (line) {
        if (lineRule === "exact") {
          // 固定行距，单位是缇（twips），1缇 = 1/20点
          attrs.lineHeight = `${parseInt(line) / 20}pt`;
        } else if (lineRule === "atLeast") {
          // 最小行距
          attrs.lineHeight = `${parseInt(line) / 20}pt`;
        } else {
          // 多倍行距，240 = 单倍行距
          const multiplier = parseInt(line) / 240;
          attrs.lineHeight = multiplier.toString();
        }
      }
    }

    // 段前间距
    const spacingBefore = paragraphProps.querySelector("w\\:spacing, spacing");
    if (spacingBefore) {
      const before =
        spacingBefore.getAttribute("w:before") ||
        spacingBefore.getAttribute("before");
      if (before) {
        // 单位是缇（twips），1缇 = 1/20点
        attrs.marginTop = `${parseInt(before) / 20}pt`;
      }
    }

    // 段后间距
    const spacingAfter = paragraphProps.querySelector("w\\:spacing, spacing");
    if (spacingAfter) {
      const after =
        spacingAfter.getAttribute("w:after") ||
        spacingAfter.getAttribute("after");
      if (after) {
        // 单位是缇（twips），1缇 = 1/20点
        attrs.marginBottom = `${parseInt(after) / 20}pt`;
      }
    }

    // 首行缩进
    const indentation = paragraphProps.querySelector("w\\:ind, ind");
    if (indentation) {
      const firstLine =
        indentation.getAttribute("w:firstLine") ||
        indentation.getAttribute("firstLine");
      const hanging =
        indentation.getAttribute("w:hanging") ||
        indentation.getAttribute("hanging");
      const left =
        indentation.getAttribute("w:left") || indentation.getAttribute("left");
      const right =
        indentation.getAttribute("w:right") ||
        indentation.getAttribute("right");

      if (firstLine) {
        // 首行缩进，单位是缇（twips）
        attrs.textIndent = `${parseInt(firstLine) / 20}pt`;
      } else if (hanging) {
        // 悬挂缩进
        attrs.textIndent = `-${parseInt(hanging) / 20}pt`;
      }

      if (left) {
        attrs.marginLeft = `${parseInt(left) / 20}pt`;
      }

      if (right) {
        attrs.marginRight = `${parseInt(right) / 20}pt`;
      }
    }

    return attrs;
  }

  private extractMarksFromRunProps(runProps: Element | null): TiptapMark[] {
    if (!runProps) return [];

    const marks: TiptapMark[] = [];

    // 粗体
    if (runProps.querySelector("w\\:b, b")) {
      marks.push({ type: "bold" });
    }

    // 斜体
    if (runProps.querySelector("w\\:i, i")) {
      marks.push({ type: "italic" });
    }

    // 下划线
    if (runProps.querySelector("w\\:u, u")) {
      marks.push({ type: "underline" });
    }

    // 删除线
    if (runProps.querySelector("w\\:strike, strike")) {
      marks.push({ type: "strike" });
    }

    // 字体颜色
    const colorEl = runProps.querySelector("w\\:color, color");
    if (colorEl) {
      const color =
        colorEl.getAttribute("w:val") || colorEl.getAttribute("val");
      if (color && color !== "auto") {
        marks.push({
          type: "textStyle",
          attrs: { color: `#${color}` },
        });
      }
    }

    // 字体大小
    const sizeEl = runProps.querySelector("w\\:sz, sz");
    if (sizeEl) {
      const size = sizeEl.getAttribute("w:val") || sizeEl.getAttribute("val");
      if (size) {
        // Word 中的字体大小是半点单位，需要除以2
        const fontSize = `${parseInt(size) / 2}pt`;
        marks.push({
          type: "textStyle",
          attrs: { fontSize },
        });
      }
    }

    // 字体族
    const fontEl = runProps.querySelector("w\\:rFonts, rFonts");
    if (fontEl) {
      const fontFamily = this.extractFontFamilyByHint(fontEl);
      if (fontFamily) {
        marks.push({
          type: "textStyle",
          attrs: { fontFamily },
        });
      }
    }

    return marks;
  }

  /**
   * 将 Tiptap JSON 转换为 Word XML
   * @param tiptapDoc - Tiptap 文档
   * @returns Word XML 字符串
   */
  convertTiptapJsonToWordXml(tiptapDoc: TiptapDocument): string {
    try {
      Console.debug("开始将 Tiptap JSON 转换为 Word XML");
      Console.debug("Tiptap 文档结构:", tiptapDoc);
      Console.debug("内容节点数量:", tiptapDoc.content?.length);
      Console.debug("批注数量:", tiptapDoc.comments?.length || 0);

      // 调试每个节点的类型
      tiptapDoc.content?.forEach((node, index) => {
        Console.debug(
          `节点 ${index}: 类型=${node.type}, 内容=${
            node.content?.length || 0
          }个子节点`
        );
      });

      // 注意：批注数据将通过单独的comments.xml文件处理，不在文档内容中添加范围标记
      if (tiptapDoc.comments && tiptapDoc.comments.length > 0) {
        Console.debug("文档包含批注数据，将通过comments.xml文件处理，批注数量:", tiptapDoc.comments.length);
      }

      const paragraphs = tiptapDoc.content
        .map((node) => this.convertTiptapNodeToWordXml(node))
        .filter(Boolean);

      Console.debug("转换后的段落数量:", paragraphs.length);

      // 只返回body内容，不包含document标签
      const wordXml = paragraphs.join("\n");

      Console.debug("Tiptap JSON 转换为 Word XML 完成");
      Console.debug("生成的Word XML内容:", wordXml.substring(0, 500) + "...");

      return wordXml;
    } catch (error) {
      Console.error("Tiptap JSON 转换为 Word XML 时发生错误:", error);
      throw error;
    }
  }

  /**
   * 将 Tiptap 节点转换为 Word XML
   * @param node - Tiptap 节点
   * @returns Word XML 字符串
   */
  private convertTiptapNodeToWordXml(node: TiptapNode): string {
    Console.debug(`转换节点类型: ${node.type}`);

    switch (node.type) {
      case "paragraph":
        return this.convertParagraphNodeToWordXml(node);
      case "heading":
        return this.convertHeadingNodeToWordXml(node);
      case "listItem":
        return this.convertListItemNodeToWordXml(node);
      case "bulletList":
        return this.convertBulletListNodeToWordXml(node);
      case "orderedList":
        return this.convertOrderedListNodeToWordXml(node);
      case "table":
        return this.convertTableNodeToWordXml(node);
      case "tableRow":
        return this.convertTableRowNodeToWordXml(node);
      case "tableCell":
        return this.convertTableCellNodeToWordXml(node);
      default:
        Console.debug(`未知节点类型: ${node.type}, 转换为段落`);
        // 未知节点类型，转换为段落
        return this.convertParagraphNodeToWordXml(node);
    }
  }

  /**
   * 将段落节点转换为 Word XML
   */
  private convertParagraphNodeToWordXml(node: TiptapNode): string {
    const runs = (node.content || [])
      .map((child) => this.convertTextNodeToWordRun(child))
      .filter(Boolean);

    // 处理段落属性
    const paragraphProps = this.convertParagraphAttrsToWordProps(
      node.attrs || {}
    );

    return `<w:p>
      <w:pPr>${paragraphProps}</w:pPr>
      ${runs.join("\n      ")}
    </w:p>`;
  }

  /**
   * 将标题节点转换为 Word XML
   */
  private convertHeadingNodeToWordXml(node: TiptapNode): string {
    const level = node.attrs?.level || 1;
    const runs = (node.content || [])
      .map((child) => this.convertTextNodeToWordRun(child))
      .filter(Boolean);

    return `<w:p>
      <w:pPr>
        <w:pStyle w:val="Heading${level}"/>
      </w:pPr>
      ${runs.join("\n      ")}
    </w:p>`;
  }

  /**
   * 将列表项节点转换为 Word XML
   */
  private convertListItemNodeToWordXml(
    node: TiptapNode,
    listType: "bullet" | "ordered" = "bullet"
  ): string {
    // 简化处理，将列表项转换为段落
    const paragraphContent = node.content?.[0];
    if (paragraphContent && paragraphContent.type === "paragraph") {
      const runs = (paragraphContent.content || [])
        .map((child) => this.convertTextNodeToWordRun(child))
        .filter(Boolean);

      // 根据列表类型选择不同的numId
      // numId=1: 有序列表（数字编号）
      // numId=2: 无序列表（项目符号）
      const numId = listType === "ordered" ? "1" : "2";

      return `<w:p>
        <w:pPr>
          <w:keepNext w:val="0"/>
          <w:keepLines w:val="0"/>
          <w:pageBreakBefore w:val="0"/>
          <w:widowControl w:val="0"/>
          <w:numPr>
            <w:ilvl w:val="0"/>
            <w:numId w:val="${numId}"/>
          </w:numPr>
          <w:kinsoku/>
          <w:wordWrap/>
          <w:overflowPunct/>
          <w:topLinePunct w:val="0"/>
          <w:autoSpaceDE/>
          <w:autoSpaceDN/>
          <w:bidi w:val="0"/>
          <w:adjustRightInd/>
          <w:snapToGrid/>
          <w:spacing w:line="240" w:lineRule="auto"/>
          <w:ind w:left="425" w:leftChars="0" w:right="0" w:rightChars="0" w:hanging="425" w:firstLineChars="0"/>
          <w:jc w:val="both"/>
          <w:textAlignment w:val="auto"/>
          <w:rPr>
            <w:rFonts w:hint="eastAsia" w:eastAsia="楷体_GB2312" w:cs="楷体_GB2312"/>
            <w:sz w:val="32"/>
            <w:lang w:eastAsia="zh-CN"/>
          </w:rPr>
        </w:pPr>
        ${runs.join("\n        ")}
      </w:p>`;
    }

    return "";
  }

  /**
   * 将文本节点转换为 Word 运行
   */
  private convertTextNodeToWordRun(node: TiptapNode): string {
    if (node.type !== "text" || !node.text) {
      return "";
    }

    const runProps = this.convertMarksToWordRunProps(node.marks || []);
    const escapedText = this.escapeXmlText(node.text);

    return `<w:r>
      ${runProps}
      <w:t>${escapedText}</w:t>
    </w:r>`;
  }

  /**
   * 将 Tiptap 标记转换为 Word 运行属性
   */
  private convertMarksToWordRunProps(marks: TiptapMark[]): string {
    const props: string[] = [];

    // 默认字体设置，确保中文字体正确显示
    let hasCustomFont = false;

    marks.forEach((mark) => {
      switch (mark.type) {
        case "bold":
          props.push("<w:b/>");
          break;
        case "italic":
          props.push("<w:i/>");
          break;
        case "underline":
          props.push('<w:u w:val="single"/>');
          break;
        case "strike":
          props.push("<w:strike/>");
          break;
        case "textStyle":
          if (mark.attrs?.color) {
            const color = mark.attrs.color.replace("#", "");
            props.push(`<w:color w:val="${color}"/>`);
          }
          if (mark.attrs?.fontSize) {
            const size = parseInt(mark.attrs.fontSize) * 2; // 转换为半点单位
            props.push(`<w:sz w:val="${size}"/>`);
          }
          if (mark.attrs?.fontFamily) {
            hasCustomFont = true;
            props.push(
              `<w:rFonts w:ascii="${mark.attrs.fontFamily}" w:eastAsia="${mark.attrs.fontFamily}" w:hAnsi="${mark.attrs.fontFamily}" w:cs="${mark.attrs.fontFamily}"/>`
            );
          }
          break;
      }
    });

    // 如果没有自定义字体，添加默认字体设置
    if (!hasCustomFont) {
      props.push(
        `<w:rFonts w:ascii="Times New Roman" w:eastAsia="宋体" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>`
      );
    }

    return `<w:rPr>${props.join("")}</w:rPr>`;
  }

  /**
   * 转义 XML 文本
   */
  private escapeXmlText(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  /**
   * 将无序列表节点转换为 Word XML
   */
  private convertBulletListNodeToWordXml(node: TiptapNode): string {
    Console.debug("转换无序列表节点");

    if (!node.content || node.content.length === 0) {
      return "";
    }

    // 处理列表中的每个列表项
    const listItems = node.content
      .map((listItem) => {
        if (listItem.type === "listItem") {
          return this.convertListItemNodeToWordXml(listItem, "bullet");
        }
        return "";
      })
      .filter(Boolean);

    return listItems.join("\n");
  }

  /**
   * 将 Tiptap 段落属性转换为 Word 段落属性
   */
  private convertParagraphAttrsToWordProps(attrs: Record<string, any>): string {
    const props: string[] = [];

    // 处理文本对齐
    if (attrs.textAlign) {
      const alignment = this.mapTextAlignToWordAlign(attrs.textAlign);
      if (alignment) {
        props.push(`<w:jc w:val="${alignment}"/>`);
      }
    }

    // 处理缩进
    if (attrs.indent) {
      const indentValue = parseInt(attrs.indent) * 720; // 转换为twips (1/20 point)
      props.push(`<w:ind w:left="${indentValue}"/>`);
    }

    // 处理行间距
    if (attrs.lineHeight) {
      const lineSpacing = parseFloat(attrs.lineHeight) * 240; // 转换为twips
      props.push(`<w:spacing w:line="${lineSpacing}" w:lineRule="auto"/>`);
    }

    return props.join("");
  }

  /**
   * 映射 Tiptap 文本对齐到 Word 对齐
   */
  private mapTextAlignToWordAlign(textAlign: string): string | null {
    const alignmentMap: Record<string, string> = {
      left: "left",
      center: "center",
      right: "right",
      justify: "both",
    };

    return alignmentMap[textAlign] || null;
  }

  /**
   * 将有序列表节点转换为 Word XML
   */
  private convertOrderedListNodeToWordXml(node: TiptapNode): string {
    Console.debug("转换有序列表节点");

    if (!node.content || node.content.length === 0) {
      return "";
    }

    // 处理列表中的每个列表项
    const listItems = node.content
      .map((listItem) => {
        if (listItem.type === "listItem") {
          return this.convertListItemNodeToWordXml(listItem, "ordered");
        }
        return "";
      })
      .filter(Boolean);

    return listItems.join("\n");
  }

  /**
   * 根据 w:hint 属性提取正确的字体族
   * @param fontElement w:rFonts 元素
   * @returns 字体族名称
   */
  private extractFontFamilyByHint(fontElement: Element): string | null {
    const hint =
      fontElement.getAttribute("w:hint") || fontElement.getAttribute("hint");

    // 根据 hint 值选择对应的字体属性
    let fontFamily: string | null = null;

    switch (hint) {
      case "eastAsia":
        // 东亚字体（中文、日文、韩文）
        // 在很多文档中仅设置了 w:cs（复杂脚本），而没有显式的 w:eastAsia。
        // 当 hint 指向 eastAsia 时，应优先尝试 eastAsia，其次回退到 cs，最后再到 hAnsi/ascii。
        fontFamily =
          fontElement.getAttribute("w:eastAsia") ||
          fontElement.getAttribute("eastAsia") ||
          fontElement.getAttribute("w:cs") ||
          fontElement.getAttribute("cs") ||
          fontElement.getAttribute("w:hAnsi") ||
          fontElement.getAttribute("hAnsi") ||
          fontElement.getAttribute("w:ascii") ||
          fontElement.getAttribute("ascii");
        break;
      case "cs":
        // 复杂脚本字体（阿拉伯文、希伯来文等）
        fontFamily =
          fontElement.getAttribute("w:cs") ||
          fontElement.getAttribute("cs") ||
          fontElement.getAttribute("w:eastAsia") ||
          fontElement.getAttribute("eastAsia") ||
          fontElement.getAttribute("w:hAnsi") ||
          fontElement.getAttribute("hAnsi") ||
          fontElement.getAttribute("w:ascii") ||
          fontElement.getAttribute("ascii");
        break;
      case "default":
      default:
        // 默认情况下，为了更好地支持中文等东亚文字，优先 eastAsia，其次 cs，再到 hAnsi/ascii
        fontFamily =
          fontElement.getAttribute("w:eastAsia") ||
          fontElement.getAttribute("eastAsia") ||
          fontElement.getAttribute("w:cs") ||
          fontElement.getAttribute("cs") ||
          fontElement.getAttribute("w:hAnsi") ||
          fontElement.getAttribute("hAnsi") ||
          fontElement.getAttribute("w:ascii") ||
          fontElement.getAttribute("ascii");
        break;
    }

    // 如果根据 hint 没有找到字体，则按优先级顺序查找
    if (!fontFamily) {
      fontFamily =
        fontElement.getAttribute("w:eastAsia") ||
        fontElement.getAttribute("eastAsia") ||
        fontElement.getAttribute("w:cs") ||
        fontElement.getAttribute("cs") ||
        fontElement.getAttribute("w:hAnsi") ||
        fontElement.getAttribute("hAnsi") ||
        fontElement.getAttribute("w:ascii") ||
        fontElement.getAttribute("ascii");
    }

    return fontFamily;
  }

  /**
   * 根据 numPr 确定列表类型
   * @param numPr - w:numPr 元素
   * @returns 列表类型
   */
  private determineListType(numPr: Element): "bulletList" | "orderedList" {
    // 优先根据解析得到的映射判断列表类型
    const numIdStr =
      numPr.querySelector("w\\:numId, numId")?.getAttribute("w:val") ||
      numPr.querySelector("w\\:numId, numId")?.getAttribute("val");

    if (numIdStr) {
      const numIdValue = parseInt(numIdStr, 10);
      const mapped = this.numberingTypeMap[numIdValue];
      if (mapped) return mapped;

      // 回退逻辑：常见的硬编码约定
      if (numIdValue === 1) return "orderedList";
      if (numIdValue === 2) return "bulletList";
    }

    // 最终回退：按有序列表处理
    return "orderedList";
  }

  
  /**
   * 将Word表格转换为Tiptap表格节点
   */
  private convertWordTableToTiptapNode(tableElement: Element): TiptapNode | null {
    Console.debug("转换Word表格到Tiptap节点");
    
    const rows = tableElement.querySelectorAll("w\\:tr, tr");
    const tableRows: TiptapNode[] = [];
    
    rows.forEach((row) => {
      const cells = row.querySelectorAll("w\\:tc, tc");
      const tableCells: TiptapNode[] = [];
      
      cells.forEach((cell) => {
        const paragraphs = cell.querySelectorAll("w\\:p, p");
        const cellContent: TiptapNode[] = [];
        
        paragraphs.forEach((paragraph) => {
          const paragraphNode = this.convertParagraphToTiptapNode(paragraph);
          if (paragraphNode) {
            cellContent.push(paragraphNode);
          }
        });
        
        // 如果单元格没有内容，添加一个空段落
        if (cellContent.length === 0) {
          cellContent.push({
            type: "paragraph",
            content: []
          });
        }
        
        tableCells.push({
          type: "tableCell",
          content: cellContent
        });
      });
      
      if (tableCells.length > 0) {
        tableRows.push({
          type: "tableRow",
          content: tableCells
        });
      }
    });
    
    if (tableRows.length === 0) {
      return null;
    }
    
    return {
      type: "table",
      content: tableRows
    };
  }

  /**
   * 将段落转换为列表项
   * @param paragraph - Word 段落元素
   * @returns Tiptap 列表项节点
   */
  private convertParagraphToListItem(paragraph: Element): TiptapNode | null {
    const paragraphProps = paragraph.querySelector("w\\:pPr, pPr");
    const paragraphAttrs = this.extractParagraphAttrs(paragraphProps);

    // 提取段落中的所有文本运行
    const runs = paragraph.querySelectorAll("w\\:r, r");
    const content: TiptapNode[] = [];

    runs.forEach((run) => {
      const textNodes = this.convertRunToTiptapNodes(run);
      content.push(...textNodes);
    });

    return {
      type: "listItem",
      content: [
        {
          type: "paragraph",
          attrs: paragraphAttrs,
          content: content.length > 0 ? content : [{ type: "text", text: " " }],
        },
      ],
    };
  }

  
  /**
   * 将表格节点转换为 Word XML
   */
  private convertTableNodeToWordXml(node: TiptapNode): string {
    Console.debug("转换表格节点");
    
    const rows = (node.content || [])
      .map((child) => this.convertTableRowNodeToWordXml(child))
      .filter(Boolean);

          // 计算列数（从第一行获取）
    const firstRow = node.content?.[0];
    const columnCount = firstRow?.content?.length || 1;
    
    // 计算每列宽度（总宽度5000，平均分配）
    const columnWidth = Math.floor(5000 / columnCount);


    return `<w:tbl>
      <w:tblPr>
        <w:tblStyle w:val="TableGrid"/>
        <w:tblW w:w="5000" w:type="pct"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
          <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
          <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
          <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/>
          <w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        </w:tblBorders>
        <w:tblCellMar>
          <w:top w:w="108" w:type="dxa"/>
          <w:left w:w="108" w:type="dxa"/>
          <w:bottom w:w="108" w:type="dxa"/>
          <w:right w:w="108" w:type="dxa"/>
        </w:tblCellMar>
      </w:tblPr>
      <w:tblGrid>
        ${Array(columnCount).fill(0).map(() => `<w:gridCol w:w="${columnWidth}"/>`).join('\n        ')}
      </w:tblGrid>
      ${rows.join("\n      ")}
    </w:tbl>`;
  }

  /**
   * 将表格行节点转换为 Word XML
   */
  private convertTableRowNodeToWordXml(node: TiptapNode): string {
    Console.debug("转换表格行节点");
    
    const cells = (node.content || [])
      .map((child) => this.convertTableCellNodeToWordXml(child))
      .filter(Boolean);

    return `<w:tr>
      ${cells.join("\n      ")}
    </w:tr>`;
  }

  /**
   * 将表格单元格节点转换为 Word XML
   */
  private convertTableCellNodeToWordXml(node: TiptapNode): string {
    Console.debug("转换表格单元格节点");
    
    const paragraphs = (node.content || [])
      .map((child) => {
        if (child.type === "paragraph") {
          return this.convertParagraphNodeToWordXml(child);
        }
        // 如果不是段落，包装成段落
        return this.convertParagraphNodeToWordXml({
          type: "paragraph",
          content: [child]
        });
      })
      .filter(Boolean);

    // 如果没有内容，创建一个空段落
    const cellContent = paragraphs.length > 0 ? paragraphs.join("\n      ") : 
      `<w:p>
      <w:pPr><w:jc w:val="left"/></w:pPr>
      
    </w:p>`;

    return `<w:tc>
      <w:tcPr>
        <w:tcW w:w="1000" w:type="pct"/>
        <w:vAlign w:val="top"/>
      </w:tcPr>
      ${cellContent}
    </w:tc>`;
  }

  /**
   * 保存Word XML内容到文件用于调试
   */
  private saveWordXmlToFile(wordXml: string): void {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `debug-word-xml-${timestamp}.xml`;

      // 创建一个可下载的文件
      const blob = new Blob([wordXml], { type: "application/xml" });
      const url = URL.createObjectURL(blob);

      // 创建下载链接
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.style.display = "none";

      // 触发下载
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 清理URL对象
      URL.revokeObjectURL(url);

      Console.debug(`Word XML已保存到文件: ${filename}`);
    } catch (error) {
      Console.error("保存Word XML文件时出错:", error);
    }
  }
}
