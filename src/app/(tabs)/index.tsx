import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Award,
  Building2,
  Clock,
  Eye,
  EyeOff,
  Flame,
  Moon,
  Phone,
  Sun,
  Users,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { Lead } from '../../types';

export default function DashboardScreen() {
  const { user, profile, company } = useAuth();
  const { colors, isDark, themeMode, setThemeMode } = useAppTheme();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hideValues, setHideValues] = useState(false);
  const [stats, setStats] = useState({
    propertiesCount: 0,
    newLeadsCount: 0,
    myLeadsCount: 0,
  });
  const [urgentLeads, setUrgentLeads] = useState<Lead[]>([]);

  const loadDashboardData = useCallback(async () => {
    try {
      if (!user) return;

      // 1. Contagem de Imóveis disponíveis
      let propQuery = supabase
        .from('properties')
        .select('id', { count: 'exact', head: true });

      if (profile?.company_id) {
        propQuery = propQuery.eq('company_id', profile.company_id);
      }

      const { count: propCount } = await propQuery;

      // 2. Contagem de Leads novos e leads do corretor
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
        .eq('status', 'Aguardando Atendimento');

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

  const toggleTheme = () => {
    setThemeMode(isDark ? 'light' : 'dark');
  };

  const firstName = profile?.name ? profile.name.split(' ')[0] : 'Corretor';
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

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 20, paddingTop: 56 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0ea5e9" />}
    >
      {/* Header com Saudação + Alternador de Tema */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text
              style={{
                fontFamily: 'Sora_400Regular',
                fontSize: 14,
                color: colors.textMuted,
              }}
            >
              Olá,
            </Text>
            <Text
              style={{
                fontFamily: 'Sora_700Bold',
                fontSize: 18,
                color: colors.text,
              }}
            >
              {firstName} 👋
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 }}>
            <View
              style={{
                backgroundColor: 'rgba(14, 165, 233, 0.15)',
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 8,
              }}
            >
              <Text
                style={{
                  fontFamily: 'Sora_600SemiBold',
                  fontSize: 11,
                  color: '#0ea5e9',
                }}
              >
                {roleLabel}
              </Text>
            </View>
            {company?.name && (
              <Text
                style={{
                  fontFamily: 'Sora_400Regular',
                  fontSize: 12,
                  color: colors.textMuted,
                }}
                numberOfLines={1}
              >
                {company.name}
              </Text>
            )}
          </View>
        </View>

        {/* Botões rápidos: Olho de privacidade e Tema Claro/Escuro */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            onPress={() => setHideValues(!hideValues)}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {hideValues ? <EyeOff size={18} color={colors.textMuted} /> : <Eye size={18} color={colors.textMuted} />}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={toggleTheme}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isDark ? <Sun size={18} color="#f59e0b" /> : <Moon size={18} color="#0ea5e9" />}
          </TouchableOpacity>
        </View>
      </View>

      {/* Card da Liga dos Corretores (Gamificação) */}
      <View
        style={{
          backgroundColor: '#082f49', // Brand 950
          borderRadius: 20,
          padding: 18,
          marginBottom: 20,
          borderWidth: 1,
          borderColor: '#0284c7',
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                backgroundColor: '#0ea5e9',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Award size={24} color="#ffffff" />
            </View>
            <View>
              <Text style={{ fontFamily: 'Sora_700Bold', fontSize: 15, color: '#ffffff' }}>
                {profile?.level_title || 'Corretor Júnior'}
              </Text>
              <Text style={{ fontFamily: 'Sora_400Regular', fontSize: 12, color: '#38bdf8' }}>
                Nível {profile?.level || 1} • {profile?.xp_points || 0} XP Acumulados
              </Text>
            </View>
          </View>
          <View
            style={{
              backgroundColor: 'rgba(56, 189, 248, 0.2)',
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 10,
            }}
          >
            <Text style={{ fontFamily: 'Sora_700Bold', fontSize: 12, color: '#38bdf8' }}>Liga PRO</Text>
          </View>
        </View>
      </View>

      {/* Grid de KPIs Rápidos */}
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
        {/* Card Imóveis */}
        <View
          style={{
            flex: 1,
            backgroundColor: colors.card,
            borderRadius: 18,
            padding: 16,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: 'rgba(14, 165, 233, 0.15)',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 10,
            }}
          >
            <Building2 size={20} color="#0ea5e9" />
          </View>
          <Text style={{ fontFamily: 'Sora_400Regular', fontSize: 12, color: colors.textMuted }}>
            Imóveis Ativos
          </Text>
          <Text style={{ fontFamily: 'Sora_800ExtraBold', fontSize: 22, color: colors.text, marginTop: 2 }}>
            {hideValues ? '••' : stats.propertiesCount}
          </Text>
        </View>

        {/* Card Leads Novos */}
        <View
          style={{
            flex: 1,
            backgroundColor: colors.card,
            borderRadius: 18,
            padding: 16,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 10,
            }}
          >
            <Flame size={20} color="#f59e0b" />
          </View>
          <Text style={{ fontFamily: 'Sora_400Regular', fontSize: 12, color: colors.textMuted }}>
            Aguardando Contato
          </Text>
          <Text style={{ fontFamily: 'Sora_800ExtraBold', fontSize: 22, color: colors.text, marginTop: 2 }}>
            {hideValues ? '••' : stats.newLeadsCount}
          </Text>
        </View>
      </View>

      {/* Seção Leads Recentes */}
      <View style={{ marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontFamily: 'Sora_700Bold', fontSize: 17, color: colors.text }}>
          Leads Recentes
        </Text>
        <Text style={{ fontFamily: 'Sora_600SemiBold', fontSize: 13, color: '#0ea5e9' }}>
          Ver Funil Completo
        </Text>
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
          <Users size={32} color={colors.textMuted} style={{ marginBottom: 8 }} />
          <Text style={{ fontFamily: 'Sora_600SemiBold', fontSize: 14, color: colors.text }}>
            Nenhum lead pendente no momento
          </Text>
          <Text style={{ fontFamily: 'Sora_400Regular', fontSize: 12, color: colors.textMuted, marginTop: 4 }}>
            Novas captações aparecerão automaticamente aqui.
          </Text>
        </View>
      ) : (
        urgentLeads.map((item) => (
          <View
            key={item.id}
            style={{
              backgroundColor: colors.card,
              borderRadius: 16,
              padding: 16,
              marginBottom: 10,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontFamily: 'Sora_700Bold', fontSize: 15, color: colors.text }}>
                {item.name}
              </Text>
              <View
                style={{
                  backgroundColor:
                    item.status === 'Aguardando Atendimento'
                      ? 'rgba(245, 158, 11, 0.15)'
                      : 'rgba(16, 185, 129, 0.15)',
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 8,
                }}
              >
                <Text
                  style={{
                    fontFamily: 'Sora_600SemiBold',
                    fontSize: 11,
                    color: item.status === 'Aguardando Atendimento' ? '#f59e0b' : '#10b981',
                  }}
                >
                  {item.status}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Phone size={13} color={colors.textMuted} />
                <Text style={{ fontFamily: 'Sora_400Regular', fontSize: 12, color: colors.textMuted }}>
                  {item.phone || 'Sem telefone'}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Clock size={13} color={colors.textMuted} />
                <Text style={{ fontFamily: 'Sora_400Regular', fontSize: 12, color: colors.textMuted }}>
                  {item.source || 'Site'}
                </Text>
              </View>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}
