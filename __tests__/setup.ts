// __tests__/setup.ts - テスト環境のセットアップ

import 'react-native-gesture-handler/jestSetup';

// AsyncStorage のモック（Jest制約対応）
jest.mock('@react-native-async-storage/async-storage', () => {
  const mockStorage = new Map();
  
  return {
    getItem: jest.fn((key) => {
      const value = mockStorage.get(key);
      return Promise.resolve(value || null);
    }),
    
    setItem: jest.fn((key, value) => {
      mockStorage.set(key, value);
      return Promise.resolve();
    }),
    
    removeItem: jest.fn((key) => {
      mockStorage.delete(key);
      return Promise.resolve();
    }),
    
    clear: jest.fn(() => {
      mockStorage.clear();
      return Promise.resolve();
    }),
    
    getAllKeys: jest.fn(() => {
      return Promise.resolve(Array.from(mockStorage.keys()));
    }),
    
    multiGet: jest.fn((keys) => {
      const result = keys.map(key => [key, mockStorage.get(key) || null]);
      return Promise.resolve(result);
    }),
    
    multiSet: jest.fn((keyValuePairs) => {
      keyValuePairs.forEach(([key, value]) => {
        mockStorage.set(key, value);
      });
      return Promise.resolve();
    }),
    
    multiRemove: jest.fn((keys) => {
      keys.forEach(key => mockStorage.delete(key));
      return Promise.resolve();
    }),
    
    // デバッグ用：内部ストレージ直接アクセス
    __getMockStorage: () => mockStorage,
  };
});

console.log('setup.ts: AsyncStorageモック設定完了');

// React Native ライブラリのモック
jest.mock('react-native', () => {
  const ReactNative = jest.requireActual('react-native');
  return {
    ...ReactNative,
    Alert: {
      alert: jest.fn(),
    },
    NativeModules: {
      ...ReactNative.NativeModules,
      // 必要に応じて追加のネイティブモジュールモック
    },
    Platform: {
      ...ReactNative.Platform,
      OS: 'ios',
      Version: '14.0',
    },
  };
});

// 位置情報サービスのモック
jest.mock('@react-native-community/geolocation', () => ({
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
  clearWatch: jest.fn(),
  stopObserving: jest.fn(),
}));

// カメラのモック（将来の機能に備えて）
jest.mock('react-native-vision-camera', () => ({
  Camera: {
    getCameraDevice: jest.fn(),
    requestCameraPermission: jest.fn(),
  },
  useCameraDevices: jest.fn(() => ({})),
  useFrameProcessor: jest.fn(),
}));

// TTSのモック
jest.mock('react-native-tts', () => ({
  speak: jest.fn(),
  stop: jest.fn(),
  getInitStatus: jest.fn(() => Promise.resolve()),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

// 権限管理のモック
jest.mock('react-native-permissions', () => ({
  PERMISSIONS: {
    ANDROID: {
      ACCESS_FINE_LOCATION: 'android.permission.ACCESS_FINE_LOCATION',
      CAMERA: 'android.permission.CAMERA',
    },
    IOS: {
      LOCATION_WHEN_IN_USE: 'ios.permission.LOCATION_WHEN_IN_USE',
      CAMERA: 'ios.permission.CAMERA',
    },
  },
  RESULTS: {
    GRANTED: 'granted',
    DENIED: 'denied',
    BLOCKED: 'blocked',
    UNAVAILABLE: 'unavailable',
  },
  request: jest.fn(() => Promise.resolve('granted')),
  check: jest.fn(() => Promise.resolve('granted')),
}));

// Google AI SDK のモック
jest.mock('@google/genai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn(() => ({
      generateContent: jest.fn(() => Promise.resolve({
        response: {
          text: jest.fn(() => 'モックされたAI応答'),
        },
      })),
    })),
  })),
}));

// 日付のモック設定（テストの一貫性のため）
const MOCK_DATE = new Date('2024-06-01T09:00:00.000Z');
jest.useFakeTimers();
jest.setSystemTime(MOCK_DATE);

// グローバルなテストヘルパー
global.MOCK_DATE = MOCK_DATE;

// コンソールのエラー・警告を制御（必要に応じて調整）
const originalWarn = console.warn;
const originalError = console.error;

beforeEach(() => {
  // 予期しないエラーのみ表示
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterEach(() => {
  console.warn = originalWarn;
  console.error = originalError;
  jest.clearAllMocks();
});

// タイムアウト設定
jest.setTimeout(10000);

export {};
