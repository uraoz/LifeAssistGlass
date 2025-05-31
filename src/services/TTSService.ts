// src/services/TTSService.ts - Text-to-Speech音声合成サービス
// 
// 注意: react-native-tts の API制限
// - setDefaultVolume(): 利用不可 (音量制御は制限的)
// - setDefaultVoice(): 利用不可 (音声選択は制限的)  
// - 音量制御: システム音量またはハードウェアに依存
// - 音声選択: voices()で取得可能だが、設定は制限的

import Tts from 'react-native-tts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  TTSSettings,
  VoiceInfo,
  SpeechRequest,
  TTSQueueItem,
  TTSStatus,
  SpeechPriority,
  PersonalizedTTSConfig,
  TTSAdvancedOptions,
  TTSUsageStats,
  TTSOptions,
} from '../types/tts';
import PersonalizationService from './PersonalizationService';

class TTSService {
  private readonly STORAGE_KEYS = {
    settings: 'tts_settings',
    usageStats: 'tts_usage_stats',
    customReplacements: 'tts_custom_replacements',
  };

  private settings: TTSSettings | null = null;
  private isInitialized = false;
  private speechQueue: TTSQueueItem[] = [];
  private currentSpeech: TTSQueueItem | null = null;
  private availableVoices: VoiceInfo[] = [];
  private usageStats: TTSUsageStats | null = null;
  private customReplacements: { [key: string]: string } = {};

  // 優先度設定
  private readonly PRIORITY_LEVELS = {
    low: 1,
    medium: 2,
    high: 3,
    urgent: 4,
  };

  // デフォルト設定
  private getDefaultSettings(): TTSSettings {
    return {
      enabled: true,
      language: 'ja-JP',
      speechRate: 1.0,
      pitch: 1.0,
      volume: 0.8,
      ducking: true,
      defaultCategory: 'AVAudioSessionCategoryPlayback',
    };
  }

  // ===== 初期化とセットアップ =====

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('TTSService 初期化開始...');

      // TTS エンジンの初期化
      await this.initializeTTSEngine();

      // 設定とデータの並行読み込み
      const [settings, usageStats, customReplacements] = await Promise.all([
        this.loadSettings(),
        this.loadUsageStats(),
        this.loadCustomReplacements(),
      ]);

      this.settings = settings;
      this.usageStats = usageStats;
      this.customReplacements = customReplacements;

      // 利用可能な音声の取得
      await this.loadAvailableVoices();

      // TTS設定の適用
      await this.applySettings();

      // イベントリスナーの設定
      this.setupEventListeners();

      this.isInitialized = true;
      console.log('TTSService 初期化完了:', {
        settings: this.settings,
        voicesCount: this.availableVoices.length,
        queueLength: this.speechQueue.length,
      });

    } catch (error) {
      console.error('TTSService 初期化エラー:', error);
      // エラー時もデフォルト設定で初期化
      this.settings = this.getDefaultSettings();
      this.usageStats = this.getDefaultUsageStats();
      this.isInitialized = true;
    }
  }

  private async initializeTTSEngine(): Promise<void> {
    try {
      // TTS エンジンの基本設定（利用可能なAPIのみ）
      await Tts.setDefaultLanguage(this.getDefaultSettings().language);
      await Tts.setDefaultRate(this.getDefaultSettings().speechRate);
      await Tts.setDefaultPitch(this.getDefaultSettings().pitch);
      
      console.log('TTS エンジン初期化完了');
    } catch (error) {
      console.error('TTS エンジン初期化エラー:', error);
      // 初期化エラーでも継続する（一部機能は利用可能な可能性があるため）
      console.warn('TTS 基本設定の一部が失敗しましたが、継続します');
    }
  }

  private setupEventListeners(): void {
    // 音声開始イベント
    Tts.addEventListener('tts-start', (event) => {
      console.log('TTS 開始:', event);
      if (this.currentSpeech?.onStart) {
        this.currentSpeech.onStart();
      }
    });

    // 音声完了イベント
    Tts.addEventListener('tts-finish', (event) => {
      console.log('TTS 完了:', event);
      if (this.currentSpeech?.onFinish) {
        this.currentSpeech.onFinish(true);
      }
      this.onSpeechCompleted(true);
    });

    // 音声進行イベント
    Tts.addEventListener('tts-progress', (event) => {
      if (this.currentSpeech?.onProgress) {
        this.currentSpeech.onProgress(event);
      }
    });

    // 音声取消イベント
    Tts.addEventListener('tts-cancel', (event) => {
      console.log('TTS キャンセル:', event);
      if (this.currentSpeech?.onFinish) {
        this.currentSpeech.onFinish(false);
      }
      this.onSpeechCompleted(false);
    });

    // エラーイベント
    Tts.addEventListener('tts-error', (event) => {
      console.error('TTS エラー:', event);
      if (this.currentSpeech?.onError) {
        this.currentSpeech.onError(event.error);
      }
      this.onSpeechError(event.error);
    });
  }

  // ===== 音声合成の主要機能 =====

  async speak(request: SpeechRequest): Promise<string> {
    await this.initialize();

    if (!this.settings?.enabled) {
      console.log('TTS 無効のため音声出力をスキップ');
      return 'disabled';
    }

    // テキストの前処理
    const processedText = this.preprocessText(request.text);
    
    if (!processedText.trim()) {
      console.warn('TTS: 空のテキストのため音声出力をスキップ');
      return 'empty';
    }

    // キューアイテムの作成
    const queueItem: TTSQueueItem = {
      ...request,
      text: processedText,
      id: this.generateId(),
      timestamp: new Date(),
      retryCount: 0,
    };

    // 優先度に基づくキューへの追加
    this.addToQueue(queueItem);

    // 音声出力の開始（キューが空の場合）
    if (!this.currentSpeech) {
      await this.processQueue();
    }

    // 使用統計の更新
    await this.updateUsageStats(queueItem);

    return queueItem.id;
  }

  // 優先度に基づくキューへの追加
  private addToQueue(item: TTSQueueItem): void {
    const priority = this.PRIORITY_LEVELS[item.priority];

    if (item.priority === 'urgent') {
      // 緊急の場合は現在の音声を停止してキューの先頭に追加
      if (this.currentSpeech && this.currentSpeech.priority !== 'urgent') {
        this.stopCurrent();
      }
      this.speechQueue.unshift(item);
    } else {
      // 優先度順に挿入
      let insertIndex = this.speechQueue.length;
      for (let i = 0; i < this.speechQueue.length; i++) {
        if (this.PRIORITY_LEVELS[this.speechQueue[i].priority] < priority) {
          insertIndex = i;
          break;
        }
      }
      this.speechQueue.splice(insertIndex, 0, item);
    }

    console.log(`TTS キュー追加: ${item.priority} (ID: ${item.id}), キューサイズ: ${this.speechQueue.length}`);
  }

  // キューの処理
  private async processQueue(): Promise<void> {
    if (this.speechQueue.length === 0 || this.currentSpeech) {
      return;
    }

    const nextItem = this.speechQueue.shift();
    if (!nextItem) return;

    this.currentSpeech = nextItem;

    try {
      // 個人化設定の適用
      await this.applyPersonalizedSettings(nextItem);

      // 音声合成の実行
      const options = nextItem.options || {};
      await Tts.speak(nextItem.text, options);

    } catch (error) {
      console.error('TTS 音声出力エラー:', error);
      if (nextItem.onError) {
        nextItem.onError(error.toString());
      }
      this.onSpeechError(error.toString());
    }
  }

  // 音声完了時の処理
  private onSpeechCompleted(finished: boolean): void {
    if (this.currentSpeech) {
      if (finished) {
        console.log(`TTS 完了: ${this.currentSpeech.id}`);
      } else {
        console.log(`TTS 中断: ${this.currentSpeech.id}`);
      }
    }

    this.currentSpeech = null;

    // 次のキューを処理
    setTimeout(() => {
      this.processQueue();
    }, 100);
  }

  // エラー時の処理
  private onSpeechError(error: string): void {
    if (this.currentSpeech) {
      this.currentSpeech.retryCount++;
      
      // リトライ可能かチェック（最大3回）
      if (this.currentSpeech.retryCount < 3) {
        console.log(`TTS リトライ ${this.currentSpeech.retryCount}/3: ${this.currentSpeech.id}`);
        this.speechQueue.unshift(this.currentSpeech);
      } else {
        console.error(`TTS 最大リトライ数に達しました: ${this.currentSpeech.id}`);
      }
    }

    this.currentSpeech = null;

    // エラー後も次のキューを処理
    setTimeout(() => {
      this.processQueue();
    }, 500);
  }

  // ===== テキスト前処理 =====

  private preprocessText(text: string): string {
    let processedText = text;

    // 改行の処理
    processedText = processedText.replace(/\n+/g, '。');

    // 絵文字の削除（音声では読み上げにくいため）
    processedText = processedText.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '');

    // カスタム置換の適用
    for (const [from, to] of Object.entries(this.customReplacements)) {
      processedText = processedText.replace(new RegExp(from, 'g'), to);
    }

    // 特殊記号の置換
    const symbolReplacements: { [key: string]: string } = {
      '⚠️': '注意、',
      '💡': '提案、',
      '📅': 'カレンダー、',
      '⏰': '時間、',
      '🔋': 'バッテリー、',
      '📚': '学習、',
      '💼': '仕事、',
      '％': 'パーセント',
      '°C': '度',
    };

    for (const [symbol, replacement] of Object.entries(symbolReplacements)) {
      processedText = processedText.replace(new RegExp(symbol, 'g'), replacement);
    }

    // 過度に長いテキストの制限（日本語で200文字程度）
    if (processedText.length > 200) {
      processedText = processedText.substring(0, 197) + '...';
    }

    return processedText.trim();
  }

  // ===== 個人化設定との統合 =====

  private async applyPersonalizedSettings(item: TTSQueueItem): Promise<void> {
    try {
      const personalizationData = await PersonalizationService.getPersonalizationData();
      const personalSchedule = await PersonalizationService.getPersonalScheduleContext();

      if (!personalizationData.userProfile) {
        // 個人化データがない場合はデフォルト設定を使用
        return;
      }

      const config: PersonalizedTTSConfig = {
        userProfile: {
          ageGroup: personalizationData.userProfile.ageGroup,
          communicationStyle: personalizationData.userProfile.communicationStyle,
          preferences: personalizationData.userProfile.priorities,
        },
        adaptiveSettings: {
          timeOfDay: this.getTimeOfDay(),
          location: this.getCurrentLocationContext(),
          activity: this.getCurrentActivityContext(personalSchedule.schedulePhase),
        },
        contextualAdjustments: this.calculateContextualAdjustments(item.priority),
      };

      await this.applyAdaptiveSettings(config);

    } catch (error) {
      console.warn('個人化設定の適用に失敗、デフォルト設定を使用:', error);
    }
  }

  private async applyAdaptiveSettings(config: PersonalizedTTSConfig): Promise<void> {
    if (!this.settings) return;

    // 音量の調整（設定は保持するが、実際の制御は限定的）
    const adjustedVolume = Math.max(0.1, Math.min(1.0, 
      this.settings.volume + config.contextualAdjustments.volumeAdjustment
    ));

    // 速度の調整
    const adjustedRate = Math.max(0.3, Math.min(2.0, 
      this.settings.speechRate + config.contextualAdjustments.speedAdjustment
    ));

    // 利用可能な設定のみ適用
    try {
      await Tts.setDefaultRate(adjustedRate);
      await Tts.setDefaultPitch(this.settings.pitch);
    } catch (error) {
      console.warn('適応設定の一部適用に失敗:', error);
    }

    // 音量は設定として保持（システム音量やハードウェア制御に依存）
    this.settings.volume = adjustedVolume;
    this.settings.speechRate = adjustedRate;

    console.log('適応設定適用:', {
      volume: adjustedVolume, // 注意: システム音量に依存
      rate: adjustedRate,
      context: config.adaptiveSettings,
    });
  }

  private calculateContextualAdjustments(priority: SpeechPriority): PersonalizedTTSConfig['contextualAdjustments'] {
    const hour = new Date().getHours();
    
    // 基本調整
    let volumeAdjustment = 0;
    let speedAdjustment = 0;
    let priorityThreshold: SpeechPriority = 'low';

    // 時間帯による調整
    if (hour < 7 || hour > 22) {
      // 早朝・深夜は音量を下げる
      volumeAdjustment -= 0.3;
      priorityThreshold = 'medium';
    } else if (hour >= 9 && hour <= 17) {
      // 日中は効率重視
      speedAdjustment += 0.1;
    }

    // 優先度による調整
    switch (priority) {
      case 'urgent':
        volumeAdjustment += 0.2;
        speedAdjustment += 0.1;
        break;
      case 'high':
        volumeAdjustment += 0.1;
        break;
      case 'low':
        volumeAdjustment -= 0.1;
        speedAdjustment -= 0.1;
        break;
    }

    return {
      volumeAdjustment,
      speedAdjustment,
      priorityThreshold,
    };
  }

  // ===== 制御メソッド =====

  async pause(): Promise<void> {
    try {
      await Tts.pause();
      console.log('TTS 一時停止');
    } catch (error) {
      console.error('TTS 一時停止エラー:', error);
    }
  }

  async resume(): Promise<void> {
    try {
      await Tts.resume();
      console.log('TTS 再開');
    } catch (error) {
      console.error('TTS 再開エラー:', error);
    }
  }

  async stop(): Promise<void> {
    try {
      await Tts.stop();
      this.speechQueue = [];
      this.currentSpeech = null;
      console.log('TTS 停止 - キューをクリア');
    } catch (error) {
      console.error('TTS 停止エラー:', error);
    }
  }

  private async stopCurrent(): Promise<void> {
    try {
      await Tts.stop();
      this.currentSpeech = null;
    } catch (error) {
      console.error('現在のTTS停止エラー:', error);
    }
  }

  // キューの管理
  clearQueue(): void {
    this.speechQueue = [];
    console.log('TTS キューをクリア');
  }

  getQueueStatus(): { length: number; items: TTSQueueItem[] } {
    return {
      length: this.speechQueue.length,
      items: [...this.speechQueue],
    };
  }

  // ===== 設定管理 =====

  async saveSettings(newSettings: Partial<TTSSettings>): Promise<TTSSettings> {
    await this.initialize();

    const updatedSettings = { ...this.settings, ...newSettings };
    this.settings = updatedSettings;

    await AsyncStorage.setItem(this.STORAGE_KEYS.settings, JSON.stringify(updatedSettings));
    await this.applySettings();

    console.log('TTS設定保存:', updatedSettings);
    return updatedSettings;
  }

  private async loadSettings(): Promise<TTSSettings> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEYS.settings);
      return stored ? JSON.parse(stored) : this.getDefaultSettings();
    } catch (error) {
      console.error('TTS設定読み込みエラー:', error);
      return this.getDefaultSettings();
    }
  }

  private async applySettings(): Promise<void> {
    if (!this.settings) return;

    try {
      // 利用可能なAPIのみを使用
      await Tts.setDefaultLanguage(this.settings.language);
      await Tts.setDefaultRate(this.settings.speechRate);
      await Tts.setDefaultPitch(this.settings.pitch);
      
      // 注意: setDefaultVolume と setDefaultVoice は react-native-tts では利用できません
      // 音量は speak() メソッドのオプションで設定するか、システム音量に依存します
      
      console.log('TTS設定適用完了:', {
        language: this.settings.language,
        rate: this.settings.speechRate,
        pitch: this.settings.pitch,
        volume: this.settings.volume, // 設定は保持するが、実際の制御は限定的
      });
    } catch (error) {
      console.error('TTS設定適用エラー:', error);
    }
  }

  // ===== 音声エンジン情報 =====

  private async loadAvailableVoices(): Promise<void> {
    try {
      const voices = await Tts.voices();
      this.availableVoices = voices.map((voice: any): VoiceInfo => ({
        id: voice.id,
        name: voice.name,
        language: voice.language,
        quality: voice.quality || 'Default',
        networkConnectionRequired: voice.networkConnectionRequired,
        notInstalled: voice.notInstalled,
      }));

      console.log(`利用可能な音声: ${this.availableVoices.length}件`);
    } catch (error) {
      console.error('音声一覧取得エラー:', error);
      this.availableVoices = [];
    }
  }

  getAvailableVoices(): VoiceInfo[] {
    return [...this.availableVoices];
  }

  // ===== 統計とログ =====

  private async updateUsageStats(item: TTSQueueItem): Promise<void> {
    if (!this.usageStats) {
      this.usageStats = this.getDefaultUsageStats();
    }

    this.usageStats.totalSpeeches++;
    this.usageStats.totalCharacters += item.text.length;
    this.usageStats.averageSpeechLength = this.usageStats.totalCharacters / this.usageStats.totalSpeeches;
    this.usageStats.priorityDistribution[item.priority]++;
    this.usageStats.lastUsed = new Date();

    await AsyncStorage.setItem(this.STORAGE_KEYS.usageStats, JSON.stringify(this.usageStats));
  }

  private getDefaultUsageStats(): TTSUsageStats {
    return {
      totalSpeeches: 0,
      totalCharacters: 0,
      averageSpeechLength: 0,
      priorityDistribution: { low: 0, medium: 0, high: 0, urgent: 0 },
      errorRate: 0,
      userInterruptionRate: 0,
      preferredSettings: this.getDefaultSettings(),
      lastUsed: new Date(),
    };
  }

  private async loadUsageStats(): Promise<TTSUsageStats> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEYS.usageStats);
      if (!stored) return this.getDefaultUsageStats();

      const stats: TTSUsageStats = JSON.parse(stored);
      stats.lastUsed = new Date(stats.lastUsed);
      return stats;
    } catch (error) {
      console.error('使用統計読み込みエラー:', error);
      return this.getDefaultUsageStats();
    }
  }

  async getUsageStats(): Promise<TTSUsageStats> {
    await this.initialize();
    return { ...this.usageStats } || this.getDefaultUsageStats();
  }

  // ===== カスタム置換管理 =====

  private async loadCustomReplacements(): Promise<{ [key: string]: string }> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEYS.customReplacements);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('カスタム置換読み込みエラー:', error);
      return {};
    }
  }

  async saveCustomReplacements(replacements: { [key: string]: string }): Promise<void> {
    this.customReplacements = replacements;
    await AsyncStorage.setItem(this.STORAGE_KEYS.customReplacements, JSON.stringify(replacements));
    console.log('カスタム置換保存:', replacements);
  }

  // ===== ユーティリティメソッド =====

  private getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
    const hour = new Date().getHours();
    if (hour < 6) return 'night';
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    if (hour < 22) return 'evening';
    return 'night';
  }

  private getCurrentLocationContext(): 'home' | 'office' | 'public' | 'transit' | 'unknown' {
    // 実際の実装では位置情報サービスと連携
    return 'unknown';
  }

  private getCurrentActivityContext(schedulePhase: string): 'working' | 'commuting' | 'leisure' | 'sleeping' | 'unknown' {
    if (schedulePhase.includes('work')) return 'working';
    if (schedulePhase.includes('commute')) return 'commuting';
    if (schedulePhase.includes('sleep')) return 'sleeping';
    if (schedulePhase.includes('free') || schedulePhase.includes('weekend')) return 'leisure';
    return 'unknown';
  }

  private generateId(): string {
    return Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // ===== 公開API =====

  async getStatus(): Promise<TTSStatus> {
    await this.initialize();

    return {
      isInitialized: this.isInitialized,
      isSpeaking: !!(this.currentSpeech),
      isPaused: false, // react-native-ttsでは一時停止状態の取得が困難
      availableVoices: this.availableVoices,
      currentSettings: this.settings || this.getDefaultSettings(),
      queueLength: this.speechQueue.length,
    };
  }

  // 簡易音声出力メソッド（よく使用される場合）
  async speakText(text: string, priority: SpeechPriority = 'medium'): Promise<string> {
    return this.speak({
      text,
      priority,
    });
  }

  // 緊急音声出力メソッド
  async speakUrgent(text: string): Promise<string> {
    return this.speak({
      text,
      priority: 'urgent',
    });
  }

  // デバッグ用データクリア
  async clearAllData(): Promise<void> {
    await Promise.all([
      AsyncStorage.removeItem(this.STORAGE_KEYS.settings),
      AsyncStorage.removeItem(this.STORAGE_KEYS.usageStats),
      AsyncStorage.removeItem(this.STORAGE_KEYS.customReplacements),
    ]);

    this.settings = null;
    this.usageStats = null;
    this.customReplacements = {};
    this.isInitialized = false;

    console.log('TTSServiceデータをすべてクリアしました');
  }
}

export default new TTSService();