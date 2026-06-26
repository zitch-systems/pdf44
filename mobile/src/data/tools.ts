/**
 * PDF44 tool catalog — ported from the design prototype (screens-home.jsx).
 * `route` is the screen a tool opens; `mode` parameterises the Fill/Sign engine.
 */
export type ScreenName =
  | 'edit'
  | 'fillsign'
  | 'scan'
  | 'organize'
  | 'comment'
  | 'compare'
  | 'reqsign'
  | 'tool';

export interface Tool {
  id: string;
  icon: string;
  color: string;
  title: string;
  desc?: string;
  label?: string;
  mode?: 'fill' | 'sign' | 'both';
  isNew?: boolean;
}

export interface ToolGroup {
  cat: string;
  items: Tool[];
}

export const QUICK: Tool[] = [
  {id: 'scan', icon: 'scan', color: 'green', title: 'Scan', label: 'Scan'},
  {id: 'edit', icon: 'edit', color: 'orange', title: 'Edit PDF', label: 'Edit PDF'},
  {id: 'fillpdf', icon: 'text2pdf', color: 'teal', title: 'Fill PDF', label: 'Fill PDF', mode: 'fill'},
  {id: 'signpdf', icon: 'sign', color: 'green', title: 'Sign PDF', label: 'Sign PDF', mode: 'sign'},
  {id: 'merge', icon: 'merge', color: 'red', title: 'Merge', label: 'Merge'},
  {id: 'compress', icon: 'compress', color: 'cyan', title: 'Compress', label: 'Compress'},
];

export const POPULAR: Tool[] = [
  {id: 'merge', icon: 'merge', color: 'red', title: 'Merge PDF', desc: 'Combine files in any order'},
  {id: 'compress', icon: 'compress', color: 'cyan', title: 'Compress PDF', desc: 'Shrink size, keep quality'},
  {id: 'pdf2word', icon: 'pdf2word', color: 'blue', title: 'PDF to Word', desc: 'Export an editable .docx'},
  {id: 'protect', icon: 'protect', color: 'red', title: 'Protect PDF', desc: 'Encrypt with a password'},
  {id: 'epub2pdf', icon: 'ebook', color: 'orange', title: 'EPUB to PDF', desc: 'Convert ebooks', isNew: true},
];

export const ALL: ToolGroup[] = [
  {
    cat: 'Convert',
    items: [
      {id: 'pdf2word', icon: 'pdf2word', color: 'blue', title: 'PDF to Word', desc: 'Editable .docx'},
      {id: 'pdf2jpg', icon: 'pdf2jpg', color: 'indigo', title: 'PDF to JPG', desc: 'High-res images'},
      {id: 'jpg2pdf', icon: 'jpg2pdf', color: 'pink', title: 'Image to PDF', desc: 'Combine photos'},
      {id: 'scan', icon: 'scan', color: 'green', title: 'Scan to PDF', desc: 'Use your camera'},
      {id: 'epub2pdf', icon: 'ebook', color: 'orange', title: 'EPUB to PDF', desc: 'Convert ebooks', isNew: true},
      {id: 'pdf2excel', icon: 'pdf2excel', color: 'green', title: 'PDF to Excel', desc: 'Extract tables'},
    ],
  },
  {
    cat: 'Edit & sign',
    items: [
      {id: 'edit', icon: 'edit', color: 'orange', title: 'Edit PDF', desc: 'Text, draw, shapes'},
      {id: 'fillpdf', icon: 'text2pdf', color: 'teal', title: 'Fill PDF', desc: 'Type into form fields', mode: 'fill'},
      {id: 'signpdf', icon: 'sign', color: 'green', title: 'Sign PDF', desc: 'Add your signature', mode: 'sign'},
      {id: 'fillsign', icon: 'sign', color: 'blue', title: 'Fill & Sign', desc: 'Forms & signatures', mode: 'both'},
      {id: 'watermark', icon: 'watermark', color: 'cyan', title: 'Watermark', desc: 'Stamp every page'},
      {id: 'pagenumber', icon: 'pagenumber', color: 'indigo', title: 'Page Numbers', desc: 'Any position'},
    ],
  },
  {
    cat: 'Review & sign',
    items: [
      {id: 'comment', icon: 'edit', color: 'yellow', title: 'Comment', desc: 'Highlight, note, markup'},
      {id: 'fillpdf', icon: 'text2pdf', color: 'teal', title: 'Fill PDF', desc: 'Type into form fields', mode: 'fill'},
      {id: 'signpdf', icon: 'sign', color: 'green', title: 'Sign PDF', desc: 'Add your signature', mode: 'sign'},
      {id: 'reqsign', icon: 'contact', color: 'purple', title: 'Request signatures', desc: 'Send out to be signed'},
      {id: 'compare', icon: 'compare', color: 'teal', title: 'Compare files', desc: 'Spot every change'},
    ],
  },
  {
    cat: 'Organize',
    items: [
      {id: 'organize', icon: 'organize', color: 'yellow', title: 'Organize', desc: 'Reorder, rotate, delete'},
      {id: 'merge', icon: 'merge', color: 'red', title: 'Merge', desc: 'Combine PDFs'},
      {id: 'split', icon: 'split', color: 'orange', title: 'Split', desc: 'Separate pages'},
      {id: 'extract', icon: 'extract', color: 'teal', title: 'Extract', desc: 'Pull out pages'},
      {id: 'crop', icon: 'crop', color: 'indigo', title: 'Crop', desc: 'Trim page margins'},
      {id: 'rotate', icon: 'rotate', color: 'green', title: 'Rotate', desc: 'Turn pages'},
    ],
  },
  {
    cat: 'Optimize & secure',
    items: [
      {id: 'compress', icon: 'compress', color: 'cyan', title: 'Compress', desc: 'Reduce file size'},
      {id: 'protect', icon: 'protect', color: 'red', title: 'Protect', desc: 'Password encrypt'},
      {id: 'unlock', icon: 'unlock', color: 'green', title: 'Unlock', desc: 'Remove password'},
      {id: 'redact', icon: 'redact', color: 'slate', title: 'Redact', desc: 'Black out text'},
      {id: 'ocr', icon: 'pdf2text', color: 'blue', title: 'Recognize text (OCR)', desc: 'Make scans searchable'},
      {id: 'flatten', icon: 'flatten', color: 'slate', title: 'Flatten', desc: 'Lock annotations'},
    ],
  },
];

export const FLAT_TOOLS: Tool[] = ALL.reduce<Tool[]>((a, g) => a.concat(g.items), []);

export const TOOL_CATEGORIES = ['All', ...ALL.map(g => g.cat)];

export function routeFor(id: string): ScreenName {
  if (id === 'edit' || id === 'annotate') return 'edit';
  if (id === 'fillsign' || id === 'sign' || id === 'fillpdf' || id === 'signpdf') return 'fillsign';
  if (id === 'scan') return 'scan';
  if (id === 'organize') return 'organize';
  if (id === 'comment') return 'comment';
  if (id === 'compare') return 'compare';
  if (id === 'reqsign') return 'reqsign';
  return 'tool';
}
