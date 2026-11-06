import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Eye,
  FileCheck,
  FileText,
  Filter,
  PenTool,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
  X,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Contract, Profile } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { formatCurrency, timeAgo } from '../../utils/crm';
import { ContractReviewModal } from '../../components/contracts/ContractReviewModal';
import { SignatureTrackerModal } from '../../components/contracts/SignatureTrackerModal';

type FilterType = 'all' | 'sales' | 'rents' | 'pending' | 'signed';

export default function ContractsScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { colors, isDark } = useAppTheme();

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, { name: string; avatar_url?: string }>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  // Modais
  const [reviewContract, setReviewContract] = useState<Contract | null>(null);
  const [trackerContract, setTrackerContract] = useState<Contract | null>(null);

  const fetchContracts = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);

      // Busca contratos
      let query = supabase
        .from('contracts')
        .select(`
          id, type, status, sale_total_value, rent_value, content, html_content,
          notes, created_at, updated_at, company_id, broker_id, lead_id, property_id, created_by
        `)
        .order('created_at', { ascending: false });

      if (profile?.company_id) {
        query = query.eq('company_id', profile.company_id);
      }

      // Busca perfis para mapeamento do corretor responsável sem risco de erro de FK
      let profQuery = supabase
        .from('profiles')
        .select('id, name, avatar_url');

      if (profile?.company_id) {
        profQuery = profQuery.eq('company_id', profile.company_id);
      }

      const [{ data: contractsData, error: contractsErr }, { data: profsData }] = await Promise.all([
        query,
        profQuery,
      ]);

      if (contractsErr) throw contractsErr;

      const pMap: Record<string, { name: string; avatar_url?: string }> = {};
      if (profsData) {
        profsData.forEach((p: any) => {
          pMap[p.id] = { name: p.name || 'Corretor', avatar_url: p.avatar_url };
        });
      }
      setProfilesMap(pMap);
      setContracts((contractsData as unknown as Contract[]) || []);
    } catch (err) {
      console.warn('Erro ao carregar contratos:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, profile?.company_id]);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchContracts();
  };

  // KPIs
  const kpis = useMemo(() => {
    let salesVgv = 0;
    let rentMrr = 0;
    let pendingCount = 0;

    contracts.forEach((c) => {
      if (c.status === 'active' || c.status === 'signed') {
        if (c.sale_total_value) salesVgv += Number(c.sale_total_value);
        if (c.rent_value) rentMrr += Number(c.rent_value);
      } else if (c.status === 'pending') {
        pendingCount++;
      }
    });

    return { salesVgv, rentMrr, pendingCount };
  }, [contracts]);

  // Filtros
  const filteredContracts = useMemo(() => {
    return contracts.filter((c) => {
      if (activeFilter === 'sales' && c.type !== 'sale') return false;
      if (activeFilter === 'rents' && c.type !== 'rent') return false;
      if (activeFilter === 'pending' && c.status !== 'pending') return false;
      if (activeFilter === 'signed' && c.status !== 'active' && c.status !== 'signed') return false;

      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const matchType = (c.type || '').toLowerCase().includes(q);
      const matchStatus = (c.status || '').toLowerCase().includes(q);
      const matchNotes = (c.notes || '').toLowerCase().includes(q);
      const brokerId = c.broker_id || c.created_by;
      const matchBroker = brokerId && profilesMap[brokerId]?.name.toLowerCase().includes(q);
      return matchType || matchStatus || matchNotes || matchBroker;
    });
  }, [contracts, activeFilter, search, profilesMap]);

  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'active' || s === 'signed') {
      return { label: 'Assinado / Ativo', bg: isDark ? 'rgba(16, 185, 129, 0.15)' : '#d1fae5', text: '#10b981' };
    }
    if (s === 'pending') {
      return { label: 'Aguardando Assinatura', bg: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fef3c7', text: '#f59e0b' };
    }
    if (s === 'canceled') {
      return { label: 'Cancelado', bg: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2', text: '#ef4444' };
    }
    return { label: 'Rascunho / Revisão', bg: isDark ? 'rgba(14, 165, 233, 0.15)' : '#e0f2fe', text: '#0ea5e9' };
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: 52 }}>
      {/* Header com Voltar e Botão de Minha Assinatura */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          marginBottom: 16,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              backgroundColor: colors.card,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <ArrowLeft size={18} color={colors.text} />
          </TouchableOpacity>
          <View>
            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>
              Contratos & Assinaturas
            </Text>
            <Text style={{ fontSize: 11, color: colors.textMuted }}>
              Gestão jurídica e assinaturas digitais
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => router.push('/signature')}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: colors.card,
            paddingHorizontal: 10,
            paddingVertical: 8,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: colors.border,
          }}
          activeOpacity={0.7}
        >
          <PenTool size={14} color="#0ea5e9" />
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#0ea5e9' }}>
            Minha Assinatura
          </Text>
        </TouchableOpacity>
      </View>

      {/* KPIs Rápidos */}
      <View style={{ paddingHorizontal: 20, marginBottom: 14 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View
            style={{
              flex: 1,
              backgroundColor: colors.card,
              borderRadius: 12,
              padding: 12,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ fontSize: 11, color: colors.textMuted }}>VGV Assinado</Text>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#10b981', marginTop: 2 }}>
              {formatCurrency(kpis.salesVgv)}
            </Text>
          </View>

          <View
            style={{
              flex: 1,
              backgroundColor: colors.card,
              borderRadius: 12,
              padding: 12,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ fontSize: 11, color: colors.textMuted }}>Locações MRR</Text>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#0ea5e9', marginTop: 2 }}>
              {formatCurrency(kpis.rentMrr)}
            </Text>
          </View>

          <View
            style={{
              flex: 1,
              backgroundColor: colors.card,
              borderRadius: 12,
              padding: 12,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ fontSize: 11, color: colors.textMuted }}>Pendentes</Text>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#f59e0b', marginTop: 2 }}>
              {kpis.pendingCount}
            </Text>
          </View>
        </View>
      </View>

      {/* Barra de Busca */}
      <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.card,
            borderRadius: 12,
            paddingHorizontal: 12,
            height: 42,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Search size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar por tipo, status, notas ou corretor..."
            placeholderTextColor={colors.textMuted}
            style={{ flex: 1, fontSize: 13, color: colors.text }}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <X size={15} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Pílulas de Filtro */}
      <View style={{ marginBottom: 12 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
        >
          {[
            { id: 'all' as FilterType, label: 'Todos' },
            { id: 'pending' as FilterType, label: 'Pendentes de Assinatura' },
            { id: 'signed' as FilterType, label: 'Assinados' },
            { id: 'sales' as FilterType, label: 'Vendas' },
            { id: 'rents' as FilterType, label: 'Locações' },
          ].map((pill) => {
            const isSelected = activeFilter === pill.id;
            return (
              <TouchableOpacity
                key={pill.id}
                onPress={() => setActiveFilter(pill.id)}
                style={{
                  backgroundColor: isSelected ? '#0ea5e9' : colors.card,
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: isSelected ? '#0ea5e9' : colors.border,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: isSelected ? '700' : '500',
                    color: isSelected ? '#ffffff' : colors.text,
                  }}
                >
                  {pill.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Lista de Contratos */}
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#0ea5e9" size="large" />
          <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 10 }}>
            Carregando contratos...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredContracts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0ea5e9" />}
          ListEmptyComponent={
            <View style={{ paddingVertical: 60, alignItems: 'center' }}>
              <FileText size={36} color={colors.textMuted} style={{ marginBottom: 10 }} />
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
                Nenhum contrato encontrado
              </Text>
              <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 4, textAlign: 'center' }}>
                Os contratos são gerados na web ou ao fechar vendas no funil.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const badge = getStatusBadge(item.status);
            const value = item.sale_total_value || item.rent_value || 0;
            const typeLabel =
              item.type === 'sale'
                ? 'Contrato de Compra e Venda'
                : item.type === 'rent'
                ? 'Contrato de Locação'
                : item.type === 'intermediation'
                ? 'Termo de Intermediação'
                : 'Contrato Imobiliário';

            const brokerId = item.broker_id || item.created_by;
            const brokerName = brokerId ? profilesMap[brokerId]?.name : null;

            return (
              <View
                style={{
                  backgroundColor: colors.card,
                  borderRadius: 14,
                  padding: 16,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                {/* Header do Card */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }} numberOfLines={1}>
                      {typeLabel}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                      Criado em {new Date(item.created_at).toLocaleDateString('pt-BR')}
                    </Text>
                  </View>

                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 6,
                      backgroundColor: badge.bg,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '600', color: badge.text }}>
                      {badge.label}
                    </Text>
                  </View>
                </View>

                {/* Tag do Corretor Responsável (Pilar 3) */}
                {brokerName && (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 5,
                      backgroundColor: isDark ? 'rgba(14, 165, 233, 0.1)' : '#f0f9ff',
                      alignSelf: 'flex-start',
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 6,
                      borderWidth: 1,
                      borderColor: isDark ? 'rgba(14, 165, 233, 0.2)' : '#bae6fd',
                      marginBottom: 8,
                    }}
                  >
                    <UserCheck size={12} color="#0ea5e9" />
                    <Text style={{ fontSize: 11, color: colors.textMuted }}>
                      Corretor: <Text style={{ fontWeight: '700', color: colors.text }}>{brokerName}</Text>
                    </Text>
                  </View>
                )}

                {/* Valor */}
                {value > 0 && (
                  <View
                    style={{
                      backgroundColor: colors.mutedSurface,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 8,
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginVertical: 6,
                    }}
                  >
                    <Text style={{ fontSize: 12, color: colors.textMuted }}>Valor do Negócio:</Text>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#10b981' }}>
                      {formatCurrency(value)}
                    </Text>
                  </View>
                )}

                {/* Botões de Ação Rápida */}
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                  <TouchableOpacity
                    onPress={() => setReviewContract(item)}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      backgroundColor: colors.mutedSurface,
                      paddingVertical: 9,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                    activeOpacity={0.8}
                  >
                    <Eye size={14} color={colors.text} />
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>Revisar / Assinar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setTrackerContract(item)}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      backgroundColor: isDark ? 'rgba(14, 165, 233, 0.15)' : '#e0f2fe',
                      paddingVertical: 9,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: isDark ? 'rgba(14, 165, 233, 0.3)' : '#bae6fd',
                    }}
                    activeOpacity={0.8}
                  >
                    <Users size={14} color="#0ea5e9" />
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#0ea5e9' }}>Rastrear Signatários</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Modal de Revisão */}
      <ContractReviewModal
        visible={!!reviewContract}
        contract={reviewContract}
        onClose={() => setReviewContract(null)}
        onOpenTracker={(c) => setTrackerContract(c)}
        onContractUpdated={fetchContracts}
      />

      {/* Modal de Rastreamento */}
      <SignatureTrackerModal
        visible={!!trackerContract}
        contract={trackerContract}
        onClose={() => setTrackerContract(null)}
        onRefreshContract={fetchContracts}
      />
    </View>
  );
}
