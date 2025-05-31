// GoogleCalendarService.ts - Google Calendar API連携サービス

import { GOOGLE_OAUTH_CLIENT_ID, GOOGLE_CALENDAR_API_KEY, GOOGLE_OAUTH_CLIENT_SECRET } from '@env';
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
  private readonly OAUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
  private readonly TOKEN_URL = 'https://oauth2.googleapis.com/token';
  
  // OAuth認証用のスコープ
  private readonly SCOPES = 'https://www.googleapis.com/auth/calendar.readonly';
  
  // 認証状態管理
  private authState: AuthState = {
    isAuthenticated: false,
    isLoading: false,
  };

  // 認証状態の取得
  getAuthState(): AuthState {
    return { ...this.authState };
  }

  // OAuth認証URLの生成（React Native対応）
  generateAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: GOOGLE_OAUTH_CLIENT_ID,
      redirect_uri: 'urn:ietf:wg:oauth:2.0:oob', // モバイルアプリ用の標準URI
      response_type: 'code',
      scope: this.SCOPES,
      access_type: 'offline',
      prompt: 'consent',
      state: 'calendar_auth_' + Date.now(),
    });

    return `${this.OAUTH_URL}?${params.toString()}`;
  }

  // 認証コードからアクセストークンを取得
  async exchangeCodeForTokens(authCode: string): Promise<GoogleCalendarTokens | null> {
    try {
      this.authState.isLoading = true;

      console.log('Google Calendar認証開始...');

      const requestBody = new URLSearchParams({
        code: authCode,
        client_id: GOOGLE_OAUTH_CLIENT_ID,
        redirect_uri: 'urn:ietf:wg:oauth:2.0:oob',
        grant_type: 'authorization_code',
      });

      // client_secretが設定されている場合は追加
      if (GOOGLE_OAUTH_CLIENT_SECRET) {
        requestBody.append('client_secret', GOOGLE_OAUTH_CLIENT_SECRET);
      }

      const tokenResponse = await fetch(this.TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: requestBody.toString(),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('認証エラー:', errorText);
        
        let errorDetails = `HTTP ${tokenResponse.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          errorDetails += `: ${errorJson.error}`;
        } catch {
          errorDetails += `: ${errorText}`;
        }
        
        throw new Error(errorDetails);
      }

      const tokenData = await tokenResponse.json();
      
      const tokens: GoogleCalendarTokens = {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiryDate: Date.now() + (tokenData.expires_in * 1000),
        tokenType: tokenData.token_type || 'Bearer',
      };

      // トークンを保存
      await this.saveTokens(tokens);
      
      this.authState = {
        isAuthenticated: true,
        isLoading: false,
        tokens,
      };

      return tokens;

    } catch (error) {
      console.error('認証エラー:', error);
      this.authState = {
        isAuthenticated: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      return null;
    } finally {
      this.authState.isLoading = false;
    }
  }

  // トークンの保存
  private async saveTokens(tokens: GoogleCalendarTokens): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(tokens));
    } catch (error) {
      console.error('トークン保存エラー:', error);
    }
  }

  // 保存されたトークンの読み込み
  async loadStoredTokens(): Promise<GoogleCalendarTokens | null> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
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
      this.authState = {
        isAuthenticated: false,
        isLoading: false,
      };
    } catch (error) {
      console.error('トークンクリアエラー:', error);
    }
  }

  // アクセストークンの取得（リフレッシュ処理含む）
  private async getValidAccessToken(): Promise<string | null> {
    const tokens = await this.loadStoredTokens();
    if (!tokens) return null;

    // トークンがまだ有効な場合
    if (!tokens.expiryDate || Date.now() < tokens.expiryDate - 60000) { // 1分の余裕を持つ
      return tokens.accessToken;
    }

    // リフレッシュトークンでアクセストークンを更新
    if (tokens.refreshToken) {
      return await this.refreshAccessToken(tokens.refreshToken);
    }

    return null;
  }

  // アクセストークンのリフレッシュ
  private async refreshAccessToken(refreshToken: string): Promise<string | null> {
    try {
      const response = await fetch(this.TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          refresh_token: refreshToken,
          client_id: GOOGLE_OAUTH_CLIENT_ID,
          grant_type: 'refresh_token',
        }).toString(),
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.status}`);
      }

      const data = await response.json();
      
      const newTokens: GoogleCalendarTokens = {
        accessToken: data.access_token,
        refreshToken: refreshToken, // リフレッシュトークンは変わらない場合が多い
        expiryDate: Date.now() + (data.expires_in * 1000),
        tokenType: data.token_type || 'Bearer',
      };

      await this.saveTokens(newTokens);
      this.authState.tokens = newTokens;

      return newTokens.accessToken;
    } catch (error) {
      console.error('トークンリフレッシュエラー:', error);
      await this.clearStoredTokens();
      return null;
    }
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
      },
    });

    if (!response.ok) {
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
      return true; // エラーの場合は認証が必要とみなす
    }
  }
}

export default new GoogleCalendarService();
