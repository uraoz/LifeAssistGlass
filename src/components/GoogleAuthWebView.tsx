// GoogleAuthWebView.tsx - Google OAuth認証用WebViewコンポーネント

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  ActivityIndicator,
  TextInput,
  Linking,
} from 'react-native';
import { WebView } from 'react-native-webview';
import GoogleCalendarService from '../services/GoogleCalendarService';
import { AuthState } from '../types/calendar';

interface GoogleAuthWebViewProps {
  onAuthSuccess: () => void;
  onAuthError: (error: string) => void;
}

const GoogleAuthWebView: React.FC<GoogleAuthWebViewProps> = ({
  onAuthSuccess,
  onAuthError,
}) => {
  const [showWebView, setShowWebView] = useState(false);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [authUrl, setAuthUrl] = useState<string>('');
  const [authCode, setAuthCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [authState, setAuthState] = useState<AuthState>({ 
    isAuthenticated: false, 
    isLoading: true  // 初期状態ではloading=trueにして認証チェック中を示す
  });
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  // コンポーネントマウント時に保存された認証状態をチェック
  useEffect(() => {
    if (!hasCheckedAuth) {
      checkStoredAuthSilently();
    }
  }, [hasCheckedAuth]);

  // 保存された認証を静かにチェック（ユーザーに通知しない）
  const checkStoredAuthSilently = async () => {
    setIsLoading(true);
    setHasCheckedAuth(true);
    
    try {
      const tokens = await GoogleCalendarService.loadStoredTokens();
      
      if (tokens) {
        setAuthState({ isAuthenticated: true, isLoading: false, tokens });
        onAuthSuccess();
      } else {
        setAuthState({ isAuthenticated: false, isLoading: false });
      }
    } catch (error) {
      console.error('認証状態チェックエラー:', error);
      setAuthState({ isAuthenticated: false, isLoading: false });
    } finally {
      setIsLoading(false);
    }
  };

  // WebView認証開始
  const startAuthentication = () => {
    try {
      const url = GoogleCalendarService.generateAuthUrl();
      setAuthUrl(url);
      setShowWebView(true);
      setIsLoading(false);
      console.log('OAuth認証開始:', url);
    } catch (error) {
      console.error('認証URL生成エラー:', error);
      onAuthError('認証URLの生成に失敗しました');
    }
  };


  // URLを表示してブラウザで開く
  const copyUrlToClipboard = async (url: string) => {
    try {
      Alert.alert(
        '認証URL',
        'ブラウザで以下のURLを開いてください：\n\n' + url,
        [
          { text: 'キャンセル', style: 'cancel' },
          { 
            text: 'ブラウザで開く', 
            onPress: async () => {
              try {
                await Linking.openURL(url);
              } catch (error) {
                Alert.alert('エラー', 'ブラウザを開けませんでした。URLを手動でコピーしてください。');
              }
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('エラー', 'URL表示に失敗しました。');
    }
  };

  // 手動認証コードの処理
  const handleManualAuthCode = async () => {
    if (!authCode.trim()) {
      Alert.alert('エラー', '認証コードを入力してください');
      return;
    }

    setIsLoading(true);
    
    try {
      const tokens = await GoogleCalendarService.exchangeCodeForTokens(authCode.trim());
      
      if (tokens) {
        setShowCodeInput(false);
        setAuthCode('');
        setAuthState({ isAuthenticated: true, isLoading: false, tokens });
        onAuthSuccess();
        Alert.alert('成功', 'Google Calendarの認証が完了しました！');
      } else {
        throw new Error('認証に失敗しました');
      }

    } catch (error) {
      console.error('認証エラー:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setAuthState({ isAuthenticated: false, isLoading: false, error: errorMessage });
      onAuthError(errorMessage);
      
      Alert.alert(
        '認証エラー', 
        '認証に失敗しました。認証コードが正しく入力されているか、有効期限内（10分）かを確認してください。'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // WebViewのナビゲーション変更を監視
  const handleNavigationStateChange = async (navState: any) => {
    const { url } = navState;
    console.log('Navigation changed:', url);

    // リダイレクトURLかチェック
    if (url.includes('localhost:3000/oauth/callback')) {
      setIsLoading(true);
      
      try {
        // URLからauthorization codeを抽出
        const urlParams = new URLSearchParams(url.split('?')[1]);
        const authCode = urlParams.get('code');
        const error = urlParams.get('error');

        if (error) {
          throw new Error(`OAuth error: ${error}`);
        }

        if (!authCode) {
          throw new Error('Authorization code not found');
        }

        console.log('Authorization code取得成功');

        // トークン交換
        const tokens = await GoogleCalendarService.exchangeCodeForTokens(authCode);
        
        if (tokens) {
          setShowWebView(false);
          setAuthState({ isAuthenticated: true, isLoading: false, tokens });
          onAuthSuccess();
          Alert.alert('成功', 'Google Calendarの認証が完了しました！');
        } else {
          throw new Error('Token exchange failed');
        }

      } catch (error) {
        console.error('認証処理エラー:', error);
        setShowWebView(false);
        setIsLoading(false);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setAuthState({ isAuthenticated: false, isLoading: false, error: errorMessage });
        onAuthError(errorMessage);
        Alert.alert('エラー', '認証に失敗しました: ' + errorMessage);
      }
    }
  };

  // WebView読み込みエラー
  const handleWebViewError = (error: any) => {
    console.error('WebView error:', error);
    setShowWebView(false);
    setIsLoading(false);
    onAuthError('WebView読み込みエラー');
    Alert.alert('エラー', 'Webページの読み込みに失敗しました');
  };

  // 認証状態をリセット
  const resetAuth = async () => {
    try {
      await GoogleCalendarService.clearStoredTokens();
      setAuthState({ isAuthenticated: false, isLoading: false });
      Alert.alert('完了', '認証情報をクリアしました');
    } catch (error) {
      console.error('認証クリアエラー:', error);
    }
  };

  // 保存された認証を確認（ユーザーアクション用、アラート表示あり）
  const checkStoredAuth = async () => {
    setIsLoading(true);
    try {
      const tokens = await GoogleCalendarService.loadStoredTokens();
      if (tokens) {
        setAuthState({ isAuthenticated: true, isLoading: false, tokens });
        onAuthSuccess();
        Alert.alert('成功', '保存された認証情報を確認しました');
      } else {
        setAuthState({ isAuthenticated: false, isLoading: false });
        Alert.alert('情報', '保存された認証情報はありません');
      }
    } catch (error) {
      console.error('認証確認エラー:', error);
      setAuthState({ isAuthenticated: false, isLoading: false });
      Alert.alert('エラー', '認証確認に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Google Calendar 連携</Text>
      
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
              style={[styles.authButton, styles.browserButton]} 
              onPress={() => setShowCodeInput(true)}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>
                📋 認証を開始
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.authButton, styles.checkButton]} 
              onPress={checkStoredAuth}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>
                🔄 認証状態を確認
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity 
            style={[styles.authButton, styles.resetButton]} 
            onPress={resetAuth}
          >
            <Text style={styles.buttonText}>
              🗑️ 認証をリセット
            </Text>
          </TouchableOpacity>
        )}
      </View>


      {/* OAuth WebView Modal */}
      <Modal
        visible={showWebView}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Google認証</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowWebView(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>認証処理中...</Text>
            </View>
          ) : (
            <WebView
              source={{ uri: authUrl }}
              onNavigationStateChange={handleNavigationStateChange}
              onError={handleWebViewError}
              style={styles.webview}
              startInLoadingState={true}
              renderLoading={() => (
                <View style={styles.webviewLoading}>
                  <ActivityIndicator size="large" color="#007AFF" />
                  <Text>読み込み中...</Text>
                </View>
              )}
            />
          )}
        </View>
      </Modal>

      {/* 手動認証コード入力Modal */}
      <Modal
        visible={showCodeInput}
        animationType="slide"
        presentationStyle="formSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>認証コード入力</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => {
                setShowCodeInput(false);
                setAuthCode('');
              }}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.codeInputContainer}>
            <Text style={styles.instructionTitle}>
              📋 Google Calendar 手動認証
            </Text>

            <TouchableOpacity 
              style={styles.urlButton}
              onPress={() => {
                const url = GoogleCalendarService.generateAuthUrl();
                copyUrlToClipboard(url);
              }}
            >
              <Text style={styles.urlButtonText}>
                🔗 認証URLを取得
              </Text>
            </TouchableOpacity>
            
            <Text style={styles.instructionText}>
              ブラウザで認証完了後、認証コードを入力してください：
            </Text>
            
            <TextInput
              style={styles.codeInput}
              value={authCode}
              onChangeText={setAuthCode}
              placeholder="4/0AX4XfWh..."
              autoCapitalize="none"
              autoCorrect={false}
              multiline={false}
            />

            <View style={styles.codeButtonContainer}>
              <TouchableOpacity 
                style={[styles.authButton, styles.submitButton]}
                onPress={handleManualAuthCode}
                disabled={isLoading || !authCode.trim()}
              >
                <Text style={styles.buttonText}>
                  {isLoading ? '認証中...' : '✅ 認証実行'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
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
    gap: 10,
  },
  authButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  checkButton: {
    backgroundColor: '#34C759',
  },
  browserButton: {
    backgroundColor: '#FF9500',
  },
  resetButton: {
    backgroundColor: '#FF3B30',
  },
  submitButton: {
    backgroundColor: '#007AFF',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  codeInputContainer: {
    padding: 20,
    flex: 1,
  },
  instructionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  urlButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center',
  },
  urlButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    textAlign: 'center',
  },
  codeInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    backgroundColor: 'white',
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  codeButtonContainer: {
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    backgroundColor: '#f8f9fa',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
  },
  webview: {
    flex: 1,
  },
  webviewLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
});

export default GoogleAuthWebView;
