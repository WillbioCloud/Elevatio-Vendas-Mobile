import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  AlertCircle,
  Award,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  CheckSquare,
  Clock,
  ExternalLink,
  History,
  ListTodo,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  Send,
  Shuffle,
  Sparkles,
  Trash2,
  User,
  UserCheck,
  X,
} from 'lucide-react-native';
import { Lead, LeadMatch, Property, Task, TimelineEvent } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { formatCurrency, formatPhone, formatTimeInStage, getLeadSlaHealth, timeAgo } from '../../utils/crm';
import { CloseSaleModal } from './CloseSaleModal';
import { LostLeadModal } from './LostLeadModal';
import { TransferLeadModal } from './TransferLeadModal';

interface LeadDetailsSheetProps {
  visible: boolean;
  lead: Lead | null;
  onClose: () => void;
  onLeadUpdated: () => void;
}

type TabKey = 'timeline' | 'matches' | 'tasks' | 'info' | 'edit';

const FUNNEL_STEPS = [
  { key: 'pre_atendimento', label: 'Pré-Atend.', status: 'Aguardando Atendimento' },
  { key: 'atendimento', label: 'Atendimento', status: 'Em Atendimento' },
  { key: 'proposta', label: 'Proposta', status: 'Proposta' },
  { key: 'venda_ganha', label: 'Fechado', status: 'Venda Fechada' },
  { key: 'perdido', label: 'Perdido', status: 'Perdido' },
];

export const LeadDetailsSheet: React.FC<LeadDetailsSheetProps> = ({
  visible,
  lead,
  onClose,
  onLeadUpdated,
}) => {
  const { user, profile, permissions } = useAuth();
  const { colors, isDark } = useAppTheme();

  const [activeTab, setActiveTab] = useState<TabKey>('timeline');
  const [currentLead, setCurrentLead] = useState<Lead | null>(lead);

  // Submodals
  const [showCloseSale, setShowCloseSale] = useState(false);
  const [showLostLead, setShowLostLead] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);

  // Timeline state
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [sendingNote, setSendingNote] = useState(false);

  // Match IA state
  const [matchedProps, setMatchedProps] = useState<Property[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);

  // Tasks state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [addingTask, setAddingTask] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editBudget, setEditBudget] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    if (lead) {
      setCurrentLead(lead);
      setEditName(lead.name || '');
      setEditPhone(lead.phone || '');
      setEditEmail(lead.email || '');
      setEditBudget(lead.budget ? lead.budget.toString() : '');
      setEditNotes(lead.notes || lead.message || '');
    }
  }, [lead]);

  // Load tab content
  const loadTimeline = useCallback(async () => {
    if (!currentLead?.id) return;
    setLoadingTimeline(true);
    try {
      const { data, error } = await supabase
        .from('timeline_events')
        .select('*')
        .eq('lead_id', currentLead.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setTimelineEvents(data as TimelineEvent[]);
      }
    } catch (err) {
      console.warn('Erro ao carregar timeline:', err);
    } finally {
      setLoadingTimeline(false);
    }
  }, [currentLead?.id]);

  const loadMatches = useCallback(async () => {
    if (!currentLead) return;
    setLoadingMatches(true);
    try {
      let query = supabase
        .from('properties')
        .select('*')
        .eq('status', 'Disponível');

      if (profile?.company_id) {
        query = query.eq('company_id', profile.company_id);
      }

      // If budget exists, filter roughly in range (up to +30%)
      if (currentLead.budget && currentLead.budget > 0) {
        const maxPrice = currentLead.budget * 1.35;
        const minPrice = currentLead.budget * 0.65;
        query = query.gte('price', minPrice).lte('price', maxPrice);
      }

      const { data, error } = await query.order('price', { ascending: true }).limit(10);
      if (!error && data) {
        setMatchedProps(data as Property[]);
      }
    } catch (err) {
      console.warn('Erro ao carregar matches:', err);
    } finally {
      setLoadingMatches(false);
    }
  }, [currentLead, profile?.company_id]);

  const loadTasks = useCallback(async () => {
    if (!currentLead?.id) return;
    setLoadingTasks(true);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('lead_id', currentLead.id)
        .order('completed', { ascending: true })
        .order('due_date', { ascending: true });

      if (!error && data) {
        setTasks(data as Task[]);
      }
    } catch (err) {
      console.warn('Erro ao carregar tarefas:', err);
    } finally {
      setLoadingTasks(false);
    }
  }, [currentLead?.id]);

  useEffect(() => {
    if (visible && currentLead) {
      if (activeTab === 'timeline') loadTimeline();
      else if (activeTab === 'matches') loadMatches();
      else if (activeTab === 'tasks') loadTasks();
    }
  }, [visible, activeTab, currentLead, loadTimeline, loadMatches, loadTasks]);

  // Funnel Stage Change Handler
  const handleFunnelStepSelect = async (stepKey: string, statusName: string) => {
    if (!currentLead || !user) return;

    if (stepKey === 'venda_ganha') {
      setShowCloseSale(true);
      return;
    }

    if (stepKey === 'perdido') {
      setShowLostLead(true);
      return;
    }

    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('leads')
        .update({
          status: statusName,
          funnel_step: stepKey,
          stage_updated_at: now,
          last_interaction: now,
        })
        .eq('id', currentLead.id);

      if (error) throw error;

      // Log in timeline
      await supabase.from('timeline_events').insert({
        lead_id: currentLead.id,
        title: `Etapa alterada: ${statusName}`,
        description: `Lead movido para a etapa "${statusName}" por ${profile?.name || 'Corretor'}.`,
        type: 'status_change',
        created_by: user.id,
      });

      setCurrentLead({
        ...currentLead,
        status: statusName,
        funnel_step: stepKey,
        stage_updated_at: now,
        last_interaction: now,
      });

      onLeadUpdated();
      loadTimeline();
    } catch (err: any) {
      Alert.alert('Erro ao atualizar etapa', err.message || 'Tente novamente.');
    }
  };

  // Add Timeline Note
  const handleAddNote = async () => {
    if (!newNote.trim() || !currentLead || !user) return;

    try {
      setSendingNote(true);
      const now = new Date().toISOString();

      const { error } = await supabase.from('timeline_events').insert({
        lead_id: currentLead.id,
        title: 'Nova Interação',
        description: newNote.trim(),
        type: 'note',
        created_by: user.id,
      });

      if (error) throw error;

      // Update lead last_interaction
      await supabase
        .from('leads')
        .update({ last_interaction: now })
        .eq('id', currentLead.id);

      setNewNote('');
      loadTimeline();
      onLeadUpdated();
    } catch (err: any) {
      Alert.alert('Erro ao salvar nota', err.message || 'Tente novamente.');
    } finally {
      setSendingNote(false);
    }
  };

  // Add Task
  const handleAddTask = async () => {
    if (!newTaskTitle.trim() || !currentLead || !user) return;

    try {
      setAddingTask(true);
      const { error } = await supabase.from('tasks').insert({
        lead_id: currentLead.id,
        user_id: user.id,
        company_id: profile?.company_id || null,
        title: newTaskTitle.trim(),
        completed: false,
        priority: 'medium',
        status: 'pending',
      });

      if (error) throw error;

      setNewTaskTitle('');
      loadTasks();
    } catch (err: any) {
      Alert.alert('Erro ao adicionar tarefa', err.message || 'Tente novamente.');
    } finally {
      setAddingTask(false);
    }
  };

  // Toggle Task Completion
  const handleToggleTask = async (task: Task) => {
    try {
      const updatedStatus = !task.completed;
      await supabase
        .from('tasks')
        .update({ completed: updatedStatus, status: updatedStatus ? 'completed' : 'pending' })
        .eq('id', task.id);

      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, completed: updatedStatus } : t))
      );
    } catch (err: any) {
      Alert.alert('Erro ao atualizar tarefa', err.message);
    }
  };

  // Delete Task
  const handleDeleteTask = async (taskId: string) => {
    try {
      await supabase.from('tasks').delete().eq('id', taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err: any) {
      Alert.alert('Erro ao remover tarefa', err.message);
    }
  };

  // Save Lead Profile Edit
  const handleSaveEdit = async () => {
    if (!currentLead || !editName.trim()) {
      Alert.alert('Campo Obrigatório', 'O nome do cliente é obrigatório.');
      return;
    }

    try {
      setSavingEdit(true);
      const numBudget = editBudget ? parseFloat(editBudget.replace(/[^\d.,]/g, '').replace(',', '.')) : null;

      const { error } = await supabase
        .from('leads')
        .update({
          name: editName.trim(),
          phone: editPhone.replace(/\D/g, '') || null,
          email: editEmail.trim() || null,
          budget: numBudget,
          notes: editNotes.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentLead.id);

      if (error) throw error;

      Alert.alert('Sucesso', 'Dados do lead atualizados com sucesso.');
      setCurrentLead({
        ...currentLead,
        name: editName.trim(),
        phone: editPhone.replace(/\D/g, '') || null,
        email: editEmail.trim() || null,
        budget: numBudget || undefined,
        notes: editNotes.trim(),
      });
      onLeadUpdated();
      setActiveTab('timeline');
    } catch (err: any) {
      Alert.alert('Erro ao salvar', err.message || 'Tente novamente.');
    } finally {
      setSavingEdit(false);
    }
  };

  if (!currentLead) return null;

  const sla = getLeadSlaHealth(currentLead);
  const timeInStage = formatTimeInStage(currentLead.stage_updated_at || currentLead.created_at);

  const handleOpenWhatsApp = () => {
    if (!currentLead.phone) return;
    const cleanPhone = currentLead.phone.replace(/\D/g, '');
    const firstWord = currentLead.name ? currentLead.name.trim().split(' ')[0] : 'Cliente';
    const text = encodeURIComponent(
      `Olá, ${firstWord}! Tudo bem? Sou da imobiliária e estou entrando em contato sobre seu interesse no imóvel.`
    );
    Linking.openURL(`whatsapp://send?phone=55${cleanPhone}&text=${text}`).catch(() => {
      Linking.openURL(`https://wa.me/55${cleanPhone}?text=${text}`);
    });
  };

  const handleCall = () => {
    if (!currentLead.phone) return;
    Linking.openURL(`tel:${currentLead.phone}`);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.75)', justifyContent: 'flex-end' }}
      >
        <View
          style={{
            backgroundColor: colors.card,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            height: '92%',
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          {/* Header do Sheet */}
          <View
            style={{
              paddingHorizontal: 20,
              paddingTop: 16,
              paddingBottom: 12,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }} numberOfLines={1}>
                  {currentLead.name}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                  <View
                    style={{
                      paddingHorizontal: 7,
                      paddingVertical: 2,
                      borderRadius: 6,
                      backgroundColor: isDark ? 'rgba(14, 165, 233, 0.15)' : '#e0f2fe',
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '600', color: '#0ea5e9' }}>
                      {currentLead.status}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 11, color: colors.textMuted }}>•</Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted }}>{timeInStage}</Text>
                </View>
              </View>

              {/* Botões rápidos: Transferir, Fechar */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {permissions.canRedistributeLeads && (
                  <TouchableOpacity
                    onPress={() => setShowTransfer(true)}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 8,
                      backgroundColor: colors.mutedSurface,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                    activeOpacity={0.7}
                  >
                    <Shuffle size={16} color="#0ea5e9" />
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={onClose}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    backgroundColor: colors.mutedSurface,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  activeOpacity={0.7}
                >
                  <X size={18} color={colors.text} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Ações de Contato Rápido (WhatsApp & Ligação) */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              {currentLead.phone ? (
                <>
                  <TouchableOpacity
                    onPress={handleOpenWhatsApp}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      backgroundColor: '#10b981',
                      paddingVertical: 9,
                      borderRadius: 10,
                    }}
                    activeOpacity={0.8}
                  >
                    <MessageCircle size={15} color="#ffffff" />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#ffffff' }}>WhatsApp</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleCall}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      backgroundColor: colors.mutedSurface,
                      paddingVertical: 9,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                    activeOpacity={0.8}
                  >
                    <Phone size={15} color={colors.text} />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>Ligar</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <Text style={{ fontSize: 12, color: colors.textMuted }}>Sem telefone cadastrado</Text>
              )}
            </View>
          </View>

          {/* Funnel Stepper Interativo */}
          <View style={{ paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {FUNNEL_STEPS.map((step) => {
                const isActive = currentLead.status?.toLowerCase().includes(step.label.toLowerCase()) ||
                  (step.key === 'venda_ganha' && currentLead.status === 'Venda Fechada') ||
                  (step.key === 'perdido' && currentLead.status === 'Perdido');

                const isClosed = step.key === 'venda_ganha';
                const isLost = step.key === 'perdido';

                let bg = colors.mutedSurface;
                let textColor = colors.textMuted;
                let borderColor = colors.border;

                if (isActive) {
                  if (isClosed) {
                    bg = isDark ? 'rgba(16, 185, 129, 0.2)' : '#d1fae5';
                    textColor = '#10b981';
                    borderColor = '#10b981';
                  } else if (isLost) {
                    bg = isDark ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2';
                    textColor = '#ef4444';
                    borderColor = '#ef4444';
                  } else {
                    bg = isDark ? 'rgba(14, 165, 233, 0.2)' : '#e0f2fe';
                    textColor = '#0ea5e9';
                    borderColor = '#0ea5e9';
                  }
                }

                return (
                  <TouchableOpacity
                    key={step.key}
                    onPress={() => handleFunnelStepSelect(step.key, step.status)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 8,
                      backgroundColor: bg,
                      borderWidth: 1,
                      borderColor,
                    }}
                    activeOpacity={0.7}
                  >
                    {isActive && <Check size={12} color={textColor} />}
                    <Text style={{ fontSize: 11, fontWeight: isActive ? '700' : '500', color: textColor }}>
                      {step.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Abas Internas */}
          <View
            style={{
              flexDirection: 'row',
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
              backgroundColor: colors.mutedSurface,
            }}
          >
            {[
              { key: 'timeline' as TabKey, label: 'Timeline', icon: History },
              { key: 'matches' as TabKey, label: 'Match IA', icon: Sparkles },
              { key: 'tasks' as TabKey, label: 'Tarefas', icon: ListTodo },
              { key: 'info' as TabKey, label: 'Infos', icon: Building2 },
              { key: 'edit' as TabKey, label: 'Perfil', icon: User },
            ].map((tab) => {
              const isSelected = activeTab === tab.key;
              const IconComp = tab.icon;
              return (
                <TouchableOpacity
                  key={tab.key}
                  onPress={() => setActiveTab(tab.key)}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    alignItems: 'center',
                    borderBottomWidth: 2,
                    borderBottomColor: isSelected ? '#0ea5e9' : 'transparent',
                  }}
                >
                  <IconComp size={15} color={isSelected ? '#0ea5e9' : colors.textMuted} />
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: isSelected ? '700' : '500',
                      color: isSelected ? '#0ea5e9' : colors.textMuted,
                      marginTop: 2,
                    }}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Conteúdo da Aba */}
          <View style={{ flex: 1 }}>
            {/* ABA 1: TIMELINE */}
            {activeTab === 'timeline' && (
              <View style={{ flex: 1, padding: 16 }}>
                <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                  {loadingTimeline ? (
                    <ActivityIndicator color="#0ea5e9" style={{ marginVertical: 20 }} />
                  ) : timelineEvents.length === 0 ? (
                    <View style={{ padding: 24, alignItems: 'center' }}>
                      <Clock size={32} color={colors.textMuted} style={{ marginBottom: 8 }} />
                      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                        Nenhum registro ainda
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 4, textAlign: 'center' }}>
                        Adicione notas abaixo para registrar contatos, visitas ou atualizações.
                      </Text>
                    </View>
                  ) : (
                    timelineEvents.map((evt) => (
                      <View
                        key={evt.id}
                        style={{
                          flexDirection: 'row',
                          marginBottom: 14,
                          gap: 12,
                        }}
                      >
                        <View
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 14,
                            backgroundColor: evt.type === 'deal_closed' ? '#10b981' : isDark ? 'rgba(14, 165, 233, 0.2)' : '#e0f2fe',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginTop: 2,
                          }}
                        >
                          {evt.type === 'deal_closed' ? (
                            <Award size={14} color="#ffffff" />
                          ) : (
                            <Clock size={13} color="#0ea5e9" />
                          )}
                        </View>
                        <View
                          style={{
                            flex: 1,
                            backgroundColor: colors.mutedSurface,
                            padding: 12,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: colors.border,
                          }}
                        >
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>
                              {evt.title || 'Registro'}
                            </Text>
                            <Text style={{ fontSize: 10, color: colors.textMuted }}>
                              {timeAgo(evt.created_at)}
                            </Text>
                          </View>
                          <Text style={{ fontSize: 12, color: colors.text, lineHeight: 17 }}>
                            {evt.description}
                          </Text>
                        </View>
                      </View>
                    ))
                  )}
                </ScrollView>

                {/* Input para adicionar nova nota */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    paddingTop: 10,
                    borderTopWidth: 1,
                    borderTopColor: colors.border,
                  }}
                >
                  <TextInput
                    value={newNote}
                    onChangeText={setNewNote}
                    placeholder="Registrar nota ou interação..."
                    placeholderTextColor={colors.textMuted}
                    style={{
                      flex: 1,
                      backgroundColor: colors.mutedSurface,
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      fontSize: 13,
                      color: colors.text,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  />
                  <TouchableOpacity
                    onPress={handleAddNote}
                    disabled={sendingNote || !newNote.trim()}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      backgroundColor: newNote.trim() ? '#0ea5e9' : colors.mutedSurface,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {sendingNote ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Send size={16} color={newNote.trim() ? '#ffffff' : colors.textMuted} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ABA 2: MATCH IA */}
            {activeTab === 'matches' && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>
                <View
                  style={{
                    backgroundColor: isDark ? 'rgba(14, 165, 233, 0.1)' : '#f0f9ff',
                    padding: 12,
                    borderRadius: 12,
                    marginBottom: 14,
                    borderWidth: 1,
                    borderColor: isDark ? 'rgba(14, 165, 233, 0.2)' : '#bae6fd',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Sparkles size={18} color="#0ea5e9" />
                  <Text style={{ fontSize: 12, color: colors.text, flex: 1 }}>
                    Imóveis compatíveis com o orçamento de {formatCurrency(currentLead.budget)}:
                  </Text>
                </View>

                {loadingMatches ? (
                  <ActivityIndicator color="#0ea5e9" style={{ marginVertical: 20 }} />
                ) : matchedProps.length === 0 ? (
                  <View style={{ padding: 24, alignItems: 'center' }}>
                    <Building2 size={32} color={colors.textMuted} style={{ marginBottom: 8 }} />
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                      Nenhum imóvel compatível encontrado
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 4, textAlign: 'center' }}>
                      Cadastre novos imóveis na carteira com valores próximos ao orçamento.
                    </Text>
                  </View>
                ) : (
                  matchedProps.map((prop) => (
                    <View
                      key={prop.id}
                      style={{
                        backgroundColor: colors.card,
                        borderRadius: 12,
                        padding: 14,
                        marginBottom: 10,
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, flex: 1, marginRight: 8 }} numberOfLines={1}>
                          {prop.title}
                        </Text>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#10b981' }}>
                          {formatCurrency(prop.price)}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>
                        {prop.city ? `${prop.neighborhood || ''}, ${prop.city}` : 'Localização não informada'} • {prop.bedrooms || 0} quartos
                      </Text>
                    </View>
                  ))
                )}
              </ScrollView>
            )}

            {/* ABA 3: TAREFAS */}
            {activeTab === 'tasks' && (
              <View style={{ flex: 1, padding: 16 }}>
                <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                  {loadingTasks ? (
                    <ActivityIndicator color="#0ea5e9" style={{ marginVertical: 20 }} />
                  ) : tasks.length === 0 ? (
                    <View style={{ padding: 24, alignItems: 'center' }}>
                      <CheckSquare size={32} color={colors.textMuted} style={{ marginBottom: 8 }} />
                      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                        Nenhuma tarefa pendente
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 4, textAlign: 'center' }}>
                        Crie compromissos rápidos como "Enviar proposta", "Agendar visita", etc.
                      </Text>
                    </View>
                  ) : (
                    tasks.map((task) => (
                      <View
                        key={task.id}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: 12,
                          borderRadius: 12,
                          backgroundColor: colors.mutedSurface,
                          marginBottom: 8,
                          borderWidth: 1,
                          borderColor: colors.border,
                        }}
                      >
                        <TouchableOpacity
                          onPress={() => handleToggleTask(task)}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginRight: 8 }}
                        >
                          <View
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: 6,
                              borderWidth: 1.5,
                              borderColor: task.completed ? '#10b981' : colors.textMuted,
                              backgroundColor: task.completed ? '#10b981' : 'transparent',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {task.completed && <Check size={14} color="#ffffff" />}
                          </View>
                          <Text
                            style={{
                              fontSize: 13,
                              color: task.completed ? colors.textMuted : colors.text,
                              textDecorationLine: task.completed ? 'line-through' : 'none',
                              flex: 1,
                            }}
                          >
                            {task.title}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => handleDeleteTask(task.id)}>
                          <Trash2 size={16} color={colors.textMuted} />
                        </TouchableOpacity>
                      </View>
                    ))
                  )}
                </ScrollView>

                {/* Criador de Tarefas */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    paddingTop: 10,
                    borderTopWidth: 1,
                    borderTopColor: colors.border,
                  }}
                >
                  <TextInput
                    value={newTaskTitle}
                    onChangeText={setNewTaskTitle}
                    placeholder="Adicionar nova tarefa..."
                    placeholderTextColor={colors.textMuted}
                    style={{
                      flex: 1,
                      backgroundColor: colors.mutedSurface,
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      fontSize: 13,
                      color: colors.text,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  />
                  <TouchableOpacity
                    onPress={handleAddTask}
                    disabled={addingTask || !newTaskTitle.trim()}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      backgroundColor: newTaskTitle.trim() ? '#0ea5e9' : colors.mutedSurface,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {addingTask ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Plus size={18} color={newTaskTitle.trim() ? '#ffffff' : colors.textMuted} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ABA 4: INFOS & IMÓVEIS */}
            {activeTab === 'info' && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 12 }}>
                <View style={{ backgroundColor: colors.mutedSurface, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase' }}>
                    Dados do Atendimento
                  </Text>
                  <View style={{ marginTop: 8, gap: 6 }}>
                    <Text style={{ fontSize: 13, color: colors.text }}>
                      Canal de Origem: <Text style={{ fontWeight: '700' }}>{currentLead.source || 'Não especificado'}</Text>
                    </Text>
                    <Text style={{ fontSize: 13, color: colors.text }}>
                      Orçamento Estimado: <Text style={{ fontWeight: '700', color: '#10b981' }}>{formatCurrency(currentLead.budget)}</Text>
                    </Text>
                    <Text style={{ fontSize: 13, color: colors.text }}>
                      Corretor Responsável: <Text style={{ fontWeight: '700' }}>{currentLead.assigned_user?.name || 'Não atribuído'}</Text>
                    </Text>
                  </View>
                </View>

                {currentLead.notes || currentLead.message ? (
                  <View style={{ backgroundColor: colors.mutedSurface, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border }}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase' }}>
                      Observações / Mensagem do Lead
                    </Text>
                    <Text style={{ fontSize: 13, color: colors.text, marginTop: 6, lineHeight: 18 }}>
                      {currentLead.notes || currentLead.message}
                    </Text>
                  </View>
                ) : null}
              </ScrollView>
            )}

            {/* ABA 5: EDITAR PERFIL */}
            {activeTab === 'edit' && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 4 }}>Nome do Cliente</Text>
                <TextInput
                  value={editName}
                  onChangeText={setEditName}
                  style={{
                    backgroundColor: colors.mutedSurface,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    color: colors.text,
                    fontSize: 14,
                    borderWidth: 1,
                    borderColor: colors.border,
                    marginBottom: 12,
                  }}
                />

                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 4 }}>Telefone / WhatsApp</Text>
                <TextInput
                  value={editPhone}
                  onChangeText={setEditPhone}
                  keyboardType="phone-pad"
                  style={{
                    backgroundColor: colors.mutedSurface,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    color: colors.text,
                    fontSize: 14,
                    borderWidth: 1,
                    borderColor: colors.border,
                    marginBottom: 12,
                  }}
                />

                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 4 }}>E-mail</Text>
                <TextInput
                  value={editEmail}
                  onChangeText={setEditEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={{
                    backgroundColor: colors.mutedSurface,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    color: colors.text,
                    fontSize: 14,
                    borderWidth: 1,
                    borderColor: colors.border,
                    marginBottom: 12,
                  }}
                />

                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 4 }}>Orçamento (R$)</Text>
                <TextInput
                  value={editBudget}
                  onChangeText={setEditBudget}
                  keyboardType="numeric"
                  style={{
                    backgroundColor: colors.mutedSurface,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    color: colors.text,
                    fontSize: 14,
                    borderWidth: 1,
                    borderColor: colors.border,
                    marginBottom: 12,
                  }}
                />

                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 4 }}>Observações Gerais</Text>
                <TextInput
                  value={editNotes}
                  onChangeText={setEditNotes}
                  multiline
                  numberOfLines={3}
                  style={{
                    backgroundColor: colors.mutedSurface,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    color: colors.text,
                    fontSize: 14,
                    borderWidth: 1,
                    borderColor: colors.border,
                    minHeight: 60,
                    textAlignVertical: 'top',
                    marginBottom: 16,
                  }}
                />

                <TouchableOpacity
                  onPress={handleSaveEdit}
                  disabled={savingEdit}
                  style={{
                    backgroundColor: '#0ea5e9',
                    paddingVertical: 12,
                    borderRadius: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {savingEdit ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#ffffff' }}>Salvar Alterações</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Submodal Fechar Venda */}
      <CloseSaleModal
        visible={showCloseSale}
        lead={currentLead}
        onClose={() => setShowCloseSale(false)}
        onSaleSuccess={() => {
          onLeadUpdated();
          onClose();
        }}
      />

      {/* Submodal Marcar Perdido */}
      <LostLeadModal
        visible={showLostLead}
        lead={currentLead}
        onClose={() => setShowLostLead(false)}
        onLostSuccess={() => {
          onLeadUpdated();
          onClose();
        }}
      />

      {/* Submodal Transferir Lead */}
      <TransferLeadModal
        visible={showTransfer}
        lead={currentLead}
        onClose={() => setShowTransfer(false)}
        onTransferSuccess={() => {
          onLeadUpdated();
          onClose();
        }}
      />
    </Modal>
  );
};

