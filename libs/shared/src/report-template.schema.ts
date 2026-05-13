import { z } from 'zod';

// --- Colour and Style Primitives ---

const ColorSchema = z.string(); // Hex (#FF0000), rgba(), or CSS colour name
const FontSchema = z.object({
  family: z.string().default('Inter'),
  size: z.number().default(12),          // Points
  weight: z.enum(['300', '400', '500', '600', '700', '800']).default('400'),
  style: z.enum(['normal', 'italic']).default('normal'),
  lineHeight: z.number().default(1.5),
  letterSpacing: z.number().default(0),   // em units
  color: ColorSchema.default('#000000'),
});

const PaddingSchema = z.object({
  top: z.number().default(0),
  right: z.number().default(0),
  bottom: z.number().default(0),
  left: z.number().default(0),
});

const BorderSchema = z.object({
  width: z.number().default(0),
  style: z.enum(['solid', 'dashed', 'dotted', 'none']).default('none'),
  color: ColorSchema.default('#000000'),
  radius: z.number().default(0),
});

const BackgroundSchema = z.object({
  type: z.enum(['solid', 'gradient', 'image', 'none']).default('none'),
  color: ColorSchema.optional(),
  gradient: z.object({
    type: z.enum(['linear', 'radial']).default('linear'),
    angle: z.number().default(0),
    stops: z.array(z.object({
      color: ColorSchema,
      position: z.number(),            // 0-100 percentage
    })),
  }).optional(),
  imageUrl: z.string().optional(),       // URL to uploaded asset
  imageSize: z.enum(['cover', 'contain', 'fill', 'auto']).optional(),
  imagePosition: z.string().optional(),  // CSS background-position
  opacity: z.number().min(0).max(1).default(1),
});

// --- Element Types ---

const BaseElementSchema = z.object({
  id: z.string(),
  type: z.string(),
  // Grid positioning (for grid-placed elements)
  gridColumn: z.string().optional(),     // e.g., "1 / 3" or "span 2"
  gridRow: z.string().optional(),
  // Free positioning (for overlay elements)
  position: z.enum(['grid', 'absolute']).default('grid'),
  absoluteX: z.number().optional(),      // mm from left edge of page
  absoluteY: z.number().optional(),      // mm from top edge of page
  width: z.string().optional(),          // CSS width (for absolute elements)
  height: z.string().optional(),         // CSS height (for absolute elements)
  zIndex: z.number().default(0),
  // Common styling
  padding: PaddingSchema.optional(),
  border: BorderSchema.optional(),
  background: BackgroundSchema.optional(),
  opacity: z.number().min(0).max(1).default(1),
  visible: z.boolean().default(true),
  // Conditional visibility based on profile data
  conditionalVisibility: z.object({
    field: z.string(),                   // JSONPath into scored profile, e.g., "domains[0].band"
    operator: z.enum(['equals', 'not_equals', 'in', 'not_in', 'exists']),
    value: z.union([z.string(), z.array(z.string())]),
  }).optional(),
});

// Text element — static or dynamic
const TextElementSchema = BaseElementSchema.extend({
  type: z.literal('text'),
  content: z.string(),                   // Static text OR template expression like {{domain.safety.band}}
  font: FontSchema.optional(),
  textAlign: z.enum(['left', 'center', 'right', 'justify']).default('left'),
});

// CMS Content Block element — pulls from the CMS
const CmsBlockElementSchema = BaseElementSchema.extend({
  type: z.literal('cms_block'),
  sectionKey: z.string(),                // CMS section_key to look up
  domain: z.string().optional(),         // Nullable — resolved from profile at render time if set to '{{current_domain}}'
  dimension: z.string().optional(),
  // The CMS block is resolved at render time by matching against the scored profile's bands
  font: FontSchema.optional(),
  textAlign: z.enum(['left', 'center', 'right', 'justify']).default('left'),
});

// Image element — uploaded asset or URL
const ImageElementSchema = BaseElementSchema.extend({
  type: z.literal('image'),
  src: z.string(),                       // URL to asset (from storage service)
  alt: z.string().default(''),
  objectFit: z.enum(['cover', 'contain', 'fill', 'none']).default('contain'),
});

// Shape element — decorative (rectangles, circles, lines)
const ShapeElementSchema = BaseElementSchema.extend({
  type: z.literal('shape'),
  shapeType: z.enum(['rectangle', 'circle', 'ellipse', 'line', 'divider']),
  fill: ColorSchema.optional(),
  stroke: z.object({
    color: ColorSchema,
    width: z.number(),
  }).optional(),
});

// Chart element — renders a visualisation from profile data
const ChartElementSchema = BaseElementSchema.extend({
  type: z.literal('chart'),
  chartType: z.enum(['radar', 'bar', 'horizontal_bar', 'gauge', 'comparison_bar']),
  dataBinding: z.object({
    source: z.enum(['domains', 'dimensions', 'alignments']),
    // For comparison reports: primary vs secondary profile
    compareProfiles: z.boolean().default(false),
  }),
  colors: z.record(z.string(), ColorSchema).optional(),  // e.g., { safety: '#4A90D9', challenge: '#F5A623' }
  showLabels: z.boolean().default(true),
  showValues: z.boolean().default(false),
});

// Spacer element — vertical spacing
const SpacerElementSchema = BaseElementSchema.extend({
  type: z.literal('spacer'),
  heightMm: z.number().default(10),
});

// Page break
const PageBreakElementSchema = BaseElementSchema.extend({
  type: z.literal('page_break'),
});

const TemplateElementSchema = z.discriminatedUnion('type', [
  TextElementSchema,
  CmsBlockElementSchema,
  ImageElementSchema,
  ShapeElementSchema,
  ChartElementSchema,
  SpacerElementSchema,
  PageBreakElementSchema,
]);

// --- Repeating Section ---
// For domains/dimensions: a section that repeats once per domain or per dimension
const RepeatingSectionSchema = z.object({
  id: z.string(),
  type: z.literal('repeating_section'),
  repeatOver: z.enum(['domains', 'dimensions']),
  // Filter: only repeat over specific domains/dimensions (optional)
  filterTo: z.array(z.string()).optional(),
  elements: z.array(TemplateElementSchema),
  // Grid config for this section
  gridColumns: z.string().default('1fr'),
  gap: z.number().default(4),            // mm
  padding: PaddingSchema.optional(),
  background: BackgroundSchema.optional(),
  pageBreakBefore: z.boolean().default(false),
  pageBreakAfter: z.boolean().default(false),
});

// --- Page Definition ---
const PageSchema = z.object({
  id: z.string(),
  label: z.string(),                     // For editor reference, e.g., "Cover Page", "Safety Domain"
  // Grid layout
  gridColumns: z.string().default('1fr'),   // CSS grid-template-columns
  gridRows: z.string().default('auto'),     // CSS grid-template-rows (can be "auto" for dynamic)
  gap: z.number().default(4),               // mm between grid cells
  // Page-level styling
  background: BackgroundSchema.optional(),
  padding: PaddingSchema.optional(),
  // Page content: mix of elements and repeating sections
  children: z.array(z.union([TemplateElementSchema, RepeatingSectionSchema])),
  // Header/footer for this page (optional — overrides template-level)
  headerOverride: z.string().optional(),     // Element ID to use as header
  footerOverride: z.string().optional(),
});

// --- Header & Footer ---
const HeaderFooterSchema = z.object({
  height: z.number().default(20),           // mm
  elements: z.array(TemplateElementSchema),
  background: BackgroundSchema.optional(),
  // Dynamic tokens: {{page_number}}, {{total_pages}}, {{report_date}}, {{subject_name}}
});

// --- Root Template Definition ---
export const ReportTemplateSchema = z.object({
  id: z.string(),
  reportType: z.string(),                   // From REPORT_TYPES
  name: z.string(),                         // e.g., "Base Report - Standard Template"
  version: z.number().int().min(1),

  // Page setup
  pageSize: z.object({
    width: z.number().default(210),         // mm (A4 default)
    height: z.number().default(297),
  }),
  margins: PaddingSchema.default({ top: 15, right: 15, bottom: 15, left: 15 }),

  // Global styles
  defaultFont: FontSchema.optional(),
  colorPalette: z.record(z.string(), ColorSchema).optional(),  // Named colors for the template

  // Header & Footer (applied to all pages unless overridden)
  header: HeaderFooterSchema.optional(),
  footer: HeaderFooterSchema.optional(),

  // Pages
  pages: z.array(PageSchema).min(1),

  // Global overlay elements (appear on every page — e.g., watermarks, page borders)
  globalOverlays: z.array(TemplateElementSchema).optional(),

  // Metadata
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type ReportTemplate = z.infer<typeof ReportTemplateSchema>;
export type TemplateElement = z.infer<typeof TemplateElementSchema>;
export type PageDefinition = z.infer<typeof PageSchema>;
export type RepeatingSection = z.infer<typeof RepeatingSectionSchema>;
export type HeaderFooter = z.infer<typeof HeaderFooterSchema>;
