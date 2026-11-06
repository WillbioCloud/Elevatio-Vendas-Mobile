import React, { useState } from 'react';
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
import { AlertCircle, Check, X } from 'lucide-react-native';
import { Lead } from '../../types';
import { useAppTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { LOSS_REASONS } from '../../utils/crm';

interface LostLeadModalProps {
  visible: boolean;
  lead: Lead | null;
  onClose: () => void;
  onLostSuccess: () => void;
}

export const LostLeadModal: React.FC<LostLeadModalProps> = ({
  visible,
  lead,
  onClose,
  onLostSuccess,
}) => {
  const { user } = useAuth();
  const { colors, isDark } = useAppTheme();

  const [selectedReason, setSelectedReason] = useState<string>(LOSS_REASONS[0]);
  const [customNote, setCustomNote] = useState('');
  const [saving, setSaving] = useState(false);

  const handleConfirmLost = async () => {
    if (!lead || !user) return;

    try {
      setSaving(true);
      const fullReason = selectedReason === 'Outros' && customNote.trim()
        ? `Outros: ${customNote.trim()}`
        : selectedReason;

      // 1. Atualiza o status do Lead
      const { error: leadErr } = await supabase
        .from('leads')
        .update({
          status: 'Perdido',
          stage_updated_at: new Date().toISOString(),
          last_interaction: new Date().toISOString(),
        })
        .eq('id', lead.id);

      if (leadErr) throw leadErr;

      // 2. Registra na timeline
      await supabase.from('timeline_events').insert({
        lead_id: lead.id,
        title: 'Lead Marcado como Perdido',
        description: `Motivo da perda: ${fullReason}.`,
        type: 'status_change',
        created_by: user.id,
      });

      Alert.alert('Lead arquivado', 'O status do lead foi atualizado para Perdido.');
      onLostSuccess();
      onClose();
    } catch (err: any) {
      Alert.alert('Erro ao arquivar lead', err.message || 'Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          justifyContent: 'flex-end',
        }}
      >
        <View
          style={{
            backgroundColor: colors.card,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 20,
            maxHeight: '85%',
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AlertCircle size={20} color="#ef4444" />
              </View>
              <View>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
                  Marcar como Perdido
                </Text>
                <Text style={{ fontSize: 12, color: colors.textMuted }}>
                  {lead?.name}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: colors.mutedSurface,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={18} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 16 }}>
              Selecione o motivo principal pelo qual o negócio não pôde ser continuado:
            </Text>

            {/* Lista de Motivos de Perda */}
            <View style={{ gap: 8, marginBottom: 16 }}>
              {LOSS_REASONS.map((reason) => {
                const isSelected = selectedReason === reason;
                return (
                  <TouchableOpacity
                    key={reason}
                    onPress={() => setSelectedReason(reason)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 12,
                      paddingHorizontal: 14,
                      borderRadius: 12,
                      backgroundColor: isSelected
                        ? (isDark ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2')
                        : colors.mutedSurface,
                      borderWidth: 1,
                      borderColor: isSelected ? '#ef4444' : colors.border,
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: isSelected ? '700' : '500',
                        color: isSelected ? '#ef4444' : colors.text,
                      }}
                    >
                      {reason}
                    </Text>
                    {isSelected && <Check size={16} color="#ef4444" />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Campo Opcional de Detalhes Adicionais */}
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 6 }}>
              Observações Adicionais (opcional)
            </Text>
            <TextInput
              value={customNote}
              onChangeText={setCustomNote}
              placeholder="Descreva detalhes que possam ser úteis no futuro..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              style={{
                backgroundColor: colors.mutedSurface,
                borderRadius: 12,
                padding: 12,
                color: colors.text,
                fontSize: 14,
                borderWidth: 1,
                borderColor: colors.border,
                minHeight: 70,
                textAlignVertical: 'top',
                marginBottom: 20,
              }}
            />

            {/* Botão de Confirmação */}
            <TouchableOpacity
              onPress={handleConfirmLost}
              disabled={saving}
              style={{
                backgroundColor: '#ef4444',
                paddingVertical: 14,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 20,
              }}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#ffffff' }}>
                  Confirmar Perda do Lead
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

