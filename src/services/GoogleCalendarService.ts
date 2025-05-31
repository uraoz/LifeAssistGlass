// GoogleCalendarService.ts - react-native-app-auth対応版（メインサービス）

import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  CalendarInfo, 
  CalendarEvent, 
  GoogleCalendarTokens, 
  GoogleCalendarApiResponse,
  AuthState 
} from '../types/calendar';

class GoogleCalendarService {
  private readonly STORAGE_KEY = 'google_calendar_tokens';
  private readonly API_BASE_URL = 'https://www.googleapis.com/calendar/v3';
  
  // 認証状態管理
  private authState: AuthState = {
    isAuthenticated: false,
    isLoading: false,
  };

  // 認証状態の取得
  getAuthState(): AuthState {
    return { ...this.authState };
  }

  // 保存されたトークンの読み込み（新旧両方のキーをチェック）
  async loadStoredTokens(): Promise<GoogleCalendarTokens | null> {
    try {
      // 新しいキーを先にチェック
      let stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      
      // 新しいキーにデータがない場合、古いキーをチェック
      if (!stored) {
        stored = await AsyncStorage.getItem('google_calendar_tokens_native');
        if (stored) {
          // 古いキーから新しいキーにデータを移行
          await AsyncStorage.setItem(this.STORAGE_KEY, stored);
          await AsyncStorage.removeItem('google_calendar_tokens_native');
          console.log('トークンデータを新しいキーに移行しました');
        }
      }
      
      if (!stored) return null;

      const tokens: GoogleCalendarTokens = JSON.parse(stored);
      
      // トークンの有効期限をチェック
      if (tokens.expiryDate && Date.now() >= tokens.expiryDate) {
        console.log('保存されたトークンが期限切れです');
        await this.clearStoredTokens();
        return null;
      }

      this.authState = {
        isAuthenticated: true,
        isLoading: false,
        tokens,
      };

      return tokens;
    } catch (error) {
      console.error('トークン読み込みエラー:', error);
      return null;
    }
  }

  // トークンのクリア
  async clearStoredTokens(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
      await AsyncStorage.removeItem('google_calendar_tokens_native'); // 古いキーも削除
      this.authState = {
        isAuthenticated: false,
        isLoading: false,
      };
    } catch (error) {
      console.error('トークンクリアエラー:', error);
    }
  }

  // 有効なアクセストークンの取得
  async getValidAccessToken(): Promise<string | null> {
    const tokens = await this.loadStoredTokens();
    if (!tokens) return null;

    // トークンがまだ有効な場合
    if (!tokens.expiryDate || Date.now() < tokens.expiryDate - 60000) {
      return tokens.accessToken;
    }

    // react-native-app-authではリフレッシュは外部で処理される
    console.log('トークンが期限切れです。再認証が必要です。');
    return null;
  }

  // 今日のカレンダー情報を取得
  async getTodayCalendarInfo(): Promise<CalendarInfo | null> {
    try {
      const accessToken = await this.getValidAccessToken();
      if (!accessToken) {
        console.log('有効なアクセストークンがありません');
        return null;
      }

      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

      // 今日のイベントを取得
      const todayEvents = await this.getEvents(accessToken, startOfDay, endOfDay);
      
      // 明日以降の直近のイベントも取得（最大5件）
      const tomorrow = new Date(endOfDay.getTime());
      const nextWeek = new Date(tomorrow.getTime() + 7 * 24 * 60 * 60 * 1000);
      const upcomingEvents = await this.getEvents(accessToken, tomorrow, nextWeek, 5);

      // 現在進行中のイベントを検索
      const currentEvent = this.findCurrentEvent(todayEvents, now);
      
      // 次のイベントを検索
      const nextEvent = this.findNextEvent([...todayEvents, ...upcomingEvents], now);

      const calendarInfo: CalendarInfo = {
        todayEvents,
        upcomingEvents,
        currentEvent,
        nextEvent,
        totalEventsToday: todayEvents.length,
      };

      return calendarInfo;

    } catch (error) {
      console.error('カレンダー情報取得エラー:', error);
      return null;
    }
  }

  // 指定期間のイベントを取得
  private async getEvents(
    accessToken: string, 
    timeMin: Date, 
    timeMax: Date, 
    maxResults: number = 50
  ): Promise<CalendarEvent[]> {
    const params = new URLSearchParams({
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      maxResults: maxResults.toString(),
      singleEvents: 'true',
      orderBy: 'startTime',
    });

    const response = await fetch(`${this.API_BASE_URL}/calendars/primary/events?${params}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Calendar API error: ${response.status} - ${errorText}`);
      throw new Error(`Calendar API error: ${response.status}`);
    }

    const data: GoogleCalendarApiResponse = await response.json();
    return data.items || [];
  }

  // 現在進行中のイベントを検索
  private findCurrentEvent(events: CalendarEvent[], now: Date): CalendarEvent | undefined {
    return events.find(event => {
      const start = new Date(event.start.dateTime || event.start.date || '');
      const end = new Date(event.end.dateTime || event.end.date || '');
      return now >= start && now <= end;
    });
  }

  // 次のイベントを検索
  private findNextEvent(events: CalendarEvent[], now: Date): CalendarEvent | undefined {
    const futureEvents = events.filter(event => {
      const start = new Date(event.start.dateTime || event.start.date || '');
      return start > now;
    });

    // 開始時間でソート
    futureEvents.sort((a, b) => {
      const startA = new Date(a.start.dateTime || a.start.date || '');
      const startB = new Date(b.start.dateTime || b.start.date || '');
      return startA.getTime() - startB.getTime();
    });

    return futureEvents[0];
  }

  // カレンダー情報に基づくアドバイス生成
  generateCalendarAdvice(calendar: CalendarInfo): string[] {
    const advice: string[] = [];
    const now = new Date();

    // 現在のイベントに関するアドバイス
    if (calendar.currentEvent) {
      const event = calendar.currentEvent;
      const endTime = new Date(event.end.dateTime || event.end.date || '');
      const remainingMinutes = Math.round((endTime.getTime() - now.getTime()) / (1000 * 60));
      
      advice.push(`現在「${event.summary}」の時間です（あと${remainingMinutes}分）`);
    }

    // 次のイベントに関するアドバイス
    if (calendar.nextEvent) {
      const event = calendar.nextEvent;
      const startTime = new Date(event.start.dateTime || event.start.date || '');
      const minutesUntil = Math.round((startTime.getTime() - now.getTime()) / (1000 * 60));
      
      if (minutesUntil <= 15) {
        advice.push(`まもなく「${event.summary}」です（${minutesUntil}分後）`);
      } else if (minutesUntil <= 60) {
        advice.push(`次は「${event.summary}」です（${Math.round(minutesUntil / 60)}時間後）`);
      } else {
        const hours = Math.round(minutesUntil / 60);
        advice.push(`次の予定「${event.summary}」まで${hours}時間です`);
      }

      // 移動が必要な場合
      if (event.location) {
        advice.push(`会場は${event.location}です`);
      }
    }

    // 今日の予定の概要
    if (calendar.totalEventsToday > 0) {
      advice.push(`今日は${calendar.totalEventsToday}件の予定があります`);
    } else {
      advice.push('今日は予定のない一日です');
    }

    return advice;
  }

  // 認証が必要かどうかをチェック
  async isAuthenticationRequired(): Promise<boolean> {
    try {
      const tokens = await this.loadStoredTokens();
      const required = !tokens;
      console.log('認証チェック:', required ? '認証が必要' : '認証済み');
      return required;
    } catch (error) {
      console.error('認証チェックエラー:', error);
      return true;
    }
  }

  // カレンダー情報のテスト取得（デバッグ用）
  async testCalendarAccess(): Promise<{success: boolean, message: string, data?: any}> {
    try {
      const accessToken = await this.getValidAccessToken();
      if (!accessToken) {
        return {
          success: false,
          message: '認証が必要です'
        };
      }

      // シンプルなCalendar情報取得テスト
      const response = await fetch(`${this.API_BASE_URL}/calendars/primary`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        return {
          success: false,
          message: `API呼び出し失敗: ${response.status}`
        };
      }

      const calendarData = await response.json();
      return {
        success: true,
        message: 'Google Calendar API接続成功',
        data: {
          summary: calendarData.summary,
          timeZone: calendarData.timeZone,
          id: calendarData.id,
        }
      };

    } catch (error) {
      console.error('Calendar API テストエラー:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export default new GoogleCalendarService();