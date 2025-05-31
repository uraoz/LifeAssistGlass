// src/services/ContextService.ts - 統合コンテキスト管理サービス

import { LifeAssistContext } from '../types/lifeassist';
import { PersonalizationData, PersonalScheduleContext } from '../types/personalization';
import PersonalizationService from './PersonalizationService';
import LocationService from './LocationService';
import WeatherService from './WeatherService';
import GoogleCalendarService from './GoogleCalendarService';

// 拡張されたコンテキスト型
export interface EnhancedLifeAssistContext extends LifeAssistContext {
  // 個人化データ
  personalization: PersonalizationData;
  personalSchedule: PersonalScheduleContext;
  
  // 時間的コンテキスト
  timeContext: {
    currentTime: Date;
    dayOfWeek: string;
    dayOfWeekEn: string;
    isWeekend: boolean;
    isHoliday: boolean;
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    season: 'spring' | 'summer' | 'autumn' | 'winter';
    workingHours: boolean;
    timeZone: string;
  };
  
  // デバイス状態（将来実装）
  deviceContext?: {
    batteryLevel: number;
    isCharging: boolean;
    networkStatus: 'wifi' | 'cellular' | 'offline';
    networkStrength: number;
    availableStorage: number;
  };
}

// コンテキスト収集の設定
interface ContextCollectionOptions {
  includeLocation: boolean;
  includeWeather: boolean;
  includeCalendar: boolean;
  includePersonalization: boolean;
  timeout: number; // ミリ秒
  locationTimeout?: number; // 位置情報専用タイムアウト
}

class ContextService {
  private readonly DEFAULT_OPTIONS: ContextCollectionOptions = {
    includeLocation: true,
    includeWeather: true,
    includeCalendar: true,
    includePersonalization: true,
    timeout: 15000, // 15秒タイムアウト
    locationTimeout: 10000, // 位置情報は10秒タイムアウト（エミュレータ対応）
  };

  // 統合コンテキストの収集
  async collectEnhancedContext(
    options: Partial<ContextCollectionOptions> = {}
  ): Promise<EnhancedLifeAssistContext> {
    const config = { ...this.DEFAULT_OPTIONS, ...options };
    
    console.log('統合コンテキスト収集開始:', config);
    const startTime = Date.now();

    try {
      // 基本時間情報は常に取得
      const timeContext = this.generateTimeContext();
      
      // 並行でデータ収集（タイムアウト付き）
      const promises: Promise<any>[] = [];
      
      // 位置情報（エミュレータ対応でより長いタイムアウト）
      if (config.includeLocation) {
        promises.push(
          this.withTimeout(
            LocationService.getCurrentLocation(),
            config.locationTimeout || 10000,
            'location'
          ).catch(error => {
            console.warn('位置情報取得エラー（フォールバック使用）:', error);
            // エミュレータ用のダミー位置情報を返す
            return {
              latitude: 35.6762,
              longitude: 139.6503,
              address: '東京都渋谷区（エミュレータ模擬位置）',
              city: '渋谷区',
              region: '東京都',
              country: '日本',
            };
          })
        );
      }
      
      // 個人化データ
      let personalizationPromise: Promise<any> = Promise.resolve(null);
      if (config.includePersonalization) {
        personalizationPromise = this.withTimeout(
          this.getPersonalizationData(),
          config.timeout / 4,
          'personalization'
        );
      }
      
      // 基本データを並行取得
      const [locationResult, personalizationResult] = await Promise.allSettled([
        config.includeLocation ? promises[0] : Promise.resolve(null),
        personalizationPromise,
      ]);

      const location = this.extractResult(locationResult, 'location');
      const { personalization, personalSchedule } = this.extractResult(personalizationResult, 'personalization') || {};

      // 位置依存データ（天気・カレンダー）を順次取得
      let weather = null;
      let calendar = null;

      if (config.includeWeather && location) {
        try {
          weather = await this.withTimeout(
            WeatherService.getWeatherInfo(location),
            config.timeout / 4,
            'weather'
          );
        } catch (error) {
          console.warn('天気情報取得エラー:', error);
        }
      }

      if (config.includeCalendar) {
        try {
          const isAuthRequired = await GoogleCalendarService.isAuthenticationRequired();
          if (!isAuthRequired) {
            calendar = await this.withTimeout(
              GoogleCalendarService.getTodayCalendarInfo(),
              config.timeout / 4,
              'calendar'
            );
          }
        } catch (error) {
          console.warn('カレンダー情報取得エラー:', error);
        }
      }

      // 統合コンテキストの構築
      const enhancedContext: EnhancedLifeAssistContext = {
        // 基本LifeAssistContext
        currentTime: new Date().toLocaleString('ja-JP'),
        location,
        weather,
        calendar,

        // 拡張情報
        personalization: personalization || await this.getDefaultPersonalization(),
        personalSchedule: personalSchedule || await this.getDefaultPersonalSchedule(),
        timeContext,
      };

      const collectionTime = Date.now() - startTime;
      console.log(`統合コンテキスト収集完了: ${collectionTime}ms`, {
        hasLocation: !!location,
        hasWeather: !!weather,
        hasCalendar: !!calendar,
        isPersonalized: personalSchedule?.isPersonalized || false,
      });

      return enhancedContext;

    } catch (error) {
      console.error('統合コンテキスト収集エラー:', error);
      
      // エラー時のフォールバック
      return {
        currentTime: new Date().toLocaleString('ja-JP'),
        personalization: await this.getDefaultPersonalization(),
        personalSchedule: await this.getDefaultPersonalSchedule(),
        timeContext: this.generateTimeContext(),
      };
    }
  }

  // 基本コンテキストの収集（既存機能の互換性維持）
  async collectBasicContext(): Promise<LifeAssistContext> {
    const enhanced = await this.collectEnhancedContext({
      includePersonalization: false,
      timeout: 10000,
    });

    return {
      currentTime: enhanced.currentTime,
      location: enhanced.location,
      weather: enhanced.weather,
      calendar: enhanced.calendar,
    };
  }

  // 個人化データの取得
  private async getPersonalizationData(): Promise<{
    personalization: PersonalizationData;
    personalSchedule: PersonalScheduleContext;
  }> {
    await PersonalizationService.initialize();
    
    const [personalization, personalSchedule] = await Promise.all([
      PersonalizationService.getPersonalizationData(),
      PersonalizationService.getPersonalScheduleContext(),
    ]);

    return { personalization, personalSchedule };
  }

  // デフォルト個人化データ
  private async getDefaultPersonalization(): Promise<PersonalizationData> {
    return {
      settings: {
        adviceFrequency: 'medium',
        adviceTypes: ['時間管理', '健康管理'],
        shareLocation: true,
        shareSchedule: true,
        shareHealthInfo: false,
        language: 'ja',
        useEmoji: true,
        formalityLevel: 'polite',
        enableBehaviorLearning: true,
        enableAdviceTracking: true,
      },
    };
  }

  // デフォルト個人スケジュール
  private async getDefaultPersonalSchedule(): Promise<PersonalScheduleContext> {
    return {
      isPersonalized: false,
      schedulePhase: this.detectGeneralSchedulePhase(),
      relevantDescription: this.getGeneralTimeDescription(),
      adviceHints: ['一般的な時間管理アドバイス'],
    };
  }

  // 時間的コンテキストの生成
  private generateTimeContext() {
    const now = new Date();
    const dayOfWeek = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'][now.getDay()];
    const dayOfWeekEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()];
    const isWeekend = [0, 6].includes(now.getDay());
    const isHoliday = this.checkHoliday(now);
    const hour = now.getHours();
    const month = now.getMonth() + 1;

    // 時間帯の判定
    let timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    if (hour < 6) timeOfDay = 'night';
    else if (hour < 12) timeOfDay = 'morning';
    else if (hour < 18) timeOfDay = 'afternoon';
    else timeOfDay = 'evening';

    // 季節の判定
    let season: 'spring' | 'summer' | 'autumn' | 'winter';
    if (month >= 3 && month <= 5) season = 'spring';
    else if (month >= 6 && month <= 8) season = 'summer';
    else if (month >= 9 && month <= 11) season = 'autumn';
    else season = 'winter';

    // 勤務時間の判定（一般的な9-17時）
    const workingHours = !isWeekend && !isHoliday && hour >= 9 && hour < 17;

    return {
      currentTime: now,
      dayOfWeek,
      dayOfWeekEn,
      isWeekend,
      isHoliday,
      timeOfDay,
      season,
      workingHours,
      timeZone: 'Asia/Tokyo',
    };
  }

  // 一般的なスケジュール段階の検出
  private detectGeneralSchedulePhase() {
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

  // 一般的な時間説明
  private getGeneralTimeDescription(): string {
    const hour = new Date().getHours();
    if (hour < 6) return '深夜・早朝時間帯';
    if (hour < 12) return '朝・午前時間帯';
    if (hour < 17) return '昼・午後時間帯';
    if (hour < 21) return '夕方・夜時間帯';
    return '夜・就寝前時間帯';
  }

  // 祝日チェック（簡易版）
  private checkHoliday(date: Date): boolean {
    // 実装簡略化：日本の固定祝日の一部のみ
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    const holidays = [
      [1, 1],   // 元日
      [2, 11],  // 建国記念の日
      [4, 29],  // 昭和の日
      [5, 3],   // 憲法記念日
      [5, 4],   // みどりの日
      [5, 5],   // こどもの日
      [8, 11],  // 山の日
      [11, 3],  // 文化の日
      [11, 23], // 勤労感謝の日
      [12, 23], // 天皇誕生日
    ];

    return holidays.some(([hMonth, hDay]) => month === hMonth && day === hDay);
  }

  // タイムアウト付きPromise実行
  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    label: string
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timeout after ${timeoutMs}ms`)), timeoutMs)
    );

    return Promise.race([promise, timeoutPromise]);
  }

  // Promise結果の抽出
  private extractResult(result: PromiseSettledResult<any>, label: string): any {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      console.warn(`${label} データ取得失敗:`, result.reason);
      return null;
    }
  }

  // コンテキスト品質評価
  assessContextQuality(context: EnhancedLifeAssistContext): {
    score: number; // 0-100
    completeness: number; // 0-100
    personalizationLevel: 'none' | 'basic' | 'medium' | 'high';
    recommendations: string[];
  } {
    let score = 0;
    let completeness = 0;
    const recommendations: string[] = [];

    // 基本データの評価
    if (context.location) {
      score += 20;
      completeness += 25;
    } else {
      recommendations.push('位置情報の有効化でより具体的なアドバイス');
    }

    if (context.weather) {
      score += 15;
      completeness += 25;
    } else {
      recommendations.push('天気情報でより適切な服装・行動提案');
    }

    if (context.calendar) {
      score += 15;
      completeness += 25;
    } else {
      recommendations.push('カレンダー連携で時間管理アドバイス');
    }

    // 個人化レベルの評価
    let personalizationLevel: 'none' | 'basic' | 'medium' | 'high' = 'none';
    
    if (context.personalSchedule.isPersonalized) {
      score += 30;
      completeness += 25;
      
      if (context.personalization.userProfile && context.personalization.weeklySchedule) {
        personalizationLevel = 'high';
        score += 20;
      } else if (context.personalization.userProfile) {
        personalizationLevel = 'medium';
        score += 10;
      } else {
        personalizationLevel = 'basic';
      }
    } else {
      recommendations.push('個人プロファイル設定で高精度なアドバイス');
    }

    return {
      score: Math.min(score, 100),
      completeness,
      personalizationLevel,
      recommendations,
    };
  }

  // デバッグ用：コンテキスト情報の要約
  summarizeContext(context: EnhancedLifeAssistContext): string {
    const quality = this.assessContextQuality(context);
    
    return `
統合コンテキスト要約:
- 品質スコア: ${quality.score}/100
- 完成度: ${quality.completeness}%
- 個人化レベル: ${quality.personalizationLevel}
- 時刻: ${context.timeContext.dayOfWeek} ${context.timeContext.timeOfDay}
- 位置: ${context.location ? '取得済み' : '未取得'}
- 天気: ${context.weather ? '取得済み' : '未取得'}
- スケジュール: ${context.calendar ? '取得済み' : '未取得'}
- 個人化: ${context.personalSchedule.isPersonalized ? '有効' : '無効'}
`.trim();
  }
}

export default new ContextService();