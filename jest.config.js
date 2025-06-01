module.exports = {
  preset: 'react-native',
  
  // テストファイルの検索パターン
  testMatch: [
    '**/__tests__/**/*.(ts|tsx|js)',
    '**/*.(test|spec).(ts|tsx|js)',
  ],
  
  // モジュール名マッピング（絶対パス対応）
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  
  // セットアップファイル
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup_simple.ts'],
  
  // モック対象
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-.*|@react-native-async-storage|react-native-vision-camera)/)',
  ],
  
  // モジュール変換設定
  transform: {
    '^.+\\.(ts|tsx)$': 'babel-jest',
  },
  
  // カバレッジ設定
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,tsx}',
    '!src/types/**/*',
  ],
  
  // カバレッジ閾値（将来的な品質維持）
  coverageThreshold: {
    global: {
      statements: 70,
      branches: 60,
      functions: 70,
      lines: 70,
    },
    // サービス層は高い品質を要求
    'src/services/**/*.ts': {
      statements: 85,
      branches: 75,
      functions: 85,
      lines: 85,
    },
  },
  
  // テスト環境
  testEnvironment: 'node',
  
  // タイムアウト設定（非同期処理対応）
  testTimeout: 10000,
  
  // 詳細な出力
  verbose: true,
  
  // 並列実行設定（将来のテスト数増加に備える）
  maxWorkers: '50%',
  
  // キャッシュ無効化トリガー
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,
};