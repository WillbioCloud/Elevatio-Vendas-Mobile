import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Check,
  CheckCircle,
  CheckCircle2,
  Download,
  Eye,
  FileCheck,
  FileText,
  PenTool,
  Share2,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import WebView, { WebViewProps } from 'react-native-webview';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Contract, ContractSignature } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../utils/crm';

const NativeWebView = WebView as unknown as React.ComponentType<WebViewProps & { ref?: React.Ref<any> }>;

interface ContractReviewModalProps {
  visible: boolean;
  contract: Contract | null;
  onClose: () => void;
  onOpenTracker: (contract: Contract) => void;
  onContractUpdated: () => void;
}

export const ContractReviewModal: React.FC<ContractReviewModalProps> = ({
  visible,
  contract,
  onClose,
  onOpenTracker,
  onContractUpdated,
}) => {
  const router = useRouter();
  const { user, profile, company, permissions } = useAuth();
  const { colors, isDark } = useAppTheme();

  const [signatures, setSignatures] = useState<ContractSignature[]>([]);
  const [loadingSignatures, setLoadingSignatures] = useState(false);
  const [approving, setApproving] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  // Modal com 2 escolhas de assinatura
  const [showSignChoiceModal, setShowSignChoiceModal] = useState(false);
  const [applyingSavedSign, setApplyingSavedSign] = useState(false);

  const savedSignatureUrl = profile?.signature_url || company?.admin_signature_url || null;

  // Carrega assinaturas do contrato
  useEffect(() => {
    if (visible && contract?.id) {
      const fetchSignatures = async () => {
        try {
          setLoadingSignatures(true);
          const { data, error } = await supabase
            .from('contract_signatures')
            .select('*')
            .eq('contract_id', contract.id)
            .order('created_at', { ascending: true });

          if (!error && data) {
            setSignatures(data as ContractSignature[]);
          }
        } catch (err) {
          console.warn('Erro ao carregar assinaturas:', err);
        } finally {
          setLoadingSignatures(false);
        }
      };

      fetchSignatures();
    }
  }, [visible, contract?.id]);

  if (!contract) return null;

  const totalValue = contract.sale_total_value || contract.rent_value || 0;
  const isDraftOrReview = contract.status === 'draft' || contract.status === 'review';

  // Montagem do HTML oficial da Folha A4 formatada
  const buildContractA4Html = () => {
    let rawContent = contract.html_content || contract.content || '';

    // Mapeia assinaturas por papel para substituição das tags
    const signaturesByRole: Record<string, ContractSignature> = {};
    signatures.forEach((sig) => {
      const r = (sig.signer_role || '').toLowerCase();
      if (r.includes('locador') || r.includes('vendedor')) signaturesByRole['seller'] = sig;
      else if (r.includes('locatario') || r.includes('comprador')) signaturesByRole['buyer'] = sig;
      else if (r.includes('corretor') || r.includes('intermediador')) signaturesByRole['broker'] = sig;
      else if (r.includes('testemunha 1') || r.includes('testemunha_1')) signaturesByRole['witness1'] = sig;
      else if (r.includes('testemunha 2') || r.includes('testemunha_2')) signaturesByRole['witness2'] = sig;
    });

    const createSignatureBlockHtml = (roleTitle: string, sig?: ContractSignature) => {
      if (sig && sig.status === 'signed' && sig.signature_image) {
        let imgTag = '';
        if (sig.signature_image.startsWith('svg:')) {
          const pathD = sig.signature_image.replace('svg:', '');
          imgTag = `<svg style="max-height: 48px; max-width: 220px;" viewBox="0 0 300 80"><path d="${pathD}" stroke="#0f172a" stroke-width="2.5" fill="none"/></svg>`;
        } else {
          imgTag = `<img src="${sig.signature_image}" style="max-height: 48px; max-width: 200px; object-fit: contain;" />`;
        }

        const dateStr = sig.signed_at ? new Date(sig.signed_at).toLocaleString('pt-BR') : '';

        return `
          <div style="text-align: center; margin: 16px auto; min-width: 220px; display: inline-block;">
            <div style="min-height: 50px; display: flex; align-items: center; justify-content: center;">
              ${imgTag}
            </div>
            <div style="border-top: 1.5px solid #0f172a; padding-top: 4px; margin-top: 2px;">
              <strong style="font-size: 13px; color: #0f172a; display: block;">${sig.signer_name}</strong>
              <span style="font-size: 11px; color: #64748b; display: block;">${roleTitle}</span>
              <span style="font-size: 10px; color: #10b981; font-weight: bold; display: block; margin-top: 2px;">
                ✓ ASSINADO DIGITALMENTE • ${dateStr}
              </span>
            </div>
          </div>
        `;
      }

      const defaultName = sig?.signer_name || roleTitle;
      return `
        <div style="text-align: center; margin: 20px auto; min-width: 220px; display: inline-block;">
          <div style="height: 44px;"></div>
          <div style="border-top: 1px dashed #94a3b8; padding-top: 4px;">
            <strong style="font-size: 12px; color: #334155; display: block;">${defaultName}</strong>
            <span style="font-size: 11px; color: #64748b; display: block;">${roleTitle} (Pendente)</span>
          </div>
        </div>
      `;
    };

    // Substitui as tags de assinatura pelo layout visual
    rawContent = rawContent
      .replace(/\{\{ASSINATURA_LOCADOR\}\}/g, createSignatureBlockHtml('Locador / Proprietário', signaturesByRole['seller']))
      .replace(/\{\{ASSINATURA_VENDEDOR\}\}/g, createSignatureBlockHtml('Vendedor / Proprietário', signaturesByRole['seller']))
      .replace(/\{\{ASSINATURA_LOCATARIO\}\}/g, createSignatureBlockHtml('Locatário / Inquilino', signaturesByRole['buyer']))
      .replace(/\{\{ASSINATURA_COMPRADOR\}\}/g, createSignatureBlockHtml('Comprador', signaturesByRole['buyer']))
      .replace(/\{\{ASSINATURA_CORRETOR\}\}/g, createSignatureBlockHtml('Corretor de Imóveis', signaturesByRole['broker']))
      .replace(/\{\{ASSINATURA_TESTEMUNHA_1\}\}/g, createSignatureBlockHtml('Testemunha 1', signaturesByRole['witness1']))
      .replace(/\{\{ASSINATURA_TESTEMUNHA_2\}\}/g, createSignatureBlockHtml('Testemunha 2', signaturesByRole['witness2']));

    // Se o conteúdo for texto simples sem HTML, converte quebras de linha em parágrafos
    if (!rawContent.includes('<p>') && !rawContent.includes('<div>')) {
      rawContent = rawContent
        .split('\n\n')
        .map((p) => `<p style="margin-bottom: 12px; text-align: justify; line-height: 1.6;">${p.replace(/\n/g, '<br />')}</p>`)
        .join('');
    }

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 16px;
              background-color: #f1f5f9;
              font-family: 'Georgia', 'Times New Roman', serif;
              color: #0f172a;
              display: flex;
              justify-content: center;
            }
            .a4-page {
              background: #ffffff;
              width: 100%;
              max-width: 800px;
              min-height: 900px;
              padding: 36px 32px;
              border-radius: 8px;
              box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
              font-size: 13.5px;
              line-height: 1.7;
            }
            h1, h2, h3 {
              font-family: 'Inter', -apple-system, sans-serif;
              color: #0f172a;
              text-align: center;
              margin-top: 0;
            }
            h1 { font-size: 18px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
            h2 { font-size: 15px; margin-bottom: 20px; color: #475569; }
            p { margin: 0 0 12px 0; text-align: justify; }
            .header-badge {
              text-align: center;
              font-family: -apple-system, sans-serif;
              font-size: 11px;
              color: #0ea5e9;
              font-weight: bold;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-bottom: 16px;
              border-bottom: 2px solid #0ea5e9;
              padding-bottom: 8px;
            }
            .signatures-container {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e2e8f0;
              display: flex;
              flex-wrap: wrap;
              justify-content: space-around;
              gap: 20px;
            }
          </style>
        </head>
        <body>
          <div class="a4-page">
            <div class="header-badge">
              Elevatio Vendas • Sistema Integrado de Gestão Imobiliária & Contratos
            </div>
            <h1>${(contract.type || 'Contrato Imobiliário').toUpperCase()}</h1>
            <h2>Documento Oficial Auditado Eletronicamente</h2>

            <div class="contract-body">
              ${rawContent}
            </div>

            <!-- Blocos de Assinatura se não estiverem explícitos no texto -->
            ${!rawContent.includes('border-top: 1.5px solid') ? `
              <div class="signatures-container">
                ${signatures.map((s) => createSignatureBlockHtml(s.signer_role || 'Signatário', s)).join('')}
              </div>
            ` : ''}
          </div>
        </body>
      </html>
    `;
  };

  const a4Html = buildContractA4Html();

  // Exportar / Compartilhar como PDF
  const handleExportPdf = async () => {
    try {
      setExportingPdf(true);
      const { uri } = await Print.printToFileAsync({
        html: a4Html,
        base64: false,
      });

      await Sharing.shareAsync(uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
      });
    } catch (err: any) {
      Alert.alert('Erro ao gerar PDF', err.message || 'Tente novamente.');
    } finally {
      setExportingPdf(false);
    }
  };

  // Aprovar e mandar para assinatura (Gestores)
  const handleApproveAndSend = async () => {
    try {
      setApproving(true);
      const { error } = await supabase
        .from('contracts')
        .update({
          status: 'pending',
          updated_at: new Date().toISOString(),
        })
        .eq('id', contract.id);

      if (error) throw error;

      if (profile?.company_id) {
        await supabase.from('notifications').insert({
          company_id: profile.company_id,
          user_id: user?.id,
          title: 'Contrato Aprovado para Assinatura',
          message: `O contrato foi aprovado por ${profile?.name || 'Gestor'} e está pronto para assinaturas.`,
          type: 'contract_approved',
          read: false,
        });
      }

      Alert.alert('Contrato Aprovado!', 'O documento agora está pronto para coleta de assinaturas digitais.');
      onContractUpdated();
      onClose();
    } catch (err: any) {
      Alert.alert('Erro ao aprovar', err.message || 'Tente novamente.');
    } finally {
      setApproving(false);
    }
  };

  // Aplicar Assinatura Existente com 1 Clique
  const handleApplySavedSignature = async () => {
    if (!user || !savedSignatureUrl) {
      Alert.alert('Sem assinatura', 'Nenhuma assinatura cadastrada no perfil.');
      return;
    }

    try {
      setApplyingSavedSign(true);
      const now = new Date().toISOString();

      const { data: signers } = await supabase
        .from('contract_signatures')
        .select('id, signer_email')
        .eq('contract_id', contract.id);

      const mySigner = signers?.find(
        (s) => s.signer_email?.toLowerCase() === user.email?.toLowerCase()
      );

      if (mySigner) {
        await supabase
          .from('contract_signatures')
          .update({
            status: 'signed',
            signed_at: now,
            signature_image: savedSignatureUrl,
            signer_name: profile?.name || 'Corretor',
          })
          .eq('id', mySigner.id);
      } else {
        await supabase.from('contract_signatures').insert({
          contract_id: contract.id,
          company_id: profile?.company_id || null,
          signer_name: profile?.name || 'Corretor',
          signer_email: user.email,
          signer_phone: profile?.phone || null,
          signer_role: profile?.role === 'owner' ? 'Diretor/Gestor' : 'Corretor Responsável',
          status: 'signed',
          signed_at: now,
          signature_image: savedSignatureUrl,
        });
      }

      // Checa se todas as assinaturas foram concluídas
      const { data: allSigs } = await supabase
        .from('contract_signatures')
        .select('status')
        .eq('contract_id', contract.id);

      const allSigned = allSigs && allSigs.length > 0 && allSigs.every((s) => s.status === 'signed');
      if (allSigned) {
        await supabase
          .from('contracts')
          .update({ status: 'active', updated_at: now })
          .eq('id', contract.id);
      }

      Alert.alert('Contrato Assinado com Sucesso! ✍️', 'Sua assinatura existente foi vinculada ao documento.');
      setShowSignChoiceModal(false);
      onContractUpdated();
      onClose();
    } catch (err: any) {
      Alert.alert('Erro ao assinar contrato', err.message);
    } finally {
      setApplyingSavedSign(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.75)', justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: colors.card,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            height: '92%',
            borderWidth: 1,
            borderColor: colors.border,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <View
            style={{
              paddingHorizontal: 20,
              paddingTop: 16,
              paddingBottom: 12,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }} numberOfLines={1}>
                {(contract.type || 'Contrato').toUpperCase()}
              </Text>
              <Text style={{ fontSize: 11, color: colors.textMuted }}>
                Valor: <Text style={{ color: '#10b981', fontWeight: '700' }}>{formatCurrency(totalValue)}</Text> • {contract.status}
              </Text>
            </View>

            {/* Ações Topo: PDF e Fechar */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity
                onPress={handleExportPdf}
                disabled={exportingPdf}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  backgroundColor: isDark ? 'rgba(14, 165, 233, 0.15)' : '#e0f2fe',
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: isDark ? 'rgba(14, 165, 233, 0.3)' : '#bae6fd',
                }}
              >
                {exportingPdf ? (
                  <ActivityIndicator size="small" color="#0ea5e9" />
                ) : (
                  <>
                    <Share2 size={13} color="#0ea5e9" />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#0ea5e9' }}>Exportar PDF</Text>
                  </>
                )}
              </TouchableOpacity>

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
                <X size={16} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Visualização da Folha A4 via WebView */}
          <View style={{ flex: 1, backgroundColor: '#f1f5f9' }}>
            <NativeWebView
              source={{ html: a4Html }}
              style={{ flex: 1, backgroundColor: '#f1f5f9' }}
              javaScriptEnabled
              scalesPageToFit={Platform.OS === 'android'}
            />
          </View>

          {/* Barra de Ações Inferior */}
          <View
            style={{
              paddingHorizontal: 20,
              paddingVertical: 12,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              backgroundColor: colors.card,
              gap: 8,
            }}
          >
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {/* Botão Assinar com Escolha de Opção */}
              <TouchableOpacity
                onPress={() => setShowSignChoiceModal(true)}
                style={{
                  flex: 1,
                  backgroundColor: '#0ea5e9',
                  paddingVertical: 12,
                  borderRadius: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
                activeOpacity={0.8}
              >
                <PenTool size={16} color="#ffffff" />
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#ffffff' }}>
                  Assinar Contrato Agora
                </Text>
              </TouchableOpacity>

              {/* Botão Rastrear Signatários */}
              <TouchableOpacity
                onPress={() => {
                  onClose();
                  onOpenTracker(contract);
                }}
                style={{
                  backgroundColor: colors.mutedSurface,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
                activeOpacity={0.8}
              >
                <Users size={16} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Aprovação Gestor */}
            {isDraftOrReview && permissions.canApproveContract && (
              <TouchableOpacity
                onPress={handleApproveAndSend}
                disabled={approving}
                style={{
                  backgroundColor: '#10b981',
                  paddingVertical: 10,
                  borderRadius: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                {approving ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <CheckCircle size={15} color="#ffffff" />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#ffffff' }}>
                      Aprovar e Liberar Assinaturas
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* MODAL PILAR 3: 2 OPÇÕES EXPLÍCITAS AO ASSINAR */}
      <Modal visible={showSignChoiceModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: colors.card,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 20,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
                Como deseja assinar?
              </Text>
              <TouchableOpacity onPress={() => setShowSignChoiceModal(false)}>
                <X size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* OPÇÃO 1: USAR ASSINATURA EXISTENTE */}
            <TouchableOpacity
              onPress={() => {
                if (!savedSignatureUrl) {
                  Alert.alert('Sem assinatura salva', 'Você ainda não possui assinatura configurada no perfil. Crie uma nova agora mesmo.');
                  return;
                }
                handleApplySavedSignature();
              }}
              disabled={applyingSavedSign}
              style={{
                backgroundColor: colors.mutedSurface,
                borderRadius: 14,
                padding: 14,
                marginBottom: 12,
                borderWidth: 1.5,
                borderColor: savedSignatureUrl ? '#0ea5e9' : colors.border,
                opacity: savedSignatureUrl ? 1 : 0.6,
              }}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>
                  1. Usar Assinatura Existente
                </Text>
                {savedSignatureUrl && (
                  <View style={{ backgroundColor: '#10b981', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                    <Text style={{ fontSize: 9, fontWeight: '700', color: '#ffffff' }}>DISPONÍVEL</Text>
                  </View>
                )}
              </View>

              {savedSignatureUrl ? (
                <View
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: 8,
                    height: 60,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginVertical: 6,
                    padding: 4,
                  }}
                >
                  {savedSignatureUrl.startsWith('data:image') || savedSignatureUrl.startsWith('http') ? (
                    <Image source={{ uri: savedSignatureUrl }} resizeMode="contain" style={{ width: '100%', height: '100%' }} />
                  ) : (
                    <Text style={{ fontSize: 18, fontStyle: 'italic', color: '#0f172a' }}>
                      {savedSignatureUrl.replace('typed:', '')}
                    </Text>
                  )}
                </View>
              ) : (
                <Text style={{ fontSize: 11, color: colors.textMuted, marginVertical: 4 }}>
                  Nenhuma assinatura salva no seu perfil.
                </Text>
              )}

              <Text style={{ fontSize: 11, color: colors.textMuted }}>
                Aplica a assinatura cadastrada no seu perfil em 1 toque com validade jurídica.
              </Text>
            </TouchableOpacity>

            {/* OPÇÃO 2: ASSINAR AGORA (CRIAR NOVA) */}
            <TouchableOpacity
              onPress={() => {
                setShowSignChoiceModal(false);
                onClose();
                router.push({
                  pathname: '/signature',
                  params: { contract_id: contract.id },
                });
              }}
              style={{
                backgroundColor: colors.mutedSurface,
                borderRadius: 14,
                padding: 14,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: colors.border,
              }}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <PenTool size={16} color="#0ea5e9" />
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>
                  2. Assinar Agora (Criar Nova)
                </Text>
              </View>
              <Text style={{ fontSize: 11, color: colors.textMuted }}>
                Abre o Pad Digital com Desenho a Mão Livre, 5 Fontes Cursivas ou Scanner por Câmera.
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Modal>
  );
};
