import type { ReportTemplate, TemplateElement, PageDefinition, RepeatingSection, HeaderFooter } from '@dimensional/shared';
import sanitizeHtml from 'sanitize-html';
import type { ScoredProfilePayload } from '../../../scoring/scoring.types';
import type { CmsContentBlock } from '../cms/cms.schema';
import { ChartSvgGenerator, type IChartSvgGenerator } from './chart-svg.generator';

export interface RenderParams {
  template: ReportTemplate;
  profile?: ScoredProfilePayload;
  secondaryProfile?: ScoredProfilePayload;
  teamProfiles?: ScoredProfilePayload[];
  longitudinalProfiles?: ScoredProfilePayload[];
  cmsBlocks: CmsContentBlock[];
  subjectName: string;
  reportDate: string;
  current_domain?: string;
  current_dimension?: string;
  current_item?: any;
}

export interface IHtmlTemplateRenderer {
  render(params: RenderParams): string;
}

export class HtmlTemplateRenderer implements IHtmlTemplateRenderer {
  private chartGenerator: IChartSvgGenerator = new ChartSvgGenerator();

  render(params: RenderParams): string {
    const { template, subjectName, reportDate } = params;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      size: ${template.pageSize.width}mm ${template.pageSize.height}mm;
      margin: 0;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: ${template.defaultFont?.family || 'Inter'}, sans-serif;
      font-size: ${template.defaultFont?.size || 12}pt;
      line-height: ${template.defaultFont?.lineHeight || 1.5};
      color: ${template.defaultFont?.color || '#000000'};
    }
    .page {
      width: ${template.pageSize.width}mm;
      height: ${template.pageSize.height}mm;
      position: relative;
      overflow: hidden;
      page-break-after: always;
      background-color: white;
    }
    .page-content {
      display: grid;
      position: absolute;
      top: ${template.margins.top}mm;
      left: ${template.margins.left}mm;
      right: ${template.margins.right}mm;
      bottom: ${template.margins.bottom}mm;
    }
    ${this.generateGlobalStyles(template)}
  </style>
</head>
<body>
  ${template.pages.map((page, index) => this.renderPage(page, index, params)).join('')}
</body>
</html>
`;
    return html;
  }

  private renderPage(page: PageDefinition, pageIndex: number, params: RenderParams): string {
    const { template } = params;
    return `
<div class="page" id="page-${page.id}" style="${this.getBackgroundStyle(page.background)}">
  <div class="page-content" style="
    grid-template-columns: ${page.gridColumns};
    grid-template-rows: ${page.gridRows};
    gap: ${page.gap}mm;
    padding: ${this.getPaddingStyle(page.padding)};
  ">
    ${page.children.map(child => this.renderChild(child, params)).join('')}
  </div>
  ${this.renderHeaderFooter(template.header, 'header', params)}
  ${this.renderHeaderFooter(template.footer, 'footer', params)}
</div>
`;
  }

  private renderChild(child: TemplateElement | RepeatingSection, params: RenderParams): string {
    if (child.type === 'repeating_section') {
      return this.renderRepeatingSection(child as RepeatingSection, params);
    }
    return this.renderElement(child as TemplateElement, params);
  }

  private renderElement(element: TemplateElement, params: RenderParams): string {
    if (!this.checkVisibility(element, params)) return '';

    const style = `
      ${element.position === 'absolute' ? `
        position: absolute;
        left: ${element.absoluteX}mm;
        top: ${element.absoluteY}mm;
        width: ${element.width};
        height: ${element.height};
        z-index: ${element.zIndex};
      ` : `
        grid-column: ${element.gridColumn || 'auto'};
        grid-row: ${element.gridRow || 'auto'};
      `}
      padding: ${this.getPaddingStyle(element.padding)};
      border: ${this.getBorderStyle(element.border)};
      ${this.getBackgroundStyle(element.background)}
      opacity: ${element.opacity};
    `;

    switch (element.type) {
      case 'text':
        return `<div class="element-text" style="${style} ${this.getFontStyle(element.font)} text-align: ${element.textAlign};">
          ${this.resolveTokens(element.content, params)}
        </div>`;
      case 'cms_block':
        return `<div class="element-cms" style="${style} ${this.getFontStyle(element.font)} text-align: ${element.textAlign};">
          ${this.renderCmsBlock(element, params)}
        </div>`;
      case 'image':
        return `<div class="element-image" style="${style}">
          <img src="${element.src}" alt="${element.alt}" style="width: 100%; height: 100%; object-fit: ${element.objectFit};">
        </div>`;
      case 'spacer':
        return `<div class="element-spacer" style="${style} height: ${element.heightMm}mm;"></div>`;
      case 'page_break':
        return `<div style="page-break-after: always;"></div>`;
      case 'chart':
        return `<div class="element-chart" style="${style}">
          ${this.renderChart(element, params)}
        </div>`;
      case 'shape':
        return `<div class="element-shape" style="${style}"></div>`; // Placeholder for shape
      default:
        return '';
    }
  }

  private renderRepeatingSection(section: RepeatingSection, params: RenderParams): string {
    let items: any[] = [];
    if (section.repeatOver === 'domains') {
      items = params.profile?.domains || [];
    } else if (section.repeatOver === 'dimensions') {
      items = params.profile?.dimensions || [];
    }

    const filteredItems = section.filterTo ? items.filter((i: any) => section.filterTo?.includes(i.domain || i.dimension)) : items;

    return filteredItems.map((item: any) => {
      const itemParams: RenderParams = { ...params, current_domain: item.domain, current_dimension: item.dimension, current_item: item };
      return `
<div class="repeating-section" style="
  display: grid;
  grid-template-columns: ${section.gridColumns};
  gap: ${section.gap}mm;
  padding: ${this.getPaddingStyle(section.padding)};
  ${this.getBackgroundStyle(section.background)}
  ${section.pageBreakBefore ? 'page-break-before: always;' : ''}
  ${section.pageBreakAfter ? 'page-break-after: always;' : ''}
">
  ${section.elements.map(el => this.renderElement(el, itemParams)).join('')}
</div>
`;
    }).join('');
  }

  private renderCmsBlock(element: Extract<TemplateElement, { type: 'cms_block' }>, params: RenderParams): string {
    const domain = element.domain === '{{current_domain}}' ? params.current_domain : element.domain;
    const dimension = element.dimension === '{{current_dimension}}' ? params.current_dimension : element.dimension;
    
    // Find matching band from profile
    let band = 'balanced';
    if (params.profile) {
      if (domain && !dimension) {
        band = params.profile.domains.find(d => d.domain === domain)?.band || 'balanced';
      } else if (dimension) {
        band = params.profile.dimensions.find(d => d.dimension === dimension)?.band || 'balanced';
      }
    }

    const block = params.cmsBlocks.find(b => 
      b.sectionKey === element.sectionKey && 
      (domain ? b.domain === domain : true) && 
      (dimension ? b.dimension === dimension : true) &&
      (b.scoreBand === band)
    );

    if (!block) return `[Missing CMS Block: ${element.sectionKey}]`;

    const rawContent = this.resolveTokens(block.contentText, params);
    
    // Sanitise the HTML from CMS (which might contain formatting but shouldn't have scripts/iframes)
    return sanitizeHtml(rawContent, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2', 'span', 'div']),
      allowedAttributes: {
        ...sanitizeHtml.defaults.allowedAttributes,
        '*': ['style', 'class'],
      },
      allowedStyles: {
        '*': {
          'color': [/^#(0x)?[0-9a-f]+$/i, /^rgb\(/],
          'text-align': [/^left$/, /^right$/, /^center$/],
          'font-size': [/^\d+(?:px|em|pt|%)$/],
          'font-weight': [/^\d+$/, /^bold$/, /^normal$/],
        }
      }
    });
  }

  private renderChart(element: Extract<TemplateElement, { type: 'chart' }>, params: RenderParams): string {
    const { chartType, dataBinding, colors: configColors } = element;
    const colors: string[] = configColors ? Object.values(configColors) as string[] : ['#4A90D9', '#F5A623', '#7ED321'];
    
    let labels: string[] = [];
    let values: number[] = [];

    if (dataBinding.source === 'domains' && params.profile) {
      labels = params.profile.domains.map(d => d.domain);
      values = params.profile.domains.map(d => d.rawScore);
    } else if (dataBinding.source === 'dimensions' && params.profile) {
      labels = params.profile.dimensions.map(d => d.dimension);
      values = params.profile.dimensions.map(d => d.rawScore);
    }

    const options = { colors, max: 5 };

    switch (chartType) {
      case 'radar': return this.chartGenerator.renderRadar({ labels, values }, options);
      case 'bar': return this.chartGenerator.renderBar({ labels, values }, options);
      case 'horizontal_bar': return this.chartGenerator.renderHorizontalBar({ labels, values }, options);
      case 'gauge': return this.chartGenerator.renderGauge(values[0] || 0, 5, options);
      default: return '';
    }
  }

  private renderHeaderFooter(config: HeaderFooter | undefined, type: 'header' | 'footer', params: RenderParams): string {
    if (!config) return '';
    const style = `
      position: absolute;
      ${type === 'header' ? 'top: 0;' : 'bottom: 0;'}
      left: 0;
      right: 0;
      height: ${config.height}mm;
      ${this.getBackgroundStyle(config.background)}
    `;
    return `
<div class="${type}" style="${style}">
  ${config.elements.map(el => this.renderElement(el, params)).join('')}
</div>
`;
  }

  private resolveTokens(text: string, params: RenderParams): string {
    return text.replace(/\{\{(.*?)\}\}/g, (match, token) => {
      const path = token.trim().split('.');
      let current: any = params;
      
      // Special tokens
      if (token === 'subject_name') return this.escapeHtml(params.subjectName);
      if (token === 'report_date') return this.escapeHtml(params.reportDate);
      if (token === 'current_domain') return this.escapeHtml(params.current_domain || '');
      
      // Root mapping for profile data
      if (params.profile) {
        if (path[0] === 'domain' || path[0] === 'domains') {
          current = params.profile.domains;
          path.shift();
        } else if (path[0] === 'dimension' || path[0] === 'dimensions') {
          current = params.profile.dimensions;
          path.shift();
        } else if (path[0] === 'alignment' || path[0] === 'alignments') {
          current = params.profile.alignments;
          path.shift();
        }
      }
      
      // Generic path resolution
      for (const key of path) {
        if (current && typeof current === 'object' && key in current) {
          current = current[key];
        } else {
          // Try to find in arrays (e.g. domains.safety.band)
          if (Array.isArray(current)) {
            const found = current.find(i => (i as any).domain === key || (i as any).dimension === key);
            if (found) current = found;
            else return match;
          } else {
            return match;
          }
        }
      }
      return this.escapeHtml(String(current));
    });
  }

  private escapeHtml(unsafe: string): string {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private checkVisibility(element: TemplateElement, params: RenderParams): boolean {
    if (element.visible === false) return false;
    if (!element.conditionalVisibility) return true;
    
    const { field, operator, value } = element.conditionalVisibility;
    const actualValue = this.resolveTokens(`{{${field}}}`, params);

    switch (operator) {
      case 'equals': return actualValue === value;
      case 'not_equals': return actualValue !== value;
      case 'in': return Array.isArray(value) && value.includes(actualValue);
      case 'not_in': return Array.isArray(value) && !value.includes(actualValue);
      case 'exists': return actualValue !== undefined && actualValue !== `{{${field}}}`;
      default: return true;
    }
  }

  private generateGlobalStyles(template: ReportTemplate): string {
    return `
      .element-text { box-sizing: border-box; }
      .element-cms { box-sizing: border-box; }
      .element-image img { display: block; }
    `;
  }

  private getPaddingStyle(p?: any) {
    if (!p) return '0';
    return `${p.top}mm ${p.right}mm ${p.bottom}mm ${p.left}mm`;
  }

  private getBorderStyle(b?: any) {
    if (!b || b.style === 'none') return 'none';
    return `${b.width}pt ${b.style} ${b.color}; border-radius: ${b.radius}pt;`;
  }

  private getBackgroundStyle(b?: any) {
    if (!b || b.type === 'none') return '';
    if (b.type === 'solid') return `background-color: ${b.color}; opacity: ${b.opacity};`;
    return ''; // Add gradient/image logic if needed
  }

  private getFontStyle(f?: Extract<TemplateElement, { type: 'text' }>['font']) {
    if (!f) return '';
    return `
      font-family: ${f.family};
      font-size: ${f.size}pt;
      font-weight: ${f.weight};
      font-style: ${f.style};
      line-height: ${f.lineHeight};
      letter-spacing: ${f.letterSpacing}em;
      color: ${f.color};
    `;
  }
}
