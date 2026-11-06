import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Building2,
  DollarSign,
  Mail,
  Phone,
  Tag,
  User,
  UserCheck,
  X,
} from 'lucide-react-native';
import { Lead, Profile, Property } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { LEAD_SOURCES } from '../../utils/crm';

interface NewLeadModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (newLead: Lead) => void;
}

export const NewLeadModal: React.FC<NewLeadModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const { user, profile, isAdmin, isManager, isOwner, settings } = useAuth();
  const { colors, isDark } = useAppTheme();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [budget, setBudget] = useState('');
  const [source, setSource] = useState('Manual');
  const [message, setMessage] = useState('');
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [assignedTo, setAssignedTo] = useState<string>(user?.id || '');

  const [properties, setProperties] = useState<Property[]>([]);
  const [brokers, setBrokers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  const canManageAssignees = isOwner || isAdmin || isManager;

  useEffect(() => {
    if (visible && user) {
      setName('');
      setPhone('');
      setEmail('');
      setBudget('');
      setSource('Manual');
      setMessage('');
      setPropertyId(null);
      setAssignedTo(user.id);

      if (profile?.company_id) {
        // Carrega imóveis para associar ao lead
        supabase
          .from('properties')
          .select('id, title, price')
          .eq('company_id', profile.company_id)
          .order('title', { ascending: true })
          .then(({ data }) => {
            if (data) setProperties(data as unknown as Property[]);
          });

        // Se for gestor, carrega os corretores da imobiliária
        if (canManageAssignees) {
          supabase
            .from('profiles')
            .select('id, name, email, avatar_url, role')
            .eq('company_id', profile.company_id)
            .order('name', { ascending: true })
            .then(({ data }) => {
              if (data) setBrokers(data as unknown as Profile[]);
            });
        }
      }
    }
  }, [visible, user, profile?.company_id, canManageAssignees]);

  const handlePhoneChange = (text: string) => {
    const numeric = text.replace(/\D/g, '');
    let formatted = numeric;
    if (numeric.length > 2) {
      formatted = `(${numeric.slice(0, 2)}) ${numeric.slice(2)}`;
    }
    if (numeric.length > 7) {
      formatted = `(${numeric.slice(0, 2)}) ${numeric.slice(2, 7)}-${numeric.slice(7, 11)}`;
    }
    setPhone(formatted);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Campo Obrigatório', 'Por favor, informe o nome do lead.');
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      Alert.alert('Telefone Inválido', 'Por favor, informe um telefone válido com DDD.');
      return;
    }

    setLoading(true);

    try {
      const numericBudget = budget ? Number(budget.replace(/\D/g, '')) || null : null;
      const now = new Date().toISOString();

      // Checa se rota para central está ativa
      let finalAssignee = assignedTo || user?.id;
      if (settings?.route_to_central && settings?.central_user_id) {
        if (!canManageAssignees) {
          finalAssignee = settings.central_user_id;
        }
      }

      const newLeadPayload: any = {
        name: name.trim(),
        phone: cleanPhone,
        email: email.trim() || null,
        source,
        budget: numericBudget,
        message: message.trim() || null,
        property_id: propertyId,
        assigned_to: finalAssignee,
        status: 'Aguardando Atendimento',
        funnel_step: 'pre_atendimento',
        company_id: profile?.company_id || null,
        created_at: now,
        stage_updated_at: now,
        last_interaction: now,
      };

      const { data: inserted, error: insertErr } = await supabase
        .from('leads')
        .insert(newLeadPayload)
        .select(`
          id, name, phone, email, status, source, budget, assigned_to, created_at, message, property_id,
          properties:property_id ( id, title )
        `)
        .single();

      if (insertErr) throw insertErr;

      // 1. Registra criação na timeline_events
      if (inserted?.id) {
        await supabase.from('timeline_events').insert({
          lead_id: inserted.id,
          type: 'note',
          description: `Lead cadastrado manualmente no app móvel por ${profile?.name || 'Corretor'}.`,
          company_id: profile?.company_id || null,
          created_by: user?.id,
        });

        // 2. Notificação se atribuído a outro corretor
        if (finalAssignee && user?.id && finalAssignee !== user.id) {
          await supabase.from('notifications').insert({
            user_id: finalAssignee,
            company_id: profile?.company_id || null,
            title: 'Novo Lead Atribuído',
            message: `Você recebeu um novo lead: ${name.trim()}`,
            type: 'lead_assigned',
            read: false,
          });
        }
      }

      setLoading(false);
      onSuccess(inserted as unknown as Lead);
      onClose();
    } catch (err: any) {
      setLoading(false);
      console.error('Erro ao cadastrar lead:', err);
      Alert.alert('Erro ao Salvar', err.message || 'Não foi possível cadastrar o lead.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' }}
      >
        <View
          style={{
            backgroundColor: colors.card,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: Platform.OS === 'ios' ? 40 : 24,
            maxHeight: '90%',
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <View>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>
                Novo Lead
              </Text>
              <Text style={{ fontSize: 12, color: colors.textMuted }}>
                Cadastrar cliente e iniciar atendimento
              </Text>
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
            {/* Nome */}
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 6 }}>
              Nome do Cliente *
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.mutedSurface,
                borderRadius: 12,
                paddingHorizontal: 12,
                borderWidth: 1,
                borderColor: colors.border,
                marginBottom: 12,
              }}
            >
              <User size={16} color={colors.textMuted} />
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Ex: Carlos Eduardo"
                placeholderTextColor={colors.textMuted}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  paddingHorizontal: 8,
                  fontSize: 14,
                  color: colors.text,
                }}
              />
            </View>

            {/* Telefone */}
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 6 }}>
              WhatsApp / Telefone *
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.mutedSurface,
                borderRadius: 12,
                paddingHorizontal: 12,
                borderWidth: 1,
                borderColor: colors.border,
                marginBottom: 12,
              }}
            >
              <Phone size={16} color={colors.textMuted} />
              <TextInput
                value={phone}
                onChangeText={handlePhoneChange}
                placeholder="(00) 00000-0000"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                maxLength={15}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  paddingHorizontal: 8,
                  fontSize: 14,
                  color: colors.text,
                }}
              />
            </View>

            {/* Email */}
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 6 }}>
              E-mail (opcional)
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.mutedSurface,
                borderRadius: 12,
                paddingHorizontal: 12,
                borderWidth: 1,
                borderColor: colors.border,
                marginBottom: 12,
              }}
            >
              <Mail size={16} color={colors.textMuted} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="carlos@email.com"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  paddingHorizontal: 8,
                  fontSize: 14,
                  color: colors.text,
                }}
              />
            </View>

            {/* Orçamento Previsto */}
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 6 }}>
              Orçamento / Valor Previsto
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.mutedSurface,
                borderRadius: 12,
                paddingHorizontal: 12,
                borderWidth: 1,
                borderColor: colors.border,
                marginBottom: 12,
              }}
            >
              <DollarSign size={16} color={colors.textMuted} />
              <TextInput
                value={budget}
                onChangeText={setBudget}
                placeholder="Ex: 500000"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  paddingHorizontal: 8,
                  fontSize: 14,
                  color: colors.text,
                }}
              />
            </View>

            {/* Canal de Origem */}
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 6 }}>
              Canal de Origem
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingBottom: 12 }}
            >
              {LEAD_SOURCES.map((s) => {
                const isSelected = source === s;
                return (
                  <TouchableOpacity
                    key={s}
                    onPress={() => setSource(s)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 10,
                      backgroundColor: isSelected
                        ? (isDark ? 'rgba(14, 165, 233, 0.2)' : '#e0f2fe')
                        : colors.mutedSurface,
                      borderWidth: 1,
                      borderColor: isSelected ? '#0ea5e9' : colors.border,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: isSelected ? '700' : '500',
                        color: isSelected ? '#0ea5e9' : colors.text,
                      }}
                    >
                      {s}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Imóvel de Interesse */}
            {properties.length > 0 && (
              <>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 6 }}>
                  Imóvel de Interesse
                </Text>
                <View style={{ maxHeight: 140, marginBottom: 12 }}>
                  <ScrollView nestedScrollEnabled style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12 }}>
                    <TouchableOpacity
                      onPress={() => setPropertyId(null)}
                      style={{
                        padding: 10,
                        backgroundColor: propertyId === null ? (isDark ? 'rgba(14, 165, 233, 0.15)' : '#e0f2fe') : colors.card,
                        borderBottomWidth: 1,
                        borderBottomColor: colors.border,
                      }}
                    >
                      <Text style={{ fontSize: 12, color: propertyId === null ? '#0ea5e9' : colors.textMuted }}>
                        Nenhum imóvel específico
                      </Text>
                    </TouchableOpacity>
                    {properties.map((p) => {
                      const isSel = propertyId === p.id;
                      return (
                        <TouchableOpacity
                          key={p.id}
                          onPress={() => setPropertyId(p.id)}
                          style={{
                            padding: 10,
                            backgroundColor: isSel ? (isDark ? 'rgba(14, 165, 233, 0.15)' : '#e0f2fe') : colors.card,
                            borderBottomWidth: 1,
                            borderBottomColor: colors.border,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: isSel ? '700' : '500',
                              color: isSel ? '#0ea5e9' : colors.text,
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
              </>
            )}

            {/* Corretor Responsável (se Gestor) */}
            {canManageAssignees && brokers.length > 0 && (
              <>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 6 }}>
                  Atribuir Corretor
                </Text>
                <View style={{ maxHeight: 130, marginBottom: 12 }}>
                  <ScrollView nestedScrollEnabled style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12 }}>
                    {brokers.map((b) => {
                      const isSel = assignedTo === b.id;
                      return (
                        <TouchableOpacity
                          key={b.id}
                          onPress={() => setAssignedTo(b.id)}
                          style={{
                            padding: 10,
                            backgroundColor: isSel ? (isDark ? 'rgba(14, 165, 233, 0.15)' : '#e0f2fe') : colors.card,
                            borderBottomWidth: 1,
                            borderBottomColor: colors.border,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: isSel ? '700' : '500',
                              color: isSel ? '#0ea5e9' : colors.text,
                            }}
                          >
                            {b.name} ({b.role})
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              </>
            )}

            {/* Mensagem / Observações */}
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 6 }}>
              Observação Inicial (opcional)
            </Text>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Ex: Cliente busca apartamento com 3 quartos próximo ao metrô..."
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

            {/* Botão Salvar */}
            <TouchableOpacity
              onPress={handleSave}
              disabled={loading}
              style={{
                backgroundColor: '#0ea5e9',
                paddingVertical: 14,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 20,
              }}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#ffffff' }}>
                  Salvar e Iniciar Atendimento
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
