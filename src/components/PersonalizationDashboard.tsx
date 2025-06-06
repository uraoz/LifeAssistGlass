// src/components/PersonalizationDashboard.tsx - 個人化設定ダッシュボード

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import PersonalizationService from '../services/PersonalizationService';
import ImageAnalysisService from '../services/ImageAnalysisService';
import ContextService from '../services/ContextService';
import LocationService from '../services/LocationService';
import TTSService from '../services/TTSService';
import {
  UserProfile,
  PersonalizationData,
  PersonalScheduleContext,
} from '../types/personalization';
import { LifeAssistContext } from '../types/lifeassist';

interface PersonalizationDashboardProps {
  onStartSetup: () => void;
}

// 自由記述フィールドの要約を生成
const getFreeformSummary = (freeformFields: any): string => {
  const filledFields = Object.entries(freeformFields)
    .filter(([key, value]) => value && (value as string).trim())
    .length;
  
  if (filledFields === 0) return '未記述';
  
  const fieldLabels: { [key: string]: string } = {
    personalDescription: '生活スタイル',
    dailyRoutineNotes: 'ルーティン',
    personalGoals: '目標',
    challengesAndStruggles: '課題',
    preferredAdviceStyle: 'アドバイス希望',
    workLifeDetails: '仕事詳細',
    hobbiesDetails: '趣味詳細',
    uniqueCircumstances: '特殊事情',
  };
  
  const filledLabels = Object.entries(freeformFields)
    .filter(([key, value]) => value && (value as string).trim())
    .map(([key]) => fieldLabels[key] || key)
    .slice(0, 3);
  
  return `${filledFields}項目記述済み (${filledLabels.join('、')}${filledFields > 3 ? ' など' : ''})`;
};

// 自由記述フィールドのキーをラベルに変換
const getFreeformFieldLabel = (key: string): string => {
  const labels: { [key: string]: string } = {
    personalDescription: '生活スタイル・特徴',
    dailyRoutineNotes: '日常ルーティン',
    personalGoals: '個人的目標',
    challengesAndStruggles: '課題・困りごと',
    preferredAdviceStyle: 'アドバイス希望',
    workLifeDetails: '仕事・生活詳細',
    hobbiesDetails: '趣味・娯楽詳細',
    uniqueCircumstances: '特殊事情・配慮',
  };
  return labels[key] || key;
};

const PersonalizationDashboard: React.FC<PersonalizationDashboardProps> = ({ onStartSetup }) => {
  const [personalizationData, setPersonalizationData] = useState<PersonalizationData | null>(null);
  const [personalSchedule, setPersonalSchedule] = useState<PersonalScheduleContext | null>(null);
  const [setupStatus, setSetupStatus] = useState({ isCompleted: false, progress: 0, missingSteps: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [testResult, setTestResult] = useState<string>('');
  const [isTesting, setIsTesting] = useState(false);
  const [debugResult, setDebugResult] = useState<string>('');
  const [ttsEnabled, setTTSEnabled] = useState(true);

  useEffect(() => {
    loadPersonalizationData();
    initializeTTS();
  }, []);

  // TTS初期化
  const initializeTTS = async () => {
    try {
      await TTSService.initialize();
      const status = await TTSService.getStatus();
      setTTSEnabled(status.currentSettings.enabled);
      console.log('PersonalizationDashboard TTS初期化完了:', status);
    } catch (error) {
      console.error('PersonalizationDashboard TTS初期化エラー:', error);
      setTTSEnabled(false);
    }
  };

  // TTS音声読み上げ機能
  const speakResult = async (text: string, priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium') => {
    if (!ttsEnabled) return;
    
    try {
      await TTSService.speak({
        text,
        priority,
        onStart: () => console.log('個人化ダッシュボード音声読み上げ開始'),
        onFinish: (finished) => console.log('個人化ダッシュボード音声読み上げ完了:', finished),
        onError: (error) => console.error('個人化ダッシュボード音声読み上げエラー:', error),
      });
    } catch (error) {
      console.error('PersonalizationDashboard TTS呼び出しエラー:', error);
    }
  };

  const loadPersonalizationData = async () => {
    setIsLoading(true);
    try {
      await PersonalizationService.initialize();
      
      const [data, schedule, status] = await Promise.all([
        PersonalizationService.getPersonalizationData(),
        PersonalizationService.getPersonalScheduleContext(),
        PersonalizationService.getSetupStatus(),
      ]);

      setPersonalizationData(data);
      setPersonalSchedule(schedule);
      setSetupStatus(status);

      console.log('個人化データ読み込み完了:', { data, schedule, status });
    } catch (error) {
      console.error('個人化データ読み込みエラー:', error);
      Alert.alert('エラー', '個人化データの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // 個人化されたアドバイステスト
  const testPersonalizedAdvice = async () => {
    setIsTesting(true);
    setTestResult('');
    
    try {
      // テスト用のコンテキストを作成
      const testContext: LifeAssistContext = {
        currentTime: new Date().toLocaleString('ja-JP'),
        location: {
          latitude: 35.6762,
          longitude: 139.6503,
          address: '東京都渋谷区',
          city: '渋谷区',
          region: '東京都',
          country: '日本',
        },
        weather: {
          temperature: 22,
          humidity: 60,
          description: '晴れ',
          condition: 'clear',
          windSpeed: 2,
          windDirection: 180,
        },
        calendar: {
          todayEvents: [],
          upcomingEvents: [],
          totalEventsToday: 0,
        },
      };

      console.log('個人化アドバイステスト開始...');
      const result = await ImageAnalysisService.analyzeImage('', testContext);
      
      setTestResult(result.text);
      console.log('個人化アドバイステスト結果:', result);

      // テスト結果をTTSで読み上げ
      if (result.success && result.text) {
        await TTSService.speakTestResult(result.text, true);
      } else if (result.error) {
        await TTSService.speakError('個人化アドバイステスト');
      }
      
    } catch (error) {
      console.error('個人化アドバイステストエラー:', error);
      const errorMessage = `テストエラー: ${error instanceof Error ? error.message : '不明なエラー'}`;
      setTestResult(errorMessage);
      
      // エラーもTTSで読み上げ
      await TTSService.speakError('個人化アドバイステスト');
    } finally {
      setIsTesting(false);
    }
  };

  // データクリア
  const clearAllData = async () => {
    Alert.alert(
      '確認',
      '全ての個人化データをクリアしますか？この操作は元に戻せません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'クリア',
          style: 'destructive',
          onPress: async () => {
            try {
              await PersonalizationService.clearAllData();
              await loadPersonalizationData();
              Alert.alert('完了', '個人化データをクリアしました');
            } catch (error) {
              console.error('データクリアエラー:', error);
              Alert.alert('エラー', 'データクリアに失敗しました');
            }
          },
        },
      ]
    );
  };

  // 位置情報・コンテキストデバッグ
  const testLocationAndContext = async () => {
    setIsTesting(true);
    setDebugResult('');
    
    try {
      let debugInfo = '🔍 デバッグ情報\n\n';
      
      // 1. 位置情報テスト
      debugInfo += '【位置情報テスト】\n';
      const startTime = Date.now();
      
      try {
        const location = await LocationService.getCurrentLocation();
        const locationTime = Date.now() - startTime;
        
        if (location) {
          debugInfo += `✅ 成功 (${locationTime}ms)\n`;
          debugInfo += `📍 ${location.address}\n`;
          debugInfo += `📊 緯度: ${location.latitude.toFixed(4)}, 経度: ${location.longitude.toFixed(4)}\n`;
          debugInfo += location.address.includes('エミュレータ') ? '🤖 エミュレータ模擬位置を使用\n' : '📱 実デバイス位置情報\n';
        } else {
          debugInfo += `❌ 失敗 (${locationTime}ms)\n`;
        }
      } catch (locationError) {
        const locationTime = Date.now() - startTime;
        debugInfo += `❌ エラー (${locationTime}ms): ${locationError}\n`;
      }
      
      setDebugResult(debugInfo);

      // デバッグ結果の要約をTTSで読み上げ
      const hasLocation = debugInfo.includes('✅ 成功');
      const isEmulator = debugInfo.includes('エミュレータ模擬位置');
      
      let summary = '';
      if (hasLocation) {
        summary = isEmulator ? 'エミュレータ模擬位置情報を取得しました。' : '実デバイス位置情報を取得しました。';
      } else {
        summary = '位置情報の取得に失敗しました。';
      }
      
      await TTSService.speakTestResult(summary, hasLocation);
      
    } catch (error) {
      console.error('デバッグテストエラー:', error);
      const errorMessage = `❌ デバッグテスト失敗: ${error}`;
      setDebugResult(errorMessage);
      
      // デバッグエラーもTTSで読み上げ
      await TTSService.speakError('デバッグテスト');
    } finally {
      setIsTesting(false);
    }
  };

  // ライフスタイルラベル変換
  const getLifestyleLabel = (lifestyle?: string): string => {
    const labels = {
      student: '🎓 学生',
      employee: '💼 会社員',
      freelancer: '💻 フリーランス',
      homemaker: '🏠 主婦/主夫',
      retired: '🌿 退職者',
      other: '🤔 その他',
    };
    return labels[lifestyle as keyof typeof labels] || '未設定';
  };

  // 価値観ラベル変換
  const getPriorityLabels = (priorities: string[]): string => {
    const labels = {
      health_first: '🏥 健康最優先',
      efficiency_focus: '⚡ 効率重視',
      work_life_balance: '⚖️ ワークライフバランス',
      family_priority: '👨‍👩‍👧‍👦 家族優先',
      personal_growth: '📈 自己成長',
      social_connection: '🤝 社会的つながり',
      financial_stability: '💰 経済的安定',
      creativity: '🎨 創造性',
      adventure: '🗻 冒険・チャレンジ',
    };
    
    return priorities.map(p => labels[p as keyof typeof labels] || p).join(', ');
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>個人化データを読み込み中...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <Text style={styles.title}>👤 個人化設定ダッシュボード</Text>
        <Text style={styles.subtitle}>v0.3.0 - 個人化機能テスト版</Text>
      </View>

      {/* 設定状況 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>設定状況</Text>
        <View style={styles.statusCard}>
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>設定完了度: {setupStatus.progress}%</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${setupStatus.progress}%` }]} />
            </View>
          </View>
          
          <Text style={[
            styles.statusText,
            setupStatus.isCompleted ? styles.statusComplete : styles.statusIncomplete
          ]}>
            {setupStatus.isCompleted ? '✅ 設定完了' : '⚠️ 設定が必要'}
          </Text>
          
          {setupStatus.missingSteps.length > 0 && (
            <View style={styles.missingSteps}>
              <Text style={styles.missingStepsTitle}>未完了の項目:</Text>
              {setupStatus.missingSteps.map((step, index) => (
                <Text key={index} style={styles.missingStep}>• {step}</Text>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* ユーザープロファイル */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ユーザープロファイル</Text>
        {personalizationData?.userProfile ? (
          <View style={styles.profileCard}>
            <Text style={styles.profileItem}>
              <Text style={styles.profileLabel}>ライフスタイル:</Text> {getLifestyleLabel(personalizationData.userProfile.lifestyle)}
            </Text>
            <Text style={styles.profileItem}>
              <Text style={styles.profileLabel}>年齢層:</Text> {personalizationData.userProfile.ageGroup || '未設定'}
            </Text>
            <Text style={styles.profileItem}>
              <Text style={styles.profileLabel}>興味・関心:</Text> {personalizationData.userProfile.interests.length}項目
            </Text>
            <Text style={styles.profileItem}>
              <Text style={styles.profileLabel}>価値観:</Text> {getPriorityLabels(personalizationData.userProfile.priorities)}
            </Text>
            {personalizationData.userProfile.healthConsiderations && (
              <Text style={styles.profileItem}>
                <Text style={styles.profileLabel}>健康配慮:</Text> {personalizationData.userProfile.healthConsiderations}
              </Text>
            )}
            {personalizationData.userProfile.freeformFields && Object.values(personalizationData.userProfile.freeformFields).some(v => v && v.trim()) && (
              <Text style={styles.profileItem}>
                <Text style={styles.profileLabel}>自由記述:</Text> {getFreeformSummary(personalizationData.userProfile.freeformFields)}
              </Text>
            )}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>プロファイルが設定されていません</Text>
          </View>
        )}
      </View>

      {/* 週間スケジュール */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>週間スケジュール</Text>
        {personalizationData?.weeklySchedule ? (
          <View style={styles.scheduleCard}>
            <Text style={styles.scheduleDescription}>
              {personalizationData.weeklySchedule.description || 'パターン設定済み'}
            </Text>
            <View style={styles.scheduleGrid}>
              {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                <View key={day} style={styles.scheduleDay}>
                  <Text style={styles.dayName}>
                    {['月', '火', '水', '木', '金', '土', '日'][['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].indexOf(day)]}
                  </Text>
                  <Text style={styles.dayPattern}>
                    {(personalizationData.weeklySchedule as any)[day] || '未設定'}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>週間スケジュールが設定されていません</Text>
          </View>
        )}
      </View>

      {/* 個人スケジュールコンテキスト */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>現在のコンテキスト</Text>
        {personalSchedule && (
          <View style={styles.contextCard}>
            <Text style={styles.contextItem}>
              <Text style={styles.contextLabel}>個人化レベル:</Text> 
              {personalSchedule.isPersonalized ? '✅ 高' : '❌ 低'}
            </Text>
            <Text style={styles.contextItem}>
              <Text style={styles.contextLabel}>スケジュール段階:</Text> {personalSchedule.schedulePhase}
            </Text>
            {personalSchedule.currentPattern && (
              <Text style={styles.contextItem}>
                <Text style={styles.contextLabel}>現在のパターン:</Text> {personalSchedule.currentPattern}
              </Text>
            )}
            <Text style={styles.contextItem}>
              <Text style={styles.contextLabel}>アドバイスヒント:</Text> {personalSchedule.adviceHints.length}個
            </Text>
          </View>
        )}
      </View>

      {/* アクションボタン */}
      <View style={styles.actionSection}>
        <TouchableOpacity style={styles.primaryButton} onPress={onStartSetup}>
          <Text style={styles.buttonText}>
            {setupStatus.isCompleted ? '⚙️ 設定を編集' : '🚀 設定を開始'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.testButton} 
          onPress={testPersonalizedAdvice}
          disabled={isTesting}
        >
          <Text style={styles.buttonText}>
            {isTesting ? '🧪 テスト中...' : '🧪 個人化アドバイステスト'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.reloadButton} onPress={loadPersonalizationData}>
          <Text style={styles.buttonText}>🔄 データ再読込</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.clearButton} onPress={clearAllData}>
          <Text style={styles.buttonText}>🗑️ データクリア</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.debugButton} onPress={testLocationAndContext}>
          <Text style={styles.buttonText}>🔍 位置情報・コンテキストデバッグ</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.ttsButton, ttsEnabled ? styles.ttsEnabledButton : styles.ttsDisabledButton]} 
          onPress={() => setTTSEnabled(!ttsEnabled)}
        >
          <Text style={styles.buttonText}>
            {ttsEnabled ? '🔊 統合音声ON' : '🔇 統合音声OFF'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* テスト結果 */}
      {testResult && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>アドバイステスト結果</Text>
          <View style={styles.testResultCard}>
            <Text style={styles.testResultText}>{testResult}</Text>
            <Text style={styles.testTimestamp}>
              {new Date().toLocaleString('ja-JP')}
            </Text>
          </View>
        </View>
      )}

      {/* デバッグ結果 */}
      {debugResult && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔍 デバッグ結果</Text>
          <View style={styles.debugResultCard}>
            <Text style={styles.debugResultText}>{debugResult}</Text>
            <Text style={styles.testTimestamp}>
              {new Date().toLocaleString('ja-JP')}
            </Text>
          </View>
        </View>
      )}

      {/* 自由記述詳細表示 */}
      {personalizationData?.userProfile?.freeformFields && 
       Object.values(personalizationData.userProfile.freeformFields).some(v => v && v.trim()) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>自由記述詳細</Text>
          <View style={styles.freeformCard}>
            {Object.entries(personalizationData.userProfile.freeformFields)
              .filter(([key, value]) => value && (value as string).trim())
              .map(([key, value], index) => (
                <View key={index} style={styles.freeformItem}>
                  <Text style={styles.freeformKey}>
                    {getFreeformFieldLabel(key)}:
                  </Text>
                  <Text style={styles.freeformValue}>
                    {(value as string).length > 100 
                      ? `${(value as string).substring(0, 100)}...` 
                      : value as string}
                  </Text>
                </View>
              ))}
          </View>
        </View>
      )}

      {/* 開発情報 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>開発情報</Text>
        <View style={styles.devInfo}>
          <Text style={styles.devText}>• PersonalizationService 実装済み</Text>
          <Text style={styles.devText}>• 自由記述フィールド 実装済み 🆕</Text>
          <Text style={styles.devText}>• 個人化コンテキスト生成 実装済み</Text>
          <Text style={styles.devText}>• ImageAnalysisService 個人化対応済み</Text>
          <Text style={styles.devText}>• 次実装予定: 行動履歴学習, TTS機能</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statusCard: {
    backgroundColor: 'white',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  progressContainer: {
    marginBottom: 15,
  },
  progressText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#34C759',
    borderRadius: 4,
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  statusComplete: {
    color: '#34C759',
  },
  statusIncomplete: {
    color: '#FF9500',
  },
  missingSteps: {
    backgroundColor: '#fff3cd',
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  missingStepsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 5,
  },
  missingStep: {
    fontSize: 14,
    color: '#856404',
    marginLeft: 5,
  },
  profileCard: {
    backgroundColor: 'white',
    padding: 20,
  },
  profileItem: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    lineHeight: 20,
  },
  profileLabel: {
    fontWeight: 'bold',
    color: '#007AFF',
  },
  scheduleCard: {
    backgroundColor: 'white',
    padding: 20,
  },
  scheduleDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    fontStyle: 'italic',
  },
  scheduleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  scheduleDay: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  dayName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  dayPattern: {
    fontSize: 11,
    color: '#333',
    lineHeight: 16,
  },
  contextCard: {
    backgroundColor: 'white',
    padding: 20,
  },
  contextItem: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    lineHeight: 20,
  },
  contextLabel: {
    fontWeight: 'bold',
    color: '#34C759',
  },
  emptyCard: {
    backgroundColor: 'white',
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  actionSection: {
    padding: 20,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#34C759',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  testButton: {
    backgroundColor: '#FF9500',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  reloadButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: '#FF3B30',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  debugButton: {
    backgroundColor: '#6C7B7F',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  debugResultCard: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#6C7B7F',
    borderRadius: 4,
  },
  debugResultText: {
    fontSize: 12,
    color: '#333',
    lineHeight: 18,
    fontFamily: 'monospace',
    marginBottom: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  testResultCard: {
    backgroundColor: 'white',
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#34C759',
  },
  testResultText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    marginBottom: 10,
  },
  testTimestamp: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
  },
  devInfo: {
    backgroundColor: 'white',
    padding: 20,
  },
  devText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  ttsButton: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  ttsEnabledButton: {
    backgroundColor: '#34C759',
  },
  ttsDisabledButton: {
    backgroundColor: '#8E8E93',
  },
  freeformCard: {
    backgroundColor: 'white',
    padding: 20,
  },
  freeformItem: {
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  freeformKey: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 5,
  },
  freeformValue: {
    fontSize: 13,
    color: '#333',
    lineHeight: 20,
  },
});

export default PersonalizationDashboard;