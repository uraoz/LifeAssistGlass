# LifeAssistGlass

AIを活用したライフアシスタントアプリケーション

## 📋 プロジェクト概要

LifeAssistGlassは、個人の生活パターンを学習し、コンテキストに応じた最適なアドバイスを提供するReact Nativeアプリケーションです。

### 🌟 主要機能

- **🤖 AI統合**: Google Generative AIによる個人化されたアドバイス
- **📍 位置情報連携**: 現在地に応じた適切な提案
- **🌤️ 天気情報**: 気象条件を考慮したアクション提案
- **📅 カレンダー統合**: スケジュールに基づく時間管理支援
- **⚙️ 個人化設定**: 詳細なプロファイル設定と学習機能
- **📱 ネイティブ機能**: カメラ、TTS、位置情報の活用

### 🏗️ アーキテクチャ

```
src/
├── components/     # UIコンポーネント
├── services/       # ビジネスロジック層
├── types/         # TypeScript型定義
└── utils/         # ユーティリティ関数
```

## 🚀 開発環境セットアップ

### 前提条件

- **Node.js**: >=18
- **React Native CLI**: 最新版
- **Android Studio** または **Xcode**
- **Java 17** (Android開発用)

### インストール

```bash
# 依存関係のインストール
npm install

# iOS依存関係（macOSのみ）
cd ios && pod install && cd ..
```

### 実行

```bash
# Metro開発サーバー起動
npm start

# Android実行
npm run android

# iOS実行
npm run ios
```

## 🧪 テスト環境

高品質で保守性の高いテストスイートを構築しています。

### テスト実行

```bash
# 全テスト実行
npm test

# 監視モード（開発推奨）
npm run test:watch

# カバレッジ測定
npm run test:coverage

# サービス層のみ
npm run test:services
```

### テスト構成

- **サービス層**: 85%以上のカバレッジ（高品質要求）
- **コンポーネント**: UIロジックとインタラクション
- **統合テスト**: 機能の組み合わせ検証
- **モック環境**: 外部依存関係を完全分離

### 現在の実装状況

- ✅ **PersonalizationService** - 完全実装（31テスト）
- 🔄 **ContextService** - 基本実装済み
- 📋 **その他サービス層** - 準備完了

詳細は [`TESTING.md`](./TESTING.md) を参照してください。

## 📂 プロジェクト構造

### 主要ディレクトリ

```
LifeAssistGlass/
├── src/
│   ├── components/           # UIコンポーネント
│   │   ├── CameraScreen.tsx
│   │   ├── GoogleAuthNative.tsx
│   │   ├── PersonalizationDashboard.tsx
│   │   └── UserProfileSetup.tsx
│   ├── services/             # ビジネスロジック層
│   │   ├── ContextService.ts      # 統合コンテキスト管理
│   │   ├── PersonalizationService.ts  # 個人化設定管理
│   │   ├── LocationService.ts     # 位置情報サービス
│   │   ├── WeatherService.ts      # 天気情報サービス
│   │   └── GoogleCalendarService.ts   # カレンダー連携
│   ├── types/               # TypeScript型定義
│   └── utils/               # ユーティリティ
├── __tests__/               # テスト環境
│   ├── services/            # サービス層テスト
│   ├── utils/               # テストユーティリティ
│   └── setup_simple.ts      # テスト環境設定
├── android/                 # Android固有設定
├── ios/                     # iOS固有設定
└── docs/                    # ドキュメント
```

### 設定ファイル

- **jest.config.js** - テスト設定
- **metro.config.js** - Metro bundler設定
- **babel.config.js** - Babel設定
- **tsconfig.json** - TypeScript設定

## 🔧 開発フロー

### 機能開発

1. **サービス層テスト作成** (TDD推奨)
2. **サービス層実装**
3. **コンポーネント実装**
4. **統合テスト**
5. **実機検証**

### 品質保証

- **自動テスト**: 開発時の品質担保
- **実機テスト**: ユーザーによる動作確認
- **コードレビュー**: 保守性とベストプラクティス確認

### ブランチ戦略

- **main**: 本番リリース用
- **develop**: 開発統合用
- **feature/\***: 機能開発用

## 📱 対応プラットフォーム

### テスト環境
- **Android**: Pixel 7 (API 33)
- **開発環境**: WSL2 + React Native

### 本番対応予定
- **Android**: API 21+
- **iOS**: iOS 12+

## 🔐 環境変数

`.env`ファイルを作成して以下を設定：

```env
# Google AI API
GOOGLE_AI_API_KEY=your_api_key

# Google Calendar API
GOOGLE_CALENDAR_CLIENT_ID=your_client_id
GOOGLE_CALENDAR_CLIENT_SECRET=your_client_secret

# Weather API
WEATHER_API_KEY=your_weather_api_key
```

## 🤝 コントリビューション

### コーディング規約

- **TypeScript**: 厳密型チェック
- **ESLint + Prettier**: コード品質統一
- **命名規約**: camelCase (variables/functions), PascalCase (components/types)

### プルリクエスト

1. 機能ブランチの作成
2. テストの追加・更新
3. 全テストが通ることを確認
4. プルリクエスト作成

### 課題報告

GitHub Issuesで以下を含めて報告：

- 再現手順
- 期待する動作
- 実際の動作
- 環境情報

## 📚 ドキュメント

- [`TESTING.md`](./TESTING.md) - テスト環境詳細ガイド
- [`DEVELOPMENT.md`](./DEVELOPMENT.md) - 開発者向け詳細ドキュメント
- [`API.md`](./API.md) - API仕様書

## 🛠️ トラブルシューティング

### よくある問題

**Metro bundlerエラー**
```bash
npx react-native start --reset-cache
```

**Android build失敗**
```bash
cd android && ./gradlew clean && cd ..
```

**テスト失敗**
```bash
npx jest --clearCache
npm run test:services
```

### サポート

- 開発チーム内での技術相談
- GitHub Issuesでの問題報告
- テスト環境の詳細は`TESTING.md`参照

## 📄 ライセンス

プライベートプロジェクト

---

**開発状況**: アクティブ開発中 🚧  
**最終更新**: 2024年6月  
**メンテナー**: 開発チーム