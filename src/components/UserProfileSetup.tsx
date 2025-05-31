// src/components/UserProfileSetup.tsx - ユーザープロファイル設定ウィザード

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import PersonalizationService from '../services/PersonalizationService';
import {
  UserProfile,
  UserProfileForm,
  WeeklyScheduleForm,
  InterestCategory,
  PriorityValue,
} from '../types/personalization';

interface UserProfileSetupProps {
  onSetupComplete: (profile: UserProfile) => void;
}

const UserProfileSetup: React.FC<UserProfileSetupProps> = ({ onSetupComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [profileForm, setProfileForm] = useState<UserProfileForm>({
    interests: [],
    priorities: [],
    healthConsiderations: '',
    freeformFields: {
      personalDescription: '',
      dailyRoutineNotes: '',
      personalGoals: '',
      uniqueCircumstances: '',
      preferredAdviceStyle: '',
      workLifeDetails: '',
      hobbiesDetails: '',
      challengesAndStruggles: '',
    },
  });
  const [weeklyForm, setWeeklyForm] = useState<WeeklyScheduleForm>({
    description: '',
  });
  const [setupStatus, setSetupStatus] = useState({ isCompleted: false, progress: 0, missingSteps: [] });

  // 初期化時に既存の設定状況を確認
  useEffect(() => {
    checkExistingSetup();
  }, []);

  const checkExistingSetup = async () => {
    try {
      const status = await PersonalizationService.getSetupStatus();
      const existingProfile = await PersonalizationService.loadUserProfile();
      const existingSchedule = await PersonalizationService.loadWeeklySchedule();

      setSetupStatus(status);

      if (existingProfile) {
        setProfileForm({
          lifestyle: existingProfile.lifestyle,
          ageGroup: existingProfile.ageGroup,
          interests: existingProfile.interests || [],
          priorities: existingProfile.priorities || [],
          healthConsiderations: existingProfile.healthConsiderations || '',
          communicationStyle: existingProfile.communicationStyle,
          freeformFields: existingProfile.freeformFields || {
            personalDescription: '',
            dailyRoutineNotes: '',
            personalGoals: '',
            uniqueCircumstances: '',
            preferredAdviceStyle: '',
            workLifeDetails: '',
            hobbiesDetails: '',
            challengesAndStruggles: '',
          },
        });
      }

      if (existingSchedule) {
        setWeeklyForm({
          monday: existingSchedule.monday || '',
          tuesday: existingSchedule.tuesday || '',
          wednesday: existingSchedule.wednesday || '',
          thursday: existingSchedule.thursday || '',
          friday: existingSchedule.friday || '',
          saturday: existingSchedule.saturday || '',
          sunday: existingSchedule.sunday || '',
          description: existingSchedule.description || '',
        });
      }

      console.log('既存設定確認完了:', { status, existingProfile, existingSchedule });
    } catch (error) {
      console.error('既存設定確認エラー:', error);
    }
  };

  // ステップ1: 基本情報
  const renderBasicInfoStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>基本情報</Text>
      <Text style={styles.stepDescription}>
        あなたのライフスタイルと年齢層を教えてください
      </Text>

      {/* ライフスタイル選択 */}
      <Text style={styles.fieldLabel}>ライフスタイル</Text>
      <View style={styles.optionGrid}>
        {[
          { key: 'student', label: '🎓 学生' },
          { key: 'employee', label: '💼 会社員' },
          { key: 'freelancer', label: '💻 フリーランス' },
          { key: 'homemaker', label: '🏠 主婦/主夫' },
          { key: 'retired', label: '🌿 退職者' },
          { key: 'other', label: '🤔 その他' },
        ].map((option) => (
          <TouchableOpacity
            key={option.key}
            style={[
              styles.optionButton,
              profileForm.lifestyle === option.key && styles.optionButtonSelected,
            ]}
            onPress={() => setProfileForm(prev => ({ ...prev, lifestyle: option.key as any }))}
          >
            <Text style={[
              styles.optionText,
              profileForm.lifestyle === option.key && styles.optionTextSelected,
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 年齢層選択 */}
      <Text style={styles.fieldLabel}>年齢層</Text>
      <View style={styles.optionGrid}>
        {[
          { key: '10s', label: '10代' },
          { key: '20s', label: '20代' },
          { key: '30s', label: '30代' },
          { key: '40s', label: '40代' },
          { key: '50s+', label: '50代以上' },
        ].map((option) => (
          <TouchableOpacity
            key={option.key}
            style={[
              styles.optionButton,
              profileForm.ageGroup === option.key && styles.optionButtonSelected,
            ]}
            onPress={() => setProfileForm(prev => ({ ...prev, ageGroup: option.key as any }))}
          >
            <Text style={[
              styles.optionText,
              profileForm.ageGroup === option.key && styles.optionTextSelected,
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // ステップ2: 興味・関心
  const renderInterestsStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>興味・関心</Text>
      <Text style={styles.stepDescription}>
        あなたの興味や関心のある分野を選択してください（複数選択可）
      </Text>

      <View style={styles.optionGrid}>
        {[
          { key: 'sports', label: '⚽ スポーツ' },
          { key: 'fitness', label: '💪 フィットネス' },
          { key: 'reading', label: '📚 読書' },
          { key: 'music', label: '🎵 音楽' },
          { key: 'movies', label: '🎬 映画' },
          { key: 'cooking', label: '🍳 料理' },
          { key: 'travel', label: '✈️ 旅行' },
          { key: 'gaming', label: '🎮 ゲーム' },
          { key: 'technology', label: '💻 テクノロジー' },
          { key: 'art', label: '🎨 アート' },
          { key: 'photography', label: '📸 写真' },
          { key: 'gardening', label: '🌱 ガーデニング' },
          { key: 'fashion', label: '👗 ファッション' },
          { key: 'pets', label: '🐕 ペット' },
          { key: 'volunteer', label: '🤝 ボランティア' },
          { key: 'business', label: '📈 ビジネス' },
        ].map((option) => (
          <TouchableOpacity
            key={option.key}
            style={[
              styles.optionButton,
              profileForm.interests.includes(option.key as InterestCategory) && styles.optionButtonSelected,
            ]}
            onPress={() => {
              const interests = [...profileForm.interests];
              const index = interests.indexOf(option.key as InterestCategory);
              if (index >= 0) {
                interests.splice(index, 1);
              } else {
                interests.push(option.key as InterestCategory);
              }
              setProfileForm(prev => ({ ...prev, interests }));
            }}
          >
            <Text style={[
              styles.optionText,
              profileForm.interests.includes(option.key as InterestCategory) && styles.optionTextSelected,
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // ステップ3: 価値観・健康配慮
  const renderPreferencesStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>価値観・配慮事項</Text>
      <Text style={styles.stepDescription}>
        重視する価値観と健康面での配慮事項を教えてください
      </Text>

      {/* 価値観選択 */}
      <Text style={styles.fieldLabel}>重視する価値観（複数選択可）</Text>
      <View style={styles.optionGrid}>
        {[
          { key: 'health_first', label: '🏥 健康最優先' },
          { key: 'efficiency_focus', label: '⚡ 効率重視' },
          { key: 'work_life_balance', label: '⚖️ ワークライフバランス' },
          { key: 'family_priority', label: '👨‍👩‍👧‍👦 家族優先' },
          { key: 'personal_growth', label: '📈 自己成長' },
          { key: 'social_connection', label: '🤝 社会的つながり' },
          { key: 'financial_stability', label: '💰 経済的安定' },
          { key: 'creativity', label: '🎨 創造性' },
          { key: 'adventure', label: '🗻 冒険・チャレンジ' },
        ].map((option) => (
          <TouchableOpacity
            key={option.key}
            style={[
              styles.optionButton,
              profileForm.priorities.includes(option.key as PriorityValue) && styles.optionButtonSelected,
            ]}
            onPress={() => {
              const priorities = [...profileForm.priorities];
              const index = priorities.indexOf(option.key as PriorityValue);
              if (index >= 0) {
                priorities.splice(index, 1);
              } else {
                priorities.push(option.key as PriorityValue);
              }
              setProfileForm(prev => ({ ...prev, priorities }));
            }}
          >
            <Text style={[
              styles.optionText,
              profileForm.priorities.includes(option.key as PriorityValue) && styles.optionTextSelected,
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 健康配慮事項 */}
      <Text style={styles.fieldLabel}>健康面での配慮事項（任意）</Text>
      <TextInput
        style={styles.textInput}
        multiline
        numberOfLines={3}
        value={profileForm.healthConsiderations}
        onChangeText={(text) => setProfileForm(prev => ({ ...prev, healthConsiderations: text }))}
        placeholder="アレルギー、薬の服用時間、運動制限など"
      />

      {/* コミュニケーションスタイル */}
      <Text style={styles.fieldLabel}>話しかけ方</Text>
      <View style={styles.optionGrid}>
        {[
          { key: 'casual', label: '🙂 カジュアル' },
          { key: 'friendly', label: '😊 親しみやすく' },
          { key: 'formal', label: '🤔 丁寧・フォーマル' },
        ].map((option) => (
          <TouchableOpacity
            key={option.key}
            style={[
              styles.optionButton,
              profileForm.communicationStyle === option.key && styles.optionButtonSelected,
            ]}
            onPress={() => setProfileForm(prev => ({ ...prev, communicationStyle: option.key as any }))}
          >
            <Text style={[
              styles.optionText,
              profileForm.communicationStyle === option.key && styles.optionTextSelected,
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // ステップ4: 自由記述・詳細設定
  const renderFreeformStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>詳細・自由記述</Text>
      <Text style={styles.stepDescription}>
        あなたの生活スタイルや特徴を自由に記述してください。AIがより具体的で個人に寄り添ったアドバイスを提供できます。
      </Text>

      {/* 個人的な特徴・生活スタイル */}
      <Text style={styles.fieldLabel}>あなたの生活スタイル・特徴（任意）</Text>
      <TextInput
        style={styles.textAreaLarge}
        multiline
        numberOfLines={4}
        value={profileForm.freeformFields.personalDescription}
        onChangeText={(text) => setProfileForm(prev => ({ 
          ...prev, 
          freeformFields: { ...prev.freeformFields, personalDescription: text }
        }))}
        placeholder="例: 朝型で早起きが得意、在宅ワークが多い、猫を2匹飼っている、週末は山登りを楽しんでいる..."
      />

      {/* 日常ルーティン・特記事項 */}
      <Text style={styles.fieldLabel}>日常ルーティンの特記事項（任意）</Text>
      <TextInput
        style={styles.textAreaMedium}
        multiline
        numberOfLines={3}
        value={profileForm.freeformFields.dailyRoutineNotes}
        onChangeText={(text) => setProfileForm(prev => ({ 
          ...prev, 
          freeformFields: { ...prev.freeformFields, dailyRoutineNotes: text }
        }))}
        placeholder="例: 毎朝6時にジョギング、昼休みは必ず散歩、夜は読書時間を確保..."
      />

      {/* 個人的な目標・重視していること */}
      <Text style={styles.fieldLabel}>個人的な目標・重視していること（任意）</Text>
      <TextInput
        style={styles.textAreaMedium}
        multiline
        numberOfLines={3}
        value={profileForm.freeformFields.personalGoals}
        onChangeText={(text) => setProfileForm(prev => ({ 
          ...prev, 
          freeformFields: { ...prev.freeformFields, personalGoals: text }
        }))}
        placeholder="例: 健康的な生活習慣を身につけたい、仕事とプライベートのバランス、英語学習を継続..."
      />

      {/* 困っていること・課題 */}
      <Text style={styles.fieldLabel}>日々の課題・困っていること（任意）</Text>
      <TextInput
        style={styles.textAreaMedium}
        multiline
        numberOfLines={3}
        value={profileForm.freeformFields.challengesAndStruggles}
        onChangeText={(text) => setProfileForm(prev => ({ 
          ...prev, 
          freeformFields: { ...prev.freeformFields, challengesAndStruggles: text }
        }))}
        placeholder="例: 時間管理が苦手、つい夜更かししてしまう、運動が続かない、集中力が続かない..."
      />

      {/* どんなアドバイスが欲しいか */}
      <Text style={styles.fieldLabel}>どんなアドバイスが欲しいですか？（任意）</Text>
      <TextInput
        style={styles.textAreaMedium}
        multiline
        numberOfLines={3}
        value={profileForm.freeformFields.preferredAdviceStyle}
        onChangeText={(text) => setProfileForm(prev => ({ 
          ...prev, 
          freeformFields: { ...prev.freeformFields, preferredAdviceStyle: text }
        }))}
        placeholder="例: 具体的で実践しやすい提案、やる気が出る励ましの言葉、健康面を重視したアドバイス..."
      />

      <View style={styles.helpBox}>
        <Text style={styles.helpTitle}>💡 ヒント</Text>
        <Text style={styles.helpText}>
          • 全て任意項目です。書ける範囲で大丈夫です{'\n'}
          • 詳しく書くほど、あなたに最適化されたアドバイスを提供できます{'\n'}
          • 後からいつでも追加・変更できます
        </Text>
      </View>
    </View>
  );

  // ステップ5: 週間スケジュール
  const renderScheduleStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>週間スケジュール</Text>
      <Text style={styles.stepDescription}>
        典型的な1週間のスケジュールを教えてください
      </Text>

      {[
        { key: 'monday', label: '月曜日' },
        { key: 'tuesday', label: '火曜日' },
        { key: 'wednesday', label: '水曜日' },
        { key: 'thursday', label: '木曜日' },
        { key: 'friday', label: '金曜日' },
        { key: 'saturday', label: '土曜日' },
        { key: 'sunday', label: '日曜日' },
      ].map((day) => (
        <View key={day.key} style={styles.scheduleRow}>
          <Text style={styles.dayLabel}>{day.label}</Text>
          <TextInput
            style={styles.scheduleInput}
            value={weeklyForm[day.key] || ''}
            onChangeText={(text) => setWeeklyForm(prev => ({ ...prev, [day.key]: text }))}
            placeholder="例: 9:00-17:00 オフィス勤務"
          />
        </View>
      ))}

      <Text style={styles.fieldLabel}>スケジュールの説明（任意）</Text>
      <TextInput
        style={styles.textInput}
        multiline
        numberOfLines={2}
        value={weeklyForm.description}
        onChangeText={(text) => setWeeklyForm(prev => ({ ...prev, description: text }))}
        placeholder="例: 平日は会社勤務、土日は家族との時間"
      />
    </View>
  );

  // ステップ6: 確認・完了
  const renderConfirmationStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>設定確認</Text>
      <Text style={styles.stepDescription}>
        入力内容を確認して、設定を完了してください
      </Text>

      <View style={styles.confirmationBox}>
        <Text style={styles.confirmationLabel}>基本情報</Text>
        <Text style={styles.confirmationText}>
          {profileForm.lifestyle ? `ライフスタイル: ${getLifestyleLabel(profileForm.lifestyle)}` : '未設定'}
        </Text>
        <Text style={styles.confirmationText}>
          {profileForm.ageGroup ? `年齢層: ${profileForm.ageGroup}` : '未設定'}
        </Text>

        <Text style={styles.confirmationLabel}>興味・関心</Text>
        <Text style={styles.confirmationText}>
          {profileForm.interests.length > 0 ? `${profileForm.interests.length}項目選択済み` : '未設定'}
        </Text>

        <Text style={styles.confirmationLabel}>価値観</Text>
        <Text style={styles.confirmationText}>
          {profileForm.priorities.length > 0 ? `${profileForm.priorities.length}項目選択済み` : '未設定'}
        </Text>

        <Text style={styles.confirmationLabel}>詳細・自由記述</Text>
        <Text style={styles.confirmationText}>
          {Object.values(profileForm.freeformFields).some(v => v && v.trim()) ? '記述済み' : '未記述'}
        </Text>

        <Text style={styles.confirmationLabel}>スケジュール</Text>
        <Text style={styles.confirmationText}>
          {Object.values(weeklyForm).some(v => v && v !== weeklyForm.description) ? '設定済み' : '未設定'}
        </Text>
      </View>
    </View>
  );

  const steps = [
    { title: '基本情報', component: renderBasicInfoStep },
    { title: '興味・関心', component: renderInterestsStep },
    { title: '価値観・配慮', component: renderPreferencesStep },
    { title: '詳細・自由記述', component: renderFreeformStep },
    { title: '週間スケジュール', component: renderScheduleStep },
    { title: '確認・完了', component: renderConfirmationStep },
  ];

  const handleNext = async () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      await saveProfile();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const saveProfile = async () => {
    setIsLoading(true);
    try {
      // プロファイル保存
      const savedProfile = await PersonalizationService.saveUserProfile(profileForm);
      
      // 週間スケジュール保存
      if (Object.values(weeklyForm).some(v => v && v !== weeklyForm.description)) {
        await PersonalizationService.saveWeeklySchedule(weeklyForm);
      }

      Alert.alert('設定完了', 'プロファイル設定が完了しました！', [
        { text: 'OK', onPress: () => onSetupComplete(savedProfile) }
      ]);

    } catch (error) {
      console.error('プロファイル保存エラー:', error);
      Alert.alert('エラー', 'プロファイルの保存に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const getLifestyleLabel = (lifestyle: string): string => {
    const labels = {
      student: '学生',
      employee: '会社員',
      freelancer: 'フリーランス',
      homemaker: '主婦/主夫',
      retired: '退職者',
      other: 'その他',
    };
    return labels[lifestyle] || lifestyle;
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return profileForm.lifestyle && profileForm.ageGroup;
      case 1: return profileForm.interests.length > 0;
      case 2: return profileForm.priorities.length > 0;
      case 3: return true; // 自由記述は任意
      case 4: return true; // スケジュールは任意
      case 5: return true; // 確認画面
      default: return false;
    }
  };

  return (
    <View style={styles.container}>
      {/* プログレスバー */}
      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>
          ステップ {currentStep + 1} / {steps.length}: {steps[currentStep].title}
        </Text>
        <View style={styles.progressBar}>
          <View 
            style={[styles.progressFill, { width: `${((currentStep + 1) / steps.length) * 100}%` }]} 
          />
        </View>
      </View>

      {/* ステップコンテンツ */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {steps[currentStep].component()}
      </ScrollView>

      {/* ナビゲーションボタン */}
      <View style={styles.navigationContainer}>
        {currentStep > 0 && (
          <TouchableOpacity style={styles.navButton} onPress={handlePrevious}>
            <Text style={styles.navButtonText}>戻る</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity 
          style={[
            styles.navButton, 
            styles.nextButton,
            !canProceed() && styles.navButtonDisabled
          ]} 
          onPress={handleNext}
          disabled={!canProceed() || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.navButtonText}>
              {currentStep === steps.length - 1 ? '完了' : '次へ'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  progressContainer: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  progressText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 3,
  },
  content: {
    flex: 1,
  },
  stepContainer: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  stepDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    lineHeight: 24,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionButton: {
    backgroundColor: 'white',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 10,
  },
  optionButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  optionText: {
    fontSize: 14,
    color: '#333',
  },
  optionTextSelected: {
    color: 'white',
  },
  textInput: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  textAreaMedium: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 14,
    textAlignVertical: 'top',
    minHeight: 80,
    marginBottom: 15,
  },
  textAreaLarge: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 14,
    textAlignVertical: 'top',
    minHeight: 100,
    marginBottom: 15,
  },
  helpBox: {
    backgroundColor: '#e8f5e8',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c3e6c3',
    marginTop: 20,
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2d5d2d',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 12,
    color: '#2d5d2d',
    lineHeight: 18,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  dayLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    width: 80,
  },
  scheduleInput: {
    flex: 1,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    marginLeft: 10,
  },
  confirmationBox: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  confirmationLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
    marginBottom: 5,
  },
  confirmationText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  navButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  nextButton: {
    backgroundColor: '#34C759',
  },
  navButtonDisabled: {
    backgroundColor: '#ccc',
  },
  navButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default UserProfileSetup;