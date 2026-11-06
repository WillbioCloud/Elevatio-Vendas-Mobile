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
import { Check, Shuffle, User, Users, X } from 'lucide-react-native';
import { Lead, Profile } from '../../types';
import { useAppTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

interface TransferLeadModalProps {
  visible: boolean;
  lead: Lead | null;
  onClose: () => void;
  onTransferSuccess: () => void;
}

export const TransferLeadModal: React.FC<TransferLeadModalProps> = ({
  visible,
  lead,
  onClose,
  onTransferSuccess,
}) => {
  const { user, profile } = useAuth();
  const { colors, isDark } = useAppTheme();

  const [teamMembers, setTeamMembers] = useState<Profile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [transferNote, setTransferNote] = useState('');
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible && profile?.company_id) {
      setSelectedUserId(null);
      setTransferNote('');

      const fetchTeam = async () => {
        setLoadingMembers(true);
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('company_id', profile.company_id)
            .order('name', { ascending: true });

          if (!error && data) {
            // Exclude current lead assignee or show all
            setTeamMembers(data as Profile[]);
          }
        } catch (err) {
          console.warn('Erro ao carregar membros da equipe:', err);
        } finally {
          setLoadingMembers(false);
        }
      };

      fetchTeam();
    }
  }, [visible, profile?.company_id]);

  const handleConfirmTransfer = async () => {
    if (!lead || !user || !selectedUserId) {
      Alert.alert('Selecione um corretor', 'Por favor, escolha o corretor destinatário.');
      return;
    }

    const targetMember = teamMembers.find((m) => m.id === selectedUserId);
    const targetName = targetMember?.name || 'Corretor';

    try {
      setSaving(true);

      // 1. Atualizar lead com novo corretor responsável
      const { error: leadErr } = await supabase
        .from('leads')
        .update({
          assigned_to: selectedUserId,
          last_interaction: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', lead.id);

      if (leadErr) throw leadErr;

      // 2. Inserir timeline_event de transferência
      const noteText = transferNote.trim() ? ` Nota: "${transferNote.trim()}"` : '';
      await supabase.from('timeline_events').insert({
        lead_id: lead.id,
        title: 'Lead Transferido',
        description: `Lead reatribuído para ${targetName} por ${profile?.name || 'Gestor'}.${noteText}`,
        type: 'transfer',
        created_by: user.id,
      });

      // 3. Notificar o corretor que recebeu o lead
      await supabase.from('notifications').insert({
        user_id: selectedUserId,
        title: 'Novo Lead Atribuído',
        message: `${profile?.name || 'A equipe'} transferiu o lead ${lead.name} para você.`,
        type: 'lead_assigned',
        reference_id: lead.id,
        read: false,
      });

      Alert.alert('Lead Transferido', `O lead ${lead.name} foi atribuído a ${targetName} com sucesso.`);
      onTransferSuccess();
      onClose();
    } catch (err: any) {
      Alert.alert('Erro ao transferir lead', err.message || 'Tente novamente.');
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
                  backgroundColor: isDark ? 'rgba(14, 165, 233, 0.15)' : '#e0f2fe',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Shuffle size={18} color="#0ea5e9" />
              </View>
              <View>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
                  Transferir Lead
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
            <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 12 }}>
              Selecione o corretor que assumirá o atendimento deste cliente:
            </Text>

            {loadingMembers ? (
              <ActivityIndicator color="#0ea5e9" style={{ marginVertical: 20 }} />
            ) : teamMembers.length === 0 ? (
              <Text style={{ fontSize: 13, color: colors.textMuted, marginVertical: 12 }}>
                Nenhum membro da equipe encontrado.
              </Text>
            ) : (
              <View style={{ maxHeight: 220, marginBottom: 16 }}>
                <ScrollView nestedScrollEnabled style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12 }}>
                  {teamMembers.map((member) => {
                    const isSelected = selectedUserId === member.id;
                    const isCurrent = lead?.assigned_to === member.id;

                    return (
                      <TouchableOpacity
                        key={member.id}
                        onPress={() => setSelectedUserId(member.id)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: 12,
                          backgroundColor: isSelected
                            ? (isDark ? 'rgba(14, 165, 233, 0.15)' : '#e0f2fe')
                            : colors.card,
                          borderBottomWidth: 1,
                          borderBottomColor: colors.border,
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                          <View
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 16,
                              backgroundColor: colors.mutedSurface,
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <User size={16} color={colors.text} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text
                              style={{
                                fontSize: 13,
                                fontWeight: isSelected ? '700' : '500',
                                color: isSelected ? '#0ea5e9' : colors.text,
                              }}
                              numberOfLines={1}
                            >
                              {member.name || 'Sem nome'}
                            </Text>
                            <Text style={{ fontSize: 11, color: colors.textMuted }}>
                              {member.role || 'Corretor'} {isCurrent ? '• Atual' : ''}
                            </Text>
                          </View>
                        </View>
                        {isSelected && <Check size={16} color="#0ea5e9" />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Nota de passagem de bastão */}
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 6 }}>
              Observações para o Colega (opcional)
            </Text>
            <TextInput
              value={transferNote}
              onChangeText={setTransferNote}
              placeholder="Ex: Cliente tem interesse em sobrados na região sul e já tem aprovação de crédito..."
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

            {/* Botão de Transferir */}
            <TouchableOpacity
              onPress={handleConfirmTransfer}
              disabled={saving || !selectedUserId}
              style={{
                backgroundColor: selectedUserId ? '#0ea5e9' : colors.mutedSurface,
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
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: '700',
                    color: selectedUserId ? '#ffffff' : colors.textMuted,
                  }}
                >
                  Confirmar Transferência
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

