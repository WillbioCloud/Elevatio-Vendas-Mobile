import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Building2,
  Check,
  DollarSign,
  FileText,
  Key,
  RotateCcw,
  Save,
  Shield,
  Users,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import {
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSION_GROUPS,
  ROLE_LABELS,
} from '../../constants/permissions';

type RoleKey = 'manager' | 'admin' | 'attendant' | 'agent';

const ROLE_OPTIONS: { key: RoleKey; label: string; desc: string }[] = [
  { key: 'manager', label: 'Gerente', desc: 'Gestão geral da imobiliária' },
  { key: 'admin', label: 'Administrativo', desc: 'Operações e contratos' },
  { key: 'attendant', label: 'Atendente', desc: 'Recepção e triagem de leads' },
  { key: 'agent', label: 'Corretor', desc: 'Funil pessoal e imóveis' },
];

export function PermissionsSettingsTab() {
  const { profile } = useAuth();
  const { colors, isDark } = useAppTheme();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleKey>('agent');

  // Matriz completa de permissões por cargo
  const [rolePermissions, setRolePermissions] = useState<Record<string, Record<string, boolean>>>(
    DEFAULT_ROLE_PERMISSIONS
  );
  const [settingsRaw, setSettingsRaw] = useState<any>(null);

  const fetchSettings = async () => {
    if (!profile?.company_id) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('company_id', profile.company_id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setSettingsRaw(data || {});

      const savedRolePerms = data?.permissions?.role_permissions;
      if (savedRolePerms && typeof savedRolePerms === 'object') {
        // Mescla com defaults para garantir que qualquer permissão nova exista
        const merged: Record<string, Record<string, boolean>> = {};
        for (const role of ['manager', 'admin', 'attendant', 'agent']) {
          merged[role] = {
            ...(DEFAULT_ROLE_PERMISSIONS[role] || {}),
            ...(savedRolePerms[role] || {}),
          };
        }
        setRolePermissions(merged);
      } else {
        setRolePermissions(DEFAULT_ROLE_PERMISSIONS);
      }
    } catch (err: any) {
      Alert.alert('Erro ao carregar permissões', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [profile?.company_id]);

  const handleTogglePermission = (permKey: string, value: boolean) => {
    setRolePermissions((prev) => ({
      ...prev,
      [selectedRole]: {
        ...(prev[selectedRole] || {}),
        [permKey]: value,
      },
    }));
  };

  const handleResetRoleDefaults = () => {
    Alert.alert(
      'Restaurar Padrões',
      `Deseja restaurar as permissões recomendadas para o cargo de ${ROLE_OPTIONS.find((r) => r.key === selectedRole)?.label}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restaurar',
          onPress: () => {
            setRolePermissions((prev) => ({
              ...prev,
              [selectedRole]: {
                ...(DEFAULT_ROLE_PERMISSIONS[selectedRole] || {}),
              },
            }));
          },
        },
      ]
    );
  };

  const handleSaveSettings = async () => {
    if (!profile?.company_id) return;
    try {
      setSaving(true);

      const existingPerms = settingsRaw?.permissions || {};
      const updatedPermissionsPayload = {
        ...existingPerms,
        role_permissions: rolePermissions,
      };

      if (settingsRaw?.id) {
        // Update existing row
        const { error } = await supabase
          .from('settings')
          .update({
            permissions: updatedPermissionsPayload,
          })
          .eq('company_id', profile.company_id);

        if (error) throw error;
      } else {
        // Insert new row if company settings doesn't exist yet
        const { data, error } = await supabase
          .from('settings')
          .insert({
            company_id: profile.company_id,
            permissions: updatedPermissionsPayload,
          })
          .select()
          .single();

        if (error) throw error;
        setSettingsRaw(data);
      }

      Alert.alert('Sucesso!', 'Matriz de permissões dos cargos salva com sucesso.');
    } catch (err: any) {
      Alert.alert('Erro ao salvar permissões', err.message);
    } finally {
      setSaving(false);
    }
  };

  const getGroupIcon = (iconName: string) => {
    switch (iconName) {
      case 'Building2':
        return <Building2 size={16} color="#0ea5e9" />;
      case 'Key':
        return <Key size={16} color="#0ea5e9" />;
      case 'FileText':
        return <FileText size={16} color="#0ea5e9" />;
      case 'Users':
        return <Users size={16} color="#0ea5e9" />;
      case 'DollarSign':
        return <DollarSign size={16} color="#0ea5e9" />;
      default:
        return <Shield size={16} color="#0ea5e9" />;
    }
  };

  const currentRolePerms = rolePermissions[selectedRole] || {};

  return (
    <View style={{ flex: 1 }}>
      {/* Cabeçalho */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <View>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
            Matriz de Permissões
          </Text>
          <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
            Padrões globais de acesso por cargo da imobiliária
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleResetRoleDefaults}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 8,
            backgroundColor: colors.mutedSurface,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <RotateCcw size={12} color={colors.textMuted} />
          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textMuted }}>
            Restaurar
          </Text>
        </TouchableOpacity>
      </View>

      {/* Seletor de Cargo no Topo (Pills Horizontais) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, marginBottom: 16 }}
      >
        {ROLE_OPTIONS.map((item) => {
          const isSelected = selectedRole === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              onPress={() => setSelectedRole(item.key)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 9,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: isSelected ? '#0ea5e9' : colors.border,
                backgroundColor: isSelected ? 'rgba(14, 165, 233, 0.15)' : colors.card,
              }}
              activeOpacity={0.7}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: isSelected ? '700' : '500',
                  color: isSelected ? '#0ea5e9' : colors.text,
                }}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Info Card do Cargo */}
      <View
        style={{
          backgroundColor: isDark ? 'rgba(14, 165, 233, 0.08)' : '#f0f9ff',
          padding: 12,
          borderRadius: 10,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: isDark ? 'rgba(14, 165, 233, 0.2)' : '#bae6fd',
        }}
      >
        <Text style={{ fontSize: 12, fontWeight: '700', color: '#0ea5e9' }}>
          Configurando cargo: {ROLE_OPTIONS.find((r) => r.key === selectedRole)?.label}
        </Text>
        <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
          {ROLE_OPTIONS.find((r) => r.key === selectedRole)?.desc}. Todas as alterações feitas aqui
          serão aplicadas como padrão aos membros deste cargo.
        </Text>
      </View>

      {/* Lista de Permissões por Categoria */}
      {loading ? (
        <View style={{ paddingVertical: 40, alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#0ea5e9" />
          <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 10 }}>
            Carregando permissões do cargo...
          </Text>
        </View>
      ) : (
        <View style={{ gap: 14 }}>
          {PERMISSION_GROUPS.map((group) => (
            <View
              key={group.id}
              style={{
                backgroundColor: colors.card,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: colors.border,
                overflow: 'hidden',
              }}
            >
              {/* Header da Categoria */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  backgroundColor: colors.mutedSurface,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                }}
              >
                {getGroupIcon(group.icon)}
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>
                  {group.title}
                </Text>
              </View>

              {/* Switches da Categoria */}
              <View style={{ paddingHorizontal: 14, paddingVertical: 6 }}>
                {group.permissions.map((perm) => {
                  const isEnabled = !!currentRolePerms[perm.key];
                  return (
                    <View
                      key={perm.key}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingVertical: 10,
                        borderBottomWidth: 1,
                        borderBottomColor: colors.border,
                      }}
                    >
                      <View style={{ flex: 1, paddingRight: 12 }}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>
                          {perm.label}
                        </Text>
                        <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 2 }}>
                          {perm.description}
                        </Text>
                      </View>
                      <Switch
                        value={isEnabled}
                        onValueChange={(val) => handleTogglePermission(perm.key, val)}
                        trackColor={{ false: colors.border, true: '#0ea5e9' }}
                        thumbColor="#ffffff"
                      />
                    </View>
                  );
                })}
              </View>
            </View>
          ))}

          {/* Botão Salvar Padrões de Cargo */}
          <TouchableOpacity
            onPress={handleSaveSettings}
            disabled={saving}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              backgroundColor: '#0ea5e9',
              paddingVertical: 14,
              borderRadius: 12,
              marginTop: 10,
              marginBottom: 30,
            }}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Save size={16} color="#ffffff" />
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#ffffff' }}>
                  Salvar Padrões de Cargo
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

