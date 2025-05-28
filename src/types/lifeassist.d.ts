import { LocationInfo } from './location';
import { WeatherInfo } from './weather';

export interface LifeAssistContext {
  currentTime: string;
  location?: LocationInfo;
  weather?: WeatherInfo;
  userPreferences?: string[];
}

export interface AnalysisResult {
  text: string;
  timestamp: Date;
  success: boolean;
  error?: string;
}