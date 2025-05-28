export interface WeatherInfo {
  temperature: number;
  humidity: number;
  description: string;
  condition: string; // 'clear', 'rain', 'snow', 'clouds', etc.
  windSpeed?: number;
  windDirection?: number;
  visibility?: number;
  uvIndex?: number;
}