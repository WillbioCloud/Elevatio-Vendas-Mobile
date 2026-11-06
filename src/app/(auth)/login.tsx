import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Building2, CheckCircle2, Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import { TurnstileCaptcha, TurnstileCaptchaRef } from '../../components/TurnstileCaptcha';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const { colors, isDark } = useAppTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileCaptchaRef>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setErrorMessage('Por favor, informe seu e-mail e senha.');
      return;
    }

    if (!captchaToken) {
      setErrorMessage('Por favor, conclua a verificação de segurança (Não sou um robô) abaixo.');
      return;
    }

    setErrorMessage(null);
    setLoading(true);

    try {
      console.log('[LoginScreen] Iniciando autenticação para:', email.trim());
      const { error } = await signIn(email, password, captchaToken);
      setLoading(false);

      if (error) {
        console.warn('[LoginScreen] Falha no login:', error.message);
        turnstileRef.current?.reset();
        setCaptchaToken(null);
        if (error.message.toLowerCase().includes('invalid login')) {
          setErrorMessage('E-mail ou senha inválidos. Verifique suas credenciais.');
        } else if (error.message.toLowerCase().includes('captcha')) {
          setErrorMessage('Falha na validação do CAPTCHA. Por favor, toque no desafio para validar novamente.');
        } else {
          setErrorMessage(error.message);
        }
      }
    } catch (err: any) {
      setLoading(false);
      turnstileRef.current?.reset();
      setCaptchaToken(null);
      console.error('[LoginScreen] Erro inesperado:', err);
      setErrorMessage('Erro de conexão ao tentar fazer login. Tente novamente.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: colors.bg }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header com Logo Oficial */}
        <View style={{ alignItems: 'center', marginBottom: 40 }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              backgroundColor: '#0ea5e9',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
              shadowColor: '#0ea5e9',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.35,
              shadowRadius: 16,
              elevation: 8,
            }}
          >
            <Building2 size={38} color="#ffffff" />
          </View>
          <Text
            style={{
              fontFamily: 'Sora_800ExtraBold',
              fontSize: 28,
              color: colors.text,
              letterSpacing: -0.5,
            }}
          >
            Elevatio<Text style={{ color: '#0ea5e9' }}> Vendas</Text>
          </Text>
          <Text
            style={{
              fontFamily: 'Sora_400Regular',
              fontSize: 14,
              color: colors.textMuted,
              marginTop: 6,
              textAlign: 'center',
            }}
          >
            Ecossistema Imobiliário de Alta Performance
          </Text>
        </View>

        {/* Card de Formulário */}
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 24,
            padding: 24,
            borderWidth: 1,
            borderColor: colors.border,
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isDark ? 0.3 : 0.05,
            shadowRadius: 12,
            elevation: 4,
          }}
        >
          <Text
            style={{
              fontFamily: 'Sora_700Bold',
              fontSize: 20,
              color: colors.text,
              marginBottom: 6,
            }}
          >
            Acessar sua Conta
          </Text>
          <Text
            style={{
              fontFamily: 'Sora_400Regular',
              fontSize: 13,
              color: colors.textMuted,
              marginBottom: 20,
            }}
          >
            Entre com suas credenciais do portal web
          </Text>

          {errorMessage && (
            <View
              style={{
                backgroundColor: 'rgba(244, 63, 94, 0.1)',
                borderWidth: 1,
                borderColor: '#f43f5e',
                borderRadius: 12,
                padding: 12,
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  fontFamily: 'Sora_600SemiBold',
                  fontSize: 13,
                  color: '#f43f5e',
                  lineHeight: 18,
                }}
              >
                {errorMessage}
              </Text>
            </View>
          )}

          {/* Campo E-mail */}
          <View style={{ marginBottom: 16 }}>
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
              E-mail
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: isDark ? '#0a0f1c' : '#f8fafc',
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 14,
                paddingHorizontal: 14,
                height: 52,
              }}
            >
              <Mail size={20} color={colors.textMuted} style={{ marginRight: 10 }} />
              <TextInput
                style={{
                  flex: 1,
                  fontFamily: 'Sora_400Regular',
                  fontSize: 15,
                  color: colors.text,
                }}
                placeholder="seu.email@imobiliaria.com"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>
          </View>

          {/* Campo Senha */}
          <View style={{ marginBottom: 24 }}>
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
              Senha
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: isDark ? '#0a0f1c' : '#f8fafc',
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 14,
                paddingHorizontal: 14,
                height: 52,
              }}
            >
              <Lock size={20} color={colors.textMuted} style={{ marginRight: 10 }} />
              <TextInput
                style={{
                  flex: 1,
                  fontFamily: 'Sora_400Regular',
                  fontSize: 15,
                  color: colors.text,
                }}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={{ padding: 4 }}
              >
                {showPassword ? (
                  <EyeOff size={20} color={colors.textMuted} />
                ) : (
                  <Eye size={20} color={colors.textMuted} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Verificação Cloudflare Turnstile */}
          <View style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text
                style={{
                  fontFamily: 'Sora_600SemiBold',
                  fontSize: 12,
                  color: colors.textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                Verificação de Segurança
              </Text>
              {captchaToken && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <CheckCircle2 size={13} color="#10b981" />
                  <Text style={{ fontFamily: 'Sora_600SemiBold', fontSize: 11, color: '#10b981' }}>
                    Verificado
                  </Text>
                </View>
              )}
            </View>

            <View
              style={{
                backgroundColor: isDark ? '#0a0f1c' : '#f8fafc',
                borderWidth: 1,
                borderColor: captchaToken ? '#10b981' : colors.border,
                borderRadius: 16,
                paddingVertical: 4,
                overflow: 'hidden',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <TurnstileCaptcha
                ref={turnstileRef}
                isDark={isDark}
                onVerify={(token) => {
                  console.log('[Turnstile] Token gerado pelo usuário com sucesso');
                  setCaptchaToken(token);
                  setErrorMessage(null);
                }}
                onExpire={() => {
                  console.log('[Turnstile] Token expirado');
                  setCaptchaToken(null);
                }}
                onError={(err) => {
                  console.warn('[Turnstile] Erro no widget:', err);
                }}
              />
            </View>
          </View>

          {/* Botão Entrar */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            style={{
              backgroundColor: '#0ea5e9',
              borderRadius: 14,
              height: 52,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#0ea5e9',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text
                style={{
                  fontFamily: 'Sora_700Bold',
                  fontSize: 16,
                  color: '#ffffff',
                }}
              >
                Entrar no Aplicativo
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Rodapé de Segurança */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 32,
          }}
        >
          <ShieldCheck size={16} color="#0ea5e9" style={{ marginRight: 6 }} />
          <Text
            style={{
              fontFamily: 'Sora_400Regular',
              fontSize: 12,
              color: colors.textMuted,
            }}
          >
            Conexão Segura e Criptografada via Supabase
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
