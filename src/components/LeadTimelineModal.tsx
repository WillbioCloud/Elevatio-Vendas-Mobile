import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowRightCircle,
  Clock,
  FileText,
  MessageCircle,
  PhoneCall,
  Send,
  Sparkles,
  User,
  X,
} from 'lucide-react-native';
import { Lead, TimelineEvent } from '../types';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import { timeAgo } from '../utils/crm';

interface LeadTimelineModalProps {
  visible: boolean;
  lead: Lead | null;
  onClose: () => void;
  onInteractionAdded?: () => void;
}

export const LeadTimelineModal: React.FC<LeadTimelineModalProps> = ({
  visible,
  lead,
  onClose,
  onInteractionAdded,
}) => {
  const { user, profile } = useAuth();
  const { colors, isDark } = useAppTheme();

  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [sending, setSending] = useState(false);

  const fetchTimeline = async () => {
    if (!lead) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('timeline_events')
        .select(`
          id, created_at, type, description, metadata, lead_id, created_by, company_id,
          creator:created_by ( id, name, avatar_url )
        `)
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEvents((data as unknown as TimelineEvent[]) || []);
    } catch (err) {
      console.warn('Erro ao carregar timeline do lead:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible && lead) {
      fetchTimeline();
    }
  }, [visible, lead]);

  const handleSendNote = async () => {
    if (!newNote.trim() || !user || !lead) return;

    setSending(true);
    const noteText = newNote.trim();
    setNewNote('');

    try {
      const now = new Date().toISOString();

      // 1. Inserir nota na timeline_events
      const { data, error } = await supabase
        .from('timeline_events')
        .insert({
          lead_id: lead.id,
          type: 'note',
          description: noteText,
          company_id: profile?.company_id || null,
          created_by: user.id,
        })
        .select(`
          id, created_at, type, description, metadata, lead_id, created_by, company_id,
          creator:created_by ( id, name, avatar_url )
        `)
        .single();

      if (error) throw error;

      // 2. Atualizar last_interaction no lead para reaquecer o SLA para Quente 🔥
      await supabase
        .from('leads')
        .update({ last_interaction: now })
        .eq('id', lead.id);

      // Adicionar otimista na lista
      if (data) {
        setEvents((prev) => [data as unknown as TimelineEvent, ...prev]);
      }

      onInteractionAdded?.();
    } catch (err: any) {
      console.error('Erro ao adicionar nota na timeline:', err);
      setNewNote(noteText);
    } finally {
      setSending(false);
    }
  };

  const getEventIcon = (type: string, desc: string) => {
    if (desc.includes('🎉') || desc.includes('VENDA FECHADA')) {
      return <Sparkles size={16} color="#10b981" />;
    }
    switch (type) {
      case 'status_change':
        return <ArrowRightCircle size={16} color="#0ea5e9" />;
      case 'whatsapp':
        return <MessageCircle size={16} color="#10b981" />;
      case 'call_log':
        return <PhoneCall size={16} color="#f59e0b" />;
      case 'note':
      default:
        return <FileText size={16} color="#a855f7" />;
    }
  };

  if (!lead) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' }}
      >
        <View
          style={{
            backgroundColor: colors.card,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            height: '85%',
            borderWidth: 1,
            borderColor: colors.border,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header do Modal */}
          <View
            style={{
              paddingHorizontal: 20,
              paddingTop: 18,
              paddingBottom: 14,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <View>
              <Text style={{ fontFamily: 'Sora_700Bold', fontSize: 18, color: colors.text }}>
                Histórico de Interações
              </Text>
              <Text style={{ fontFamily: 'Sora_400Regular', fontSize: 12, color: colors.textMuted }}>
                Timeline de {lead.name}
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

          {/* Lista de Eventos Cronológicos */}
          {loading ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator color="#0ea5e9" size="large" />
            </View>
          ) : (
            <FlatList
              data={events}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 20, paddingBottom: 16 }}
              ListEmptyComponent={
                <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 48 }}>
                  <Clock size={36} color={colors.textMuted} style={{ marginBottom: 10 }} />
                  <Text style={{ fontFamily: 'Sora_600SemiBold', fontSize: 14, color: colors.text }}>
                    Nenhuma interação registrada
                  </Text>
                  <Text style={{ fontFamily: 'Sora_400Regular', fontSize: 12, color: colors.textMuted, marginTop: 4 }}>
                    Adicione uma nota abaixo para registrar o contato.
                  </Text>
                </View>
              }
              renderItem={({ item, index }) => {
                const creatorName = item.creator?.name || 'Corretor';
                const isCelebration = item.description.includes('🎉');

                return (
                  <View style={{ flexDirection: 'row', marginBottom: 16 }}>
                    {/* Linha vertical e marcador de timeline */}
                    <View style={{ alignItems: 'center', marginRight: 12 }}>
                      <View
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor: isCelebration
                            ? 'rgba(16, 185, 129, 0.2)'
                            : isDark
                            ? '#1e293b'
                            : '#f1f5f9',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {getEventIcon(item.type, item.description)}
                      </View>
                      {index < events.length - 1 && (
                        <View
                          style={{
                            width: 2,
                            flex: 1,
                            backgroundColor: colors.border,
                            marginVertical: 4,
                          }}
                        />
                      )}
                    </View>

                    {/* Conteúdo do Card do Evento */}
                    <View
                      style={{
                        flex: 1,
                        backgroundColor: isCelebration
                          ? 'rgba(16, 185, 129, 0.1)'
                          : isDark
                          ? '#0a0f1c'
                          : '#f8fafc',
                        borderRadius: 14,
                        padding: 12,
                        borderWidth: 1,
                        borderColor: isCelebration ? '#10b981' : colors.border,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 4,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: 'Sora_700Bold',
                            fontSize: 12,
                            color: isCelebration ? '#10b981' : colors.text,
                          }}
                        >
                          {creatorName}
                        </Text>
                        <Text style={{ fontFamily: 'Sora_400Regular', fontSize: 10, color: colors.textMuted }}>
                          {timeAgo(item.created_at)}
                        </Text>
                      </View>

                      <Text
                        style={{
                          fontFamily: 'Sora_400Regular',
                          fontSize: 13,
                          color: colors.text,
                          lineHeight: 18,
                        }}
                      >
                        {item.description}
                      </Text>
                    </View>
                  </View>
                );
              }}
            />
          )}

          {/* Barra Fixa Inferior para Adicionar Nova Nota */}
          <View
            style={{
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: Platform.OS === 'ios' ? 28 : 14,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              backgroundColor: colors.card,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <View
              style={{
                flex: 1,
                backgroundColor: isDark ? '#0a0f1c' : '#f8fafc',
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 14,
                paddingHorizontal: 14,
                height: 46,
                justifyContent: 'center',
              }}
            >
              <TextInput
                style={{
                  fontFamily: 'Sora_400Regular',
                  fontSize: 13,
                  color: colors.text,
                }}
                placeholder="Escreva uma nova nota sobre o lead..."
                placeholderTextColor={colors.textMuted}
                value={newNote}
                onChangeText={setNewNote}
                onSubmitEditing={handleSendNote}
              />
            </View>

            <TouchableOpacity
              onPress={handleSendNote}
              disabled={sending || !newNote.trim()}
              style={{
                width: 46,
                height: 46,
                borderRadius: 14,
                backgroundColor: newNote.trim() ? '#0ea5e9' : colors.border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Send size={18} color="#ffffff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

