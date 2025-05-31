import { LocationInfo } from './location';
import { WeatherInfo } from './weather';
import { CalendarInfo } from './calendar';

export interface LifeAssistContext {
  currentTime: string;
  location?: LocationInfo;
  weather?: WeatherInfo;
  calendar?: CalendarInfo;
  userPreferences?: string[];
}

export interface AnalysisResult {
  text: string;
  timestamp: Date;
  success: boolean;
  error?: string;
}