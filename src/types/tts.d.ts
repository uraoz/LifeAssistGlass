// src/types/tts.d.ts - TTS音声合成の型定義

export interface TTSSettings {
  enabled: boolean;
  language: string;             // 'ja-JP', 'en-US' など
  voice?: string;               // 利用可能な音声エンジン
  speechRate: number;           // 0.1 - 2.0 (1.0が標準)
  pitch: number;                // 0.5 - 2.0 (1.0が標準)
  volume: number;               // 0.0 - 1.0
  ducking: boolean;             // 他の音声をミュートするか
  defaultCategory: string;      // AVAudioSessionCategory
}

export interface VoiceInfo {
  id: string;
  name: string;
  language: string;
  quality: 'Default' | 'Enhanced';
  networkConnectionRequired?: boolean;
  notInstalled?: boolean;
}

export interface TTSOptions {
  iosVoiceId?: string;
  androidParams?: {
    KEY_PARAM_PAN?: number;
    KEY_PARAM_VOLUME?: number;
    KEY_PARAM_STREAM?: number;
  };
  queueMode?: 'flush' | 'add';   // flush: 既存のキューをクリア, add: キューに追加
}

export type SpeechPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface SpeechRequest {
  text: string;
  priority: SpeechPriority;
  options?: TTSOptions;
  onStart?: () => void;
  onFinish?: (finished: boolean) => void;
  onProgress?: (event: any) => void;
  onError?: (error: string) => void;
}

export interface TTSQueueItem extends SpeechRequest {
  id: string;
  timestamp: Date;
  retryCount: number;
}

export interface TTSStatus {
  isInitialized: boolean;
  isSpeaking: boolean;
  isPaused: boolean;
  availableVoices: VoiceInfo[];
  currentSettings: TTSSettings;
  queueLength: number;
  lastError?: string;
}

// 個人化設定との統合用
export interface PersonalizedTTSConfig {
  userProfile?: {
    ageGroup?: string;
    communicationStyle?: 'formal' | 'casual' | 'friendly';
    preferences?: string[];
  };
  adaptiveSettings: {
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    location: 'home' | 'office' | 'public' | 'transit' | 'unknown';
    activity: 'working' | 'commuting' | 'leisure' | 'sleeping' | 'unknown';
  };
  contextualAdjustments: {
    volumeAdjustment: number;     // -0.3 to +0.3
    speedAdjustment: number;      // -0.3 to +0.3
    priorityThreshold: SpeechPriority; // この優先度以上のみ読み上げ
  };
}

// TTS機能の拡張設定
export interface TTSAdvancedOptions {
  breakTime?: number;           // 文の間の休止時間（ミリ秒）
  emphasizeWords?: string[];    // 強調する単語リスト
  customReplacements?: { [key: string]: string }; // 読み方の置換
  emotionTone?: 'neutral' | 'encouraging' | 'urgent' | 'gentle';
  contextualFiltering?: boolean; // 文脈に応じたフィルタリング
}

// 使用例の型定義
export interface TTSUsageStats {
  totalSpeeches: number;
  totalCharacters: number;
  averageSpeechLength: number;
  priorityDistribution: { [key in SpeechPriority]: number };
  errorRate: number;
  userInterruptionRate: number; // ユーザーが中断した割合
  preferredSettings: TTSSettings;
  lastUsed: Date;
}