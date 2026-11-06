import React from 'react';
import { LayoutAnimation, Platform, UIManager, View } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../context/ThemeContext';
import { MaskedTabBar } from '../../components/ui/masked-tab-bar';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const ELEV_TABS = [
  { value: 'index', label: 'Início', icon: 'home' },
  { value: 'leads', label: 'Leads', icon: 'people' },
  { value: 'properties', label: 'Imóveis', icon: 'business' },
  { value: 'finance', label: 'Financeiro', icon: 'wallet' },
  { value: 'settings', label: 'Ajustes', icon: 'settings' },
] as const;

type BottomTabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];

function ElevatioMaskedTabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();

  const currentRouteName = state.routes[state.index]?.name || 'index';

  const handleValueChange = (nextRouteName: string) => {
    const route = state.routes.find((r) => r.name === nextRouteName);
    if (!route) return;

    const event = emitter.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });

    if (currentRouteName !== nextRouteName && !event.defaultPrevented) {
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
      navigateToTab(route.key);
    }
  };

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        bottom: Math.max(insets.bottom, 16),
        left: 16,
        right: 16,
        alignItems: 'center',
        zIndex: 50,
      }}
    >
      <MaskedTabBar
        value={currentRouteName}
        onValueChange={handleValueChange}
        radius={99}
        height={58}
        padding={4}
        gap={2}
        iconSize={18}
        fontSize={11}
        fontWeight="600"
        style={{
          backgroundColor: isDark ? '#121215' : '#ffffff',
          borderWidth: 1,
          borderColor: colors.border,
          elevation: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: isDark ? 0.45 : 0.12,
          shadowRadius: 16,
        }}
        palette={{
          pill: isDark ? '#f4f4f5' : '#09090b',
          active: isDark ? '#09090b' : '#ffffff',
          inactive: colors.textMuted,
        }}
      >
        <MaskedTabBar.List>
          {ELEV_TABS.map(({ value, label, icon }) => {
            const isFocused = currentRouteName === value;
            return (
              <MaskedTabBar.Trigger
                key={value}
                value={value}
                style={{
                  flex: isFocused ? 1.45 : 1,
                  paddingHorizontal: 4,
                  gap: 4,
                }}
              >
                <MaskedTabBar.Icon>
                  {({ color, size, active }) => (
                    <Ionicons
                      name={(active ? icon : `${icon}-outline`) as any}
                      size={size || 18}
                      color={color}
                    />
                  )}
                </MaskedTabBar.Icon>
                {isFocused && (
                  <MaskedTabBar.Label style={{ fontSize: 11 }}>{label}</MaskedTabBar.Label>
                )}
              </MaskedTabBar.Trigger>
            );
          })}
        </MaskedTabBar.List>
      </MaskedTabBar>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <ElevatioMaskedTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Início' }} />
      <Tabs.Screen name="leads" options={{ title: 'Leads' }} />
      <Tabs.Screen name="properties" options={{ title: 'Imóveis' }} />
      <Tabs.Screen name="finance" options={{ title: 'Financeiro' }} />
      <Tabs.Screen name="settings" options={{ title: 'Ajustes' }} />
    </Tabs>
  );
}
