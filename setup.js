const fs = require('fs');
const path = require('path');

const folders = [
  'src/components/swipe',
  'src/components/dashboard',
  'src/components/common',
  'src/screens',
  'src/navigation',
  'src/store',
  'src/services',
  'src/hooks',
  'src/types',
  'src/utils',
  'src/database',
  'src/constants',
];

const files = [
  // Components
  'src/components/swipe/SwipeCard.tsx',
  'src/components/swipe/CardStack.tsx',
  'src/components/swipe/SwipeOverlay.tsx',
  'src/components/dashboard/WeeklyChart.tsx',
  'src/components/dashboard/SessionHistory.tsx',
  'src/components/dashboard/StatsCard.tsx',
  'src/components/common/ProgressBar.tsx',
  'src/components/common/ActionButton.tsx',
  // Screens — Student A
  'src/screens/SplashScreen.tsx',
  'src/screens/PermissionScreen.tsx',
  'src/screens/DeniedScreen.tsx',
  'src/screens/LoadingScreen.tsx',
  'src/screens/SwipeScreen.tsx',
  'src/screens/ReviewScreen.tsx',
  'src/screens/DeletingScreen.tsx',
  'src/screens/AllDoneScreen.tsx',
  // Screens — Student B
  'src/screens/DashboardScreen.tsx',
  'src/screens/HistoryScreen.tsx',
  'src/screens/SettingsScreen.tsx',
  'src/screens/ResumeScreen.tsx',
  // Navigation
  'src/navigation/AppNavigator.tsx',
  // Store
  'src/store/useStore.ts',
  // Services — Student A
  'src/services/swipeEngine.ts',
  'src/services/mediaLibraryService.ts',
  // Services — Student B
  'src/services/photoQueue.ts',
  'src/services/analyticsService.ts',
  'src/services/databaseService.ts',
  // Database — Student B
  'src/database/schema.ts',
  'src/database/queries.ts',
  // Hooks
  'src/hooks/useSwipeGesture.ts',
  'src/hooks/usePermissions.ts',
  'src/hooks/usePhotoQueue.ts',
  'src/hooks/useAnalytics.ts',
  // Types & Utils — shared
  'src/types/index.ts',
  'src/utils/formatters.ts',
  'src/utils/shuffle.ts',
  'src/utils/dateHelpers.ts',
  // Constants
  'src/constants/theme.ts',
];

folders.forEach(folder => {
  fs.mkdirSync(path.join(__dirname, folder), { recursive: true });
});

files.forEach(file => {
  fs.writeFileSync(path.join(__dirname, file), '');
});

console.log('✅ Project structure created successfully!');