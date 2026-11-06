import React from 'react';
import {
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Building2,
  ChevronRight,
  LogOut,
  Moon,
  QrCode,
  Shield,
  Smartphone,
  Sun,
  User,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';

export default function SettingsScreen() {
  const { user, profile, company, signOut } = useAuth();
  const { colors, isDark, themeMode, setThemeMode } = useAppTheme();

  const handleSignOut = () => {
    Alert.alert('Encerrar Sessão', 'Deseja realmente sair da sua conta no Elevatio Vendas?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 20, paddingTop: 56, paddingBottom: 40 }}
    >
      <Text style={{ fontFamily: 'Sora_800ExtraBold', fontSize: 24, color: colors.text, marginBottom: 20 }}>
        Configurações
      </Text>

      {/* Card do Perfil do Usuário */}
      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: 20,
          padding: 18,
          marginBottom: 20,
          borderWidth: 1,
          borderColor: colors.border,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 18,
            backgroundColor: '#0ea5e9',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontFamily: 'Sora_700Bold', fontSize: 20, color: '#ffffff' }}>
            {profile?.name ? profile.name.charAt(0).toUpperCase() : 'U'}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: 'Sora_700Bold', fontSize: 16, color: colors.text }}>
            {profile?.name || 'Usuário'}
          </Text>
          <Text style={{ fontFamily: 'Sora_400Regular', fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
            {profile?.email || user?.email}
          </Text>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
            {profile?.creci && (
              <View style={{ backgroundColor: 'rgba(14, 165, 233, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                <Text style={{ fontFamily: 'Sora_600SemiBold', fontSize: 10, color: '#0ea5e9' }}>
                  CRECI: {profile.creci}
                </Text>
              </View>
            )}
            <View style={{ backgroundColor: 'rgba(56, 189, 248, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
              <Text style={{ fontFamily: 'Sora_600SemiBold', fontSize: 10, color: '#0284c7' }}>
                Plano {company?.plan?.toUpperCase() || 'PRO'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Seção Aparência (Tema Sora Dark/Light) */}
      <Text style={{ fontFamily: 'Sora_700Bold', fontSize: 14, color: colors.textMuted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Aparência & Tema
      </Text>
      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: 18,
          padding: 8,
          marginBottom: 24,
          borderWidth: 1,
          borderColor: colors.border,
          flexDirection: 'row',
          gap: 8,
        }}
      >
        <TouchableOpacity
          onPress={() => setThemeMode('dark')}
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 12,
            borderRadius: 12,
            backgroundColor: themeMode === 'dark' ? '#082f49' : 'transparent',
            borderWidth: themeMode === 'dark' ? 1 : 0,
            borderColor: '#0284c7',
            gap: 6,
          }}
        >
          <Moon size={16} color={themeMode === 'dark' ? '#38bdf8' : colors.textMuted} />
          <Text
            style={{
              fontFamily: 'Sora_600SemiBold',
              fontSize: 13,
              color: themeMode === 'dark' ? '#38bdf8' : colors.textMuted,
            }}
          >
            Escuro
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setThemeMode('light')}
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 12,
            borderRadius: 12,
            backgroundColor: themeMode === 'light' ? '#0ea5e9' : 'transparent',
            gap: 6,
          }}
        >
          <Sun size={16} color={themeMode === 'light' ? '#ffffff' : colors.textMuted} />
          <Text
            style={{
              fontFamily: 'Sora_600SemiBold',
              fontSize: 13,
              color: themeMode === 'light' ? '#ffffff' : colors.textMuted,
            }}
          >
            Claro
          </Text>
        </TouchableOpacity>
      </View>

      {/* Seção Dados da Conta */}
      <Text style={{ fontFamily: 'Sora_700Bold', fontSize: 14, color: colors.textMuted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Operação & Repasses
      </Text>
      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: 18,
          marginBottom: 24,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <QrCode size={20} color="#0ea5e9" />
            <View>
              <Text style={{ fontFamily: 'Sora_600SemiBold', fontSize: 14, color: colors.text }}>
                Chave PIX para Comissões
              </Text>
              <Text style={{ fontFamily: 'Sora_400Regular', fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                {profile?.pix_key || 'Adicionar chave no painel web'}
              </Text>
            </View>
          </View>
          <ChevronRight size={18} color={colors.textMuted} />
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 16,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Building2 size={20} color="#0ea5e9" />
            <View>
              <Text style={{ fontFamily: 'Sora_600SemiBold', fontSize: 14, color: colors.text }}>
                Imobiliária Vinculada
              </Text>
              <Text style={{ fontFamily: 'Sora_400Regular', fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                {company?.name || 'Não vinculada'}
              </Text>
            </View>
          </View>
          <ChevronRight size={18} color={colors.textMuted} />
        </View>
      </View>

      {/* Botão Sair */}
      <TouchableOpacity
        onPress={handleSignOut}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(244, 63, 94, 0.1)',
          borderRadius: 16,
          height: 52,
          borderWidth: 1,
          borderColor: 'rgba(244, 63, 94, 0.3)',
          gap: 8,
        }}
      >
        <LogOut size={18} color="#f43f5e" />
        <Text style={{ fontFamily: 'Sora_700Bold', fontSize: 15, color: '#f43f5e' }}>
          Encerrar Sessão
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
