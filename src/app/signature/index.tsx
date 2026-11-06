import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  GestureResponderEvent,
  Image,
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
  Camera,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  FileCheck,
  Image as ImageIcon,
  PenTool,
  Redo2,
  RefreshCw,
  Scan,
  ShieldCheck,
  Trash2,
  Type,
  Undo2,
  X,
} from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import WebView, { WebViewMessageEvent, WebViewProps } from 'react-native-webview';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';

// Type adapter para WebView no React 19
const NativeWebView = WebView as unknown as React.ComponentType<WebViewProps & { ref?: React.Ref<any> }>;

interface FontOption {
  id: string;
  name: string;
  fontFamily: string;
  cssFamily: string;
}

const FONT_OPTIONS: FontOption[] = [
  { id: 'classic', name: 'Clássica', fontFamily: 'Dancing Script', cssFamily: "'Dancing Script', cursive" },
  { id: 'handwriting', name: 'Manuscrita', fontFamily: 'Chilanka', cssFamily: "'Chilanka', cursive" },
  { id: 'elegant', name: 'Elegante', fontFamily: 'Grand Hotel', cssFamily: "'Grand Hotel', cursive" },
  { id: 'modern', name: 'Moderna', fontFamily: 'Inter', cssFamily: "'Inter', sans-serif" },
  { id: 'fluid', name: 'Fluida', fontFamily: 'Satisfy', cssFamily: "'Satisfy', cursive" },
];

export default function SignatureScreen() {
  const router = useRouter();
  const { contract_id } = useLocalSearchParams<{ contract_id?: string }>();
  const { user, profile, company, refreshUser } = useAuth();
  const { colors, isDark } = useAppTheme();

  const webViewRef = useRef<any>(null);

  // Assinatura atualmente salva
  const [savedSignature, setSavedSignature] = useState<string | null>(
    profile?.signature_url || company?.admin_signature_url || null
  );

  // Modo ativo
  const [mode, setMode] = useState<'draw' | 'type' | 'scan'>('draw');

  // Trava de Scroll no ScrollView
  const [isScrollEnabled, setIsScrollEnabled] = useState(true);

  // ABA 1: DESENHO (Múltiplos traços + Undo + Redo)
  const [strokes, setStrokes] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');

  // ABA 2: DIGITAR (5 Fontes Cursivas)
  const [typedName, setTypedName] = useState(profile?.name || '');
  const [selectedFont, setSelectedFont] = useState<FontOption>(FONT_OPTIONS[0]);
  const [typedPngBase64, setTypedPngBase64] = useState<string | null>(null);

  // ABA 3: SCANNER INTELIGENTE
  const [scannedPngBase64, setScannedPngBase64] = useState<string | null>(null);
  const [processingScan, setProcessingScan] = useState(false);

  // Estado Geral
  const [saving, setSaving] = useState(false);

  // Sincroniza assinatura salva do perfil
  useEffect(() => {
    if (profile?.signature_url) {
      setSavedSignature(profile.signature_url);
    } else if (company?.admin_signature_url) {
      setSavedSignature(company.admin_signature_url);
    }
  }, [profile?.signature_url, company?.admin_signature_url]);

  // PanResponder com trava estrita de scroll e persistência de múltiplos traços
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        setIsScrollEnabled(false);
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentPath(`M ${locationX.toFixed(1)} ${locationY.toFixed(1)}`);
      },
      onPanResponderMove: (evt: GestureResponderEvent) => {
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentPath((prev) => `${prev} L ${locationX.toFixed(1)} ${locationY.toFixed(1)}`);
      },
      onPanResponderRelease: () => {
        setIsScrollEnabled(true);
        setCurrentPath((prev) => {
          if (prev) {
            setStrokes((all) => [...all, prev]);
          }
          return '';
        });
        setRedoStack([]);
      },
      onPanResponderTerminate: () => {
        setIsScrollEnabled(true);
        setCurrentPath('');
      },
    })
  ).current;

  // Desfazer (Undo)
  const handleUndo = () => {
    if (strokes.length === 0) return;
    const last = strokes[strokes.length - 1];
    setStrokes((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, last]);
  };

  // Refazer (Redo)
  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setStrokes((prev) => [...prev, next]);
  };

  // Limpar Tudo
  const handleClearDraw = () => {
    setStrokes([]);
    setRedoStack([]);
    setCurrentPath('');
  };

  // Solicitar renderização da assinatura digitada via WebView Canvas
  useEffect(() => {
    if (mode === 'type' && typedName.trim()) {
      const code = `
        window.renderTypedSignature(${JSON.stringify(typedName.trim())}, ${JSON.stringify(selectedFont.cssFamily)});
        true;
      `;
      webViewRef.current?.injectJavaScript(code);
    }
  }, [mode, typedName, selectedFont]);

  // Ações do Scanner de Câmera
  const handleScanFromCamera = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permissão necessária', 'Permita o acesso à câmera para escanear a assinatura.');
        return;
      }

      const res = await ImagePicker.launchCameraAsync({
        quality: 0.8,
        base64: true,
      });

      if (!res.canceled && res.assets && res.assets[0] && res.assets[0].base64) {
        processSignatureBase64(res.assets[0].base64);
      }
    } catch (err: any) {
      Alert.alert('Erro ao abrir câmera', err.message);
    }
  };

  const handleScanFromGallery = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permissão necessária', 'Permita o acesso à galeria.');
        return;
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        quality: 0.8,
        base64: true,
      });

      if (!res.canceled && res.assets && res.assets[0] && res.assets[0].base64) {
        processSignatureBase64(res.assets[0].base64);
      }
    } catch (err: any) {
      Alert.alert('Erro ao selecionar foto', err.message);
    }
  };

  const processSignatureBase64 = (base64Str: string) => {
    setProcessingScan(true);
    const code = `
      window.processSmartSignature("data:image/jpeg;base64,${base64Str}");
      true;
    `;
    webViewRef.current?.injectJavaScript(code);
  };

  // Recepção de mensagens do WebView (Canvas de Fontes & Smart Scanner)
  const handleWebViewMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'TYPED_RESULT') {
        setTypedPngBase64(data.dataUrl);
      } else if (data.type === 'SCAN_RESULT') {
        setScannedPngBase64(data.dataUrl);
        setProcessingScan(false);
      }
    } catch (err) {
      console.warn('Erro ao processar mensagem do WebView:', err);
      setProcessingScan(false);
    }
  };

  // Remover Assinatura Atual
  const handleRemoveSavedSignature = () => {
    Alert.alert(
      'Remover Assinatura',
      'Deseja realmente remover a assinatura salva do seu perfil?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            try {
              await supabase
                .from('profiles')
                .update({ signature_url: null, updated_at: new Date().toISOString() })
                .eq('id', user.id);

              setSavedSignature(null);
              await refreshUser();
              Alert.alert('Removida', 'Sua assinatura padrão foi removida com sucesso.');
            } catch (err: any) {
              Alert.alert('Erro ao remover', err.message);
            }
          },
        },
      ]
    );
  };

  // Salvar / Aplicar Assinatura
  const handleSaveSignature = async () => {
    if (!user) return;

    let finalSignatureData = '';

    if (mode === 'draw') {
      if (strokes.length === 0 && !currentPath) {
        Alert.alert('Assinatura Vazia', 'Por favor, desenhe sua assinatura na área pontilhada.');
        return;
      }
      finalSignatureData = `svg:${strokes.join(' ')}`;
    } else if (mode === 'type') {
      if (!typedName.trim()) {
        Alert.alert('Campo Obrigatório', 'Digite seu nome para assinar.');
        return;
      }
      finalSignatureData = typedPngBase64 || `typed:${selectedFont.fontFamily}:${typedName.trim()}`;
    } else if (mode === 'scan') {
      if (!scannedPngBase64) {
        Alert.alert('Nenhuma Assinatura', 'Tire uma foto ou escolha uma imagem de assinatura para digitalizar.');
        return;
      }
      finalSignatureData = scannedPngBase64;
    }

    try {
      setSaving(true);
      const now = new Date().toISOString();

      // 1. Atualiza no perfil do usuário
      const { error: profErr } = await supabase
        .from('profiles')
        .update({
          signature_url: finalSignatureData,
          updated_at: now,
        })
        .eq('id', user.id);

      if (profErr) throw profErr;

      // 2. Se for dono e não tiver assinatura institucional, atualiza na empresa também
      if (profile?.role === 'owner' && profile?.company_id) {
        await supabase
          .from('companies')
          .update({
            admin_signature_url: finalSignatureData,
          })
          .eq('id', profile.company_id);
      }

      // 3. Se estiver no fluxo de um contrato específico, registra a assinatura
      if (contract_id) {
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
              signature_image: finalSignatureData,
              signer_name: profile?.name || 'Corretor',
            })
            .eq('id', mySigner.id);
        } else {
          await supabase.from('contract_signatures').insert({
            contract_id,
            company_id: profile?.company_id || null,
            signer_name: profile?.name || 'Corretor',
            signer_email: user.email,
            signer_phone: profile?.phone || null,
            signer_role: profile?.role === 'owner' ? 'Diretor/Gestor' : 'Corretor Responsável',
            status: 'signed',
            signed_at: now,
            signature_image: finalSignatureData,
          });
        }

        // Verifica se todas as assinaturas foram concluídas
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
        Alert.alert('Assinatura Atualizada! ✍️', 'Sua assinatura eletrônica padrão foi salva no perfil.');
      }

      await refreshUser();
      setSavedSignature(finalSignatureData);
      router.back();
    } catch (err: any) {
      Alert.alert('Erro ao salvar assinatura', err.message || 'Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  // HTML Head para o WebView que roda Canvas e Fontes do Google
  const webViewHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Chilanka&family=Dancing+Script:wght@600;700&family=Grand+Hotel&family=Inter:ital,wght@1,600&family=Satisfy&display=swap" rel="stylesheet">
        <style>
          body { margin: 0; padding: 0; background: transparent; overflow: hidden; }
          canvas { display: none; }
        </style>
      </head>
      <body>
        <canvas id="typeCanvas" width="800" height="260"></canvas>
        <canvas id="scanCanvas"></canvas>
        <script>
          // Renderizador de Assinatura Digitada em Canvas com Google Fonts
          window.renderTypedSignature = function(text, fontFamily) {
            document.fonts.ready.then(function() {
              var canvas = document.getElementById('typeCanvas');
              var ctx = canvas.getContext('2d');
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              ctx.font = '56px ' + fontFamily;
              ctx.fillStyle = '#0f172a';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(text, canvas.width / 2, canvas.height / 2);
              var dataUrl = canvas.toDataURL('image/png');
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'TYPED_RESULT',
                dataUrl: dataUrl
              }));
            });
          };

          // Algoritmo Oficial de Smart Scanner com Luminância e Auto-Crop
          window.processSmartSignature = function(imageSrc) {
            var img = new Image();
            img.onload = function() {
              var maxW = 800;
              var scale = Math.min(1, maxW / img.width);
              var w = Math.round(img.width * scale);
              var h = Math.round(img.height * scale);

              var canvas = document.getElementById('scanCanvas');
              canvas.width = w;
              canvas.height = h;
              var ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0, w, h);

              var imgData = ctx.getImageData(0, 0, w, h);
              var d = imgData.data;
              var minX = w, minY = h, maxX = 0, maxY = 0;

              for (var i = 0; i < d.length; i += 4) {
                var r = d[i], g = d[i+1], b = d[i+2];
                // Luminância ITU-R BT.601
                var brightness = (r * 0.299) + (g * 0.587) + (b * 0.114);

                if (brightness < 125) {
                  // Traço da caneta -> Azul marinho profundo
                  d[i] = 15;
                  d[i+1] = 23;
                  d[i+2] = 42;
                  d[i+3] = 255;

                  var px = (i / 4) % w;
                  var py = Math.floor((i / 4) / w);
                  if (px < minX) minX = px;
                  if (px > maxX) maxX = px;
                  if (py < minY) minY = py;
                  if (py > maxY) maxY = py;
                } else {
                  // Papel / Sombra clara -> 100% transparente
                  d[i+3] = 0;
                }
              }

              ctx.putImageData(imgData, 0, 0);

              // Auto-Crop com padding de 20px
              var pad = 20;
              minX = Math.max(0, minX - pad);
              minY = Math.max(0, minY - pad);
              maxX = Math.min(w, maxX + pad);
              maxY = Math.min(h, maxY + pad);
              var cropW = Math.max(50, maxX - minX);
              var cropH = Math.max(30, maxY - minY);

              var cropCanvas = document.createElement('canvas');
              cropCanvas.width = cropW;
              cropCanvas.height = cropH;
              var cropCtx = cropCanvas.getContext('2d');
              cropCtx.drawImage(canvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);

              var finalDataUrl = cropCanvas.toDataURL('image/png');
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'SCAN_RESULT',
                dataUrl: finalDataUrl
              }));
            };
            img.src = imageSrc;
          };
        </script>
      </body>
    </html>
  `;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: 52 }}>
      {/* WebView invisível para processamento Canvas / Fontes */}
      <View style={{ height: 0, width: 0, opacity: 0, position: 'absolute' }}>
        <NativeWebView
          ref={webViewRef}
          source={{ html: webViewHtml }}
          onMessage={handleWebViewMessage}
          javaScriptEnabled
          originWhitelist={['*']}
        />
      </View>

      {/* Header com Voltar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          marginBottom: 14,
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
          {contract_id ? 'Assinar Contrato' : 'Minha Assinatura'}
        </Text>

        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        scrollEnabled={isScrollEnabled}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
      >
        {/* CARD DO TOPO: ASSINATURA ATUALMENTE SALVA */}
        {savedSignature && (
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 16,
              padding: 16,
              marginBottom: 18,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={16} color="#10b981" />
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>
                  Assinatura Atual Salva
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#d1fae5',
                  paddingHorizontal: 7,
                  paddingVertical: 2,
                  borderRadius: 6,
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#10b981' }}>
                  ATIVA
                </Text>
              </View>
            </View>

            {/* Preview da Assinatura Salva */}
            <View
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 12,
                height: 90,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: '#e4e4e7',
                marginBottom: 10,
                padding: 8,
              }}
            >
              {savedSignature.startsWith('svg:') ? (
                <Svg style={{ width: '100%', height: '100%' }}>
                  {savedSignature.replace('svg:', '').split(' M ').map((seg, idx) => (
                    <Path
                      key={idx}
                      d={idx === 0 ? seg : `M ${seg}`}
                      stroke="#0f172a"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  ))}
                </Svg>
              ) : savedSignature.startsWith('data:image') || savedSignature.startsWith('http') ? (
                <Image
                  source={{ uri: savedSignature }}
                  resizeMode="contain"
                  style={{ width: '100%', height: '100%' }}
                />
              ) : (
                <Text style={{ fontSize: 22, fontStyle: 'italic', fontWeight: '600', color: '#0f172a' }}>
                  {savedSignature.replace('typed:', '')}
                </Text>
              )}
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
              <TouchableOpacity
                onPress={handleRemoveSavedSignature}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 8,
                  backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2',
                }}
              >
                <Trash2 size={13} color="#ef4444" />
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#ef4444' }}>Remover</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Banner de Validade Jurídica */}
        <View
          style={{
            backgroundColor: isDark ? 'rgba(14, 165, 233, 0.1)' : '#f0f9ff',
            borderRadius: 12,
            padding: 12,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: isDark ? 'rgba(14, 165, 233, 0.2)' : '#bae6fd',
          }}
        >
          <ShieldCheck size={20} color="#0ea5e9" />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#0ea5e9' }}>
              Validade Jurídica MP 2.200-2 / Lei 14.063
            </Text>
            <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 1 }}>
              Assinatura eletrônica com auditoria de IP, carimbo de tempo e hash digital.
            </Text>
          </View>
        </View>

        {/* Alternador de 3 Abas: Desenhar | Digitar (5 Fontes) | Câmera */}
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: colors.mutedSurface,
            borderRadius: 12,
            padding: 3,
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
              gap: 4,
              paddingVertical: 9,
              borderRadius: 9,
              backgroundColor: mode === 'draw' ? colors.card : 'transparent',
            }}
          >
            <PenTool size={14} color={mode === 'draw' ? '#0ea5e9' : colors.textMuted} />
            <Text
              style={{
                fontSize: 12,
                fontWeight: mode === 'draw' ? '700' : '500',
                color: mode === 'draw' ? '#0ea5e9' : colors.textMuted,
              }}
            >
              Desenhar
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setMode('type')}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              paddingVertical: 9,
              borderRadius: 9,
              backgroundColor: mode === 'type' ? colors.card : 'transparent',
            }}
          >
            <Type size={14} color={mode === 'type' ? '#0ea5e9' : colors.textMuted} />
            <Text
              style={{
                fontSize: 12,
                fontWeight: mode === 'type' ? '700' : '500',
                color: mode === 'type' ? '#0ea5e9' : colors.textMuted,
              }}
            >
              5 Fontes
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setMode('scan')}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              paddingVertical: 9,
              borderRadius: 9,
              backgroundColor: mode === 'scan' ? colors.card : 'transparent',
            }}
          >
            <Scan size={14} color={mode === 'scan' ? '#0ea5e9' : colors.textMuted} />
            <Text
              style={{
                fontSize: 12,
                fontWeight: mode === 'scan' ? '700' : '500',
                color: mode === 'scan' ? '#0ea5e9' : colors.textMuted,
              }}
            >
              Câmera
            </Text>
          </TouchableOpacity>
        </View>

        {/* ABA 1: DESENHO A MÃO LIVRE */}
        {mode === 'draw' && (
          <View>
            <View
              style={{
                backgroundColor: colors.card,
                borderRadius: 16,
                borderWidth: 2,
                borderColor: '#0ea5e9',
                borderStyle: 'dashed',
                height: 230,
                overflow: 'hidden',
                position: 'relative',
              }}
              {...panResponder.panHandlers}
            >
              <Svg style={{ width: '100%', height: '100%' }}>
                {strokes.map((d, i) => (
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

              {strokes.length === 0 && !currentPath && (
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
                  <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                    (O scroll da tela fica bloqueado durante o traço)
                  </Text>
                </View>
              )}
            </View>

            {/* Barra de Controles: Desfazer, Refazer e Limpar */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  onPress={handleUndo}
                  disabled={strokes.length === 0}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 8,
                    backgroundColor: colors.mutedSurface,
                    opacity: strokes.length === 0 ? 0.4 : 1,
                  }}
                >
                  <Undo2 size={13} color={colors.text} />
                  <Text style={{ fontSize: 11, color: colors.text }}>Desfazer</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleRedo}
                  disabled={redoStack.length === 0}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 8,
                    backgroundColor: colors.mutedSurface,
                    opacity: redoStack.length === 0 ? 0.4 : 1,
                  }}
                >
                  <Redo2 size={13} color={colors.text} />
                  <Text style={{ fontSize: 11, color: colors.text }}>Refazer</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={handleClearDraw}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 8,
                  backgroundColor: colors.mutedSurface,
                }}
              >
                <Trash2 size={13} color="#ef4444" />
                <Text style={{ fontSize: 11, color: '#ef4444' }}>Limpar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ABA 2: DIGITAR COM AS 5 FONTES CURSIVAS OFICIAIS */}
        {mode === 'type' && (
          <View>
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 6 }}>
              Nome Completo do Signatário
            </Text>
            <TextInput
              value={typedName}
              onChangeText={setTypedName}
              placeholder="Digite o nome completo"
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
                marginBottom: 14,
              }}
            />

            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
              Escolha o Estilo da Assinatura:
            </Text>

            {/* Lista dos 5 Estilos de Fonte */}
            <View style={{ gap: 8, marginBottom: 16 }}>
              {FONT_OPTIONS.map((font) => {
                const isSel = selectedFont.id === font.id;
                return (
                  <TouchableOpacity
                    key={font.id}
                    onPress={() => setSelectedFont(font)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: isSel
                        ? isDark ? 'rgba(14, 165, 233, 0.15)' : '#e0f2fe'
                        : colors.card,
                      padding: 12,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: isSel ? '#0ea5e9' : colors.border,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 2 }}>
                        {font.name} ({font.fontFamily})
                      </Text>
                      <Text
                        style={{
                          fontSize: 22,
                          fontStyle: font.id === 'modern' ? 'italic' : 'normal',
                          color: isDark ? '#f4f4f5' : '#0f172a',
                        }}
                        numberOfLines={1}
                      >
                        {typedName || 'Sua Assinatura'}
                      </Text>
                    </View>
                    {isSel && <Check size={18} color="#0ea5e9" />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Prévia da Assinatura Renderizada */}
            {typedPngBase64 && (
              <View
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: 14,
                  padding: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: '#e4e4e7',
                  minHeight: 100,
                }}
              >
                <Image
                  source={{ uri: typedPngBase64 }}
                  resizeMode="contain"
                  style={{ width: '100%', height: 75 }}
                />
              </View>
            )}
          </View>
        )}

        {/* ABA 3: SCANNER INTELIGENTE DE CÂMERA */}
        {mode === 'scan' && (
          <View>
            <View
              style={{
                backgroundColor: colors.card,
                borderRadius: 14,
                padding: 16,
                marginBottom: 14,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 4 }}>
                Instruções para Escaneamento
              </Text>
              <Text style={{ fontSize: 12, color: colors.textMuted, lineHeight: 18 }}>
                1. Assine com caneta escura (azul ou preta) em uma folha branca lisa.{'\n'}
                2. Posicione a câmera sobre a assinatura com boa iluminação.{'\n'}
                3. O sistema remove o fundo e faz o recorte automático instantaneamente!
              </Text>
            </View>

            {/* Botões Câmera e Galeria */}
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
              <TouchableOpacity
                onPress={handleScanFromCamera}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  backgroundColor: '#0ea5e9',
                  paddingVertical: 12,
                  borderRadius: 10,
                }}
                activeOpacity={0.8}
              >
                <Camera size={16} color="#ffffff" />
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#ffffff' }}>Escanear com Câmera</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleScanFromGallery}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  backgroundColor: colors.card,
                  paddingVertical: 12,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
                activeOpacity={0.8}
              >
                <ImageIcon size={16} color={colors.text} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>Da Galeria</Text>
              </TouchableOpacity>
            </View>

            {/* Resultado do Scanner */}
            {processingScan ? (
              <View style={{ padding: 32, alignItems: 'center' }}>
                <ActivityIndicator color="#0ea5e9" size="large" />
                <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 8 }}>
                  Processando luminância e removendo fundo branco...
                </Text>
              </View>
            ) : scannedPngBase64 ? (
              <View>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#10b981', marginBottom: 6 }}>
                  ✓ Assinatura Digitalizada com Sucesso:
                </Text>
                <View
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: 14,
                    padding: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: '#e4e4e7',
                    minHeight: 110,
                  }}
                >
                  <Image
                    source={{ uri: scannedPngBase64 }}
                    resizeMode="contain"
                    style={{ width: '100%', height: 90 }}
                  />
                </View>
              </View>
            ) : null}
          </View>
        )}

        {/* Botão de Salvar Assinatura */}
        <TouchableOpacity
          onPress={handleSaveSignature}
          disabled={saving || processingScan}
          style={{
            backgroundColor: '#0ea5e9',
            paddingVertical: 14,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 20,
          }}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#ffffff' }}>
              {contract_id ? 'Confirmar e Assinar Contrato' : 'Salvar Assinatura'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
