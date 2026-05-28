import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import { registerDevice } from './src/services/syncService';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';

function AppInner() {
  const { isDark } = useTheme();
  return (
    <>
      <AppNavigator />
      {/* StatusBar style flips with theme so the iOS clock/time stays legible. */}
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
  );
}

export default function App() {
  useEffect(() => {
    // Fire-and-forget — fails silently if the server is unreachable.
    registerDevice();
  }, []);

  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}
