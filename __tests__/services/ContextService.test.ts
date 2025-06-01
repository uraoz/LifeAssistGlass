// __tests__/services/ContextService.test.ts

import ContextService from '../../src/services/ContextService';
import PersonalizationService from '../../src/services/PersonalizationService';
import LocationService from '../../src/services/LocationService';
import WeatherService from '../../src/services/WeatherService';
import GoogleCalendarService from '../../src/services/GoogleCalendarService';
import {
  createMockLocationInfo,
  createMockWeatherInfo,
  createMockCalendarInfo,
  createMockUserProfile,
  createMockWeeklySchedule,
  setupMockStorage,
  TimeHelpers,
  expectTimeout,
  captureConsoleErrors,
} from '../utils/testUtils';

// サービスのモック化
jest.mock('../../src/services/PersonalizationService');
jest.mock('../../src/services/LocationService');
jest.mock('../../src/services/WeatherService');
jest.mock('../../src/services/GoogleCalendarService');

const mockPersonalizationService = PersonalizationService as jest.Mocked<typeof PersonalizationService>;
const mockLocationService = LocationService as jest.Mocked<typeof LocationService>;
const mockWeatherService = WeatherService as jest.Mocked<typeof WeatherService>;
const mockGoogleCalendarService = GoogleCalendarService as jest.Mocked<typeof GoogleCalendarService>;

describe('ContextService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    TimeHelpers.reset();
    
    // デフォルトのモック設定
    mockLocationService.getCurrentLocation.mockResolvedValue(createMockLocationInfo());
    mockWeatherService.getWeatherInfo.mockResolvedValue(createMockWeatherInfo());
    mockPersonalizationService.initialize.mockResolvedValue();
    mockPersonalizationService.getPersonalizationData.mockResolvedValue({
      userProfile: createMockUserProfile(),
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
    });
    mockPersonalizationService.getPersonalScheduleContext.mockResolvedValue({
      isPersonalized: true,
      currentPattern: '9:00-17:00 オフィス勤務',
      schedulePhase: 'work_time',
      relevantDescription: 'employee の monday パターン',
      adviceHints: ['仕事効率と休息のバランス重視'],
    });
    mockGoogleCalendarService.isAuthenticationRequired.mockResolvedValue(false);
    mockGoogleCalendarService.getTodayCalendarInfo.mockResolvedValue(createMockCalendarInfo());
  });

  describe('統合コンテキスト収集', () => {
    it('完全なコンテキストが正常に収集される', async () => {
      const context = await ContextService.collectEnhancedContext();
      
      expect(context).toMatchObject({
        currentTime: expect.any(String),
        location: expect.objectContaining({
          latitude: 35.6762,
          longitude: 139.6503,
          address: '東京都渋谷区',
        }),
        weather: expect.objectContaining({
          condition: 'sunny',
          temperature: 22,
        }),
        calendar: expect.objectContaining({
          hasEvents: true,
        }),
        personalization: expect.objectContaining({
          lifestyle: 'employee',
        }),
        personalSchedule: expect.objectContaining({
          isPersonalized: true,
          schedulePhase: 'work_time',
        }),
        timeContext: expect.objectContaining({
          currentTime: expect.any(Date),
          dayOfWeek: expect.any(String),
          timeOfDay: expect.any(String),
          season: expect.any(String),
        }),
      });
    });

    it('選択的なコンテキスト収集が動作する', async () => {
      const options = {
        includeLocation: false,
        includeWeather: false,
        includeCalendar: true,
        includePersonalization: true,
      };
      
      const context = await ContextService.collectEnhancedContext(options);
      
      expect(context.location).toBeNull();
      expect(context.weather).toBeNull();
      expect(context.calendar).toBeDefined();
      expect(context.personalization).toBeDefined();
    });

    it('タイムアウト設定が正常に動作する', async () => {
      // LocationServiceを遅延させる
      mockLocationService.getCurrentLocation.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(createMockLocationInfo()), 2000))
      );
      
      const options = { timeout: 1000, locationTimeout: 500 };
      const context = await ContextService.collectEnhancedContext(options);
      
      // タイムアウトにより位置情報は取得されないが、エミュレータ用フォールバックが使用される
      expect(context.location).toMatchObject({
        latitude: 35.6762,
        longitude: 139.6503,
        address: '東京都渋谷区（エミュレータ模擬位置）',
      });
    });

    it('位置情報エラー時のフォールバック', async () => {
      mockLocationService.getCurrentLocation.mockRejectedValue(new Error('位置情報取得エラー'));
      
      const context = await ContextService.collectEnhancedContext();
      
      // エミュレータ用フォールバック位置情報が使用される
      expect(context.location).toMatchObject({
        latitude: 35.6762,
        longitude: 139.6503,
        address: '東京都渋谷区（エミュレータ模擬位置）',
      });
    });

    it('天気情報エラー時の適切な処理', async () => {
      mockWeatherService.getWeatherInfo.mockRejectedValue(new Error('天気情報取得エラー'));
      const consoleCapture = captureConsoleErrors();
      
      const context = await ContextService.collectEnhancedContext();
      
      expect(context.weather).toBeNull();
      consoleCapture.restore();
    });

    it('カレンダー認証が必要な場合はスキップされる', async () => {
      mockGoogleCalendarService.isAuthenticationRequired.mockResolvedValue(true);
      
      const context = await ContextService.collectEnhancedContext();
      
      expect(context.calendar).toBeNull();
      expect(mockGoogleCalendarService.getTodayCalendarInfo).not.toHaveBeenCalled();
    });

    it('カレンダーエラー時の適切な処理', async () => {
      mockGoogleCalendarService.getTodayCalendarInfo.mockRejectedValue(new Error('カレンダーエラー'));
      const consoleCapture = captureConsoleErrors();
      
      const context = await ContextService.collectEnhancedContext();
      
      expect(context.calendar).toBeNull();
      consoleCapture.restore();
    });

    it('個人化未設定時のデフォルト値使用', async () => {
      mockPersonalizationService.getPersonalScheduleContext.mockResolvedValue({
        isPersonalized: false,
        schedulePhase: 'work_time',
        relevantDescription: '一般的な時間帯',
        adviceHints: ['一般的な時間管理アドバイス'],
      });
      
      const context = await ContextService.collectEnhancedContext();
      
      expect(context.personalSchedule.isPersonalized).toBe(false);
      expect(context.personalization).toMatchObject({
        settings: expect.objectContaining({
          adviceFrequency: 'medium',
        }),
      });
    });
  });

  describe('基本コンテキスト収集', () => {
    it('基本コンテキストが正常に収集される', async () => {
      const context = await ContextService.collectBasicContext();
      
      expect(context).toMatchObject({
        currentTime: expect.any(String),
        location: expect.any(Object),
        weather: expect.any(Object),
        calendar: expect.any(Object),
      });
      expect(context).not.toHaveProperty('personalization');
      expect(context).not.toHaveProperty('timeContext');
    });

    it('基本コンテキストでは個人化処理がスキップされる', async () => {
      await ContextService.collectBasicContext();
      
      expect(mockPersonalizationService.getPersonalScheduleContext).not.toHaveBeenCalled();
    });
  });

  describe('時間的コンテキスト生成', () => {
    it('時間帯の判定が正確', async () => {
      const testCases = [
        { hour: 3, expected: 'night' },
        { hour: 8, expected: 'morning' },
        { hour: 14, expected: 'afternoon' },
        { hour: 19, expected: 'evening' },
        { hour: 23, expected: 'evening' },
      ];
      
      for (const testCase of testCases) {
        TimeHelpers.setTime(testCase.hour);
        
        const context = await ContextService.collectEnhancedContext();
        
        expect(context.timeContext.timeOfDay).toBe(testCase.expected);
      }
    });

    it('曜日の判定が正確', async () => {
      TimeHelpers.setDayOfWeek(1); // 月曜日
      
      const context = await ContextService.collectEnhancedContext();
      
      expect(context.timeContext.dayOfWeek).toBe('月曜日');
      expect(context.timeContext.dayOfWeekEn).toBe('Monday');
      expect(context.timeContext.isWeekend).toBe(false);
    });

    it('週末の判定が正確', async () => {
      TimeHelpers.setDayOfWeek(0); // 日曜日
      
      const context = await ContextService.collectEnhancedContext();
      
      expect(context.timeContext.isWeekend).toBe(true);
    });

    it('季節の判定が正確', async () => {
      // 6月（夏）の設定は既にMOCK_DATEで設定済み
      const context = await ContextService.collectEnhancedContext();
      
      expect(context.timeContext.season).toBe('summer');
    });

    it('勤務時間の判定が正確', async () => {
      TimeHelpers.setDayOfWeek(1); // 月曜日
      TimeHelpers.setTime(10); // 10:00
      
      const context = await ContextService.collectEnhancedContext();
      
      expect(context.timeContext.workingHours).toBe(true);
      
      TimeHelpers.setTime(19); // 19:00
      const contextEvening = await ContextService.collectEnhancedContext();
      
      expect(contextEvening.timeContext.workingHours).toBe(false);
    });

    it('祝日の判定（簡易版）', async () => {
      // 元日の設定
      jest.setSystemTime(new Date('2024-01-01T10:00:00.000Z'));
      
      const context = await ContextService.collectEnhancedContext();
      
      expect(context.timeContext.isHoliday).toBe(true);
    });
  });

  describe('コンテキスト品質評価', () => {
    it('完全なコンテキストの高品質評価', async () => {
      const context = await ContextService.collectEnhancedContext();
      const quality = ContextService.assessContextQuality(context);
      
      expect(quality.score).toBeGreaterThan(80);
      expect(quality.completeness).toBeGreaterThan(80);
      expect(quality.personalizationLevel).toBe('high');
      expect(quality.recommendations).toHaveLength(0);
    });

    it('部分的なコンテキストの品質評価', async () => {
      const partialContext = await ContextService.collectEnhancedContext({
        includeLocation: false,
        includeWeather: false,
      });
      
      const quality = ContextService.assessContextQuality(partialContext);
      
      expect(quality.score).toBeLessThan(80);
      expect(quality.recommendations).toContain('位置情報の有効化でより具体的なアドバイス');
      expect(quality.recommendations).toContain('天気情報でより適切な服装・行動提案');
    });

    it('個人化未設定時の品質評価', async () => {
      mockPersonalizationService.getPersonalScheduleContext.mockResolvedValue({
        isPersonalized: false,
        schedulePhase: 'work_time',
        relevantDescription: '一般的な時間帯',
        adviceHints: ['一般的なアドバイス'],
      });
      
      const context = await ContextService.collectEnhancedContext();
      const quality = ContextService.assessContextQuality(context);
      
      expect(quality.personalizationLevel).toBe('none');
      expect(quality.recommendations).toContain('個人プロファイル設定で高精度なアドバイス');
    });
  });

  describe('コンテキスト要約', () => {
    it('コンテキスト要約が正確に生成される', async () => {
      const context = await ContextService.collectEnhancedContext();
      const summary = ContextService.summarizeContext(context);
      
      expect(summary).toContain('統合コンテキスト要約');
      expect(summary).toContain('品質スコア:');
      expect(summary).toContain('位置: 取得済み');
      expect(summary).toContain('天気: 取得済み');
      expect(summary).toContain('個人化: 有効');
    });

    it('不完全なコンテキストの要約', async () => {
      const context = await ContextService.collectEnhancedContext({
        includeLocation: false,
        includeCalendar: false,
      });
      const summary = ContextService.summarizeContext(context);
      
      expect(summary).toContain('位置: 未取得');
      expect(summary).toContain('スケジュール: 未取得');
    });
  });

  describe('エラーハンドリング', () => {
    it('全サービスエラー時のフォールバック', async () => {
      mockLocationService.getCurrentLocation.mockRejectedValue(new Error('Location Error'));
      mockWeatherService.getWeatherInfo.mockRejectedValue(new Error('Weather Error'));
      mockGoogleCalendarService.getTodayCalendarInfo.mockRejectedValue(new Error('Calendar Error'));
      mockPersonalizationService.initialize.mockRejectedValue(new Error('Personalization Error'));
      
      const context = await ContextService.collectEnhancedContext();
      
      expect(context).toBeDefined();
      expect(context.currentTime).toBeDefined();
      expect(context.timeContext).toBeDefined();
      expect(context.personalization).toBeDefined();
      expect(context.personalSchedule).toBeDefined();
    });

    it('深刻なエラー時の最小限フォールバック', async () => {
      // PersonalizationServiceの初期化もエラーにする
      mockPersonalizationService.initialize.mockRejectedValue(new Error('Critical Error'));
      
      const context = await ContextService.collectEnhancedContext();
      
      expect(context.currentTime).toBeDefined();
      expect(context.timeContext).toBeDefined();
      expect(context.personalization.settings).toBeDefined();
      expect(context.personalSchedule.isPersonalized).toBe(false);
    });
  });

  describe('パフォーマンス', () => {
    it('並行処理による高速化', async () => {
      // サービスに遅延を追加
      mockLocationService.getCurrentLocation.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(createMockLocationInfo()), 100))
      );
      mockWeatherService.getWeatherInfo.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(createMockWeatherInfo()), 100))
      );
      
      const start = Date.now();
      await ContextService.collectEnhancedContext();
      const duration = Date.now() - start;
      
      // 並行実行により、200ms（100+100）より短時間で完了することを確認
      expect(duration).toBeLessThan(200);
    });

    it('タイムアウト機能のパフォーマンス保護', async () => {
      // 極端に遅いサービス
      mockLocationService.getCurrentLocation.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(createMockLocationInfo()), 5000))
      );
      
      const start = Date.now();
      await ContextService.collectEnhancedContext({ locationTimeout: 100 });
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(1000); // タイムアウトにより短時間で完了
    });

    it('大量データ処理のパフォーマンス', async () => {
      // 大量の個人化データをモック
      const largeProfile = createMockUserProfile({
        freeformFields: {
          personalDescription: 'A'.repeat(5000),
          dailyRoutineNotes: 'B'.repeat(5000),
        },
      });
      
      mockPersonalizationService.getPersonalizationData.mockResolvedValue({
        userProfile: largeProfile,
        settings: {
          adviceFrequency: 'medium',
          adviceTypes: ['時間管理'],
          shareLocation: true,
          shareSchedule: true,
          shareHealthInfo: false,
          language: 'ja',
          useEmoji: true,
          formalityLevel: 'polite',
          enableBehaviorLearning: true,
          enableAdviceTracking: true,
        },
      });
      
      const start = Date.now();
      await ContextService.collectEnhancedContext();
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(2000); // 大量データでも2秒以内
    });
  });
});
