import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import WebView, { WebViewMessageEvent, WebViewProps } from 'react-native-webview';

export interface TurnstileCaptchaRef {
  reset: () => void;
}

interface TurnstileCaptchaProps {
  siteKey?: string;
  baseUrl?: string;
  isDark?: boolean;
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: (err: string) => void;
}

const DEFAULT_SITE_KEY =
  process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY || '0x4AAAAAADpT8l1fogA80gfC';
const DEFAULT_BASE_URL = 'https://elevatiovendas.com.br';

// Adaptador de tipo para compatibilidade com React 19
const NativeWebView = WebView as unknown as React.ComponentType<WebViewProps & { ref?: React.Ref<any> }>;

export const TurnstileCaptcha = forwardRef<TurnstileCaptchaRef, TurnstileCaptchaProps>(
  (
    {
      siteKey = DEFAULT_SITE_KEY,
      baseUrl = DEFAULT_BASE_URL,
      isDark = false,
      onVerify,
      onExpire,
      onError,
    },
    ref
  ) => {
    const webViewRef = useRef<any>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    useImperativeHandle(ref, () => ({
      reset: () => {
        const resetScript = `
          if (window.turnstile && widgetId !== null) {
            window.turnstile.reset(widgetId);
          }
          true;
        `;
        webViewRef.current?.injectJavaScript(resetScript);
      },
    }));

    const theme = isDark ? 'dark' : 'light';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" async defer></script>
        <style>
          * { box-sizing: border-box; }
          html, body {
            margin: 0;
            padding: 0;
            background-color: transparent;
            width: 100%;
            height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            overflow: hidden;
          }
        </style>
      </head>
      <body>
        <div id="cf-container"></div>
        <script>
          function post(type, data) {
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify(Object.assign({ type: type }, data || {})));
            }
          }

          var widgetId = null;

          function initTurnstile() {
            if (!window.turnstile) {
              setTimeout(initTurnstile, 80);
              return;
            }
            try {
              widgetId = window.turnstile.render('#cf-container', {
                sitekey: '${siteKey}',
                theme: '${theme}',
                callback: function(token) {
                  post('token', { token: token });
                },
                'expired-callback': function() {
                  post('expired');
                },
                'error-callback': function(err) {
                  post('error', { error: String(err) });
                }
              });
              post('ready');
            } catch (e) {
              post('error', { error: String(e) });
            }
          }

          if (document.readyState === 'complete') {
            initTurnstile();
          } else {
            window.addEventListener('load', initTurnstile);
          }
        </script>
      </body>
      </html>
    `;

    return (
      <View
        style={{
          width: '100%',
          height: 74,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          borderRadius: 14,
        }}
      >
        <NativeWebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html: htmlContent, baseUrl }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          scrollEnabled={false}
          bounces={false}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          onLoadEnd={() => setIsLoaded(true)}
          style={{
            width: 310,
            height: 74,
            backgroundColor: 'transparent',
            opacity: isLoaded ? 1 : 0,
          }}
          onMessage={(event: WebViewMessageEvent) => {
            try {
              const data = JSON.parse(event.nativeEvent.data);
              if (data.type === 'token' && data.token) {
                onVerify(data.token);
              } else if (data.type === 'expired') {
                onExpire?.();
              } else if (data.type === 'error') {
                onError?.(data.error || 'Erro no CAPTCHA');
              }
            } catch (err) {
              console.warn('[Turnstile] Erro ao processar mensagem do WebView:', err);
            }
          }}
        />
        {!isLoaded && (
          <View
            style={{
              position: 'absolute',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ActivityIndicator size="small" color="#0ea5e9" />
          </View>
        )}
      </View>
    );
  }
);
