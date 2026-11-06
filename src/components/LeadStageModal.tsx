import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  AlertTriangle,
  Building,
  CheckCircle,
  DollarSign,
  FileText,
  PartyPopper,
  X,
} from 'lucide-react-native';
import { Lead, Property } from '../types';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import { LOSS_REASONS } from '../utils/crm';

interface LeadStageModalProps {
  visible: boolean;
  lead: Lead | null;
  onClose: () => void;
  onSuccess: (updatedLead: Lead) => void;
}

const STAGES = [
  { label: 'Aguardando Atendimento', funnel: 'pre_atendimento', color: '#f59e0b' },
  { label: 'Em Atendimento', funnel: 'atendimento', color: '#0ea5e9' },
  { label: 'Visita Agendada', funnel: 'atendimento', color: '#38bdf8' },
  { label: 'Proposta', funnel: 'proposta', color: '#6366f1' },
  { label: 'Venda Fechada', funnel: 'venda_ganha', color: '#10b981' },
  { label: 'Perdido', funnel: 'perdido', color: '#f43f5e' },
];

export const LeadStageModal: React.FC<LeadStageModalProps> = ({
  visible,
  lead,
  onClose,
  onSuccess,
}) => {
  const { user, profile } = useAuth();
  const { colors, isDark } = useAppTheme();

  const [selectedStage, setSelectedStage] = useState<string>('');
  const [lossReason, setLossReason] = useState<string>('Sem contato');
  const [customLossReason, setCustomLossReason] = useState<string>('');
  const [dealValue, setDealValue] = useState<string>('');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [note, setNote] = useState<string>('');
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (lead) {
      setSelectedStage(lead.status || 'Em Atendimento');
      setLossReason(lead.loss_reason || 'Sem contato');
      setCustomLossReason('');
      setDealValue(lead.deal_value || lead.budget ? String(lead.deal_value || lead.budget) : '');
      setSelectedPropertyId(lead.sold_property_id || lead.property_id || null);
      setNote('');

      // Carregar imóveis da empresa para o fechamento de venda
      if (profile?.company_id) {
        supabase
          .from('properties')
          .select('id, title, price, status, city, neighborhood')
          .eq('company_id', profile.company_id)
          .order('title', { ascending: true })
          .then(({ data }) => {
            if (data) setProperties(data as unknown as Property[]);
          });
      }
    }
  }, [lead, profile?.company_id]);

  if (!lead) return null;

  const isClosedDeal = selectedStage === 'Venda Fechada' || selectedStage === 'Fechado';
  const isLoss = selectedStage === 'Perdido';

  const handleSave = async () => {
    if (!user || !lead) return;

    if (isLoss) {
      const finalLossReason = lossReason === 'Outros' ? customLossReason.trim() : lossReason;
      if (!finalLossReason) {
        Alert.alert('Motivo Obrigatório', 'Por favor, informe o motivo da perda do lead.');
        return;
      }
    }

    if (isClosedDeal) {
      if (!dealValue || isNaN(Number(dealValue.replace(/\D/g, '')))) {
        Alert.alert('Valor Negociado', 'Por favor, informe o valor final negociado da venda.');
        return;
      }
    }

    setLoading(true);

    try {
      const oldStatus = lead.status;
      const targetStageObj = STAGES.find((s) => s.label === selectedStage) || {
        label: selectedStage,
        funnel: 'atendimento',
      };

      const now = new Date().toISOString();
      const numericDealValue = isClosedDeal
        ? Number(dealValue.replace(/\D/g, '')) || lead.budget || 0
        : null;

      const finalLossReason = isLoss
        ? lossReason === 'Outros' && customLossReason
          ? customLossReason.trim()
          : lossReason
        : null;

      // 1. Atualizar Lead no Supabase
      const leadUpdates: any = {
        status: selectedStage,
        funnel_step: targetStageObj.funnel,
        stage_updated_at: now,
        last_interaction: now,
      };

      if (isLoss) {
        leadUpdates.loss_reason = finalLossReason;
      }

      if (isClosedDeal) {
        leadUpdates.deal_value = numericDealValue;
        if (selectedPropertyId) {
          leadUpdates.sold_property_id = selectedPropertyId;
        }
      }

      const { error: leadErr } = await supabase
        .from('leads')
        .update(leadUpdates)
        .eq('id', lead.id);

      if (leadErr) throw leadErr;

      // 2. Inserir evento de mudança na timeline
      const timelineDesc = `Mudou de etapa: "${oldStatus}" ➔ "${selectedStage}"${
        isLoss ? ` (Motivo: ${finalLossReason})` : ''
      }`;

      await supabase.from('timeline_events').insert({
        lead_id: lead.id,
        type: 'status_change',
        description: timelineDesc,
        company_id: profile?.company_id || null,
        created_by: user.id,
      });

      // 3. Se for Venda Fechada: Celebrar, atualizar imóvel e conceder Gamificação XP
      if (isClosedDeal) {
        const formattedVal = Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(numericDealValue || 0);

        // Timeline de celebração
        await supabase.from('timeline_events').insert({
          lead_id: lead.id,
          type: 'status_change',
          description: `🎉 VENDA FECHADA! Negócio concluído no valor de ${formattedVal}. Parabéns à equipe!`,
          company_id: profile?.company_id || null,
          created_by: user.id,
        });

        // Atualizar imóvel como Vendido se selecionado
        if (selectedPropertyId) {
          await supabase
            .from('properties')
            .update({ status: 'Vendido' })
            .eq('id', selectedPropertyId);
        }

        // Gamificação: Registrar evento de 500 XP
        await supabase.from('gamification_events').insert({
          user_id: user.id,
          action_type: 'deal_closed',
          entity_id: lead.id,
          points_awarded: 500,
          base_points: 500,
          company_id: profile?.company_id || null,
        });

        // Atualizar XP no perfil
        if (profile?.id) {
          const newXp = (profile.xp_points || 0) + 500;
          await supabase
            .from('profiles')
            .update({ xp_points: newXp })
            .eq('id', profile.id);
        }
      }

      // 4. Se o usuário escreveu uma nota opcional
      if (note.trim()) {
        await supabase.from('timeline_events').insert({
          lead_id: lead.id,
          type: 'note',
          description: note.trim(),
          company_id: profile?.company_id || null,
          created_by: user.id,
        });
      }

      // Criar objeto atualizado para callback otimista
      const updated: Lead = {
        ...lead,
        ...leadUpdates,
      };

      setLoading(false);
      onSuccess(updated);
      onClose();

      if (isClosedDeal) {
        Alert.alert('🎉 Parabéns!', 'Venda fechada com sucesso! Você ganhou +500 XP na Liga de Corretores!');
      }
    } catch (err: any) {
      setLoading(false);
      console.error('Erro ao atualizar etapa do lead:', err);
      Alert.alert('Erro ao Salvar', err.message || 'Não foi possível salvar a nova etapa.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.65)',
          justifyContent: 'flex-end',
        }}
      >
        <View
          style={{
            backgroundColor: colors.card,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: 36,
            maxHeight: '90%',
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          {/* Header do Modal */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <View>
              <Text style={{ fontFamily: 'Sora_700Bold', fontSize: 18, color: colors.text }}>
                Mover Etapa do Lead
              </Text>
              <Text style={{ fontFamily: 'Sora_400Regular', fontSize: 12, color: colors.textMuted }}>
                {lead.name}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Seletor de Etapas (Grade 2 Colunas) */}
            <Text
              style={{
                fontFamily: 'Sora_600SemiBold',
                fontSize: 12,
                color: colors.textMuted,
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              Selecione a Nova Etapa
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
              {STAGES.map((s) => {
                const isSelected = selectedStage === s.label;
                return (
                  <TouchableOpacity
                    key={s.label}
                    onPress={() => setSelectedStage(s.label)}
                    style={{
                      flexBasis: '48%',
                      flexGrow: 1,
                      backgroundColor: isSelected ? s.color : isDark ? '#0a0f1c' : '#f8fafc',
                      paddingVertical: 12,
                      paddingHorizontal: 12,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: isSelected ? s.color : colors.border,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: isSelected ? 'Sora_700Bold' : 'Sora_600SemiBold',
                        fontSize: 12,
                        color: isSelected ? '#ffffff' : colors.text,
                      }}
                    >
                      {s.label}
                    </Text>
                    {isSelected && <CheckCircle size={15} color="#ffffff" />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* SE FOR VENDA FECHADA: Formulário de celebração */}
            {isClosedDeal && (
              <View
                style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  borderRadius: 18,
                  padding: 16,
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: 'rgba(16, 185, 129, 0.3)',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <PartyPopper size={20} color="#10b981" />
                  <Text style={{ fontFamily: 'Sora_700Bold', fontSize: 14, color: '#10b981' }}>
                    Celebrar Venda Fechada (+500 XP)
                  </Text>
                </View>

                {/* Input de Valor Negociado */}
                <Text
                  style={{
                    fontFamily: 'Sora_600SemiBold',
                    fontSize: 12,
                    color: colors.text,
                    marginBottom: 6,
                  }}
                >
                  Valor Final Negociado (R$) *
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: colors.card,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colors.border,
                    paddingHorizontal: 12,
                    height: 46,
                    marginBottom: 12,
                  }}
                >
                  <DollarSign size={16} color="#10b981" style={{ marginRight: 6 }} />
                  <TextInput
                    style={{ flex: 1, fontFamily: 'Sora_600SemiBold', fontSize: 14, color: colors.text }}
                    placeholder="Ex: 850000"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    value={dealValue}
                    onChangeText={setDealValue}
                  />
                </View>

                {/* Seleção do Imóvel Vendido */}
                <Text
                  style={{
                    fontFamily: 'Sora_600SemiBold',
                    fontSize: 12,
                    color: colors.text,
                    marginBottom: 6,
                  }}
                >
                  Imóvel Vendido
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8 }}
                >
                  {properties.map((p) => {
                    const isSelected = selectedPropertyId === p.id;
                    return (
                      <TouchableOpacity
                        key={p.id}
                        onPress={() => setSelectedPropertyId(isSelected ? null : p.id)}
                        style={{
                          backgroundColor: isSelected ? '#10b981' : colors.card,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: isSelected ? '#10b981' : colors.border,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: isSelected ? 'Sora_700Bold' : 'Sora_600SemiBold',
                            fontSize: 11,
                            color: isSelected ? '#ffffff' : colors.text,
                          }}
                          numberOfLines={1}
                        >
                          {p.title}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* SE FOR PERDIDO: Motivo da perda */}
            {isLoss && (
              <View
                style={{
                  backgroundColor: 'rgba(244, 63, 94, 0.08)',
                  borderRadius: 18,
                  padding: 16,
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: 'rgba(244, 63, 94, 0.25)',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <AlertTriangle size={18} color="#f43f5e" />
                  <Text style={{ fontFamily: 'Sora_700Bold', fontSize: 14, color: '#f43f5e' }}>
                    Motivo da Perda do Lead *
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {LOSS_REASONS.map((reason) => {
                    const isSelected = lossReason === reason;
                    return (
                      <TouchableOpacity
                        key={reason}
                        onPress={() => setLossReason(reason)}
                        style={{
                          backgroundColor: isSelected ? '#f43f5e' : colors.card,
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: isSelected ? '#f43f5e' : colors.border,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: isSelected ? 'Sora_700Bold' : 'Sora_400Regular',
                            fontSize: 11,
                            color: isSelected ? '#ffffff' : colors.text,
                          }}
                        >
                          {reason}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {lossReason === 'Outros' && (
                  <TextInput
                    style={{
                      backgroundColor: colors.card,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: colors.border,
                      padding: 10,
                      fontFamily: 'Sora_400Regular',
                      fontSize: 13,
                      color: colors.text,
                      marginTop: 10,
                    }}
                    placeholder="Descreva o motivo da perda..."
                    placeholderTextColor={colors.textMuted}
                    value={customLossReason}
                    onChangeText={setCustomLossReason}
                  />
                )}
              </View>
            )}

            {/* Campo Opcional de Nota na Timeline */}
            <View style={{ marginBottom: 20 }}>
              <Text
                style={{
                  fontFamily: 'Sora_600SemiBold',
                  fontSize: 12,
                  color: colors.textMuted,
                  marginBottom: 6,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                Adicionar Nota na Timeline (Opcional)
              </Text>
              <View
                style={{
                  backgroundColor: isDark ? '#0a0f1c' : '#f8fafc',
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 14,
                  padding: 12,
                  minHeight: 70,
                }}
              >
                <TextInput
                  style={{
                    fontFamily: 'Sora_400Regular',
                    fontSize: 13,
                    color: colors.text,
                    textAlignVertical: 'top',
                  }}
                  placeholder="Ex: Cliente prefere visitar no próximo sábado pela manhã..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={3}
                  value={note}
                  onChangeText={setNote}
                />
              </View>
            </View>

            {/* Botão de Confirmação */}
            <TouchableOpacity
              onPress={handleSave}
              disabled={loading}
              style={{
                backgroundColor: isClosedDeal ? '#10b981' : '#0ea5e9',
                borderRadius: 14,
                height: 48,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: isClosedDeal ? '#10b981' : '#0ea5e9',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={{ fontFamily: 'Sora_700Bold', fontSize: 14, color: '#ffffff' }}>
                  {isClosedDeal ? '🎉 Confirmar Venda Fechada' : 'Confirmar Mudança de Etapa'}
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

