export interface CapturedPhoto {
    path: string;
    width: number;
    height: number;
    isRawPhoto: boolean;
    orientation: 'portrait' | 'landscape-left' | 'landscape-right' | 'portrait-upside-down';
    isMirrored: boolean;
  }
  
  export interface AnalysisResult {
    text: string;
    timestamp: Date;
    success: boolean;
    error?: string;
  }
  
  export interface LifeAssistContext {
    currentTime: string;
    location?: string;
    weather?: string;
    userPreferences?: string[];
  }