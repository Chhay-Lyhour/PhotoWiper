import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
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
  // Cloud sync removed — the app is fully local-first (SQLite). Stats/sessions
  // never leave the device, so there's no device registration on startup.
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}
