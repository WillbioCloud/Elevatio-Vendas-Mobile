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
  Building,
  DollarSign,
  Mail,
  Phone,
  Tag,
  User,
  UserCheck,
  X,
} from 'lucide-react-native';
import { Lead, Profile, Property } from '../types';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import { LEAD_SOURCES } from '../utils/crm';

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
  const { user, profile, isAdmin, isManager, isOwner } = useAuth();
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
            .eq('active', true)
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

      const newLeadPayload: any = {
        name: name.trim(),
        phone: cleanPhone,
        email: email.trim() || null,
        source,
        budget: numericBudget,
        message: message.trim() || null,
        property_id: propertyId,
        assigned_to: assignedTo || user?.id,
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
        if (assignedTo && user?.id && assignedTo !== user.id) {
          await supabase.from('notifications').insert({
            user_id: assignedTo,
            company_id: profile?.company_id || null,
            title: 'Novo Lead Atribuído',
            message: `Você recebeu um novo lead: ${name.trim()}`,
            type: 'lead_assigned',
            read: false,
            link: `/leads`,
          });
        }
      }

      setLoading(false);
      onSuccess(inserted as unknown as Lead);
      onClose();
      Alert.alert('Sucesso', 'Lead cadastrado com sucesso!');
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
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            maxHeight: '90%',
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: Platform.OS === 'ios' ? 34 : 20,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          {/* Header */}
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
                Novo Lead
              </Text>
              <Text style={{ fontFamily: 'Sora_400Regular', fontSize: 12, color: colors.textMuted }}>
                Cadastro rápido para atendimento
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
            {/* Campo Nome */}
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontFamily: 'Sora_600SemiBold', fontSize: 12, color: colors.text, marginBottom: 6 }}>
                Nome do Lead *
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: isDark ? '#0a0f1c' : '#f8fafc',
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 14,
                  paddingHorizontal: 12,
                  height: 48,
                }}
              >
                <User size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
                <TextInput
                  style={{ flex: 1, fontFamily: 'Sora_400Regular', fontSize: 14, color: colors.text }}
                  placeholder="Ex: Carlos Eduardo Silveira"
                  placeholderTextColor={colors.textMuted}
                  value={name}
                  onChangeText={setName}
                />
              </View>
            </View>

            {/* Campo WhatsApp com Máscara */}
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontFamily: 'Sora_600SemiBold', fontSize: 12, color: colors.text, marginBottom: 6 }}>
                WhatsApp / Telefone *
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: isDark ? '#0a0f1c' : '#f8fafc',
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 14,
                  paddingHorizontal: 12,
                  height: 48,
                }}
              >
                <Phone size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
                <TextInput
                  style={{ flex: 1, fontFamily: 'Sora_400Regular', fontSize: 14, color: colors.text }}
                  placeholder="(11) 99999-9999"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={handlePhoneChange}
                  maxLength={15}
                />
              </View>
            </View>

            {/* Origem do Lead */}
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontFamily: 'Sora_600SemiBold', fontSize: 12, color: colors.text, marginBottom: 6 }}>
                Origem da Captação
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {LEAD_SOURCES.map((src) => {
                  const isSelected = source === src;
                  return (
                    <TouchableOpacity
                      key={src}
                      onPress={() => setSource(src)}
                      style={{
                        backgroundColor: isSelected ? '#0ea5e9' : isDark ? '#0a0f1c' : '#f8fafc',
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: isSelected ? '#0ea5e9' : colors.border,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: isSelected ? 'Sora_700Bold' : 'Sora_600SemiBold',
                          fontSize: 11,
                          color: isSelected ? '#ffffff' : colors.textMuted,
                        }}
                      >
                        {src}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* E-mail (Opcional) */}
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontFamily: 'Sora_600SemiBold', fontSize: 12, color: colors.text, marginBottom: 6 }}>
                E-mail (Opcional)
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: isDark ? '#0a0f1c' : '#f8fafc',
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 14,
                  paddingHorizontal: 12,
                  height: 48,
                }}
              >
                <Mail size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
                <TextInput
                  style={{ flex: 1, fontFamily: 'Sora_400Regular', fontSize: 14, color: colors.text }}
                  placeholder="cliente@email.com"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
            </View>

            {/* Orçamento Previsto */}
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontFamily: 'Sora_600SemiBold', fontSize: 12, color: colors.text, marginBottom: 6 }}>
                Orçamento Previsto (R$)
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: isDark ? '#0a0f1c' : '#f8fafc',
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 14,
                  paddingHorizontal: 12,
                  height: 48,
                }}
              >
                <DollarSign size={18} color="#10b981" style={{ marginRight: 8 }} />
                <TextInput
                  style={{ flex: 1, fontFamily: 'Sora_400Regular', fontSize: 14, color: colors.text }}
                  placeholder="Ex: 650000"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={budget}
                  onChangeText={setBudget}
                />
              </View>
            </View>

            {/* Imóvel de Interesse */}
            {properties.length > 0 && (
              <View style={{ marginBottom: 14 }}>
                <Text style={{ fontFamily: 'Sora_600SemiBold', fontSize: 12, color: colors.text, marginBottom: 6 }}>
                  Imóvel de Interesse (Opcional)
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {properties.map((p) => {
                    const isSelected = propertyId === p.id;
                    return (
                      <TouchableOpacity
                        key={p.id}
                        onPress={() => setPropertyId(isSelected ? null : p.id)}
                        style={{
                          backgroundColor: isSelected ? '#0ea5e9' : isDark ? '#0a0f1c' : '#f8fafc',
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: isSelected ? '#0ea5e9' : colors.border,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: isSelected ? 'Sora_700Bold' : 'Sora_600SemiBold',
                            fontSize: 11,
                            color: isSelected ? '#ffffff' : colors.text,
                          }}
                        >
                          {p.title}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Atribuição de Corretor (Apenas Gestores / Admin / Owner) */}
            {canManageAssignees && brokers.length > 0 && (
              <View style={{ marginBottom: 14 }}>
                <Text style={{ fontFamily: 'Sora_600SemiBold', fontSize: 12, color: colors.text, marginBottom: 6 }}>
                  Atribuir a um Corretor
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {brokers.map((b) => {
                    const isSelected = assignedTo === b.id;
                    return (
                      <TouchableOpacity
                        key={b.id}
                        onPress={() => setAssignedTo(b.id)}
                        style={{
                          backgroundColor: isSelected ? '#0284c7' : isDark ? '#0a0f1c' : '#f8fafc',
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: isSelected ? '#0284c7' : colors.border,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: isSelected ? 'Sora_700Bold' : 'Sora_600SemiBold',
                            fontSize: 11,
                            color: isSelected ? '#ffffff' : colors.text,
                          }}
                        >
                          {b.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Observações Iniciais */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontFamily: 'Sora_600SemiBold', fontSize: 12, color: colors.text, marginBottom: 6 }}>
                Observação Inicial (Opcional)
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
                  placeholder="Ex: Procura apartamento com 3 dormitórios próximo ao metrô..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={3}
                  value={message}
                  onChangeText={setMessage}
                />
              </View>
            </View>

            {/* Botão Salvar Lead */}
            <TouchableOpacity
              onPress={handleSave}
              disabled={loading}
              style={{
                backgroundColor: '#0ea5e9',
                borderRadius: 14,
                height: 50,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#0ea5e9',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 4,
                marginBottom: 10,
              }}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={{ fontFamily: 'Sora_700Bold', fontSize: 15, color: '#ffffff' }}>
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

