// GoogleAuthNative.tsx - react-native-app-authを使用した簡潔なGoogle認証

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { authorize, refresh, revoke } from 'react-native-app-auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GOOGLE_OAUTH_CLIENT_ID } from '@env';
import { GoogleCalendarTokens, AuthState } from '../types/calendar';
import GoogleCalendarService from '../services/GoogleCalendarService';

interface GoogleAuthNativeProps {
  onAuthSuccess: () => void;
  onAuthError: (error: string) => void;
}

const GoogleAuthNative: React.FC<GoogleAuthNativeProps> = ({
  onAuthSuccess,
  onAuthError,
}) => {
  const [authState, setAuthState] = useState<AuthState>({ 
    isAuthenticated: false, 
    isLoading: true 
  });
  const [isInitialized, setIsInitialized] = useState(false);

  // react-native-app-auth設定（Google推奨形式に戻す）
  const authConfig = {
    issuer: 'https://accounts.google.com',
    clientId: GOOGLE_OAUTH_CLIENT_ID,
    redirectUrl: `com.googleusercontent.apps.${GOOGLE_OAUTH_CLIENT_ID.replace('.apps.googleusercontent.com', '')}:/oauth2redirect/google`,
    scopes: ['openid', 'profile', 'email', 'https://www.googleapis.com/auth/calendar.readonly'],
    additionalParameters: {
      prompt: 'consent',
    },
    customUrlScheme: `com.googleusercontent.apps.${GOOGLE_OAUTH_CLIENT_ID.replace('.apps.googleusercontent.com', '')}`,
    usesPKCE: true, // セキュリティ向上
    usesStateParam: true, // CSRF攻撃対策
  };

  // 初期化時に保存された認証状態をチェック
  useEffect(() => {
    if (!isInitialized) {
      checkStoredAuthSilently();
    }
  }, [isInitialized]);

  // 保存された認証を静かにチェック（サービスクラス使用）
  const checkStoredAuthSilently = async () => {
    setIsInitialized(true);
    setAuthState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const tokens = await GoogleCalendarService.loadStoredTokens();
      
      if (tokens) {
        setAuthState({ 
          isAuthenticated: true, 
          isLoading: false, 
          tokens 
        });
        onAuthSuccess();
      } else {
        setAuthState({ isAuthenticated: false, isLoading: false });
      }
    } catch (error) {
      console.error('認証状態チェックエラー:', error);
      setAuthState({ isAuthenticated: false, isLoading: false });
    }
  };

  // 認証実行
  const authenticate = async () => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    
    try {
      console.log('react-native-app-authで認証開始...');
      
      const authResult = await authorize(authConfig);
      
      const tokens: GoogleCalendarTokens = {
        accessToken: authResult.accessToken,
        refreshToken: authResult.refreshToken,
        expiryDate: new Date(authResult.accessTokenExpirationDate).getTime(),
        tokenType: authResult.tokenType || 'Bearer',
      };

      // トークンをサービスクラスに保存
      await AsyncStorage.setItem('google_calendar_tokens', JSON.stringify(tokens));
      
      setAuthState({ 
        isAuthenticated: true, 
        isLoading: false, 
        tokens 
      });
      
      onAuthSuccess();
      Alert.alert('成功', 'Google Calendarの認証が完了しました！');
      
    } catch (error) {
      console.error('認証エラー:', error);
      const errorMessage = error instanceof Error ? error.message : '認証に失敗しました';
      
      setAuthState({ 
        isAuthenticated: false, 
        isLoading: false, 
        error: errorMessage 
      });
      
      onAuthError(errorMessage);
      Alert.alert('認証エラー', errorMessage);
    }
  };

  // トークンリフレッシュ
  const refreshStoredTokens = async (currentTokens: GoogleCalendarTokens) => {
    if (!currentTokens.refreshToken) {
      setAuthState({ isAuthenticated: false, isLoading: false });
      return;
    }

    try {
      console.log('トークンをリフレッシュ中...');
      
      const refreshResult = await refresh(authConfig, {
        refreshToken: currentTokens.refreshToken,
      });

      const newTokens: GoogleCalendarTokens = {
        accessToken: refreshResult.accessToken,
        refreshToken: refreshResult.refreshToken || currentTokens.refreshToken,
        expiryDate: new Date(refreshResult.accessTokenExpirationDate).getTime(),
        tokenType: refreshResult.tokenType || 'Bearer',
      };

      await AsyncStorage.setItem('google_calendar_tokens', JSON.stringify(newTokens));
      
      setAuthState({ 
        isAuthenticated: true, 
        isLoading: false, 
        tokens: newTokens 
      });
      
      onAuthSuccess();
      
    } catch (error) {
      console.error('トークンリフレッシュエラー:', error);
      await clearTokens();
    }
  };

  // 認証クリア
  const clearTokens = async () => {
    try {
      // 必要に応じてリモートでも無効化
      if (authState.tokens?.refreshToken) {
        try {
          await revoke(authConfig, {
            tokenToRevoke: authState.tokens.refreshToken,
            sendClientId: true,
          });
        } catch (revokeError) {
          console.warn('リモートトークン無効化エラー:', revokeError);
        }
      }
      
      await GoogleCalendarService.clearStoredTokens();
      setAuthState({ isAuthenticated: false, isLoading: false });
      Alert.alert('完了', '認証情報をクリアしました');
      
    } catch (error) {
      console.error('認証クリアエラー:', error);
      Alert.alert('エラー', '認証クリアに失敗しました');
    }
  };

  // 手動で認証状態確認（サービスクラス使用）
  const checkAuthStatus = async () => {
    const tokens = await GoogleCalendarService.loadStoredTokens();
    
    if (tokens) {
      setAuthState({ 
        isAuthenticated: true, 
        isLoading: false, 
        tokens 
      });
      Alert.alert('認証状態', '✅ 認証済みです');
    } else {
      setAuthState({ isAuthenticated: false, isLoading: false });
      Alert.alert('認証状態', '❌ 認証が必要です');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🗓️ Google Calendar 連携 (改善版)</Text>
      <Text style={styles.subtitle}>react-native-app-authを使用</Text>
      
      {/* 認証状態表示 */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusLabel}>認証状況:</Text>
        <Text style={[
          styles.statusText, 
          authState.isLoading ? styles.statusLoading :
          authState.isAuthenticated ? styles.statusSuccess : styles.statusError
        ]}>
          {authState.isLoading ? '🔄 確認中...' : 
           authState.isAuthenticated ? '✅ 認証済み' : '❌ 未認証'}
        </Text>
        
        {authState.error && (
          <Text style={styles.errorText}>エラー: {authState.error}</Text>
        )}
        
        {authState.tokens && (
          <Text style={styles.tokenInfo}>
            🕒 トークン期限: {authState.tokens.expiryDate ? 
              new Date(authState.tokens.expiryDate).toLocaleString('ja-JP') : '不明'}
          </Text>
        )}
      </View>

      {/* 認証ボタン */}
      <View style={styles.buttonContainer}>
        {!authState.isAuthenticated ? (
          <>
            <TouchableOpacity 
              style={[styles.authButton, styles.authenticateButton]} 
              onPress={authenticate}
              disabled={authState.isLoading}
            >
              <Text style={styles.buttonText}>
                {authState.isLoading ? '認証中...' : '🔐 Google認証を開始'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.authButton, styles.checkButton]} 
              onPress={checkAuthStatus}
              disabled={authState.isLoading}
            >
              <Text style={styles.buttonText}>
                🔄 認証状態を確認
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity 
            style={[styles.authButton, styles.clearButton]} 
            onPress={clearTokens}
          >
            <Text style={styles.buttonText}>
              🗑️ 認証をクリア
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 改善点の説明 */}
      <View style={styles.improvementContainer}>
        <Text style={styles.improvementTitle}>🚀 改善点:</Text>
        <Text style={styles.improvementText}>
          • ネイティブブラウザでの安全な認証{'\n'}
          • WebViewやコード入力が不要{'\n'}
          • 自動的なトークンリフレッシュ{'\n'}
          • よりシンプルなユーザー体験
        </Text>
      </View>

      {authState.isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
    fontStyle: 'italic',
  },
  statusContainer: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusSuccess: {
    color: '#34C759',
  },
  statusError: {
    color: '#FF3B30',
  },
  statusLoading: {
    color: '#007AFF',
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 5,
  },
  tokenInfo: {
    fontSize: 11,
    color: '#666',
    marginTop: 5,
    fontFamily: 'monospace',
  },
  buttonContainer: {
    gap: 12,
    marginBottom: 20,
  },
  authButton: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  authenticateButton: {
    backgroundColor: '#34C759',
  },
  checkButton: {
    backgroundColor: '#007AFF',
  },
  clearButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  improvementContainer: {
    backgroundColor: '#e8f5e8',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#34C759',
  },
  improvementTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2d5d2d',
    marginBottom: 8,
  },
  improvementText: {
    fontSize: 14,
    color: '#2d5d2d',
    lineHeight: 20,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default GoogleAuthNative;