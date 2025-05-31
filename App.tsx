// App.tsx - LifeAssist Glass Gemini APIテスト

import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  TextInput,
  Alert,
} from 'react-native';
import { GoogleGenAI } from '@google/genai';
import { GEMINI_API_KEY } from '@env';
import CameraScreen from './src/components/CameraScreen';
import GoogleAuthNative from './src/components/GoogleAuthNative';
import UserProfileSetup from './src/components/UserProfileSetup';
import PersonalizationDashboard from './src/components/PersonalizationDashboard';
import PersonalizationService from './src/services/PersonalizationService';
import TTSService from './src/services/TTSService';
import { UserProfile } from './src/types/personalization';
import { TTSStatus } from './src/types/tts';

// 環境変数からAPIキーを取得
const ai = new GoogleGenAI({apiKey: GEMINI_API_KEY});

const App = () => {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'text' | 'camera' | 'calendar' | 'profile'>('text');
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [setupStatus, setSetupStatus] = useState({ isCompleted: false, progress: 0, missingSteps: [] });
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [ttsStatus, setTTSStatus] = useState<TTSStatus | null>(null);
  const [ttsEnabled, setTTSEnabled] = useState(true);

  // APIキーの設定確認
  useEffect(() => {
    if (!GEMINI_API_KEY) {
      Alert.alert(
        '設定エラー', 
        'APIキーが設定されていません。.envファイルを確認してください。'
      );
    }
  }, []);

  // 個人化設定とTTSの初期化
  useEffect(() => {
    initializeServices();
  }, []);

  const initializeServices = async () => {
    try {
      // PersonalizationServiceとTTSServiceを並行初期化
      await Promise.all([
        PersonalizationService.initialize(),
        TTSService.initialize(),
      ]);

      const [profile, setupStatus, ttsStatus] = await Promise.all([
        PersonalizationService.loadUserProfile(),
        PersonalizationService.getSetupStatus(),
        TTSService.getStatus(),
      ]);
      
      setUserProfile(profile);
      setSetupStatus(setupStatus);
      setTTSStatus(ttsStatus);
      setTTSEnabled(ttsStatus.currentSettings.enabled);
      
      console.log('サービス初期化完了:', { profile, setupStatus, ttsStatus });
    } catch (error) {
      console.error('サービス初期化エラー:', error);
    }
  };

  // Gemini APIにメッセージを送信
  const sendToGemini = async () => {
    if (!message.trim()) {
      Alert.alert('エラー', 'メッセージを入力してください');
      return;
    }

    setLoading(true);
    try {
      // 新しい@google/genai SDKを使用
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-001',
        contents: message,
      });
      
      const responseText = response.text;
      setResponse(responseText);

      // 音声フィードバックの実行
      if (ttsEnabled && responseText) {
        await speakResponse(responseText, 'medium');
      }
    } catch (error) {
      console.error('API Error:', error);
      Alert.alert('エラー', 'API呼び出しに失敗しました');
      
      // エラー時も音声で通知
      if (ttsEnabled) {
        await speakResponse('API呼び出しでエラーが発生しました', 'high');
      }
    } finally {
      setLoading(false);
    }
  };

  // 音声読み上げ機能
  const speakResponse = async (text: string, priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium') => {
    try {
      await TTSService.speak({
        text,
        priority,
        onStart: () => console.log('音声読み上げ開始'),
        onFinish: (finished) => console.log('音声読み上げ完了:', finished),
        onError: (error) => console.error('音声読み上げエラー:', error),
      });
    } catch (error) {
      console.error('TTS呼び出しエラー:', error);
    }
  };

  // TTS設定の切り替え
  const toggleTTS = async () => {
    try {
      const newEnabled = !ttsEnabled;
      await TTSService.saveSettings({ enabled: newEnabled });
      setTTSEnabled(newEnabled);
      
      // 変更通知
      if (newEnabled) {
        await speakResponse('音声機能を有効にしました', 'medium');
      }
    } catch (error) {
      console.error('TTS設定変更エラー:', error);
    }
  };

  // TTSテスト機能
  const testTTS = async () => {
    try {
      await speakResponse('音声テストです。TTSサービスが正常に動作しています。', 'medium');
      console.log('TTS テスト実行');
    } catch (error) {
      console.error('TTS テストエラー:', error);
      Alert.alert('TTS エラー', '音声テストに失敗しました: ' + error);
    }
  };

  // TTS停止機能
  const stopTTS = async () => {
    try {
      await TTSService.stop();
      console.log('TTS停止');
    } catch (error) {
      console.error('TTS停止エラー:', error);
    }
  };

  // LifeAssist Glass用のテストプロンプト
  const testLifeAssistPrompt = () => {
    const prompt = `
あなたは装着者の生活をサポートするAIアシスタントです。

【現在時刻】: ${new Date().toLocaleString('ja-JP')}
【状況】: ユーザーがスマートグラスのテストを行っています
【目的】: システムが正常に動作しているか確認

上記情報を基に、装着者に対する適切な挨拶とアドバイスを50文字以内で生成してください。
    `;
    
    setMessage(prompt);
  };

  // Calendar認証成功時のハンドラ
  const handleCalendarAuthSuccess = () => {
    setCalendarConnected(true);
  };

  // Calendar認証エラー時のハンドラ
  const handleCalendarAuthError = (error: string) => {
    setCalendarConnected(false);
  };

  // プロファイル設定完了時のハンドラ
  const handleProfileSetupComplete = (profile: UserProfile) => {
    setUserProfile(profile);
    setShowProfileSetup(false); // 設定画面を閉じる
    initializePersonalization(); // 設定状況を再確認
    Alert.alert('設定完了', '個人化設定が完了しました！より精度の高いアドバイスを提供できます。');
  };

  // プロファイル設定開始時のハンドラ
  const handleStartProfileSetup = () => {
    setShowProfileSetup(true);
  };

  const renderContent = () => {
    if (activeTab === 'camera') {
      return <CameraScreen />;
    }
    
    if (activeTab === 'calendar') {
      return (
        <GoogleAuthNative 
          onAuthSuccess={handleCalendarAuthSuccess}
          onAuthError={handleCalendarAuthError}
        />
      );
    }

    if (activeTab === 'profile') {
      if (showProfileSetup) {
        return (
          <UserProfileSetup 
            onSetupComplete={handleProfileSetupComplete}
          />
        );
      } else {
        return (
          <PersonalizationDashboard 
            onStartSetup={handleStartProfileSetup}
          />
        );
      }
    }
    
    // テキスト入力タブの内容（既存のUI）
    return (
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <View style={styles.content}>
          <Text style={styles.title}>LifeAssist Glass - Gemini APIテスト</Text>
          
          {/* API設定状況の表示 */}
          <View style={styles.statusSection}>
            <Text style={styles.statusLabel}>API設定状況:</Text>
            <Text style={[styles.statusText, GEMINI_API_KEY ? styles.statusOk : styles.statusError]}>
              {GEMINI_API_KEY ? `✓ APIキー設定済み (${GEMINI_API_KEY.substring(0, 8)}...)` : '✗ APIキー未設定'}
            </Text>
          </View>

          {/* TTS設定状況の表示 */}
          <View style={styles.statusSection}>
            <Text style={styles.statusLabel}>音声合成 (TTS) 状況:</Text>
            <Text style={[styles.statusText, ttsStatus?.isInitialized ? styles.statusOk : styles.statusError]}>
              {ttsStatus?.isInitialized ? '✓ TTS初期化済み' : '✗ TTS初期化失敗'}
            </Text>
            <Text style={[styles.statusText, ttsEnabled ? styles.statusOk : styles.statusError]}>
              {ttsEnabled ? '✓ 音声出力有効' : '✗ 音声出力無効'}
            </Text>
            {ttsStatus?.queueLength > 0 && (
              <Text style={styles.statusText}>
                📢 読み上げキュー: {ttsStatus.queueLength}件
              </Text>
            )}
          </View>
          
          <View style={styles.section}>
            <Text style={styles.label}>メッセージ:</Text>
            <TextInput
              style={styles.textInput}
              multiline
              value={message}
              onChangeText={setMessage}
              placeholder="Geminiに送信するメッセージを入力..."
            />
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.button} 
              onPress={sendToGemini}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? '送信中...' : 'Geminiに送信'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.button, styles.testButton]} 
              onPress={testLifeAssistPrompt}
            >
              <Text style={styles.buttonText}>
                LifeAssistテスト
              </Text>
            </TouchableOpacity>
          </View>

          {/* TTS制御ボタン */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.button, ttsEnabled ? styles.ttsEnabledButton : styles.ttsDisabledButton]} 
              onPress={toggleTTS}
            >
              <Text style={styles.buttonText}>
                {ttsEnabled ? '🔊 音声ON' : '🔇 音声OFF'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.button, styles.ttsTestButton]} 
              onPress={testTTS}
              disabled={!ttsEnabled}
            >
              <Text style={styles.buttonText}>
                🎤 音声テスト
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.button, styles.ttsStopButton]} 
              onPress={stopTTS}
            >
              <Text style={styles.buttonText}>
                ⏹️ 停止
              </Text>
            </TouchableOpacity>
          </View>

          {response ? (
            <View style={styles.section}>
              <Text style={styles.label}>Geminiの応答:</Text>
              <View style={styles.responseContainer}>
                <Text style={styles.responseText}>{response}</Text>
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* タブナビゲーション */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'text' && styles.activeTab]}
          onPress={() => setActiveTab('text')}
        >
          <Text style={[styles.tabText, activeTab === 'text' && styles.activeTabText]}>
            テキスト入力
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'camera' && styles.activeTab]}
          onPress={() => setActiveTab('camera')}
        >
          <Text style={[styles.tabText, activeTab === 'camera' && styles.activeTabText]}>
            カメラ機能
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'calendar' && styles.activeTab]}
          onPress={() => setActiveTab('calendar')}
        >
          <Text style={[styles.tabText, activeTab === 'calendar' && styles.activeTabText]}>
            📅 Calendar
            {calendarConnected && ' ✓'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tab, activeTab === 'profile' && styles.activeTab]}
          onPress={() => setActiveTab('profile')}
        >
          <Text style={[styles.tabText, activeTab === 'profile' && styles.activeTabText]}>
            👤 Profile
            {setupStatus.isCompleted && ' ✓'}
            {!setupStatus.isCompleted && setupStatus.progress > 0 && ` ${setupStatus.progress}%`}
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* コンテンツ表示 */}
      {renderContent()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    margin: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#333',
  },
  section: {
    marginBottom: 20,
  },
  statusSection: {
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  statusText: {
    fontSize: 14,
  },
  statusOk: {
    color: '#34C759',
  },
  statusError: {
    color: '#FF3B30',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#555',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    minHeight: 120,
    backgroundColor: 'white',
    textAlignVertical: 'top',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
  },
  testButton: {
    backgroundColor: '#34C759',
  },
  ttsEnabledButton: {
    backgroundColor: '#34C759',
  },
  ttsDisabledButton: {
    backgroundColor: '#8E8E93',
  },
  ttsTestButton: {
    backgroundColor: '#007AFF',
  },
  ttsStopButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  responseContainer: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
  },
  responseText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#007AFF',
  },
  tabText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  activeTabText: {
    color: 'white',
  },
});

export default App;