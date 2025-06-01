// 最もシンプルで確実なテストセットアップ

import 'react-native-gesture-handler/jestSetup';

// 成功した純粋なAsyncStorageモック実装
let globalMockStore = new Map();

const mockAsyncStorage = {
  getItem: async (key) => {
    return globalMockStore.get(key) || null;
  },
  
  setItem: async (key, value) => {
    globalMockStore.set(key, value);
    return undefined;
  },
  
  removeItem: async (key) => {
    globalMockStore.delete(key);
    return undefined;
  },
  
  clear: async () => {
    globalMockStore.clear();
    return undefined;
  },
  
  getAllKeys: async () => {
    return Array.from(globalMockStore.keys());
  },
  
  multiGet: async (keys) => {
    return keys.map(key => [key, globalMockStore.get(key) || null]);
  },
  
  multiSet: async (keyValuePairs) => {
    keyValuePairs.forEach(([key, value]) => {
      globalMockStore.set(key, value);
    });
    return undefined;
  },
  
  multiRemove: async (keys) => {
    keys.forEach(key => globalMockStore.delete(key));
    return undefined;
  },
};

// AsyncStorageモック
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// React Native基本モック
jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
  Platform: { OS: 'ios', Version: '14.0' },
}));

// 位置情報モック
jest.mock('@react-native-community/geolocation', () => ({
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
  clearWatch: jest.fn(),
  stopObserving: jest.fn(),
}));

// TTSモック
jest.mock('react-native-tts', () => ({
  speak: jest.fn(),
  stop: jest.fn(),
  getInitStatus: jest.fn(() => Promise.resolve()),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

// 権限モック
jest.mock('react-native-permissions', () => ({
  PERMISSIONS: {
    ANDROID: { ACCESS_FINE_LOCATION: 'android.permission.ACCESS_FINE_LOCATION' },
    IOS: { LOCATION_WHEN_IN_USE: 'ios.permission.LOCATION_WHEN_IN_USE' },
  },
  RESULTS: {
    GRANTED: 'granted',
    DENIED: 'denied',
  },
  request: jest.fn(() => Promise.resolve('granted')),
  check: jest.fn(() => Promise.resolve('granted')),
}));

// Google AI SDK モック
jest.mock('@google/genai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn(() => ({
      generateContent: jest.fn(() => Promise.resolve({
        response: { text: jest.fn(() => 'モックAI応答') },
      })),
    })),
  })),
}));

// 日付モック
const MOCK_DATE = new Date('2024-06-01T09:00:00.000Z');
jest.useFakeTimers();
jest.setSystemTime(MOCK_DATE);

global.MOCK_DATE = MOCK_DATE;

// テスト前後の処理
beforeEach(() => {
  jest.clearAllMocks();
});

// デバッグ用（必要に応じて使用）
global.mockAsyncStorage = mockAsyncStorage;
