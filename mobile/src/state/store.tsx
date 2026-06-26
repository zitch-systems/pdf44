import React, {createContext, useContext, useEffect, useMemo, useReducer, useRef, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {reducer, initialState, currentScreen, currentParams} from './reducer';
import {AppState, Action, NavEntry, TabName, Prefs, FileItem} from './types';

const PREFS_KEY = 'pdf44.prefs.v1';
const FILES_KEY = 'pdf44.files.v1';

interface Store {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  // navigation helpers
  go: (screen: string, params?: any) => void;
  back: () => void;
  navTab: (tab: TabName) => void;
  screen: string;
  params: any;
  // file helpers
  addFile: (f: FileItem) => void;
  updateFile: (id: string, patch: Partial<FileItem>) => void;
  deleteFile: (id: string) => void;
}

const AppContext = createContext<Store | null>(null);

export function AppProvider({children}: {children: React.ReactNode}) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const hydrated = useRef(false);

  // Load persisted prefs + files once.
  useEffect(() => {
    (async () => {
      try {
        const [prefsRaw, filesRaw] = await Promise.all([
          AsyncStorage.getItem(PREFS_KEY),
          AsyncStorage.getItem(FILES_KEY),
        ]);
        const payload: Partial<AppState> = {};
        if (prefsRaw) Object.assign(payload, JSON.parse(prefsRaw) as Prefs);
        if (filesRaw) payload.files = JSON.parse(filesRaw) as FileItem[];
        if (Object.keys(payload).length) dispatch({type: 'hydrate', payload});
      } catch {
        // ignore — fall back to defaults
      } finally {
        hydrated.current = true;
      }
    })();
  }, []);

  // Persist prefs whenever they change.
  useEffect(() => {
    if (!hydrated.current) return;
    const prefs: Prefs = {
      dark: state.dark,
      accent: state.accent,
      toolLayout: state.toolLayout,
      navStyle: state.navStyle,
      onboarded: state.onboarded,
    };
    AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs)).catch(() => {});
  }, [state.dark, state.accent, state.toolLayout, state.navStyle, state.onboarded]);

  // Persist files whenever they change.
  useEffect(() => {
    if (!hydrated.current) return;
    AsyncStorage.setItem(FILES_KEY, JSON.stringify(state.files)).catch(() => {});
  }, [state.files]);

  const value = useMemo<Store>(
    () => ({
      state,
      dispatch,
      screen: currentScreen(state),
      params: currentParams(state),
      go: (screen: string, params?: any) => dispatch({type: 'push', entry: {screen, params} as NavEntry}),
      back: () => dispatch({type: 'pop'}),
      navTab: (tab: TabName) => dispatch({type: 'navTab', tab}),
      addFile: (f: FileItem) => dispatch({type: 'addFile', file: f}),
      updateFile: (id: string, patch: Partial<FileItem>) => dispatch({type: 'updateFile', id, patch}),
      deleteFile: (id: string) => dispatch({type: 'deleteFile', id}),
    }),
    [state],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): Store {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

/* ── Toast / Snackbar context ─────────────────────────────────────────── */
export interface ToastMsg {
  text: string;
  icon?: string;
}
interface ToastStore {
  toast: ToastMsg | null;
  showToast: (text: string, icon?: string) => void;
  hideToast: () => void;
}
const ToastContext = createContext<ToastStore | null>(null);

export function ToastProvider({children}: {children: React.ReactNode}) {
  const [toast, setToast] = useState<ToastMsg | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const value = useMemo<ToastStore>(
    () => ({
      toast,
      showToast: (text: string, icon?: string) => {
        if (timer.current) clearTimeout(timer.current);
        setToast({text, icon});
        timer.current = setTimeout(() => setToast(null), 2600);
      },
      hideToast: () => setToast(null),
    }),
    [toast],
  );
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast(): ToastStore {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
