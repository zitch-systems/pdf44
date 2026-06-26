import React from 'react';
import {View, BackHandler, StyleSheet} from 'react-native';
import {useTheme} from 'react-native-paper';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {AppTheme} from './theme/theme';
import {useApp} from './state/store';
import {NavBar, ScanFab} from './components/NavBar';
import {SnackbarHost} from './components/Snackbar';

import Onboarding from './screens/Onboarding';
import Home from './screens/Home';
import AllTools from './screens/AllTools';
import Search from './screens/Search';
import Files from './screens/Files';
import Settings from './screens/Settings';
import Viewer from './screens/Viewer';
import EditPdf from './screens/EditPdf';
import FillSign from './screens/FillSign';
import Scan from './screens/Scan';
import ToolFlow from './screens/ToolFlow';
import Organize from './screens/Organize';
import Comment from './screens/Comment';
import Compare from './screens/Compare';
import RequestSign from './screens/RequestSign';

const SCREENS: Record<string, React.ComponentType<any>> = {
  home: Home,
  tools: AllTools,
  files: Files,
  settings: Settings,
  search: Search,
  viewer: Viewer,
  edit: EditPdf,
  fillsign: FillSign,
  scan: Scan,
  tool: ToolFlow,
  organize: Organize,
  comment: Comment,
  compare: Compare,
  reqsign: RequestSign,
};

// Screens that take over the whole surface (no tab bar / FAB).
const FULLSCREEN = new Set(['scan', 'edit']);

export default function AppShell() {
  const t = useTheme() as AppTheme;
  const {state, screen, navTab, back, go} = useApp();
  const insets = useSafeAreaInsets();

  // Hardware back button pops the stack; at a tab root it goes Home (or exits).
  React.useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (state.stack.length > 0) {
        back();
        return true;
      }
      if (state.tab !== 'home') {
        navTab('home');
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [state.stack.length, state.tab, back, navTab]);

  if (!state.onboarded) {
    return (
      <SafeAreaView style={{flex: 1, backgroundColor: t.pdf44.bg}}>
        <Onboarding />
      </SafeAreaView>
    );
  }

  const Current = SCREENS[screen] || Home;
  const full = FULLSCREEN.has(screen);
  const atRoot = state.stack.length === 0;
  const showChrome = atRoot && !full;
  const showFab = showChrome && state.navStyle === 'fab' && state.tab !== 'settings';

  return (
    <View style={{flex: 1, backgroundColor: full ? '#0a0a0f' : t.pdf44.bg}}>
      <SafeAreaView style={{flex: 1}} edges={full ? ['top'] : ['top']}>
        <View style={{flex: 1}}>
          <Current />
        </View>
      </SafeAreaView>

      {showFab && <ScanFab extended={state.tab === 'files'} onPress={() => go('scan')} />}

      {showChrome && (
        <View style={{paddingBottom: insets.bottom, backgroundColor: t.pdf44.bg2}}>
          <NavBar tab={state.tab} navStyle={state.navStyle} onTab={navTab} onScan={() => go('scan')} />
        </View>
      )}

      <SnackbarHost bottomOffset={showChrome ? 84 + insets.bottom : 24 + insets.bottom} />
    </View>
  );
}

export const shellStyles = StyleSheet.create({});
