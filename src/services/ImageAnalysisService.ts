// ImageAnalysisService.ts - 個人化対応版

import { GoogleGenAI } from '@google/genai';
import { GEMINI_API_KEY } from '@env';
import { AnalysisResult, LifeAssistContext } from '../types';
import PersonalizationService from './PersonalizationService';
import { PersonalizationData, PersonalScheduleContext, SchedulePhase } from '../types/personalization';

// 拡張されたコンテキスト型
interface EnhancedLifeAssistContext extends LifeAssistContext {
  personalization?: PersonalizationData;
  personalSchedule?: PersonalScheduleContext;
  timeContext?: {
    dayOfWeek: string;
    isWeekend: boolean;
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    season: 'spring' | 'summer' | 'autumn' | 'winter';
  };
}

class ImageAnalysisService {
  private genAI: GoogleGenAI;

  constructor() {
    // オブジェクト形式でAPIキーを渡す
    this.genAI = new GoogleGenAI({apiKey: GEMINI_API_KEY});
  }

  // 画像をBase64に変換
  private async imageToBase64(imagePath: string): Promise<string> {
    try {
      // React Nativeのfetch APIを使用
      const response = await fetch(`file://${imagePath}`);
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          // data:image/jpeg;base64, の部分を除去
          const base64String = base64data.split(',')[1];
          resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Base64変換エラー:', error);
      throw new Error('画像の読み込みに失敗しました');
    }
  }

  // 位置情報を文字列に変換
  private formatLocationInfo(location: any): string {
    if (!location) return '不明';
    if (typeof location === 'string') return location;
    
    // LocationInfoオブジェクトの場合
    if (location.address) return location.address;
    if (location.city && location.region) return `${location.region}${location.city}`;
    if (location.latitude && location.longitude) {
      return `緯度${location.latitude.toFixed(2)}, 経度${location.longitude.toFixed(2)}`;
    }
    return '位置情報取得中';
  }

  // 天気情報を文字列に変換
  private formatWeatherInfo(weather: any): string {
    if (!weather) return '不明';
    if (typeof weather === 'string') return weather;
    
    // WeatherInfoオブジェクトの場合
    const temp = weather.temperature ? `${weather.temperature}°C` : '';
    const desc = weather.description ? weather.description : '';
    const humidity = weather.humidity ? `湿度${weather.humidity}%` : '';
    
    const parts = [temp, desc, humidity].filter(part => part);
    return parts.length > 0 ? parts.join(', ') : '天気情報取得中';
  }

  // カレンダー情報を文字列に変換
  private formatCalendarInfo(calendar: any): string {
    if (!calendar) return '取得なし';
    
    const parts: string[] = [];
    
    // 現在のイベント
    if (calendar.currentEvent) {
      const event = calendar.currentEvent;
      const endTime = new Date(event.end.dateTime || event.end.date || '');
      const remainingMinutes = Math.round((endTime.getTime() - new Date().getTime()) / (1000 * 60));
      parts.push(`現在: ${event.summary}（あと${remainingMinutes}分）`);
    }
    
    // 次のイベント
    if (calendar.nextEvent) {
      const event = calendar.nextEvent;
      const startTime = new Date(event.start.dateTime || event.start.date || '');
      const minutesUntil = Math.round((startTime.getTime() - new Date().getTime()) / (1000 * 60));
      
      if (minutesUntil <= 60) {
        parts.push(`次: ${event.summary}（${minutesUntil}分後）`);
      } else {
        const hours = Math.round(minutesUntil / 60);
        parts.push(`次: ${event.summary}（${hours}時間後）`);
      }
    }
    
    // 今日の予定総数
    if (calendar.totalEventsToday > 0) {
      parts.push(`今日の予定: ${calendar.totalEventsToday}件`);
    } else {
      parts.push('今日は予定なし');
    }
    
    return parts.length > 0 ? parts.join(' / ') : 'カレンダー情報取得中';
  }

  // 時間的コンテキストの生成
  private generateTimeContext() {
    const now = new Date();
    const dayOfWeek = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'][now.getDay()];
    const isWeekend = [0, 6].includes(now.getDay());
    const hour = now.getHours();
    const month = now.getMonth() + 1;

    let timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    if (hour < 6) timeOfDay = 'night';
    else if (hour < 12) timeOfDay = 'morning';
    else if (hour < 18) timeOfDay = 'afternoon';
    else timeOfDay = 'evening';

    let season: 'spring' | 'summer' | 'autumn' | 'winter';
    if (month >= 3 && month <= 5) season = 'spring';
    else if (month >= 6 && month <= 8) season = 'summer';
    else if (month >= 9 && month <= 11) season = 'autumn';
    else season = 'winter';

    return { dayOfWeek, isWeekend, timeOfDay, season };
  }

  // ラベル変換ヘルパーメソッド
  private getLifestyleLabel(lifestyle?: string): string {
    const labels = {
      student: '学生',
      employee: '会社員',
      freelancer: 'フリーランス',
      homemaker: '主婦/主夫',
      retired: '退職者',
      other: 'その他',
    };
    return labels[lifestyle as keyof typeof labels] || '未設定';
  }

  private getCommunicationLabel(style?: string): string {
    const labels = {
      casual: 'カジュアル',
      friendly: '親しみやすい',
      formal: '丁寧・フォーマル',
    };
    return labels[style as keyof typeof labels] || 'バランスの取れた';
  }

  private getSchedulePhaseLabel(phase: SchedulePhase): string {
    const labels = {
      before_work: '出勤前',
      commute_to_work: '通勤中',
      work_time: '勤務時間',
      lunch_break: '昼休み',
      afternoon_work: '午後の勤務',
      commute_home: '帰宅中',
      after_work: '退勤後',
      dinner_time: '夕食時間',
      evening_free: '夜の自由時間',
      weekend_morning: '週末の朝',
      weekend_afternoon: '週末の午後',
      weekend_evening: '週末の夜',
      sleep_time: '就寝時間',
      unknown: '不明',
    };
    return labels[phase] || '一般的な時間';
  }

  private getTimeOfDayLabel(timeOfDay: string): string {
    const labels = {
      morning: '朝',
      afternoon: '午後',
      evening: '夜',
      night: '深夜',
    };
    return labels[timeOfDay as keyof typeof labels] || '不明';
  }

  private getSeasonLabel(season: string): string {
    const labels = {
      spring: '春',
      summer: '夏',
      autumn: '秋',
      winter: '冬',
    };
    return labels[season as keyof typeof labels] || '不明';
  }

  private getTodayPattern(weeklySchedule: any, dayOfWeek: string): string {
    const dayKey = dayOfWeek.replace('曜日', '').toLowerCase();
    const dayMap: { [key: string]: string } = {
      '日': 'sunday',
      '月': 'monday',
      '火': 'tuesday',
      '水': 'wednesday',
      '木': 'thursday',
      '金': 'friday',
      '土': 'saturday',
    };
    
    const key = dayMap[dayKey] || 'monday';
    return weeklySchedule[key] || '特別なパターンなし';
  }

  // 自由記述フィールドのフォーマット
  private formatFreeformFields(freeformFields: any): string {
    if (!freeformFields) return '';
    
    const sections: string[] = [];
    
    if (freeformFields.personalDescription) {
      sections.push(`【個人的特徴】: ${freeformFields.personalDescription}`);
    }
    
    if (freeformFields.dailyRoutineNotes) {
      sections.push(`【日常ルーティン】: ${freeformFields.dailyRoutineNotes}`);
    }
    
    if (freeformFields.personalGoals) {
      sections.push(`【個人的目標】: ${freeformFields.personalGoals}`);
    }
    
    if (freeformFields.challengesAndStruggles) {
      sections.push(`【課題・困りごと】: ${freeformFields.challengesAndStruggles}`);
    }
    
    if (freeformFields.preferredAdviceStyle) {
      sections.push(`【希望するアドバイススタイル】: ${freeformFields.preferredAdviceStyle}`);
    }
    
    if (freeformFields.workLifeDetails) {
      sections.push(`【仕事・生活詳細】: ${freeformFields.workLifeDetails}`);
    }
    
    if (freeformFields.hobbiesDetails) {
      sections.push(`【趣味・娯楽詳細】: ${freeformFields.hobbiesDetails}`);
    }
    
    if (freeformFields.uniqueCircumstances) {
      sections.push(`【特殊事情・配慮】: ${freeformFields.uniqueCircumstances}`);
    }
    
    return sections.length > 0 ? '\n' + sections.join('\n') : '';
  }

  // 個人化対応プロンプト生成
  private async generatePersonalizedPrompt(context: LifeAssistContext): Promise<string> {
    try {
      // 個人化データを取得
      const personalizationData = await PersonalizationService.getPersonalizationData();
      const personalSchedule = await PersonalizationService.getPersonalScheduleContext();
      const timeContext = this.generateTimeContext();

      // 個人化情報がない場合は基本プロンプトを使用
      if (!personalizationData.userProfile || !personalSchedule.isPersonalized) {
        return this.generateBasicPrompt(context);
      }

      const { userProfile, weeklySchedule, behaviorAnalysis, adviceHistory } = personalizationData;

      return `あなたは装着者の生活をサポートするAIアシスタントです。

【基本情報】:
- 現在時刻: ${context.currentTime}
- 現在地: ${this.formatLocationInfo(context.location)}
- 天気: ${this.formatWeatherInfo(context.weather)}
- スケジュール: ${this.formatCalendarInfo(context.calendar)}

【個人プロファイル】:
- ライフスタイル: ${this.getLifestyleLabel(userProfile.lifestyle)}
- 年齢層: ${userProfile.ageGroup}
- 価値観: ${userProfile.priorities.slice(0, 2).join('、')}重視
- コミュニケーション: ${this.getCommunicationLabel(userProfile.communicationStyle)}
${userProfile.healthConsiderations ? `- 健康配慮: ${userProfile.healthConsiderations}` : ''}

${this.formatFreeformFields(userProfile.freeformFields)}

【現在の状況】:
- ${timeContext.dayOfWeek}（${timeContext.isWeekend ? '週末' : '平日'}）の${this.getTimeOfDayLabel(timeContext.timeOfDay)}
- スケジュール段階: ${this.getSchedulePhaseLabel(personalSchedule.schedulePhase)}
${personalSchedule.currentPattern ? `- 今日のパターン: ${personalSchedule.currentPattern}` : ''}

上記の個人化された情報を基に、装着者に最適化されたアドバイスを50文字以内で日本語で生成してください。

【重視する要素】:
1. ${userProfile.priorities.slice(0, 1)}を最優先
2. ${this.getLifestyleLabel(userProfile.lifestyle)}に適した提案
3. ${this.getCommunicationLabel(userProfile.communicationStyle)}な話し方
4. 現在の${this.getSchedulePhaseLabel(personalSchedule.schedulePhase)}に適した内容

簡潔で個人に寄り添った実用的なアドバイスをお願いします。`;

    } catch (error) {
      console.error('個人化プロンプト生成エラー:', error);
      return this.generateBasicPrompt(context);
    }
  }

  // 基本プロンプト生成
  private generateBasicPrompt(context: LifeAssistContext): string {
    const locationText = this.formatLocationInfo(context.location);
    const weatherText = this.formatWeatherInfo(context.weather);
    const calendarText = this.formatCalendarInfo(context.calendar);

    return `あなたは装着者の生活をサポートするAIアシスタントです。

【現在時刻】: ${context.currentTime}
【現在地】: ${locationText}
【天気状況】: ${weatherText}
【スケジュール】: ${calendarText}

上記の情報を基に、装着者に対する適切なアドバイス・情報提供を日本語で50文字以内で生成してください。

現在地・天気・スケジュールを総合的に考慮して、以下のような実用的なアドバイスを提供してください：
- スケジュールに関する提案や注意点
- 外出時の注意点（天気・気温に応じた服装など）
- 現在地周辺の情報
- 健康・安全面でのアドバイス
- 時間管理に関するアドバイス

簡潔で実用的なアドバイスをお願いします。`;
  }

  // 画像付きプロンプト生成
  private async generateImagePrompt(context: LifeAssistContext): Promise<string> {
    const basePrompt = await this.generatePersonalizedPrompt(context);
    return basePrompt.replace(
      '上記の個人化された情報を基に',
      'この画像と上記の個人化された情報を基に'
    ).replace(
      '【基本情報】:',
      '【視覚情報】: 装着者が現在見ている景色\n【基本情報】:'
    );
  }

  // 画像解析（個人化対応・テキストのみ）
  async analyzeImage(imagePath: string, context: LifeAssistContext): Promise<AnalysisResult> {
    try {
      console.log('個人化対応テキスト解析開始:', imagePath);
      
      if (!GEMINI_API_KEY) {
        throw new Error('APIキーが設定されていません');
      }

      const prompt = await this.generatePersonalizedPrompt(context);
      
      const response = await this.genAI.models.generateContent({
        model: 'gemini-2.0-flash-001',
        contents: prompt,
      });

      const analysisText = response.text;
      
      console.log('個人化対応解析結果:', analysisText);

      return {
        text: analysisText,
        timestamp: new Date(),
        success: true
      };

    } catch (error) {
      console.error('個人化対応解析エラー:', error);
      return {
        text: `解析に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
        timestamp: new Date(),
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー'
      };
    }
  }

  // 画像付き解析（個人化対応）
  async analyzeImageWithPhoto(imagePath: string, context: LifeAssistContext): Promise<AnalysisResult> {
    try {
      console.log('個人化対応画像付き解析開始:', imagePath);
      
      if (!GEMINI_API_KEY) {
        throw new Error('APIキーが設定されていません');
      }

      const base64Image = await this.imageToBase64(imagePath);
      console.log('Base64変換完了、長さ:', base64Image.length);
      
      const prompt = await this.generateImagePrompt(context);

      const response = await this.genAI.models.generateContent({
        model: 'gemini-2.0-flash-001',
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: base64Image
                }
              }
            ]
          }
        ]
      });

      const analysisText = response.text;
      
      console.log('個人化対応画像解析結果:', analysisText);

      return {
        text: analysisText,
        timestamp: new Date(),
        success: true
      };

    } catch (error) {
      console.error('個人化対応画像解析エラー:', error);
      return {
        text: `画像解析に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
        timestamp: new Date(),
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー'
      };
    }
  }
}

export default new ImageAnalysisService();