import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import { registerDevice } from './src/services/syncService';

export default function App() {
  useEffect(() => {
    // Fire-and-forget — fails silently if the server is unreachable.
    registerDevice();
  }, []);

  return (
    <>
      <AppNavigator />
      <StatusBar style="light" />
    </>
  );
}
