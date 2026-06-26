/**
 * PDF44 — privacy-first PDF & document toolkit (Android).
 * Recreated from the PDF44 Material 3 design handoff.
 */
import React from 'react';
import {StatusBar} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {PaperProvider} from 'react-native-paper';
import {AppProvider, ToastProvider, useApp} from './src/state/store';
import {buildTheme} from './src/theme/theme';
import AppShell from './src/AppShell';

function Themed() {
  const {state} = useApp();
  const theme = buildTheme(state.dark, state.accent);
  return (
    <PaperProvider theme={theme}>
      <StatusBar
        barStyle={state.dark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />
      <AppShell />
    </PaperProvider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <ToastProvider>
          <Themed />
        </ToastProvider>
      </AppProvider>
    </SafeAreaProvider>
  );
}
