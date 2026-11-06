import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Building2,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  DollarSign,
  FileText,
  Key,
  Pause,
  Play,
  RotateCcw,
  Share2,
  Shield,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { Profile } from '../../types';
import {
  DEFAULT_ROLE_PERMISSIONS,
  encodeBase64,
  formatLastSeen,
  PERMISSION_GROUPS,
  ROLE_LABELS,
} from '../../constants/permissions';

export function TeamSettingsTab() {
  const { user, profile } = useAuth();
  const { colors, isDark } = useAppTheme();

  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Profile[]>([]);
  const [subTab, setSubTab] = useState<'active' | 'pending'>('active');

  // Modal de Convite
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteRole, setInviteRole] = useState<'agent' | 'attendant' | 'admin' | 'manager'>('agent');
  const [copiedLink, setCopiedLink] = useState(false);

  // Modal Alterar Cargo
  const [selectedMemberForRole, setSelectedMemberForRole] = useState<Profile | null>(null);
  const [savingRole, setSavingRole] = useState(false);

  // Modal Permissões Individuais
  const [selectedMemberForPerms, setSelectedMemberForPerms] = useState<Profile | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    properties: true,
    keys: false,
    contracts: false,
    leads: false,
    finance: false,
  });
  const [memberPerms, setMemberPerms] = useState<Record<string, boolean>>({});
  const [savingPerms, setSavingPerms] = useState(false);

  const fetchTeam = async () => {
    if (!profile?.company_id) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('name', { ascending: true });

      if (error) throw error;
      setMembers((data as Profile[]) || []);
    } catch (err: any) {
      Alert.alert('Erro ao carregar equipe', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, [profile?.company_id]);

  const activeMembers = members.filter((m) => m.active !== false);
  const pendingMembers = members.filter((m) => m.active === false);

  // Gerador de Link de Convite
  const getInviteUrl = () => {
    if (!profile?.company_id) return '';
    const token = encodeBase64(JSON.stringify({ c: profile.company_id, r: inviteRole }));
    return `https://elevatiovendas.com.br/convite?token=${token}`;
  };

  const handleCopyLink = async () => {
    const url = getInviteUrl();
    await Clipboard.setStringAsync(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleShareWhatsApp = async () => {
    const url = getInviteUrl();
    const roleName = ROLE_LABELS[inviteRole]?.label || 'Membro';
    const msg = `Olá! Você foi convidado para integrar a equipe Elevatio Vendas como ${roleName}.\n\nAcesse o link abaixo para criar sua conta:\n${url}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    const canOpen = await Linking.canOpenURL(whatsappUrl);
    if (canOpen) {
      Linking.openURL(whatsappUrl);
    } else {
      Alert.alert('Aviso', 'Não foi possível abrir o WhatsApp diretamente. O link foi copiado.');
      await Clipboard.setStringAsync(url);
    }
  };

  // Alternar Status Ativo / Pausado
  const handleToggleMemberActive = async (member: Profile) => {
    const newStatus = !member.active;
    const actionText = newStatus ? 'aprovar/reativar' : 'pausar o acesso de';
    Alert.alert(
      'Confirmar alteração',
      `Deseja realmente ${actionText} ${member.name || member.email}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('profiles')
                .update({ active: newStatus, updated_at: new Date().toISOString() })
                .eq('id', member.id);

              if (error) throw error;
              setMembers((prev) =>
                prev.map((m) => (m.id === member.id ? { ...m, active: newStatus } : m))
              );
            } catch (err: any) {
              Alert.alert('Erro ao atualizar status', err.message);
            }
          },
        },
      ]
    );
  };

  // Salvar Novo Cargo
  const handleUpdateRole = async (newRole: string) => {
    if (!selectedMemberForRole) return;
    try {
      setSavingRole(true);
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole as any, updated_at: new Date().toISOString() })
        .eq('id', selectedMemberForRole.id);

      if (error) throw error;
      setMembers((prev) =>
        prev.map((m) => (m.id === selectedMemberForRole.id ? { ...m, role: newRole as any } : m))
      );
      setSelectedMemberForRole(null);
      Alert.alert('Sucesso', 'Cargo do membro atualizado.');
    } catch (err: any) {
      Alert.alert('Erro ao alterar cargo', err.message);
    } finally {
      setSavingRole(false);
    }
  };

  // Remover Membro
  const handleDeleteMember = (member: Profile) => {
    if (member.id === user?.id) {
      Alert.alert('Ação Não Permitida', 'Você não pode remover sua própria conta de gestor.');
      return;
    }
    Alert.alert(
      'Remover Membro',
      `Tem certeza que deseja remover ${member.name || member.email} da imobiliária? Esta ação desvincula o acesso.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.from('profiles').delete().eq('id', member.id);
              if (error) throw error;
              setMembers((prev) => prev.filter((m) => m.id !== member.id));
              Alert.alert('Sucesso', 'Membro removido da equipe.');
            } catch (err: any) {
              Alert.alert('Erro ao remover membro', err.message);
            }
          },
        },
      ]
    );
  };

  // Abrir Modal de Permissões Individuais
  const handleOpenPerms = (member: Profile) => {
    setSelectedMemberForPerms(member);
    const roleKey = member.role === 'corretor' ? 'agent' : member.role;
    const defaultPerms = DEFAULT_ROLE_PERMISSIONS[roleKey] || DEFAULT_ROLE_PERMISSIONS['agent'];
    const customPerms = member.permissions || {};
    // Permissões ativas: combinação de default com custom
    setMemberPerms({ ...defaultPerms, ...customPerms });
  };

  // Restaurar Padrão do Cargo no Modal de Permissões
  const handleResetToRoleDefault = () => {
    if (!selectedMemberForPerms) return;
    const roleKey = selectedMemberForPerms.role === 'corretor' ? 'agent' : selectedMemberForPerms.role;
    const defaultPerms = DEFAULT_ROLE_PERMISSIONS[roleKey] || DEFAULT_ROLE_PERMISSIONS['agent'];
    setMemberPerms({ ...defaultPerms });
  };

  // Salvar Permissões Individuais
  const handleSavePerms = async () => {
    if (!selectedMemberForPerms) return;
    try {
      setSavingPerms(true);
      const { error } = await supabase
        .from('profiles')
        .update({
          permissions: memberPerms,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedMemberForPerms.id);

      if (error) throw error;
      setMembers((prev) =>
        prev.map((m) => (m.id === selectedMemberForPerms.id ? { ...m, permissions: memberPerms } : m))
      );
      setSelectedMemberForPerms(null);
      Alert.alert('Sucesso', 'Permissões individuais atualizadas.');
    } catch (err: any) {
      Alert.alert('Erro ao salvar permissões', err.message);
    } finally {
      setSavingPerms(false);
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

  const currentList = subTab === 'active' ? activeMembers : pendingMembers;

  return (
    <View style={{ flex: 1 }}>
      {/* Botão Superior "Convidar Usuário" */}
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
            Equipe ({members.length})
          </Text>
          <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
            Gestão de membros e acessos da imobiliária
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => setShowInviteModal(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: '#0ea5e9',
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 10,
          }}
          activeOpacity={0.8}
        >
          <UserPlus size={15} color="#ffffff" />
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#ffffff' }}>Convidar</Text>
        </TouchableOpacity>
      </View>

      {/* Sub-abas: Ativos vs Pendentes */}
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: colors.card,
          borderRadius: 10,
          padding: 4,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <TouchableOpacity
          onPress={() => setSubTab('active')}
          style={{
            flex: 1,
            paddingVertical: 8,
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: subTab === 'active' ? colors.mutedSurface : 'transparent',
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: subTab === 'active' ? '700' : '500',
              color: subTab === 'active' ? '#0ea5e9' : colors.textMuted,
            }}
          >
            Membros Ativos ({activeMembers.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setSubTab('pending')}
          style={{
            flex: 1,
            flexDirection: 'row',
            gap: 6,
            paddingVertical: 8,
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: subTab === 'pending' ? colors.mutedSurface : 'transparent',
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: subTab === 'pending' ? '700' : '500',
              color: subTab === 'pending' ? '#f59e0b' : colors.textMuted,
            }}
          >
            Pendentes ({pendingMembers.length})
          </Text>
          {pendingMembers.length > 0 && (
            <View
              style={{
                backgroundColor: '#ef4444',
                width: 18,
                height: 18,
                borderRadius: 9,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#ffffff' }}>
                {pendingMembers.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Listagem de Membros */}
      {loading ? (
        <View style={{ paddingVertical: 40, alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#0ea5e9" />
          <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 10 }}>
            Carregando membros da equipe...
          </Text>
        </View>
      ) : currentList.length === 0 ? (
        <View
          style={{
            backgroundColor: colors.card,
            padding: 24,
            borderRadius: 14,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Users size={32} color={colors.textMuted} />
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginTop: 10 }}>
            {subTab === 'active' ? 'Nenhum membro ativo' : 'Nenhum membro pendente'}
          </Text>
          <Text
            style={{ fontSize: 12, color: colors.textMuted, marginTop: 4, textAlign: 'center' }}
          >
            {subTab === 'active'
              ? 'Convide novos corretores ou atendentes para compor a equipe.'
              : 'Não há novos convites aguardando aprovação no momento.'}
          </Text>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {currentList.map((member) => {
            const roleInfo = ROLE_LABELS[member.role] || {
              label: member.role,
              color: '#0ea5e9',
              bg: 'rgba(14, 165, 233, 0.12)',
            };
            const presence = formatLastSeen(member.last_seen);
            const initials = member.name
              ? member.name
                  .trim()
                  .split(' ')
                  .slice(0, 2)
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
              : 'M';

            return (
              <View
                key={member.id}
                style={{
                  backgroundColor: colors.card,
                  borderRadius: 14,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                {/* Linha 1: Avatar, Nome, E-mail e Cargo */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  {member.avatar_url ? (
                    <Image
                      source={{ uri: member.avatar_url }}
                      style={{ width: 44, height: 44, borderRadius: 22 }}
                    />
                  ) : (
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        backgroundColor: '#0284c7',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 15, fontWeight: '700', color: '#ffffff' }}>
                        {initials}
                      </Text>
                    </View>
                  )}

                  <View style={{ flex: 1 }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Text
                        style={{ fontSize: 14, fontWeight: '700', color: colors.text }}
                        numberOfLines={1}
                      >
                        {member.name || 'Sem nome'}
                      </Text>

                      {/* Badge Cargo */}
                      <TouchableOpacity
                        onPress={() => setSelectedMemberForRole(member)}
                        style={{
                          backgroundColor: roleInfo.bg,
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 6,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '700', color: roleInfo.color }}>
                          {roleInfo.label}
                        </Text>
                        <ChevronDown size={11} color={roleInfo.color} />
                      </TouchableOpacity>
                    </View>

                    <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 1 }}>
                      {member.email}
                    </Text>

                    {/* Presença & Telefone */}
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 10,
                        marginTop: 4,
                        flexWrap: 'wrap',
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <View
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: presence.isOnline ? '#10b981' : '#94a3b8',
                          }}
                        />
                        <Text
                          style={{
                            fontSize: 10,
                            color: presence.isOnline ? '#10b981' : colors.textMuted,
                            fontWeight: presence.isOnline ? '600' : '400',
                          }}
                        >
                          {presence.text}
                        </Text>
                      </View>

                      {member.phone && (
                        <Text style={{ fontSize: 10, color: colors.textMuted }}>
                          • {member.phone}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>

                {/* Linha 2: Ações Rápidas */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: 8,
                    marginTop: 12,
                    paddingTop: 10,
                    borderTopWidth: 1,
                    borderTopColor: colors.border,
                  }}
                >
                  {/* Botão Permissões Individuais */}
                  <TouchableOpacity
                    onPress={() => handleOpenPerms(member)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 8,
                      backgroundColor: isDark ? 'rgba(14, 165, 233, 0.15)' : '#e0f2fe',
                    }}
                  >
                    <Shield size={13} color="#0ea5e9" />
                    <Text style={{ fontSize: 11, fontWeight: '600', color: '#0ea5e9' }}>
                      Permissões
                    </Text>
                  </TouchableOpacity>

                  {/* Botão Ativar / Pausar */}
                  <TouchableOpacity
                    onPress={() => handleToggleMemberActive(member)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 8,
                      backgroundColor: member.active
                        ? isDark
                          ? 'rgba(245, 158, 11, 0.15)'
                          : '#fef3c7'
                        : isDark
                        ? 'rgba(16, 185, 129, 0.15)'
                        : '#d1fae5',
                    }}
                  >
                    {member.active ? (
                      <>
                        <Pause size={13} color="#f59e0b" />
                        <Text style={{ fontSize: 11, fontWeight: '600', color: '#f59e0b' }}>
                          Pausar
                        </Text>
                      </>
                    ) : (
                      <>
                        <Play size={13} color="#10b981" />
                        <Text style={{ fontSize: 11, fontWeight: '600', color: '#10b981' }}>
                          Aprovar
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>

                  {/* Botão Excluir (Não dono) */}
                  {member.role !== 'owner' && (
                    <TouchableOpacity
                      onPress={() => handleDeleteMember(member)}
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 6,
                        borderRadius: 8,
                        backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2',
                      }}
                    >
                      <Trash2 size={13} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* MODAL 1: CONVIDAR USUÁRIO */}
      <Modal visible={showInviteModal} transparent animationType="slide">
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
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
                Convidar para a Equipe
              </Text>
              <TouchableOpacity onPress={() => setShowInviteModal(false)}>
                <X size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
              Selecione o Cargo do Convite:
            </Text>

            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
              {(
                [
                  { key: 'agent', label: 'Corretor' },
                  { key: 'attendant', label: 'Atendente' },
                  { key: 'admin', label: 'Administrativo' },
                  { key: 'manager', label: 'Gerente' },
                ] as const
              ).map((item) => {
                const selected = inviteRole === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    onPress={() => setInviteRole(item.key)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: selected ? '#0ea5e9' : colors.border,
                      backgroundColor: selected ? 'rgba(14, 165, 233, 0.15)' : colors.mutedSurface,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: selected ? '700' : '500',
                        color: selected ? '#0ea5e9' : colors.text,
                      }}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Link Preview Card */}
            <View
              style={{
                backgroundColor: colors.mutedSurface,
                borderRadius: 10,
                padding: 12,
                borderWidth: 1,
                borderColor: colors.border,
                marginBottom: 16,
              }}
            >
              <Text style={{ fontSize: 10, color: colors.textMuted, marginBottom: 4 }}>
                LINK DE CONVITE OFICIAL:
              </Text>
              <Text
                style={{ fontSize: 11, color: colors.text, fontFamily: 'monospace' }}
                numberOfLines={2}
              >
                {getInviteUrl()}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={handleCopyLink}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  paddingVertical: 13,
                  borderRadius: 10,
                  backgroundColor: colors.mutedSurface,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                {copiedLink ? (
                  <>
                    <Check size={16} color="#10b981" />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#10b981' }}>
                      Copiado!
                    </Text>
                  </>
                ) : (
                  <>
                    <Copy size={16} color={colors.text} />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>
                      Copiar Link
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleShareWhatsApp}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  paddingVertical: 13,
                  borderRadius: 10,
                  backgroundColor: '#25D366',
                }}
              >
                <Share2 size={16} color="#ffffff" />
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#ffffff' }}>WhatsApp</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: ALTERAR CARGO */}
      <Modal visible={!!selectedMemberForRole} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.7)',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 20,
              padding: 20,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
                Alterar Cargo
              </Text>
              <TouchableOpacity onPress={() => setSelectedMemberForRole(null)}>
                <X size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 14 }}>
              Selecione o novo cargo para {selectedMemberForRole?.name || selectedMemberForRole?.email}:
            </Text>

            <View style={{ gap: 8 }}>
              {[
                { key: 'manager', label: 'Gerente', desc: 'Acesso total de gestão' },
                { key: 'admin', label: 'Administrativo', desc: 'Gestão operacional e financeira' },
                { key: 'attendant', label: 'Atendente', desc: 'Triagem e distribuição de leads' },
                { key: 'agent', label: 'Corretor', desc: 'Operação de funil e carteira de imóveis' },
              ].map((roleItem) => {
                const currentRoleKey =
                  selectedMemberForRole?.role === 'corretor' ? 'agent' : selectedMemberForRole?.role;
                const isSelected = currentRoleKey === roleItem.key;
                return (
                  <TouchableOpacity
                    key={roleItem.key}
                    onPress={() => handleUpdateRole(roleItem.key)}
                    disabled={savingRole}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 12,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: isSelected ? '#0ea5e9' : colors.border,
                      backgroundColor: isSelected ? 'rgba(14, 165, 233, 0.12)' : colors.mutedSurface,
                    }}
                  >
                    <View>
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: '700',
                          color: isSelected ? '#0ea5e9' : colors.text,
                        }}
                      >
                        {roleItem.label}
                      </Text>
                      <Text style={{ fontSize: 11, color: colors.textMuted }}>{roleItem.desc}</Text>
                    </View>
                    {isSelected && <Check size={16} color="#0ea5e9" />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 3: PERMISSÕES INDIVIDUAIS COM 5 ACCORDIONS */}
      <Modal visible={!!selectedMemberForPerms} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: colors.card,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 20,
              maxHeight: '90%',
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            {/* Cabeçalho */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <View>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
                  Permissões Individuais
                </Text>
                <Text style={{ fontSize: 12, color: colors.textMuted }}>
                  {selectedMemberForPerms?.name || selectedMemberForPerms?.email} (
                  {ROLE_LABELS[selectedMemberForPerms?.role || '']?.label || selectedMemberForPerms?.role})
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedMemberForPerms(null)}>
                <X size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Botão Restaurar Padrão do Cargo */}
            <TouchableOpacity
              onPress={handleResetToRoleDefault}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                alignSelf: 'flex-start',
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 6,
                backgroundColor: colors.mutedSurface,
                marginBottom: 14,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <RotateCcw size={12} color={colors.textMuted} />
              <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textMuted }}>
                Restaurar Padrão do Cargo
              </Text>
            </TouchableOpacity>

            {/* Accordions de Permissão */}
            <ScrollView showsVerticalScrollIndicator={false} style={{ marginBottom: 14 }}>
              {PERMISSION_GROUPS.map((group) => {
                const isExpanded = !!expandedGroups[group.id];
                return (
                  <View
                    key={group.id}
                    style={{
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: colors.border,
                      backgroundColor: colors.mutedSurface,
                      marginBottom: 10,
                      overflow: 'hidden',
                    }}
                  >
                    <TouchableOpacity
                      onPress={() =>
                        setExpandedGroups((prev) => ({ ...prev, [group.id]: !prev[group.id] }))
                      }
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 12,
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        {getGroupIcon(group.icon)}
                        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>
                          {group.title}
                        </Text>
                      </View>
                      {isExpanded ? (
                        <ChevronUp size={16} color={colors.textMuted} />
                      ) : (
                        <ChevronDown size={16} color={colors.textMuted} />
                      )}
                    </TouchableOpacity>

                    {isExpanded && (
                      <View
                        style={{
                          paddingHorizontal: 12,
                          paddingBottom: 8,
                          borderTopWidth: 1,
                          borderTopColor: colors.border,
                          backgroundColor: colors.card,
                        }}
                      >
                        {group.permissions.map((perm) => {
                          const isEnabled = !!memberPerms[perm.key];
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
                              <View style={{ flex: 1, paddingRight: 10 }}>
                                <Text
                                  style={{ fontSize: 12, fontWeight: '600', color: colors.text }}
                                >
                                  {perm.label}
                                </Text>
                                <Text
                                  style={{ fontSize: 10, color: colors.textMuted, marginTop: 1 }}
                                >
                                  {perm.description}
                                </Text>
                              </View>
                              <Switch
                                value={isEnabled}
                                onValueChange={(val) =>
                                  setMemberPerms((prev) => ({ ...prev, [perm.key]: val }))
                                }
                                trackColor={{ false: colors.border, true: '#0ea5e9' }}
                                thumbColor="#ffffff"
                              />
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>

            {/* Salvar Permissões */}
            <TouchableOpacity
              onPress={handleSavePerms}
              disabled={savingPerms}
              style={{
                backgroundColor: '#0ea5e9',
                paddingVertical: 13,
                borderRadius: 10,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {savingPerms ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#ffffff' }}>
                  Salvar Permissões
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

