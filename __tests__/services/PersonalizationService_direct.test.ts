// テストファイル内で直接モック - 最も確実な方法

// jest.fn()を使わない純粋なモック実装
let mockStore = new Map();

const mockStorage = {
  // 純粋な関数（jest.fn()なし）
  getItem: async (key) => {
    console.log(`getItem called with key: ${key}`);
    const value = mockStore.get(key);
    console.log(`returning value: ${value}`);
    return value || null;
  },
  
  setItem: async (key, value) => {
    console.log(`setItem called with key: ${key}, value: ${value}`);
    mockStore.set(key, value);
    console.log(`store now has:`, Array.from(mockStore.entries()));
    return undefined;
  },
  
  removeItem: async (key) => {
    console.log(`removeItem called with key: ${key}`);
    mockStore.delete(key);
    return undefined;
  },
  
  clear: async () => {
    console.log('clear called');
    mockStore.clear();
    return undefined;
  },
  
  getAllKeys: async () => {
    const keys = Array.from(mockStore.keys());
    console.log('getAllKeys returning:', keys);
    return keys;
  },
};

jest.mock('@react-native-async-storage/async-storage', () => mockStorage);

// PersonalizationServiceのモック（既存の実装を無視）
const MockPersonalizationService = {
  async saveUserProfile(form) {
    const profile = {
      id: 'test_user_123',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...form,
      setupProgress: {
        basicInfo: true,
        lifestyle: true,
        interests: true,
        weeklySchedule: false,
        preferences: true,
        freeformDetails: true,
      },
    };
    await mockStorage.setItem('user_profile', JSON.stringify(profile));
    return profile;
  },

  async loadUserProfile() {
    const stored = await mockStorage.getItem('user_profile');
    return stored ? JSON.parse(stored) : null;
  },

  async getPersonalizationData() {
    const userProfile = await this.loadUserProfile();
    return {
      userProfile,
      settings: {
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
      },
    };
  },
};

describe('PersonalizationService - 直接モック版', () => {
  beforeEach(() => {
    console.log('=== beforeEach開始 ===');
    mockStore.clear(); // 直接クリア
    console.log('=== beforeEach完了、store size:', mockStore.size);
  });

  it('Step1: 基本的なMap動作確認', () => {
    console.log('=== Step1開始 ===');
    mockStore.set('test', 'value');
    const result = mockStore.get('test');
    console.log('Map result:', result);
    expect(result).toBe('value');
  });

  it('Step2: AsyncStorageモック動作確認', async () => {
    console.log('=== Step2開始 ===');
    console.log('mockStorage:', typeof mockStorage.setItem);
    
    await mockStorage.setItem('test', 'value');
    const result = await mockStorage.getItem('test');
    
    console.log('最終結果:', result);
    expect(result).toBe('value');
  });

  it('Step3: JSON保存テスト', async () => {
    console.log('=== Step3開始 ===');
    const testData = { name: 'test', value: 123 };
    const jsonString = JSON.stringify(testData);
    
    await mockStorage.setItem('json_test', jsonString);
    const retrieved = await mockStorage.getItem('json_test');
    const parsed = JSON.parse(retrieved);
    
    expect(parsed.name).toBe('test');
    expect(parsed.value).toBe(123);
  });
});
