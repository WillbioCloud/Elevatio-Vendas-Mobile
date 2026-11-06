import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Filter,
  Plus,
  Search,
  Users,
  X,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { Lead } from '../../types';
import { LeadCard } from '../../components/leads/LeadCard';
import { LeadDetailsSheet } from '../../components/leads/LeadDetailsSheet';
import { NewLeadModal } from '../../components/leads/NewLeadModal';

interface StatusFilterItem {
  id: string;
  label: string;
  matcher: (status: string) => boolean;
}

const FILTER_PILLS: StatusFilterItem[] = [
  { id: 'todos', label: 'Todos', matcher: () => true },
  { id: 'aguardando', label: 'Aguardando', matcher: (s) => s.toLowerCase().includes('aguardando') || s.toLowerCase().includes('novo') },
  { id: 'atendimento', label: 'Atendimento', matcher: (s) => s.toLowerCase().includes('atendimento') || s.toLowerCase().includes('interesse') },
  { id: 'visita', label: 'Visita', matcher: (s) => s.toLowerCase().includes('visita') || s.toLowerCase().includes('agend') },
  { id: 'proposta', label: 'Proposta', matcher: (s) => s.toLowerCase().includes('proposta') || s.toLowerCase().includes('pedido') },
  { id: 'fechado', label: 'Fechado', matcher: (s) => s.toLowerCase().includes('fechad') || s.toLowerCase().includes('venda') },
  { id: 'perdidos', label: 'Perdidos', matcher: (s) => s.toLowerCase().includes('perdid') || s.toLowerCase().includes('recusad') },
];

export default function LeadsScreen() {
  const { user, profile, permissions } = useAuth();
  const { colors, isDark } = useAppTheme();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeFilterId, setActiveFilterId] = useState('todos');

  // Modais
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isNewLeadModalVisible, setIsNewLeadModalVisible] = useState(false);

  const fetchLeads = useCallback(async () => {
    try {
      if (!user) return;

      let query = supabase
        .from('leads')
        .select(`
          id, name, phone, email, status, funnel_step, source, budget,
          loss_reason, last_interaction, stage_updated_at, assigned_to,
          created_at, message, property_id,
          properties:property_id ( id, title, price ),
          assigned_user:assigned_to ( id, name, avatar_url, phone )
        `)
        .order('created_at', { ascending: false });

      if (profile?.company_id) {
        query = query.eq('company_id', profile.company_id);
      }

      // Se não puder ver leads da equipe, restringe aos próprios
      if (!permissions.canViewTeamLeads) {
        query = query.eq('assigned_to', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      setLeads((data as unknown as Lead[]) || []);
    } catch (err) {
      console.warn('Erro ao carregar lista de leads:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, profile?.company_id, permissions.canViewTeamLeads]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLeads();
  };

  // Contadores por pílula de status
  const pillCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    FILTER_PILLS.forEach((pill) => {
      if (pill.id === 'todos') {
        counts[pill.id] = leads.length;
      } else {
        counts[pill.id] = leads.filter((l) => pill.matcher(l.status || '')).length;
      }
    });
    return counts;
  }, [leads]);

  // Filtro ativo + busca em tempo real (nome, telefone, imóvel)
  const filteredLeads = useMemo(() => {
    const activePill = FILTER_PILLS.find((p) => p.id === activeFilterId) || FILTER_PILLS[0];

    return leads.filter((item) => {
      const matchesStage = activePill.matcher(item.status || '');
      const searchLower = search.toLowerCase().trim();

      if (!searchLower) return matchesStage;

      const matchesName = (item.name || '').toLowerCase().includes(searchLower);
      const matchesPhone = (item.phone || '').includes(searchLower);
      const matchesProperty = (item.properties?.title || '').toLowerCase().includes(searchLower);

      return matchesStage && (matchesName || matchesPhone || matchesProperty);
    });
  }, [leads, activeFilterId, search]);

  const handleNewLeadCreated = (newLead: Lead) => {
    setLeads((prev) => [newLead, ...prev]);
    fetchLeads();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: 52 }}>
      {/* Header com Título e Estatísticas */}
      <View style={{ paddingHorizontal: 20, marginBottom: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text }}>
              Funil de Leads
            </Text>
            <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
              {!permissions.canViewTeamLeads ? 'Meus Leads Atribuídos' : 'Gestão Geral de Leads'} • {leads.length} no total
            </Text>
          </View>

          {/* Botão Novo Lead */}
          <TouchableOpacity
            onPress={() => setIsNewLeadModalVisible(true)}
            style={{
              backgroundColor: '#0ea5e9',
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 10,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
            }}
            activeOpacity={0.8}
          >
            <Plus size={15} color="#ffffff" />
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#ffffff' }}>
              Novo Lead
            </Text>
          </TouchableOpacity>
        </View>

        {/* Input de Busca Instantânea */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.card,
            borderRadius: 12,
            paddingHorizontal: 12,
            height: 44,
            marginTop: 14,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Search size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={{
              flex: 1,
              fontSize: 14,
              color: colors.text,
            }}
            placeholder="Buscar por nome, telefone ou imóvel..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <X size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Pílulas de Filtro de Etapas com Contadores */}
      <View style={{ marginBottom: 12 }}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={FILTER_PILLS}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
          renderItem={({ item }) => {
            const isSelected = activeFilterId === item.id;
            const count = pillCounts[item.id] || 0;

            return (
              <TouchableOpacity
                onPress={() => setActiveFilterId(item.id)}
                style={{
                  backgroundColor: isSelected ? '#0ea5e9' : colors.card,
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: isSelected ? '#0ea5e9' : colors.border,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: isSelected ? '700' : '500',
                    color: isSelected ? '#ffffff' : colors.text,
                  }}
                >
                  {item.label}
                </Text>
                <View
                  style={{
                    backgroundColor: isSelected
                      ? 'rgba(255, 255, 255, 0.25)'
                      : colors.mutedSurface,
                    paddingHorizontal: 6,
                    paddingVertical: 1,
                    borderRadius: 6,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: '700',
                      color: isSelected ? '#ffffff' : colors.textMuted,
                    }}
                  >
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Lista de Leads */}
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#0ea5e9" size="large" />
          <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 10 }}>
            Carregando funil de vendas...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredLeads}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 110 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0ea5e9" />
          }
          ListEmptyComponent={
            <View
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 64,
                paddingHorizontal: 24,
              }}
            >
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 18,
                  backgroundColor: colors.mutedSurface,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Users size={28} color={colors.textMuted} />
              </View>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, textAlign: 'center' }}>
                Nenhum lead nesta etapa
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: colors.textMuted,
                  marginTop: 4,
                  textAlign: 'center',
                  lineHeight: 18,
                }}
              >
                {search.length > 0
                  ? 'Não encontramos nenhum lead correspondente à sua busca.'
                  : 'Novos leads captados aparecerão automaticamente aqui.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <LeadCard
              lead={item}
              showAssignee={permissions.canViewTeamLeads}
              onPress={(lead) => setSelectedLead(lead)}
            />
          )}
        />
      )}

      {/* Floating Action Button (FAB) + */}
      <TouchableOpacity
        onPress={() => setIsNewLeadModalVisible(true)}
        style={{
          position: 'absolute',
          bottom: 96,
          right: 20,
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: '#0ea5e9',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#0ea5e9',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35,
          shadowRadius: 8,
          elevation: 5,
        }}
        activeOpacity={0.85}
      >
        <Plus size={24} color="#ffffff" />
      </TouchableOpacity>

      {/* Sheet de Detalhes do Lead (Kanban, Timeline, Match IA, Tarefas) */}
      <LeadDetailsSheet
        visible={!!selectedLead}
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
        onLeadUpdated={fetchLeads}
      />

      {/* Modal de Novo Lead */}
      <NewLeadModal
        visible={isNewLeadModalVisible}
        onClose={() => setIsNewLeadModalVisible(false)}
        onSuccess={handleNewLeadCreated}
      />
    </View>
  );
}
