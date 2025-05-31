# リダイレクト問題解決ガイド 🔄

## 🎯 現在の状況
- ✅ カスタムURLスキーム設定完了
- ✅ 「LifeAssistGlassがアクセスを求めています」ページ表示成功
- ❌ 承認後、アプリに戻らずGoogleメインページにリダイレクト

## 🔄 設定を元に戻しました

### 復元した設定:
```typescript
const authConfig = {
  redirectUrl: 'com.lifeassistglass://oauth/callback',
  customUrlScheme: 'com.lifeassistglass',
  // その他の設定...
};
```

## 🔧 Google Cloud Console設定の確認

### Step 1: OAuth 2.0 クライアント ID設定確認

1. **Google Cloud Console** → **APIs & Services** → **認証情報**
2. 現在のクライアントID: `924836063580-pasahplr95r9tk41ietdsiqfa4cn2am0.apps.googleusercontent.com`
3. **設定を編集**をクリック

### Step 2: アプリケーションタイプの確認

**現在のタイプ**: デスクトップアプリケーション

**❌ 問題**: デスクトップタイプではモバイルアプリのリダイレクトが正しく動作しない場合がある

**🔧 解決方法の選択肢**:

#### オプション A: 承認済みリダイレクトURIを追加
デスクトップアプリ設定で以下を追加：
```
com.lifeassistglass://oauth/callback
```

#### オプション B: 新しいAndroid/iOSクライアント作成（推奨）
1. 「認証情報を作成」→「OAuth 2.0 クライアント ID」
2. アプリケーションの種類: **「Android」**
3. パッケージ名: `com.lifeassistglass`
4. SHA-1証明書フィンガープリント: （下記で取得）

### Step 3: SHA-1証明書フィンガープリント取得

新しいターミナルで実行：
```bash
cd C:\Users\uraot\Documents\GitHub\LifeAssistGlass\android
./gradlew signingReport
```

出力例：
```
Variant: debug
Config: debug
Store: C:\Users\uraot\Documents\GitHub\LifeAssistGlass\android\app\debug.keystore
Alias: androiddebugkey
MD5: XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX
SHA1: XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX ← この値をコピー
SHA-256: XXXXX...
```

### Step 4: OAuth同意画面の確認

1. **OAuth同意画面** → **外部** or **内部**
2. **公開ステータス**: 
   - テスト中 → テストユーザーを追加
   - 本番環境 → 審査済み

3. **スコープ**の確認:
   ```
   - openid
   - profile
   - email
   - https://www.googleapis.com/auth/calendar.readonly
   ```

## 🛠️ 推奨修復手順

### 方法1: 簡単修正（デスクトップクライアント利用）

1. **Google Cloud Console** → 現在のクライアント編集
2. **承認済みのリダイレクトURI**に追加：
   ```
   com.lifeassistglass://oauth/callback
   ```
3. 保存

### 方法2: 完全修正（新しいAndroidクライアント作成）

1. **新しいAndroid OAuth クライアント作成**
2. **SHA-1フィンガープリント**を追加
3. **新しいクライアントID**を`.env`に設定
4. アプリをリビルド

## 🧪 テスト確認

修正後のテスト手順：
1. アプリ起動 → 🚀 Calendar改善版
2. 「🔐 Google認証を開始」タップ
3. ブラウザでGoogle認証完了
4. **アプリに自動復帰するか確認** ← 重要！
5. 「✅ 認証済み」表示

## 🔍 トラブルシューティング

### まだアプリに戻らない場合:

1. **Android設定確認**:
   ```bash
   adb shell am start -W -a android.intent.action.VIEW -d "com.lifeassistglass://oauth/callback" com.lifeassistglass
   ```

2. **ログ確認**:
   ```bash
   npx react-native log-android
   ```

3. **URL Schemeテスト**:
   ```bash
   adb shell am start -a android.intent.action.VIEW -d "com.lifeassistglass://test"
   ```

### 考えられる原因:

1. **OAuth設定**: Google ConsoleでリダイレクトURI未設定
2. **Deep Link**: Android ManifestのIntent Filter設定
3. **アプリ状態**: アプリがバックグラウンドで正常に待機していない

## 📋 チェックリスト

- [ ] Google Cloud Console でリダイレクトURI設定
- [ ] OAuth同意画面のスコープ確認
- [ ] SHA-1証明書フィンガープリント設定（Androidクライアント使用時）
- [ ] アプリのクリーンビルド実行
- [ ] 実機でのDeep Linkテスト

---

**🎯 この修正により、承認後にアプリに正常に戻るようになるはずです！**