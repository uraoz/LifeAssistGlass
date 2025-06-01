// __tests__/utils/testUtils.ts - テスト用ユーティリティ関数

import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  UserProfile, 
  WeeklySchedulePattern, 
  PersonalizationSettings,
  PersonalizationData,
  BehaviorAnalysis,
  AdviceHistory,
} from '../../src/types/personalization';
import { LocationInfo } from '../../src/types/location';
import { WeatherInfo } from '../../src/types/weather';
import { CalendarInfo } from '../../src/types/calendar';

// テスト用のモックデータ生成

/**
 * モックユーザープロファイルの生成
 */
export const createMockUserProfile = (overrides: Partial<UserProfile> = {}): UserProfile => ({
  id: 'test_user_123',
  createdAt: new Date('2024-05-01T00:00:00.000Z'),
  updatedAt: new Date('2024-06-01T00:00:00.000Z'),
  lifestyle: 'employee',
  ageGroup: '30s',
  interests: ['technology', 'fitness', 'reading'],
  priorities: ['health_first', 'work_life_balance'],
  healthConsiderations: 'アレルギー: 花粉症',
  communicationStyle: 'friendly',
  freeformFields: {
    personalDescription: 'エンジニアとして働く30代、朝型人間',
    dailyRoutineNotes: '毎朝6:30に起床、7:00にジョギング',
    personalGoals: '健康的な生活習慣を維持したい',
    challengesAndStruggles: '残業が多く、運動時間の確保が課題',
    preferredAdviceStyle: '具体的で実践しやすい提案を希望',
  },
  setupProgress: {
    basicInfo: true,
    lifestyle: true,
    interests: true,
    weeklySchedule: true,
    preferences: true,
    freeformDetails: true,
  },
  ...overrides,
});

/**
 * モック週間スケジュールの生成
 */
export const createMockWeeklySchedule = (overrides: Partial<WeeklySchedulePattern> = {}): WeeklySchedulePattern => ({
  id: 'schedule_123',
  userId: 'test_user_123',
  monday: '9:00-17:00 オフィス勤務',
  tuesday: '9:00-17:00 オフィス勤務',
  wednesday: '9:00-17:00 オフィス勤務',
  thursday: '9:00-17:00 オフィス勤務',
  friday: '9:00-17:00 オフィス勤務',
  saturday: '自由時間',
  sunday: '家族との時間',
  description: '平日は会社勤務、週末は家族時間',
  isActive: true,
  createdAt: new Date('2024-05-01T00:00:00.000Z'),
  ...overrides,
});

/**
 * モック設定の生成
 */
export const createMockSettings = (overrides: Partial<PersonalizationSettings> = {}): PersonalizationSettings => ({
  adviceFrequency: 'medium',
  adviceTypes: ['時間管理', '健康管理', '効率化'],
  shareLocation: true,
  shareSchedule: true,
  shareHealthInfo: false,
  language: 'ja',
  useEmoji: true,
  formalityLevel: 'friendly',
  enableBehaviorLearning: true,
  enableAdviceTracking: true,
  ...overrides,
});

/**
 * モック行動分析データの生成
 */
export const createMockBehaviorAnalysis = (overrides: Partial<BehaviorAnalysis> = {}): BehaviorAnalysis => ({
  userId: 'test_user_123',
  avgWakeUpTime: '06:30',
  avgBedTime: '23:00',
  productiveHours: ['09:00-11:00', '14:00-16:00'],
  breakPattern: '1時間おきに5分休憩',
  preferredTransport: '電車',
  frequentRoutes: ['自宅→駅→オフィス'],
  energyPeaks: ['09:00-11:00', '15:00-17:00'],
  stressIndicators: ['会議が多い日', '締切前'],
  successfulHabits: ['朝のジョギング', '読書時間'],
  lastAnalyzed: new Date('2024-06-01T00:00:00.000Z'),
  ...overrides,
});

/**
 * モックアドバイス履歴の生成
 */
export const createMockAdviceHistory = (overrides: Partial<AdviceHistory> = {}): AdviceHistory => ({
  userId: 'test_user_123',
  implementationRate: 75,
  totalAdviceGiven: 20,
  totalAdviceFollowed: 15,
  preferredAdviceTypes: ['時間管理', '健康管理'],
  dislikedAdviceTypes: ['早起き提案'],
  preferredFrequency: 'medium',
  successfulAdvicePatterns: ['朝の運動推奨', '休憩時間の設定'],
  bestResponseTimes: ['07:00-09:00', '12:00-13:00'],
  lastUpdated: new Date('2024-06-01T00:00:00.000Z'),
  ...overrides,
});

/**
 * モック位置情報の生成
 */
export const createMockLocationInfo = (overrides: Partial<LocationInfo> = {}): LocationInfo => ({
  latitude: 35.6762,
  longitude: 139.6503,
  address: '東京都渋谷区',
  city: '渋谷区',
  region: '東京都',
  country: '日本',
  ...overrides,
});

/**
 * モック天気情報の生成
 */
export const createMockWeatherInfo = (overrides: Partial<WeatherInfo> = {}): WeatherInfo => ({
  condition: 'sunny',
  temperature: 22,
  humidity: 60,
  description: '晴れ',
  ...overrides,
});

/**
 * モックカレンダー情報の生成
 */
export const createMockCalendarInfo = (overrides: Partial<CalendarInfo> = {}): CalendarInfo => ({
  hasEvents: true,
  nextEvent: {
    title: 'チームミーティング',
    startTime: '10:00',
    endTime: '11:00',
  },
  todayEvents: [
    {
      title: 'チームミーティング',
      startTime: '10:00',
      endTime: '11:00',
    },
    {
      title: '1on1ミーティング',
      startTime: '14:00',
      endTime: '15:00',
    },
  ],
  ...overrides,
});

/**
 * AsyncStorageのクリアとモックデータ設定
 */
export const setupMockStorage = async (data: Record<string, any> = {}) => {
  await AsyncStorage.clear();
  
  // デフォルトのテストデータを設定
  const defaultData = {
    user_profile: JSON.stringify(createMockUserProfile()),
    weekly_schedule_pattern: JSON.stringify(createMockWeeklySchedule()),
    personalization_settings: JSON.stringify(createMockSettings()),
    behavior_analysis: JSON.stringify(createMockBehaviorAnalysis()),
    advice_history: JSON.stringify(createMockAdviceHistory()),
    ...data,
  };

  // 一括設定
  const entries = Object.entries(defaultData);
  await Promise.all(
    entries.map(([key, value]) => AsyncStorage.setItem(key, value))
  );
};

/**
 * AsyncStorageの状態を取得（デバッグ用）
 */
export const getStorageState = async (): Promise<Record<string, any>> => {
  const keys = await AsyncStorage.getAllKeys();
  const items = await AsyncStorage.multiGet(keys);
  
  return items.reduce((acc, [key, value]) => {
    try {
      acc[key] = value ? JSON.parse(value) : null;
    } catch {
      acc[key] = value;
    }
    return acc;
  }, {} as Record<string, any>);
};

/**
 * 時間操作のヘルパー
 */
export const TimeHelpers = {
  // 特定の時間に設定
  setTime: (hour: number, minute: number = 0) => {
    const currentDate = new Date();
    currentDate.setHours(hour, minute, 0, 0);
    jest.setSystemTime(currentDate);
    return currentDate;
  },
  
  // 曜日を設定（0=日曜, 1=月曜, ...）
  setDayOfWeek: (dayOfWeek: number) => {
    const currentDate = new Date();
    const currentDay = currentDate.getDay();
    const diff = dayOfWeek - currentDay;
    currentDate.setDate(currentDate.getDate() + diff);
    jest.setSystemTime(currentDate);
    return currentDate;
  },
  
  // 曜日と時間を同時に設定（確実な方法）
  setDateTime: (dayOfWeek: number, hour: number, minute: number = 0) => {
    // 2024-06-01は土曜日なので、そこから計算
    const baseDate = new Date('2024-06-01T00:00:00.000Z');
    const baseDayOfWeek = baseDate.getDay(); // 土曜日 = 6
    const dayDiff = dayOfWeek - baseDayOfWeek;
    
    const targetDate = new Date(baseDate);
    targetDate.setDate(targetDate.getDate() + dayDiff);
    targetDate.setHours(hour, minute, 0, 0);
    
    jest.setSystemTime(targetDate);
    return targetDate;
  },
  
  // 元の時間に戻す
  reset: () => {
    jest.setSystemTime(global.MOCK_DATE);
  },
};

/**
 * プロミス解決の待機
 */
export const waitForPromises = () => new Promise(resolve => setImmediate(resolve));

/**
 * 非同期関数のタイムアウトテスト用
 */
export const expectTimeout = async (promise: Promise<any>, timeoutMs: number = 1000) => {
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Timeout')), timeoutMs)
  );
  
  await expect(Promise.race([promise, timeoutPromise])).rejects.toThrow('Timeout');
};

/**
 * エラーログのキャプチャ
 */
export const captureConsoleErrors = () => {
  const errors: string[] = [];
  const originalError = console.error;
  
  console.error = jest.fn((message) => {
    errors.push(message);
  });
  
  return {
    getErrors: () => errors,
    restore: () => {
      console.error = originalError;
    },
  };
};

/**
 * テストケース実行用のヘルパー
 */
export const runTestCases = async <T>(
  testCases: Array<{
    name: string;
    input: T;
    expected: any;
    setup?: () => Promise<void>;
  }>,
  testFunction: (input: T) => Promise<any>
) => {
  for (const testCase of testCases) {
    if (testCase.setup) {
      await testCase.setup();
    }
    
    const result = await testFunction(testCase.input);
    expect(result).toEqual(testCase.expected);
  }
};
