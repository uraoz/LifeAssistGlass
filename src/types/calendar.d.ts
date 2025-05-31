// calendar.d.ts - Google Calendar関連の型定義

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  location?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>;
  status: string;
  htmlLink: string;
}

export interface CalendarInfo {
  todayEvents: CalendarEvent[];
  upcomingEvents: CalendarEvent[];
  currentEvent?: CalendarEvent;
  nextEvent?: CalendarEvent;
  totalEventsToday: number;
}

export interface GoogleCalendarTokens {
  accessToken: string;
  refreshToken?: string;
  expiryDate?: number;
  tokenType?: string;
}

export interface GoogleCalendarApiResponse {
  kind: string;
  etag: string;
  summary: string;
  updated: string;
  timeZone: string;
  accessRole: string;
  defaultReminders: Array<{
    method: string;
    minutes: number;
  }>;
  nextPageToken?: string;
  items: CalendarEvent[];
}

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  tokens?: GoogleCalendarTokens;
  error?: string;
}
