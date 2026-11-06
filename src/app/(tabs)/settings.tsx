import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Building2,
  Camera,
  Check,
  ChevronRight,
  CreditCard,
  KeyRound,
  Lock,
  LogOut,
  Moon,
  PenTool,
  QrCode,
  Shield,
  Smartphone,
  Sun,
  User,
  Users,
  X,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { TeamSettingsTab } from '../../components/settings/TeamSettingsTab';
import { PermissionsSettingsTab } from '../../components/settings/PermissionsSettingsTab';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, profile, company, signOut, refreshUser } = useAuth();
  const { colors, isDark, themeMode, setThemeMode } = useAppTheme();

  // Controle de Abas para Imobiliárias
  const isAgencyAdmin =
    company?.business_type !== 'solo_broker' &&
    (profile?.role === 'owner' ||
      profile?.role === 'super_admin' ||
      profile?.role === 'manager' ||
      profile?.role === 'admin');

  const [mainTab, setMainTab] = useState<'account' | 'team' | 'permissions'>('account');

  // Modais de Edição
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPixModal, setShowPixModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Estados Perfil Profissional
  const [name, setName] = useState(profile?.name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [creci, setCreci] = useState(profile?.creci || '');
  const [cpfCnpj, setCpfCnpj] = useState(profile?.cpf_cnpj || profile?.document || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Estados Banco & PIX
  const [pixKey, setPixKey] = useState(profile?.pix_key || '');
  const [pixType, setPixType] = useState(profile?.pix_type || 'CPF');
  const [bankName, setBankName] = useState(profile?.bank_name || '');
  const [bankAgency, setBankAgency] = useState(profile?.bank_agency || '');
  const [bankAccount, setBankAccount] = useState(profile?.bank_account || '');
  const [savingPix, setSavingPix] = useState(false);

  // Estados Senha
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Estado Upload Avatar
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Ação Foto de Perfil
  const handlePickAvatar = () => {
    Alert.alert(
      'Foto de Perfil',
      'Escolha como deseja alterar sua foto profissional:',
      [
        {
          text: 'Tirar Foto com a Câmera',
          onPress: async () => {
            const perm = await ImagePicker.requestCameraPermissionsAsync();
            if (!perm.granted) {
              Alert.alert('Permissão necessária', 'Permita o acesso à câmera.');
              return;
            }
            const res = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.7,
            });
            if (!res.canceled && res.assets && res.assets[0]) {
              uploadAvatar(res.assets[0].uri);
            }
          },
        },
        {
          text: 'Escolher da Galeria',
          onPress: async () => {
            const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!perm.granted) {
              Alert.alert('Permissão necessária', 'Permita o acesso à galeria.');
              return;
            }
            const res = await ImagePicker.launchImageLibraryAsync({
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.7,
            });
            if (!res.canceled && res.assets && res.assets[0]) {
              uploadAvatar(res.assets[0].uri);
            }
          },
        },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  const uploadAvatar = async (uri: string) => {
    if (!user) return;
    try {
      setUploadingAvatar(true);
      const fileName = `${user.id}/${Date.now()}.jpg`;
      const formData = new FormData();
      formData.append('file', {
        uri,
        name: fileName,
        type: 'image/jpeg',
      } as any);

      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, formData as any, { upsert: true, contentType: 'image/jpeg' });

      if (error) throw error;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(data.path);
      const publicUrl = urlData.publicUrl;

      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
      await refreshUser();
      Alert.alert('Sucesso!', 'Foto de perfil atualizada.');
    } catch (err: any) {
      Alert.alert('Erro ao atualizar foto', err.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Salvar Dados Perfil
  const handleSaveProfile = async () => {
    if (!user) return;
    try {
      setSavingProfile(true);
      const { error } = await supabase
        .from('profiles')
        .update({
          name: name.trim(),
          phone: phone.replace(/\D/g, '') || null,
          creci: creci.trim() || null,
          cpf_cnpj: cpfCnpj.replace(/\D/g, '') || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;
      await refreshUser();
      setShowProfileModal(false);
      Alert.alert('Sucesso', 'Dados profissionais atualizados.');
    } catch (err: any) {
      Alert.alert('Erro ao salvar', err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  // Salvar Dados Bancários
  const handleSavePix = async () => {
    if (!user) return;
    try {
      setSavingPix(true);
      const { error } = await supabase
        .from('profiles')
        .update({
          pix_key: pixKey.trim() || null,
          pix_type: pixType,
          bank_name: bankName.trim() || null,
          bank_agency: bankAgency.trim() || null,
          bank_account: bankAccount.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;
      await refreshUser();
      setShowPixModal(false);
      Alert.alert('Sucesso', 'Dados bancários para repasse salvos.');
    } catch (err: any) {
      Alert.alert('Erro ao salvar', err.message);
    } finally {
      setSavingPix(false);
    }
  };

  // Alterar Senha
  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      Alert.alert('Senha Curta', 'A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Senhas Não Coincidem', 'A confirmação de senha deve ser idêntica à nova senha.');
      return;
    }

    try {
      setSavingPassword(true);
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setShowPasswordModal(false);
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Senha Alterada!', 'Sua nova senha de acesso já está ativa.');
    } catch (err: any) {
      Alert.alert('Erro ao alterar senha', err.message);
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Encerrar Sessão', 'Deseja realmente sair da sua conta no Elevatio Vendas?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const userInitials = profile?.name
    ? profile.name
        .trim()
        .split(' ')
        .slice(0, 2)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : 'U';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 52, paddingBottom: 40 }}
    >
      <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 16 }}>
        Configurações
      </Text>

      {/* Segmented Control de Abas para Imobiliárias */}
      {isAgencyAdmin && (
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: colors.card,
            borderRadius: 12,
            padding: 4,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <TouchableOpacity
            onPress={() => setMainTab('account')}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              paddingVertical: 9,
              borderRadius: 8,
              backgroundColor: mainTab === 'account' ? colors.mutedSurface : 'transparent',
            }}
          >
            <User size={14} color={mainTab === 'account' ? '#0ea5e9' : colors.textMuted} />
            <Text
              style={{
                fontSize: 12,
                fontWeight: mainTab === 'account' ? '700' : '500',
                color: mainTab === 'account' ? '#0ea5e9' : colors.textMuted,
              }}
            >
              Minha Conta
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setMainTab('team')}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              paddingVertical: 9,
              borderRadius: 8,
              backgroundColor: mainTab === 'team' ? colors.mutedSurface : 'transparent',
            }}
          >
            <Users size={14} color={mainTab === 'team' ? '#0ea5e9' : colors.textMuted} />
            <Text
              style={{
                fontSize: 12,
                fontWeight: mainTab === 'team' ? '700' : '500',
                color: mainTab === 'team' ? '#0ea5e9' : colors.textMuted,
              }}
            >
              Equipe
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setMainTab('permissions')}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              paddingVertical: 9,
              borderRadius: 8,
              backgroundColor: mainTab === 'permissions' ? colors.mutedSurface : 'transparent',
            }}
          >
            <Shield size={14} color={mainTab === 'permissions' ? '#0ea5e9' : colors.textMuted} />
            <Text
              style={{
                fontSize: 12,
                fontWeight: mainTab === 'permissions' ? '700' : '500',
                color: mainTab === 'permissions' ? '#0ea5e9' : colors.textMuted,
              }}
            >
              Permissões
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Conteúdo Dinâmico por Aba */}
      {mainTab === 'team' && isAgencyAdmin ? (
        <TeamSettingsTab />
      ) : mainTab === 'permissions' && isAgencyAdmin ? (
        <PermissionsSettingsTab />
      ) : (
        <>
          {/* Card Perfil com Foto Real e Botão de Câmera */}
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 16,
              padding: 16,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: colors.border,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <TouchableOpacity
              onPress={handlePickAvatar}
              style={{ position: 'relative' }}
              activeOpacity={0.8}
            >
              {profile?.avatar_url ? (
                <Image
                  source={{ uri: profile.avatar_url }}
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 30,
                    backgroundColor: colors.mutedSurface,
                  }}
                />
              ) : (
                <View
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 30,
                    backgroundColor: '#0284c7',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 20, fontWeight: '700', color: '#ffffff' }}>
                    {userInitials}
                  </Text>
                </View>
              )}

              {/* Botão Câmera Overlay */}
              <View
                style={{
                  position: 'absolute',
                  bottom: -2,
                  right: -2,
                  backgroundColor: '#0ea5e9',
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 2,
                  borderColor: colors.card,
                }}
              >
                {uploadingAvatar ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Camera size={12} color="#ffffff" />
                )}
              </View>
            </TouchableOpacity>

            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }} numberOfLines={1}>
                {profile?.name || 'Corretor'}
              </Text>
              <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 1 }}>
                {profile?.email || user?.email}
              </Text>

              <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                {profile?.creci && (
                  <View
                    style={{
                      backgroundColor: isDark ? 'rgba(14, 165, 233, 0.15)' : '#e0f2fe',
                      paddingHorizontal: 7,
                      paddingVertical: 2,
                      borderRadius: 6,
                    }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: '600', color: '#0ea5e9' }}>
                      CRECI: {profile.creci}
                    </Text>
                  </View>
                )}
                <View
                  style={{
                    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#d1fae5',
                    paddingHorizontal: 7,
                    paddingVertical: 2,
                    borderRadius: 6,
                  }}
                >
                  <Text style={{ fontSize: 10, fontWeight: '600', color: '#10b981' }}>
                    Nível {profile?.level || 1} • {profile?.level_title || 'Estreante'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Seção 1: Dados Pessoais & Profissionais */}
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted, marginBottom: 8, textTransform: 'uppercase' }}>
            Minha Conta & Segurança
          </Text>
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 14,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: colors.border,
              overflow: 'hidden',
            }}
          >
            <TouchableOpacity
              onPress={() => setShowProfileModal(true)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 14,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <User size={18} color="#0ea5e9" />
                <View>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>Dados Profissionais & CRECI</Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted }}>Nome, telefone, documento</Text>
                </View>
              </View>
              <ChevronRight size={16} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowPasswordModal(true)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 14,
              }}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Lock size={18} color="#0ea5e9" />
                <View>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>Alterar Senha</Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted }}>Segurança de acesso</Text>
                </View>
              </View>
              <ChevronRight size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Seção 2: Financeiro & Assinatura Digital */}
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted, marginBottom: 8, textTransform: 'uppercase' }}>
            Operação & Jurídico
          </Text>
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 14,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: colors.border,
              overflow: 'hidden',
            }}
          >
            <TouchableOpacity
              onPress={() => setShowPixModal(true)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 14,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <QrCode size={18} color="#0ea5e9" />
                <View>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>Dados Bancários & Chave PIX</Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted }}>
                    {profile?.pix_key ? `Chave: ${profile.pix_key}` : 'Cadastrar chave para comissões'}
                  </Text>
                </View>
              </View>
              <ChevronRight size={16} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/signature')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 14,
              }}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <PenTool size={18} color="#0ea5e9" />
                <View>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>Minha Assinatura Eletrônica</Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted }}>
                    {profile?.signature_url ? 'Assinatura configurada ✓' : 'Criar assinatura digital'}
                  </Text>
                </View>
              </View>
              <ChevronRight size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Seção 3: Aparência (Tema Claro / Escuro) */}
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted, marginBottom: 8, textTransform: 'uppercase' }}>
            Aparência
          </Text>
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 14,
              padding: 4,
              marginBottom: 24,
              borderWidth: 1,
              borderColor: colors.border,
              flexDirection: 'row',
              gap: 6,
            }}
          >
            <TouchableOpacity
              onPress={() => setThemeMode('dark')}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 10,
                borderRadius: 10,
                backgroundColor: themeMode === 'dark' ? colors.mutedSurface : 'transparent',
                borderWidth: themeMode === 'dark' ? 1 : 0,
                borderColor: colors.border,
                gap: 6,
              }}
            >
              <Moon size={15} color={themeMode === 'dark' ? '#0ea5e9' : colors.textMuted} />
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: themeMode === 'dark' ? '700' : '500',
                  color: themeMode === 'dark' ? '#0ea5e9' : colors.textMuted,
                }}
              >
                Escuro (Zinc)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setThemeMode('light')}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 10,
                borderRadius: 10,
                backgroundColor: themeMode === 'light' ? colors.mutedSurface : 'transparent',
                borderWidth: themeMode === 'light' ? 1 : 0,
                borderColor: colors.border,
                gap: 6,
              }}
            >
              <Sun size={15} color={themeMode === 'light' ? '#0ea5e9' : colors.textMuted} />
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: themeMode === 'light' ? '700' : '500',
                  color: themeMode === 'light' ? '#0ea5e9' : colors.textMuted,
                }}
              >
                Claro (Zinc)
              </Text>
            </TouchableOpacity>
          </View>

          {/* Botão Sair */}
          <TouchableOpacity
            onPress={handleSignOut}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#fee2e2',
              borderRadius: 12,
              paddingVertical: 14,
              borderWidth: 1,
              borderColor: isDark ? 'rgba(239, 68, 68, 0.25)' : '#fca5a5',
              gap: 8,
            }}
            activeOpacity={0.8}
          >
            <LogOut size={16} color="#ef4444" />
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#ef4444' }}>
              Encerrar Sessão
            </Text>
          </TouchableOpacity>
        </>
      )}

      {/* MODAL 1: EDITAR DADOS PROFISSIONAIS */}
      <Modal visible={showProfileModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: colors.card,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 20,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>Dados Profissionais</Text>
              <TouchableOpacity onPress={() => setShowProfileModal(false)}>
                <X size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 4 }}>Nome Completo</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              style={{
                backgroundColor: colors.mutedSurface,
                borderRadius: 10,
                padding: 10,
                color: colors.text,
                borderWidth: 1,
                borderColor: colors.border,
                marginBottom: 10,
              }}
            />

            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 4 }}>WhatsApp / Celular</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              style={{
                backgroundColor: colors.mutedSurface,
                borderRadius: 10,
                padding: 10,
                color: colors.text,
                borderWidth: 1,
                borderColor: colors.border,
                marginBottom: 10,
              }}
            />

            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 4 }}>Número do CRECI</Text>
            <TextInput
              value={creci}
              onChangeText={setCreci}
              placeholder="Ex: 123456-F"
              placeholderTextColor={colors.textMuted}
              style={{
                backgroundColor: colors.mutedSurface,
                borderRadius: 10,
                padding: 10,
                color: colors.text,
                borderWidth: 1,
                borderColor: colors.border,
                marginBottom: 10,
              }}
            />

            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 4 }}>CPF ou CNPJ</Text>
            <TextInput
              value={cpfCnpj}
              onChangeText={setCpfCnpj}
              keyboardType="numeric"
              style={{
                backgroundColor: colors.mutedSurface,
                borderRadius: 10,
                padding: 10,
                color: colors.text,
                borderWidth: 1,
                borderColor: colors.border,
                marginBottom: 16,
              }}
            />

            <TouchableOpacity
              onPress={handleSaveProfile}
              disabled={savingProfile}
              style={{
                backgroundColor: '#0ea5e9',
                paddingVertical: 13,
                borderRadius: 10,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {savingProfile ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#ffffff' }}>Salvar Dados</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: DADOS BANCÁRIOS & PIX */}
      <Modal visible={showPixModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: colors.card,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 20,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>Dados Bancários & PIX</Text>
              <TouchableOpacity onPress={() => setShowPixModal(false)}>
                <X size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 4 }}>Chave PIX</Text>
            <TextInput
              value={pixKey}
              onChangeText={setPixKey}
              placeholder="CPF, celular, e-mail ou aleatória"
              placeholderTextColor={colors.textMuted}
              style={{
                backgroundColor: colors.mutedSurface,
                borderRadius: 10,
                padding: 10,
                color: colors.text,
                borderWidth: 1,
                borderColor: colors.border,
                marginBottom: 10,
              }}
            />

            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 4 }}>Nome do Banco</Text>
            <TextInput
              value={bankName}
              onChangeText={setBankName}
              placeholder="Ex: Nubank, Itaú, Bradesco..."
              placeholderTextColor={colors.textMuted}
              style={{
                backgroundColor: colors.mutedSurface,
                borderRadius: 10,
                padding: 10,
                color: colors.text,
                borderWidth: 1,
                borderColor: colors.border,
                marginBottom: 10,
              }}
            />

            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 4 }}>Agência</Text>
                <TextInput
                  value={bankAgency}
                  onChangeText={setBankAgency}
                  placeholder="0001"
                  placeholderTextColor={colors.textMuted}
                  style={{
                    backgroundColor: colors.mutedSurface,
                    borderRadius: 10,
                    padding: 10,
                    color: colors.text,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                />
              </View>

              <View style={{ flex: 2 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 4 }}>Conta com Dígito</Text>
                <TextInput
                  value={bankAccount}
                  onChangeText={setBankAccount}
                  placeholder="123456-7"
                  placeholderTextColor={colors.textMuted}
                  style={{
                    backgroundColor: colors.mutedSurface,
                    borderRadius: 10,
                    padding: 10,
                    color: colors.text,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                />
              </View>
            </View>

            <TouchableOpacity
              onPress={handleSavePix}
              disabled={savingPix}
              style={{
                backgroundColor: '#0ea5e9',
                paddingVertical: 13,
                borderRadius: 10,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {savingPix ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#ffffff' }}>Salvar Dados Bancários</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 3: ALTERAR SENHA */}
      <Modal visible={showPasswordModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: colors.card,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 20,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>Alterar Senha de Acesso</Text>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                <X size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 4 }}>Nova Senha</Text>
            <TextInput
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              placeholder="Mínimo de 6 caracteres"
              placeholderTextColor={colors.textMuted}
              style={{
                backgroundColor: colors.mutedSurface,
                borderRadius: 10,
                padding: 10,
                color: colors.text,
                borderWidth: 1,
                borderColor: colors.border,
                marginBottom: 10,
              }}
            />

            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 4 }}>Confirmar Nova Senha</Text>
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholder="Digite a mesma senha novamente"
              placeholderTextColor={colors.textMuted}
              style={{
                backgroundColor: colors.mutedSurface,
                borderRadius: 10,
                padding: 10,
                color: colors.text,
                borderWidth: 1,
                borderColor: colors.border,
                marginBottom: 16,
              }}
            />

            <TouchableOpacity
              onPress={handleChangePassword}
              disabled={savingPassword}
              style={{
                backgroundColor: '#0ea5e9',
                paddingVertical: 13,
                borderRadius: 10,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {savingPassword ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#ffffff' }}>Atualizar Minha Senha</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
