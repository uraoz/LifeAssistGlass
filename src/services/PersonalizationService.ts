// src/services/PersonalizationService.ts - 個人化設定管理サービス

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  UserProfile,
  WeeklySchedulePattern,
  BehaviorAnalysis,
  AdviceHistory,
  PersonalizationSettings,
  PersonalizationData,
  PersonalScheduleContext,
  SchedulePhase,
  UserProfileForm,
  WeeklyScheduleForm,
  InterestCategory,
  PriorityValue,
} from '../types/personalization';

class PersonalizationService {
  private readonly STORAGE_KEYS = {
    userProfile: 'user_profile',
    weeklySchedule: 'weekly_schedule_pattern',
    behaviorAnalysis: 'behavior_analysis',
    adviceHistory: 'advice_history',
    settings: 'personalization_settings',
  };

  private personalizationData: PersonalizationData | null = null;
  private isInitialized = false;

  // サービス初期化
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('PersonalizationService 初期化開始...');
      
      // 全データを並行読み込み
      const [userProfile, weeklySchedule, behaviorAnalysis, adviceHistory, settings] = await Promise.all([
        this.loadUserProfile(),
        this.loadWeeklySchedule(),
        this.loadBehaviorAnalysis(),
        this.loadAdviceHistory(),
        this.loadSettings(),
      ]);

      this.personalizationData = {
        userProfile,
        weeklySchedule,
        behaviorAnalysis,
        adviceHistory,
        settings,
      };

      this.isInitialized = true;
      console.log('PersonalizationService 初期化完了:', this.personalizationData);

    } catch (error) {
      console.error('PersonalizationService 初期化エラー:', error);
      // エラー時はデフォルト設定で初期化
      this.personalizationData = {
        settings: this.getDefaultSettings(),
      };
      this.isInitialized = true;
    }
  }

  // ===== ユーザープロファイル管理 =====

  async saveUserProfile(profileForm: UserProfileForm): Promise<UserProfile> {
    const profile: UserProfile = {
      id: this.generateUserId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...profileForm,
      freeformFields: profileForm.freeformFields || {
        personalDescription: '',
        dailyRoutineNotes: '',
        personalGoals: '',
        uniqueCircumstances: '',
        preferredAdviceStyle: '',
        workLifeDetails: '',
        hobbiesDetails: '',
        challengesAndStruggles: '',
      },
      setupProgress: {
        basicInfo: !!(profileForm.lifestyle && profileForm.ageGroup),
        lifestyle: !!profileForm.lifestyle,
        interests: profileForm.interests.length > 0,
        weeklySchedule: false, // 別途設定
        preferences: !!(profileForm.communicationStyle),
        freeformDetails: !!(profileForm.freeformFields?.personalDescription || 
                          profileForm.freeformFields?.dailyRoutineNotes || 
                          profileForm.freeformFields?.personalGoals ||
                          profileForm.freeformFields?.challengesAndStruggles ||
                          profileForm.freeformFields?.preferredAdviceStyle),
      },
    };

    await AsyncStorage.setItem(this.STORAGE_KEYS.userProfile, JSON.stringify(profile));
    
    if (this.personalizationData) {
      this.personalizationData.userProfile = profile;
    }

    console.log('ユーザープロファイル保存完了:', profile);
    return profile;
  }

  async loadUserProfile(): Promise<UserProfile | null> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEYS.userProfile);
      if (!stored) return null;

      const profile: UserProfile = JSON.parse(stored);
      // 日付文字列をDateオブジェクトに変換
      profile.createdAt = new Date(profile.createdAt);
      profile.updatedAt = new Date(profile.updatedAt);
      
      return profile;
    } catch (error) {
      console.error('ユーザープロファイル読み込みエラー:', error);
      return null;
    }
  }

  async updateUserProfile(updates: Partial<UserProfileForm>): Promise<UserProfile | null> {
    const currentProfile = await this.loadUserProfile();
    if (!currentProfile) return null;

    const updatedProfile: UserProfile = {
      ...currentProfile,
      ...updates,
      updatedAt: new Date(),
    };

    await AsyncStorage.setItem(this.STORAGE_KEYS.userProfile, JSON.stringify(updatedProfile));
    
    if (this.personalizationData) {
      this.personalizationData.userProfile = updatedProfile;
    }

    return updatedProfile;
  }

  // ===== 週間スケジュールパターン管理 =====

  async saveWeeklySchedule(scheduleForm: WeeklyScheduleForm): Promise<WeeklySchedulePattern> {
    const userId = await this.getUserId();
    
    const schedule: WeeklySchedulePattern = {
      id: this.generateId(),
      userId,
      monday: scheduleForm.monday,
      tuesday: scheduleForm.tuesday,
      wednesday: scheduleForm.wednesday,
      thursday: scheduleForm.thursday,
      friday: scheduleForm.friday,
      saturday: scheduleForm.saturday,
      sunday: scheduleForm.sunday,
      description: scheduleForm.description,
      isActive: true,
      createdAt: new Date(),
    };

    await AsyncStorage.setItem(this.STORAGE_KEYS.weeklySchedule, JSON.stringify(schedule));
    
    if (this.personalizationData) {
      this.personalizationData.weeklySchedule = schedule;
    }

    // ユーザープロファイルの設定進捗を更新
    await this.updateSetupProgress('weeklySchedule', true);

    console.log('週間スケジュール保存完了:', schedule);
    return schedule;
  }

  async loadWeeklySchedule(): Promise<WeeklySchedulePattern | null> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEYS.weeklySchedule);
      if (!stored) return null;

      const schedule: WeeklySchedulePattern = JSON.parse(stored);
      schedule.createdAt = new Date(schedule.createdAt);
      
      return schedule;
    } catch (error) {
      console.error('週間スケジュール読み込みエラー:', error);
      return null;
    }
  }

  // ===== 設定管理 =====

  private getDefaultSettings(): PersonalizationSettings {
    return {
      adviceFrequency: 'medium',
      adviceTypes: ['時間管理', '健康管理', '効率化'],
      shareLocation: true,
      shareSchedule: true,
      shareHealthInfo: false,
      language: 'ja',
      useEmoji: true,
      formalityLevel: 'polite',
      enableBehaviorLearning: true,
      enableAdviceTracking: true,
    };
  }

  async saveSettings(settings: Partial<PersonalizationSettings>): Promise<PersonalizationSettings> {
    const currentSettings = await this.loadSettings();
    const updatedSettings = { ...currentSettings, ...settings };

    await AsyncStorage.setItem(this.STORAGE_KEYS.settings, JSON.stringify(updatedSettings));
    
    if (this.personalizationData) {
      this.personalizationData.settings = updatedSettings;
    }

    return updatedSettings;
  }

  async loadSettings(): Promise<PersonalizationSettings> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEYS.settings);
      return stored ? JSON.parse(stored) : this.getDefaultSettings();
    } catch (error) {
      console.error('設定読み込みエラー:', error);
      return this.getDefaultSettings();
    }
  }

  // ===== 行動分析・学習機能 =====

  async loadBehaviorAnalysis(): Promise<BehaviorAnalysis | null> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEYS.behaviorAnalysis);
      if (!stored) return null;

      const analysis: BehaviorAnalysis = JSON.parse(stored);
      analysis.lastAnalyzed = new Date(analysis.lastAnalyzed);
      
      return analysis;
    } catch (error) {
      console.error('行動分析データ読み込みエラー:', error);
      return null;
    }
  }

  async loadAdviceHistory(): Promise<AdviceHistory | null> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEYS.adviceHistory);
      if (!stored) return null;

      const history: AdviceHistory = JSON.parse(stored);
      history.lastUpdated = new Date(history.lastUpdated);
      
      return history;
    } catch (error) {
      console.error('アドバイス履歴読み込みエラー:', error);
      return null;
    }
  }

  // ===== 個人化コンテキスト生成 =====

  async getPersonalScheduleContext(): Promise<PersonalScheduleContext> {
    await this.initialize();

    const { userProfile, weeklySchedule, behaviorAnalysis } = this.personalizationData || {};

    if (!userProfile || !weeklySchedule) {
      return {
        isPersonalized: false,
        schedulePhase: this.detectSchedulePhase(),
        relevantDescription: this.getGeneralTimeDescription(),
        adviceHints: ['一般的な時間管理のアドバイス'],
      };
    }

    const now = new Date();
    const dayOfWeek = this.getDayOfWeekKey(now);
    const currentPattern = weeklySchedule[dayOfWeek];
    const schedulePhase = this.detectPersonalizedSchedulePhase(currentPattern, now);

    return {
      isPersonalized: true,
      currentPattern,
      schedulePhase,
      relevantDescription: `${userProfile.lifestyle}の${dayOfWeek}パターン`,
      adviceHints: this.generateAdviceHints(userProfile, schedulePhase, currentPattern),
    };
  }

  // スケジュール段階の検出（個人化版）
  private detectPersonalizedSchedulePhase(pattern?: string, now = new Date()): SchedulePhase {
    if (!pattern) return this.detectSchedulePhase();

    const hour = now.getHours();
    const isWeekend = [0, 6].includes(now.getDay());

    if (isWeekend) {
      if (hour < 10) return 'weekend_morning';
      if (hour < 17) return 'weekend_afternoon';
      return 'weekend_evening';
    }

    // パターン文字列から時間を抽出（例: "9:00-17:00 オフィス勤務"）
    const timeMatch = pattern.match(/(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      const startHour = parseInt(timeMatch[1]);
      const endHour = parseInt(timeMatch[3]);

      if (hour < startHour - 1) return 'before_work';
      if (hour < startHour) return 'commute_to_work';
      if (hour < 12) return 'work_time';
      if (hour < 14) return 'lunch_break';
      if (hour < endHour) return 'afternoon_work';
      if (hour < endHour + 1) return 'commute_home';
      if (hour < 19) return 'after_work';
      if (hour < 21) return 'dinner_time';
      return 'evening_free';
    }

    return this.detectSchedulePhase();
  }

  // 一般的なスケジュール段階の検出
  private detectSchedulePhase(): SchedulePhase {
    const now = new Date();
    const hour = now.getHours();
    const isWeekend = [0, 6].includes(now.getDay());

    if (isWeekend) {
      if (hour < 10) return 'weekend_morning';
      if (hour < 17) return 'weekend_afternoon';
      return 'weekend_evening';
    }

    // 平日の一般的なパターン
    if (hour < 7) return 'sleep_time';
    if (hour < 9) return 'before_work';
    if (hour < 12) return 'work_time';
    if (hour < 14) return 'lunch_break';
    if (hour < 17) return 'afternoon_work';
    if (hour < 19) return 'after_work';
    if (hour < 21) return 'dinner_time';
    if (hour < 23) return 'evening_free';
    return 'sleep_time';
  }

  // アドバイスヒント生成
  private generateAdviceHints(
    profile: UserProfile, 
    phase: SchedulePhase, 
    pattern?: string
  ): string[] {
    const hints: string[] = [];

    // ライフスタイルに基づくヒント
    switch (profile.lifestyle) {
      case 'student':
        hints.push('学習効率を重視したアドバイス');
        break;
      case 'employee':
        hints.push('仕事効率と休息のバランス重視');
        break;
      case 'freelancer':
        hints.push('自己管理と時間配分重視');
        break;
    }

    // スケジュール段階に基づくヒント
    switch (phase) {
      case 'before_work':
        hints.push('出勤準備とモチベーション向上');
        break;
      case 'work_time':
        hints.push('集中力維持と効率的な作業');
        break;
      case 'lunch_break':
        hints.push('適切な休息と午後の準備');
        break;
      case 'after_work':
        hints.push('リラックスと明日の準備');
        break;
    }

    // 優先価値観に基づくヒント
    if (profile.priorities.includes('health_first')) {
      hints.push('健康維持を最優先にした提案');
    }
    if (profile.priorities.includes('efficiency_focus')) {
      hints.push('効率性を重視した実用的な提案');
    }

    return hints;
  }

  // ===== ユーティリティメソッド =====

  private getDayOfWeekKey(date: Date): keyof WeeklySchedulePattern {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[date.getDay()] as keyof WeeklySchedulePattern;
  }

  private getGeneralTimeDescription(): string {
    const hour = new Date().getHours();
    if (hour < 6) return '深夜・早朝時間帯';
    if (hour < 12) return '朝・午前時間帯';
    if (hour < 17) return '昼・午後時間帯';
    if (hour < 21) return '夕方・夜時間帯';
    return '夜・就寝前時間帯';
  }

  private async updateSetupProgress(step: keyof UserProfile['setupProgress'], completed: boolean): Promise<void> {
    const profile = await this.loadUserProfile();
    if (!profile) return;

    profile.setupProgress[step] = completed;
    profile.updatedAt = new Date();

    await AsyncStorage.setItem(this.STORAGE_KEYS.userProfile, JSON.stringify(profile));
    
    if (this.personalizationData) {
      this.personalizationData.userProfile = profile;
    }
  }

  private generateUserId(): string {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  private generateId(): string {
    return Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9);
  }

  private async getUserId(): Promise<string> {
    const profile = await this.loadUserProfile();
    return profile?.id || this.generateUserId();
  }

  // ===== 公開API =====

  // 個人化データの取得
  async getPersonalizationData(): Promise<PersonalizationData> {
    await this.initialize();
    return this.personalizationData || { settings: this.getDefaultSettings() };
  }

  // 設定完了状況の確認
  async getSetupStatus(): Promise<{ isCompleted: boolean; progress: number; missingSteps: string[] }> {
    const profile = await this.loadUserProfile();
    const schedule = await this.loadWeeklySchedule();

    if (!profile) {
      return {
        isCompleted: false,
        progress: 0,
        missingSteps: ['基本プロファイル', '週間スケジュール', '設定完了'],
      };
    }

    const progress = profile.setupProgress;
    const totalSteps = Object.keys(progress).length;
    const completedSteps = Object.values(progress).filter(Boolean).length;
    const progressPercentage = Math.round((completedSteps / totalSteps) * 100);

    const missingSteps: string[] = [];
    if (!progress.basicInfo) missingSteps.push('基本情報');
    if (!progress.lifestyle) missingSteps.push('ライフスタイル');
    if (!progress.interests) missingSteps.push('興味・関心');
    if (!progress.weeklySchedule || !schedule) missingSteps.push('週間スケジュール');
    if (!progress.preferences) missingSteps.push('設定・環境設定');
    if (!progress.freeformDetails) missingSteps.push('詳細・自由記述');

    return {
      isCompleted: missingSteps.length === 0,
      progress: progressPercentage,
      missingSteps,
    };
  }

  // データクリア（デバッグ用）
  async clearAllData(): Promise<void> {
    await Promise.all([
      AsyncStorage.removeItem(this.STORAGE_KEYS.userProfile),
      AsyncStorage.removeItem(this.STORAGE_KEYS.weeklySchedule),
      AsyncStorage.removeItem(this.STORAGE_KEYS.behaviorAnalysis),
      AsyncStorage.removeItem(this.STORAGE_KEYS.adviceHistory),
      AsyncStorage.removeItem(this.STORAGE_KEYS.settings),
    ]);

    this.personalizationData = null;
    this.isInitialized = false;

    console.log('個人化データをすべてクリアしました');
  }
}

export default new PersonalizationService();