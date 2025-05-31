// src/types/personalization.d.ts - 個人化設定用の型定義

export interface UserProfile {
  // 基本情報
  id: string;
  createdAt: Date;
  updatedAt: Date;
  
  // ライフスタイル
  lifestyle: 'student' | 'employee' | 'freelancer' | 'homemaker' | 'retired' | 'other';
  ageGroup: '10s' | '20s' | '30s' | '40s' | '50s+';
  
  // 興味・関心 (複数選択可)
  interests: InterestCategory[];
  
  // 健康状態・配慮事項
  healthConsiderations: string;
  
  // 価値観・優先事項 (複数選択可)
  priorities: PriorityValue[];
  
  // コミュニケーションスタイル
  communicationStyle: 'formal' | 'casual' | 'friendly';
  
  // 自由記述フィールド（新規追加）
  freeformFields: {
    personalDescription?: string;      // 自分の生活スタイル・特徴の自由記述
    dailyRoutineNotes?: string;       // 日常ルーティンの特記事項
    personalGoals?: string;           // 個人的な目標・重視していること
    uniqueCircumstances?: string;     // 特殊な事情・配慮事項
    preferredAdviceStyle?: string;    // 欲しいアドバイスのスタイル
    workLifeDetails?: string;         // 仕事・プライベートの詳細
    hobbiesDetails?: string;          // 趣味・娯楽の詳細
    challengesAndStruggles?: string;  // 日々の課題・困っていること
  };
  
  // 設定完了度
  setupProgress: {
    basicInfo: boolean;
    lifestyle: boolean;
    interests: boolean;
    weeklySchedule: boolean;
    preferences: boolean;
    freeformDetails: boolean;
  };
}

export type InterestCategory = 
  | 'sports' | 'fitness' | 'reading' | 'music' | 'movies' | 'cooking' 
  | 'travel' | 'gaming' | 'technology' | 'art' | 'photography'
  | 'gardening' | 'fashion' | 'pets' | 'volunteer' | 'business';

export type PriorityValue = 
  | 'health_first' | 'efficiency_focus' | 'work_life_balance' 
  | 'family_priority' | 'personal_growth' | 'social_connection' 
  | 'financial_stability' | 'creativity' | 'adventure';

// 週間スケジュールパターン
export interface WeeklySchedulePattern {
  id: string;
  userId: string;
  
  // 曜日別パターン (例: "9:00-17:00 オフィス勤務", "自由時間", "家族との時間")
  monday?: string;
  tuesday?: string;
  wednesday?: string;
  thursday?: string;
  friday?: string;
  saturday?: string;
  sunday?: string;
  
  // パターンの説明
  description?: string;
  isActive: boolean;
  createdAt: Date;
}

// 個人スケジュールコンテキスト
export interface PersonalScheduleContext {
  isPersonalized: boolean;
  currentPattern?: string;
  schedulePhase: SchedulePhase;
  relevantDescription: string;
  adviceHints: string[];
}

export type SchedulePhase = 
  | 'before_work' | 'commute_to_work' | 'work_time' | 'lunch_break' 
  | 'afternoon_work' | 'commute_home' | 'after_work' | 'dinner_time'
  | 'evening_free' | 'weekend_morning' | 'weekend_afternoon' | 'weekend_evening'
  | 'sleep_time' | 'unknown';

// 行動分析データ
export interface BehaviorAnalysis {
  userId: string;
  
  // 時間パターン
  avgWakeUpTime?: string;        // "07:30"
  avgBedTime?: string;           // "23:00"
  productiveHours?: string[];    // ["09:00-11:00", "14:00-16:00"]
  breakPattern?: string;         // "1時間おきに5分休憩"
  
  // 移動・場所パターン
  preferredTransport?: string;   // "徒歩", "電車", "車"
  frequentRoutes?: string[];     // よく使うルート
  
  // エネルギー・ストレスパターン
  energyPeaks?: string[];        // エネルギーが高い時間帯
  stressIndicators?: string[];   // ストレス要因
  
  // 成功パターン
  successfulHabits?: string[];   // 続いている良い習慣
  
  lastAnalyzed: Date;
}

// アドバイス履歴・学習データ
export interface AdviceHistory {
  userId: string;
  
  // 実行率とフィードバック
  implementationRate: number;   // 0-100%
  totalAdviceGiven: number;
  totalAdviceFollowed: number;
  
  // 好み分析
  preferredAdviceTypes?: string[];     // ["時間管理", "健康管理", "効率化"]
  dislikedAdviceTypes?: string[];      // ["運動推奨", "早起き提案"]
  preferredFrequency: 'high' | 'medium' | 'low';
  
  // 成功パターン
  successfulAdvicePatterns?: string[]; // 効果的だったアドバイスのパターン
  bestResponseTimes?: string[];        // アドバイスに良く反応する時間帯
  
  lastUpdated: Date;
}

// 環境設定
export interface PersonalizationSettings {
  // アドバイス設定
  adviceFrequency: 'high' | 'medium' | 'low';  // アドバイス頻度
  adviceTypes: string[];                       // 受け取りたいアドバイスタイプ
  
  // プライバシー設定
  shareLocation: boolean;
  shareSchedule: boolean;
  shareHealthInfo: boolean;
  
  // 言語・スタイル設定
  language: 'ja' | 'en';
  useEmoji: boolean;
  formalityLevel: 'casual' | 'polite' | 'formal';
  
  // 学習設定
  enableBehaviorLearning: boolean;
  enableAdviceTracking: boolean;
}

// 統合プロファイルデータ
export interface PersonalizationData {
  userProfile?: UserProfile;
  weeklySchedule?: WeeklySchedulePattern;
  behaviorAnalysis?: BehaviorAnalysis;
  adviceHistory?: AdviceHistory;
  settings: PersonalizationSettings;
}

// プロファイル設定用のUIステップ
export interface SetupStep {
  id: string;
  title: string;
  description: string;
  component: string;
  required: boolean;
  completed: boolean;
}

// フォーム用の一時データ
export interface UserProfileForm {
  lifestyle?: UserProfile['lifestyle'];
  ageGroup?: UserProfile['ageGroup'];
  interests: InterestCategory[];
  healthConsiderations: string;
  priorities: PriorityValue[];
  communicationStyle?: UserProfile['communicationStyle'];
  freeformFields: UserProfile['freeformFields'];
}

export interface WeeklyScheduleForm {
  [key: string]: string; // monday, tuesday, etc.
  description: string;
}