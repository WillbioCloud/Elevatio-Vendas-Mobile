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
import { LeadCard } from '../../components/LeadCard';
import { LeadStageModal } from '../../components/LeadStageModal';
import { LeadTimelineModal } from '../../components/LeadTimelineModal';
import { NewLeadModal } from '../../components/NewLeadModal';

interface StatusFilterItem {
  id: string;
  label: string;
  matcher: (status: string) => boolean;
}

const FILTER_PILLS: StatusFilterItem[] = [
  { id: 'todos', label: 'Todos', matcher: () => true },
  { id: 'aguardando', label: 'Aguardando', matcher: (s) => s.toLowerCase().includes('aguardando') },
  { id: 'atendimento', label: 'Atendimento', matcher: (s) => s.toLowerCase().includes('atendimento') || s.toLowerCase().includes('interesse') },
  { id: 'visita', label: 'Visita', matcher: (s) => s.toLowerCase().includes('visita') || s.toLowerCase().includes('agend') },
  { id: 'proposta', label: 'Proposta', matcher: (s) => s.toLowerCase().includes('proposta') || s.toLowerCase().includes('pedido') },
  { id: 'fechado', label: 'Fechado', matcher: (s) => s.toLowerCase().includes('fechad') || s.toLowerCase().includes('venda') },
  { id: 'perdidos', label: 'Perdidos', matcher: (s) => s.toLowerCase().includes('perdid') || s.toLowerCase().includes('recusad') },
];

export default function LeadsScreen() {
  const { user, profile, isCorretor, isSoloBroker, isAdmin, isManager, isOwner } = useAuth();
  const { colors, isDark } = useAppTheme();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeFilterId, setActiveFilterId] = useState('todos');

  // Modais
  const [stageModalLead, setStageModalLead] = useState<Lead | null>(null);
  const [timelineModalLead, setTimelineModalLead] = useState<Lead | null>(null);
  const [isNewLeadModalVisible, setIsNewLeadModalVisible] = useState(false);

  // Regra de Acesso: Corretor associado vê apenas seus leads; Gestor e Solo Broker veem todos
  const isAssociateCorretor = isCorretor && !isSoloBroker;
  const canViewTeam = isOwner || isAdmin || isManager;

  const fetchLeads = useCallback(async () => {
    try {
      if (!user) return;

      let query = supabase
        .from('leads')
        .select(`
          id, name, phone, email, status, funnel_step, source, budget, value, deal_value,
          sold_property_id, loss_reason, last_interaction, stage_updated_at, assigned_to,
          created_at, message, property_id,
          properties:property_id ( id, title, price ),
          assigned_profile:assigned_to ( id, name, avatar_url, phone )
        `)
        .order('created_at', { ascending: false });

      if (profile?.company_id) {
        query = query.eq('company_id', profile.company_id);
      }

      if (isAssociateCorretor) {
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
  }, [user, profile?.company_id, isAssociateCorretor]);

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

  const handleLeadStageUpdated = (updatedLead: Lead) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === updatedLead.id ? { ...l, ...updatedLead } : l))
    );
  };

  const handleNewLeadCreated = (newLead: Lead) => {
    setLeads((prev) => [newLead, ...prev]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: 52 }}>
      {/* Header com Título e Estatísticas Rápidas */}
      <View style={{ paddingHorizontal: 20, marginBottom: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ fontFamily: 'Sora_800ExtraBold', fontSize: 24, color: colors.text }}>
              Funil de Leads
            </Text>
            <Text style={{ fontFamily: 'Sora_400Regular', fontSize: 13, color: colors.textMuted, marginTop: 2 }}>
              {isAssociateCorretor ? 'Meus Leads Atribuídos' : 'Gestão Geral de Leads'} • {leads.length} no total
            </Text>
          </View>

          {/* Botão Novo Lead Compacto no Header */}
          <TouchableOpacity
            onPress={() => setIsNewLeadModalVisible(true)}
            style={{
              backgroundColor: '#0ea5e9',
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 12,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              shadowColor: '#0ea5e9',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <Plus size={16} color="#ffffff" />
            <Text style={{ fontFamily: 'Sora_700Bold', fontSize: 12, color: '#ffffff' }}>
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
            borderRadius: 14,
            paddingHorizontal: 12,
            height: 46,
            marginTop: 14,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Search size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={{
              flex: 1,
              fontFamily: 'Sora_400Regular',
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
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: isSelected ? '#0ea5e9' : colors.border,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Text
                  style={{
                    fontFamily: isSelected ? 'Sora_700Bold' : 'Sora_600SemiBold',
                    fontSize: 12,
                    color: isSelected ? '#ffffff' : colors.text,
                  }}
                >
                  {item.label}
                </Text>
                <View
                  style={{
                    backgroundColor: isSelected
                      ? 'rgba(255, 255, 255, 0.25)'
                      : isDark
                      ? 'rgba(255, 255, 255, 0.08)'
                      : '#f1f5f9',
                    paddingHorizontal: 6,
                    paddingVertical: 1,
                    borderRadius: 6,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: 'Sora_700Bold',
                      fontSize: 10,
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
          <Text style={{ fontFamily: 'Sora_400Regular', fontSize: 13, color: colors.textMuted, marginTop: 10 }}>
            Carregando funil de vendas...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredLeads}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 96 }}
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
                  width: 64,
                  height: 64,
                  borderRadius: 20,
                  backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 14,
                }}
              >
                <Users size={32} color={colors.textMuted} />
              </View>
              <Text style={{ fontFamily: 'Sora_700Bold', fontSize: 16, color: colors.text, textAlign: 'center' }}>
                Nenhum lead nesta etapa
              </Text>
              <Text
                style={{
                  fontFamily: 'Sora_400Regular',
                  fontSize: 13,
                  color: colors.textMuted,
                  marginTop: 6,
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
              showAssignee={canViewTeam}
              onOpenStageModal={(targetLead) => setStageModalLead(targetLead)}
              onOpenTimeline={(targetLead) => setTimelineModalLead(targetLead)}
            />
          )}
        />
      )}

      {/* Floating Action Button (FAB) + no canto inferior direito */}
      <TouchableOpacity
        onPress={() => setIsNewLeadModalVisible(true)}
        style={{
          position: 'absolute',
          bottom: 24,
          right: 20,
          width: 58,
          height: 58,
          borderRadius: 29,
          backgroundColor: '#0ea5e9',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#0ea5e9',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.4,
          shadowRadius: 10,
          elevation: 6,
        }}
      >
        <Plus size={28} color="#ffffff" />
      </TouchableOpacity>

      {/* Modais de Operação de CRM */}
      <LeadStageModal
        visible={!!stageModalLead}
        lead={stageModalLead}
        onClose={() => setStageModalLead(null)}
        onSuccess={handleLeadStageUpdated}
      />

      <LeadTimelineModal
        visible={!!timelineModalLead}
        lead={timelineModalLead}
        onClose={() => setTimelineModalLead(null)}
        onInteractionAdded={fetchLeads}
      />

      <NewLeadModal
        visible={isNewLeadModalVisible}
        onClose={() => setIsNewLeadModalVisible(false)}
        onSuccess={handleNewLeadCreated}
      />
    </View>
  );
}
