import React, { useMemo } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';

import type { RootStackParamList, MainTabParamList } from '../types';
import { Font, Radius, rw, rh, type ThemePalette } from '../constants/theme';
import { useTheme } from '../theme/ThemeContext';

import SplashScreen from '../screens/SplashScreen';
import PermissionScreen from '../screens/PermissionScreen';
import DeniedScreen from '../screens/DeniedScreen';
import LoadingScreen from '../screens/LoadingScreen';
import ResumeScreen from '../screens/ResumeScreen';
import SwipeScreen from '../screens/SwipeScreen';
import ReviewScreen from '../screens/ReviewScreen';
import DeletingScreen from '../screens/DeletingScreen';
import AllDoneScreen from '../screens/AllDoneScreen';
import DashboardScreen from '../screens/DashboardScreen';
import HistoryScreen from '../screens/HistoryScreen';
import SettingsScreen from '../screens/SettingsScreen';

// ── Tab icons ─────────────────────────────────────────────────────────────
type TabIconProps = { label: string; focused: boolean };
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];
function TabIcon({ label, focused }: TabIconProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const icons: Record<string, { on: IoniconName; off: IoniconName }> = {
    Swipe:    { on: 'albums',       off: 'albums-outline' },
    Stats:    { on: 'stats-chart',  off: 'stats-chart-outline' },
    History:  { on: 'time',         off: 'time-outline' },
    Settings: { on: 'settings',     off: 'settings-outline' },
  };
  const icon = icons[label] ?? { on: 'ellipse', off: 'ellipse-outline' };
  return (
    <View style={[styles.tabIconWrap, focused && styles.tabIconWrapActive]}>
      <Ionicons
        name={focused ? icon.on : icon.off}
        size={Font.lg}
        color={focused ? colors.white : colors.textMuted}
      />
    </View>
  );
}

// ── Bottom Tabs ───────────────────────────────────────────────────────────
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarActiveTintColor: colors.purple3,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarIcon: ({ focused }) => (
          <TabIcon label={route.name} focused={focused} />
        ),
      })}
    >
      <Tab.Screen name="Swipe"    component={SwipeScreen}     options={{ title: 'Swipe' }} />
      <Tab.Screen name="Stats"    component={DashboardScreen} options={{ title: 'Stats' }} />
      <Tab.Screen name="History"  component={HistoryScreen}   options={{ title: 'History' }} />
      <Tab.Screen name="Settings" component={SettingsScreen}  options={{ title: 'Settings' }} />
    </Tab.Navigator>
  );
}

// ── Root Stack ────────────────────────────────────────────────────────────
const Stack = createStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="Splash"
            screenOptions={{ headerShown: false, gestureEnabled: false }}
          >
            <Stack.Screen name="Splash"     component={SplashScreen} />
            <Stack.Screen name="Permission" component={PermissionScreen} />
            <Stack.Screen name="Denied"     component={DeniedScreen} />
            <Stack.Screen name="Loading"    component={LoadingScreen} />
            <Stack.Screen name="Resume"     component={ResumeScreen} />
            <Stack.Screen name="MainTabs"   component={MainTabs} />
            <Stack.Screen
              name="Review"
              component={ReviewScreen}
              options={{ gestureEnabled: true }}
            />
            <Stack.Screen name="Deleting" component={DeletingScreen} />
            <Stack.Screen name="AllDone"  component={AllDoneScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const createStyles = (colors: ThemePalette) => StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    height: rh(84),
    paddingBottom: Platform.OS === 'ios' ? rh(20) : rh(10),
    paddingTop: rh(8),
  },
  tabLabel: {
    fontSize: Font.xs,
    fontWeight: Font.medium,
    marginTop: rh(2),
  },
  tabIconWrap: {
    width: rw(44),
    height: rh(32),
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconWrapActive: {
    backgroundColor: colors.purple3,
  },
});
