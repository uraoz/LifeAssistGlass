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

// 環境変数からAPIキーを取得
const ai = new GoogleGenAI({apiKey: GEMINI_API_KEY});

const App = () => {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'text' | 'camera'>('text');

  // APIキーの設定確認
  useEffect(() => {
    if (!GEMINI_API_KEY) {
      Alert.alert(
        '設定エラー', 
        'APIキーが設定されていません。.envファイルを確認してください。'
      );
    }
  }, []);

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
      
      setResponse(response.text);
    } catch (error) {
      console.error('API Error:', error);
      Alert.alert('エラー', 'API呼び出しに失敗しました');
    } finally {
      setLoading(false);
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

  const renderContent = () => {
    if (activeTab === 'camera') {
      return <CameraScreen />;
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