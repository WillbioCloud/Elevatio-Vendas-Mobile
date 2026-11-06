import React from 'react';
import { Tabs } from 'expo-router';
import { Building2, Home, Settings, Users, Wallet } from 'lucide-react-native';
import { useAppTheme } from '../../context/ThemeContext';

export default function TabLayout() {
  const { colors, isDark } = useAppTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0ea5e9', // Azul Oficial
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          position: 'absolute',
          bottom: 20,
          left: 18,
          right: 18,
          start: 18,
          end: 18,
          height: 64,
          borderRadius: 28,
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderWidth: 1,
          borderColor: colors.border,
          borderTopColor: colors.border,
          paddingBottom: 8,
          paddingTop: 8,
          elevation: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: isDark ? 0.45 : 0.12,
          shadowRadius: 16,
        },
        tabBarLabelStyle: {
          fontWeight: '600',
          fontSize: 11,
          marginTop: -2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ color, size }) => <Home size={size || 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="leads"
        options={{
          title: 'Leads',
          tabBarIcon: ({ color, size }) => <Users size={size || 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="properties"
        options={{
          title: 'Imóveis',
          tabBarIcon: ({ color, size }) => <Building2 size={size || 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="finance"
        options={{
          title: 'Financeiro',
          tabBarIcon: ({ color, size }) => <Wallet size={size || 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ajustes',
          tabBarIcon: ({ color, size }) => <Settings size={size || 22} color={color} />,
        }}
      />
    </Tabs>
  );
}
