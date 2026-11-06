import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Award,
  Bell,
  Building2,
  ChevronRight,
  Clock,
  Eye,
  EyeOff,
  FileText,
  Flame,
  Phone,
  Users,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { Lead } from '../../types';
import { NotificationsModal } from '../../components/notifications/NotificationsModal';

export default function DashboardScreen() {
  const router = useRouter();
  const { user, profile, company } = useAuth();
  const { colors, isDark } = useAppTheme();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hideValues, setHideValues] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const [stats, setStats] = useState({
    propertiesCount: 0,
    newLeadsCount: 0,
    myLeadsCount: 0,
  });

  const [contractStats, setContractStats] = useState({
    active: 0,
    pending: 0,
    review: 0,
  });

  const [urgentLeads, setUrgentLeads] = useState<Lead[]>([]);

  const loadDashboardData = useCallback(async () => {
    try {
      if (!user) return;

      // 1. Contagem de Notificações não lidas
      const { count: unreadNotifCount } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);

      setUnreadCount(unreadNotifCount || 0);

      // 2. Contagem de Imóveis ativos
      let propQuery = supabase
        .from('properties')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'Disponível');

      if (profile?.company_id) {
        propQuery = propQuery.eq('company_id', profile.company_id);
      }

      const { count: propCount } = await propQuery;

      // 3. Contagem de Leads novos e recentes
      let leadQuery = supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (profile?.company_id) {
        leadQuery = leadQuery.eq('company_id', profile.company_id);
      }

      const { data: leadsData } = await leadQuery;

      let newCountQuery = supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .in('status', ['Aguardando Atendimento', 'Aguardando atendimento', 'Novo Lead', 'Sem Contato']);

      if (profile?.company_id) {
        newCountQuery = newCountQuery.eq('company_id', profile.company_id);
      }

      const { count: newCount } = await newCountQuery;

      setStats({
        propertiesCount: propCount || 0,
        newLeadsCount: newCount || 0,
        myLeadsCount: (leadsData || []).length,
      });

      setUrgentLeads((leadsData as Lead[]) || []);

      // 4. Métricas de Contratos
      let contractsQuery = supabase
        .from('contracts')
        .select('id, status');

      if (profile?.company_id) {
        contractsQuery = contractsQuery.eq('company_id', profile.company_id);
      }

      const { data: contractsData } = await contractsQuery;

      if (contractsData) {
        let active = 0;
        let pending = 0;
        let review = 0;

        contractsData.forEach((c) => {
          if (c.status === 'active' || c.status === 'signed') active++;
          else if (c.status === 'pending') pending++;
          else if (c.status === 'draft' || c.status === 'review') review++;
        });

        setContractStats({ active, pending, review });
      }
    } catch (err) {
      console.warn('Erro ao carregar dados do dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, profile?.company_id]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const firstName = profile?.name ? profile.name.trim().split(' ')[0] : 'Corretor';
  const roleLabel =
    profile?.role === 'owner'
      ? 'Proprietário'
      : profile?.role === 'manager'
      ? 'Gerente'
      : profile?.role === 'admin'
      ? 'Administrador'
      : company?.business_type === 'solo_broker'
      ? 'Corretor Autônomo'
      : 'Corretor Associado';

  const userInitials = profile?.name
    ? profile.name
        .trim()
        .split(' ')
        .slice(0, 2)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : 'U';

  const xpCurrent = profile?.xp_points || 0;
  const xpInLevel = xpCurrent % 1000;
  const xpProgressPercent = Math.min(Math.max((xpInLevel / 1000) * 100, 5), 100);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingTop: 56, paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0ea5e9" />}
      >
        {/* Header com Avatar + Saudação + Ações Rápidas */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
          }}
        >
          {/* Avatar + Nome */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
            {profile?.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: colors.mutedSurface,
                  borderWidth: 1.5,
                  borderColor: colors.border,
                }}
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
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#ffffff' }}>
                  {userInitials}
                </Text>
              </View>
            )}

            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 13, color: colors.textMuted }}>Olá,</Text>
                <Text
                  style={{ fontSize: 16, fontWeight: '700', color: colors.text }}
                  numberOfLines={1}
                >
                  {firstName}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 6 }}>
                <View
                  style={{
                    backgroundColor: isDark ? 'rgba(14, 165, 233, 0.15)' : '#e0f2fe',
                    paddingHorizontal: 7,
                    paddingVertical: 2,
                    borderRadius: 6,
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '600', color: '#0ea5e9' }}>
                    {roleLabel}
                  </Text>
                </View>

                {company?.name && (
                  <Text
                    style={{ fontSize: 11, color: colors.textMuted, flex: 1 }}
                    numberOfLines={1}
                  >
                    • {company.name}
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* Botões do Header: Olho, Tema, Sino de Notificações */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              onPress={() => setHideValues(!hideValues)}
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              activeOpacity={0.7}
            >
              {hideValues ? <EyeOff size={16} color={colors.textMuted} /> : <Eye size={16} color={colors.textMuted} />}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowNotifications(true)}
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
              activeOpacity={0.7}
            >
              <Bell size={16} color={colors.text} />
              {unreadCount > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    backgroundColor: '#ef4444',
                    minWidth: 18,
                    height: 18,
                    borderRadius: 9,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 4,
                  }}
                >
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#ffffff' }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Card Contratos & Assinaturas Digitais (Clicável com Métricas) */}
        <TouchableOpacity
          onPress={() => router.push('/contracts')}
          activeOpacity={0.85}
          style={{
            backgroundColor: colors.card,
            borderRadius: 16,
            padding: 16,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: isDark ? 'rgba(14, 165, 233, 0.15)' : '#e0f2fe',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FileText size={18} color="#0ea5e9" />
              </View>
              <View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>
                  Contratos & Assinaturas
                </Text>
                <Text style={{ fontSize: 11, color: colors.textMuted }}>
                  Fluxo jurídico e assinaturas digitais
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View
              style={{
                flex: 1,
                backgroundColor: colors.mutedSurface,
                borderRadius: 10,
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#10b981' }} />
                <Text style={{ fontSize: 11, color: colors.textMuted }}>Ativos</Text>
              </View>
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>
                {hideValues ? '••' : contractStats.active}
              </Text>
            </View>

            <View
              style={{
                flex: 1,
                backgroundColor: colors.mutedSurface,
                borderRadius: 10,
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#f59e0b' }} />
                <Text style={{ fontSize: 11, color: colors.textMuted }}>Aguardando</Text>
              </View>
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>
                {hideValues ? '••' : contractStats.pending}
              </Text>
            </View>

            <View
              style={{
                flex: 1,
                backgroundColor: colors.mutedSurface,
                borderRadius: 10,
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#0ea5e9' }} />
                <Text style={{ fontSize: 11, color: colors.textMuted }}>Revisão</Text>
              </View>
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>
                {hideValues ? '••' : contractStats.review}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Card Gamificação - Liga dos Corretores */}
        <View
          style={{
            backgroundColor: isDark ? '#111827' : '#0f172a',
            borderRadius: 16,
            padding: 16,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: isDark ? '#1f2937' : '#334155',
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  backgroundColor: '#0ea5e9',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Award size={20} color="#ffffff" />
              </View>
              <View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#ffffff' }}>
                  {profile?.level_title || 'Corretor Estreante'}
                </Text>
                <Text style={{ fontSize: 11, color: '#94a3b8' }}>
                  Nível {profile?.level || 1} • {xpCurrent} XP
                </Text>
              </View>
            </View>
            <View
              style={{
                backgroundColor: 'rgba(56, 189, 248, 0.15)',
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 8,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#38bdf8' }}>LIGA PRO</Text>
            </View>
          </View>

          {/* Barra de Progresso XP */}
          <View style={{ marginTop: 2 }}>
            <View
              style={{
                height: 6,
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: 3,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  height: '100%',
                  width: `${xpProgressPercent}%`,
                  backgroundColor: '#0ea5e9',
                  borderRadius: 3,
                }}
              />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
              <Text style={{ fontSize: 10, color: '#64748b' }}>{xpInLevel} XP</Text>
              <Text style={{ fontSize: 10, color: '#64748b' }}>Próximo nível: 1.000 XP</Text>
            </View>
          </View>
        </View>

        {/* Grid de KPIs Rápidos */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
          {/* Imóveis Ativos */}
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/properties')}
            activeOpacity={0.8}
            style={{
              flex: 1,
              backgroundColor: colors.card,
              borderRadius: 16,
              padding: 14,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: isDark ? 'rgba(14, 165, 233, 0.15)' : '#e0f2fe',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 8,
              }}
            >
              <Building2 size={16} color="#0ea5e9" />
            </View>
            <Text style={{ fontSize: 11, color: colors.textMuted }}>Imóveis Ativos</Text>
            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text, marginTop: 2 }}>
              {hideValues ? '••' : stats.propertiesCount}
            </Text>
          </TouchableOpacity>

          {/* Leads Novos */}
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/leads')}
            activeOpacity={0.8}
            style={{
              flex: 1,
              backgroundColor: colors.card,
              borderRadius: 16,
              padding: 14,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fef3c7',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 8,
              }}
            >
              <Flame size={16} color="#f59e0b" />
            </View>
            <Text style={{ fontSize: 11, color: colors.textMuted }}>Aguardando Contato</Text>
            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text, marginTop: 2 }}>
              {hideValues ? '••' : stats.newLeadsCount}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Seção Leads Recentes */}
        <View style={{ marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
            Leads Recentes
          </Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/leads')}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#0ea5e9' }}>
              Ver Todos
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color="#0ea5e9" style={{ marginVertical: 20 }} />
        ) : urgentLeads.length === 0 ? (
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 16,
              padding: 24,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Users size={28} color={colors.textMuted} style={{ marginBottom: 8 }} />
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
              Nenhum lead pendente no momento
            </Text>
            <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>
              Novas captações aparecerão automaticamente aqui.
            </Text>
          </View>
        ) : (
          urgentLeads.map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => router.push('/(tabs)/leads')}
              activeOpacity={0.7}
              style={{
                backgroundColor: colors.card,
                borderRadius: 14,
                padding: 14,
                marginBottom: 10,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, flex: 1, marginRight: 8 }} numberOfLines={1}>
                  {item.name}
                </Text>
                <View
                  style={{
                    backgroundColor:
                      item.status === 'Aguardando Atendimento' || item.status === 'Novo Lead'
                        ? isDark ? 'rgba(245, 158, 11, 0.15)' : '#fef3c7'
                        : isDark ? 'rgba(16, 185, 129, 0.15)' : '#d1fae5',
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 6,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '600',
                      color:
                        item.status === 'Aguardando Atendimento' || item.status === 'Novo Lead'
                          ? '#f59e0b'
                          : '#10b981',
                    }}
                  >
                    {item.status}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Phone size={12} color={colors.textMuted} />
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>
                    {item.phone || 'Sem telefone'}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Clock size={12} color={colors.textMuted} />
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>
                    {item.source || 'Site'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Modal de Notificações */}
      <NotificationsModal
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
        onNotificationRead={() => loadDashboardData()}
      />
    </View>
  );
}
