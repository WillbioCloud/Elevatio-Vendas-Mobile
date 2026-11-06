import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  GestureResponderEvent,
  PanResponder,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  FileCheck,
  PenTool,
  RefreshCw,
  ShieldCheck,
  Type,
  X,
} from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';

export default function SignatureScreen() {
  const router = useRouter();
  const { contract_id } = useLocalSearchParams<{ contract_id?: string }>();
  const { user, profile, company } = useAuth();
  const { colors, isDark } = useAppTheme();

  const [mode, setMode] = useState<'draw' | 'type'>('draw');
  const [typedName, setTypedName] = useState(profile?.name || '');
  const [paths, setPaths] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [saving, setSaving] = useState(false);

  // PanResponder para captura de toque suave no canvas de desenho
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentPath(`M ${locationX.toFixed(1)} ${locationY.toFixed(1)}`);
      },
      onPanResponderMove: (evt: GestureResponderEvent) => {
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentPath((prev) => `${prev} L ${locationX.toFixed(1)} ${locationY.toFixed(1)}`);
      },
      onPanResponderRelease: () => {
        setCurrentPath((prev) => {
          if (prev) {
            setPaths((all) => [...all, prev]);
          }
          return '';
        });
      },
    })
  ).current;

  const handleClear = () => {
    setPaths([]);
    setCurrentPath('');
  };

  const handleSaveSignature = async () => {
    if (!user) return;

    if (mode === 'draw' && paths.length === 0 && !currentPath) {
      Alert.alert('Assinatura Vazia', 'Por favor, desenhe sua assinatura na área indicada.');
      return;
    }

    if (mode === 'type' && !typedName.trim()) {
      Alert.alert('Campo Obrigatório', 'Por favor, digite seu nome completo para gerar a assinatura.');
      return;
    }

    try {
      setSaving(true);
      const signatureData =
        mode === 'draw'
          ? `svg:${paths.join(' ')}`
          : `typed:${typedName.trim()}`;

      // 1. Atualiza a assinatura no perfil do usuário
      const { error: profErr } = await supabase
        .from('profiles')
        .update({
          signature_url: signatureData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (profErr) throw profErr;

      // 2. Se for dono e não houver admin_signature_url, atualiza na empresa também
      if (profile?.role === 'owner' && profile?.company_id) {
        await supabase
          .from('companies')
          .update({
            admin_signature_url: signatureData,
          })
          .eq('id', profile.company_id);
      }

      // 3. Se foi chamada no contexto de um contrato específico, registra a assinatura
      if (contract_id) {
        const now = new Date().toISOString();

        // Procura se já existe um signer registrado para este usuário/e-mail
        const { data: signers } = await supabase
          .from('contract_signatures')
          .select('id, signer_email')
          .eq('contract_id', contract_id);

        const mySigner = signers?.find(
          (s) => s.signer_email?.toLowerCase() === user.email?.toLowerCase()
        );

        if (mySigner) {
          await supabase
            .from('contract_signatures')
            .update({
              status: 'signed',
              signed_at: now,
              signature_image: signatureData,
              signer_name: profile?.name || 'Corretor',
            })
            .eq('id', mySigner.id);
        } else {
          // Insere nova assinatura assinada
          await supabase.from('contract_signatures').insert({
            contract_id,
            company_id: profile?.company_id || null,
            signer_name: profile?.name || 'Corretor',
            signer_email: user.email,
            signer_phone: profile?.phone || null,
            signer_role: profile?.role === 'owner' ? 'Diretor/Gestor' : 'Corretor Responsável',
            status: 'signed',
            signed_at: now,
            signature_image: signatureData,
          });
        }

        // Verifica se todas as assinaturas do contrato foram concluídas
        const { data: allSigs } = await supabase
          .from('contract_signatures')
          .select('status')
          .eq('contract_id', contract_id);

        const allSigned = allSigs && allSigs.length > 0 && allSigs.every((s) => s.status === 'signed');
        if (allSigned) {
          await supabase
            .from('contracts')
            .update({ status: 'active', updated_at: now })
            .eq('id', contract_id);
        }

        Alert.alert('Documento Assinado! ✍️', 'Sua assinatura foi vinculada ao contrato com validade jurídica.');
      } else {
        Alert.alert('Assinatura Atualizada!', 'Sua assinatura eletrônica padrão foi salva com sucesso.');
      }

      router.back();
    } catch (err: any) {
      Alert.alert('Erro ao salvar assinatura', err.message || 'Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: 52 }}>
      {/* Header com Voltar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          marginBottom: 16,
        }}
      >
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

        <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>
          {contract_id ? 'Assinar Contrato' : 'Minha Assinatura Digital'}
        </Text>

        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
        {/* Banner de Validade Jurídica */}
        <View
          style={{
            backgroundColor: isDark ? 'rgba(14, 165, 233, 0.1)' : '#f0f9ff',
            borderRadius: 14,
            padding: 14,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: isDark ? 'rgba(14, 165, 233, 0.2)' : '#bae6fd',
          }}
        >
          <ShieldCheck size={22} color="#0ea5e9" />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#0ea5e9' }}>
              Validade Jurídica Certificada
            </Text>
            <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2, lineHeight: 16 }}>
              Assinatura eletrônica em conformidade com a MP 2.200-2/2001 e a Lei 14.063/2020 para atos e contratos imobiliários.
            </Text>
          </View>
        </View>

        {/* Alternador de Modo: Desenhar vs Digitar */}
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: colors.mutedSurface,
            borderRadius: 12,
            padding: 4,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <TouchableOpacity
            onPress={() => setMode('draw')}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              paddingVertical: 10,
              borderRadius: 8,
              backgroundColor: mode === 'draw' ? colors.card : 'transparent',
              borderWidth: mode === 'draw' ? 1 : 0,
              borderColor: colors.border,
            }}
          >
            <PenTool size={15} color={mode === 'draw' ? '#0ea5e9' : colors.textMuted} />
            <Text
              style={{
                fontSize: 13,
                fontWeight: mode === 'draw' ? '700' : '500',
                color: mode === 'draw' ? '#0ea5e9' : colors.textMuted,
              }}
            >
              Desenhar a Mão
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setMode('type')}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              paddingVertical: 10,
              borderRadius: 8,
              backgroundColor: mode === 'type' ? colors.card : 'transparent',
              borderWidth: mode === 'type' ? 1 : 0,
              borderColor: colors.border,
            }}
          >
            <Type size={15} color={mode === 'type' ? '#0ea5e9' : colors.textMuted} />
            <Text
              style={{
                fontSize: 13,
                fontWeight: mode === 'type' ? '700' : '500',
                color: mode === 'type' ? '#0ea5e9' : colors.textMuted,
              }}
            >
              Digitar Nome
            </Text>
          </TouchableOpacity>
        </View>

        {/* ÁREA DE ASSINATURA */}
        {mode === 'draw' ? (
          <View>
            <View
              style={{
                backgroundColor: colors.card,
                borderRadius: 16,
                borderWidth: 2,
                borderColor: '#0ea5e9',
                borderStyle: 'dashed',
                height: 220,
                overflow: 'hidden',
                position: 'relative',
              }}
              {...panResponder.panHandlers}
            >
              <Svg style={{ width: '100%', height: '100%' }}>
                {paths.map((d, i) => (
                  <Path
                    key={i}
                    d={d}
                    stroke={isDark ? '#38bdf8' : '#0369a1'}
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                ))}
                {currentPath ? (
                  <Path
                    d={currentPath}
                    stroke={isDark ? '#38bdf8' : '#0369a1'}
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                ) : null}
              </Svg>

              {paths.length === 0 && !currentPath && (
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <PenTool size={28} color={colors.textMuted} style={{ marginBottom: 6, opacity: 0.5 }} />
                  <Text style={{ fontSize: 13, color: colors.textMuted }}>
                    Desenhe sua assinatura com o dedo aqui
                  </Text>
                </View>
              )}
            </View>

            {/* Botão Limpar Desenho */}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }}>
              <TouchableOpacity
                onPress={handleClear}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                  backgroundColor: colors.mutedSurface,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <RefreshCw size={13} color={colors.textMuted} />
                <Text style={{ fontSize: 12, color: colors.textMuted }}>Limpar</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View>
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 6 }}>
              Seu Nome Completo
            </Text>
            <TextInput
              value={typedName}
              onChangeText={setTypedName}
              placeholder="Digite seu nome para assinar"
              placeholderTextColor={colors.textMuted}
              style={{
                backgroundColor: colors.card,
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontSize: 15,
                color: colors.text,
                borderWidth: 1,
                borderColor: colors.border,
                marginBottom: 16,
              }}
            />

            {/* Prévia da Assinatura Cursiva */}
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textMuted, marginBottom: 8 }}>
              Prévia Visual da Assinatura:
            </Text>
            <View
              style={{
                backgroundColor: colors.card,
                borderRadius: 16,
                padding: 24,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: colors.border,
                minHeight: 120,
              }}
            >
              <Text
                style={{
                  fontSize: 26,
                  fontStyle: 'italic',
                  fontWeight: '600',
                  color: isDark ? '#38bdf8' : '#0369a1',
                  textAlign: 'center',
                }}
              >
                {typedName || 'Sua Assinatura'}
              </Text>
              <View style={{ height: 1, width: 140, backgroundColor: isDark ? '#38bdf8' : '#0369a1', marginTop: 8 }} />
            </View>
          </View>
        )}

        {/* Botão Salvar Assinatura */}
        <TouchableOpacity
          onPress={handleSaveSignature}
          disabled={saving}
          style={{
            backgroundColor: '#0ea5e9',
            paddingVertical: 14,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 24,
          }}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#ffffff' }}>
              {contract_id ? 'Confirmar e Assinar Contrato' : 'Salvar Minha Assinatura'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

