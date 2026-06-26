/**
 * Maps PDF44's named line-icon set to Material Community Icons (bundled with
 * react-native-vector-icons), as the design handoff recommends.
 */
import React from 'react';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const MAP: Record<string, string> = {
  // tool icons
  scan: 'scan-helper',
  edit: 'pencil-outline',
  sign: 'signature-freehand',
  text2pdf: 'form-textbox',
  jpg2pdf: 'image-plus',
  merge: 'call-merge',
  compress: 'arrow-collapse-vertical',
  split: 'call-split',
  extract: 'file-export-outline',
  organize: 'view-grid-outline',
  protect: 'lock-outline',
  unlock: 'lock-open-variant-outline',
  redact: 'marker',
  watermark: 'format-color-fill',
  pagenumber: 'format-list-numbered',
  compare: 'compare-horizontal',
  contact: 'account-multiple-outline',
  ebook: 'book-open-variant',
  pdf2word: 'file-word-outline',
  pdf2jpg: 'file-image-outline',
  pdf2excel: 'file-excel-outline',
  pdf2text: 'text-recognition',
  crop: 'crop',
  rotate: 'rotate-right',
  flatten: 'layers-outline',
  install: 'export-variant',
  history: 'history',
  shield_check: 'shield-check-outline',
  // ui icons
  eye: 'eye-outline',
  star: 'star-outline',
  'star-filled': 'star',
  trash: 'trash-can-outline',
  cmd: 'magnify',
  search: 'magnify',
  back: 'arrow-left',
  close: 'close',
  plus: 'plus',
  check: 'check',
  share: 'export-variant',
  home: 'home-variant-outline',
  tools: 'apps',
  files: 'folder-outline',
  settings: 'cog-outline',
  flash: 'flash-outline',
  undo: 'undo-variant',
  redo: 'redo-variant',
  duplicate: 'content-duplicate',
  forward: 'arrange-bring-forward',
  layers: 'layers-triple-outline',
  draw: 'draw',
  shape: 'shape-outline',
  highlight: 'format-color-highlight',
  image: 'image-outline',
  stamp: 'stamper',
  erase: 'eraser',
  select: 'cursor-default-outline',
  text: 'format-text',
  note: 'note-outline',
  underline: 'format-underline',
  strike: 'format-strikethrough',
  bold: 'format-bold',
  italic: 'format-italic',
  'align-left': 'format-align-left',
  'align-center': 'format-align-center',
  'align-right': 'format-align-right',
  thumbnails: 'view-grid-outline',
  reading: 'book-open-page-variant-outline',
  page: 'file-document-outline',
  comment: 'comment-outline',
  swap: 'swap-vertical',
  gallery: 'image-multiple-outline',
};

export interface IconProps {
  name: string;
  size?: number;
  color?: string;
  style?: any;
}

export default function Icon({name, size = 24, color = '#fff', style}: IconProps) {
  const mci = MAP[name] || name;
  return <MaterialCommunityIcons name={mci} size={size} color={color} style={style} />;
}

export function mapIcon(name: string): string {
  return MAP[name] || name;
}
