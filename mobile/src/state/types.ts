import {AccentKey} from '../theme/tokens';

export type TabName = 'home' | 'tools' | 'files' | 'settings';

export interface NavEntry {
  screen: string;
  params?: any;
}

export interface FileItem {
  id: string;
  name: string;
  meta: string;
  accent: string;
  seed: number;
  starred: boolean;
  tags: string[];
  /** Local on-device file uri once produced/imported (null for seed samples). */
  uri?: string | null;
  pages?: number;
}

export interface Prefs {
  dark: boolean;
  accent: AccentKey;
  toolLayout: 'grid' | 'list';
  navStyle: 'fab' | 'bar';
  onboarded: boolean;
}

export interface AppState extends Prefs {
  tab: TabName;
  stack: NavEntry[];
  files: FileItem[];
}

export type Action =
  | {type: 'hydrate'; payload: Partial<AppState>}
  | {type: 'setPref'; key: keyof Prefs; value: any}
  | {type: 'navTab'; tab: TabName}
  | {type: 'push'; entry: NavEntry}
  | {type: 'pop'}
  | {type: 'popToRoot'}
  | {type: 'addFile'; file: FileItem}
  | {type: 'updateFile'; id: string; patch: Partial<FileItem>}
  | {type: 'deleteFile'; id: string}
  | {type: 'setFiles'; files: FileItem[]};
