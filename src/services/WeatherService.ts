import { YAHOO_API_KEY } from '@env';
import { WeatherInfo, LocationInfo } from '../types';

// Yahoo天気APIのレスポンス型定義
interface YahooWeatherResponse {
  ResultInfo: {
    Count: number;
    Total: number;
    Start: number;
    Status: number;
    Description: string;
    Copyright: string;
  };
  Feature: Array<{
    Id: string;
    Name: string;
    Geometry: {
      Type: string;
      Coordinates: string;
    };
    Property: {
      WeatherAreaCode: string;
      WeatherList: {
        Weather: Array<{
          Type: string;
          Date: string;
          Rainfall: string;
        }>;
      };
    };
  }>;
}

class WeatherService {
  private readonly API_BASE_URL = 'https://map.yahooapis.jp/weather/V1/place';

  // 天気情報の取得
  async getWeatherInfo(location: LocationInfo): Promise<WeatherInfo | null> {
    try {
      if (!YAHOO_API_KEY) {
        console.error('Yahoo APIキーが設定されていません');
        return this.getFallbackWeather();
      }

      const { latitude, longitude } = location;
      
      // Yahoo天気APIのパラメータ設定（降水強度専用API）
      const params = new URLSearchParams({
        appid: YAHOO_API_KEY,
        coordinates: `${longitude},${latitude}`, // Yahoo APIは経度,緯度の順序
        output: 'json',
        interval: '10', // 10分間隔（デフォルト）
        past: '1', // 過去1時間の情報も取得
        // dateパラメータは省略（現在時刻で自動設定）
      });

      const url = `${this.API_BASE_URL}?${params.toString()}`;
      
      console.log('Yahoo天気API呼び出し:', url.replace(YAHOO_API_KEY, 'API_KEY'));
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Yahoo天気API呼び出し失敗: ${response.status}`, errorText);
        throw new Error(`Yahoo天気API呼び出し失敗: ${response.status}`);
      }

      const data: YahooWeatherResponse = await response.json();
      
      console.log('Yahoo天気データ取得成功:', data);

      // Yahoo APIのレスポンスをWeatherInfoに変換
      if (data.Feature && data.Feature.length > 0) {
        const weatherData = data.Feature[0].Property.WeatherList.Weather;
        
        // 現在の降水強度を取得（実測値を優先）
        const currentRainfall = this.getCurrentRainfall(weatherData);
        
        const weatherInfo: WeatherInfo = {
          temperature: await this.estimateTemperature(latitude, longitude),
          humidity: this.estimateHumidity(currentRainfall), // 降水量から湿度を推定
          description: this.mapRainfallToDescription(currentRainfall),
          condition: this.mapRainfallToCondition(currentRainfall),
          windSpeed: 0, // Yahoo天気APIには風速情報がない
          windDirection: 0,
          visibility: currentRainfall > 5 ? 5 : undefined, // 強雨時は視界不良
          uvIndex: undefined,
        };

        return weatherInfo;
      }

      return this.getFallbackWeather();

    } catch (error) {
      console.error('Yahoo天気情報取得エラー:', error);
      return this.getFallbackWeather();
    }
  }

  // 現在の降水強度を取得（実測値優先）
  private getCurrentRainfall(weatherData: any[]): number {
    // 実測値（observation）を優先して取得
    const observation = weatherData.find(w => w.Type === 'observation');
    if (observation) {
      return parseFloat(observation.Rainfall) || 0;
    }
    
    // 実測値がない場合は予測値（forecast）の最新を使用
    const forecast = weatherData.find(w => w.Type === 'forecast');
    if (forecast) {
      return parseFloat(forecast.Rainfall) || 0;
    }
    
    return 0; // データがない場合
  }

  // 降水量から湿度を推定
  private estimateHumidity(rainfall: number): number {
    if (rainfall === 0) return 45; // 晴れ
    if (rainfall <= 1) return 65;  // 小雨
    if (rainfall <= 3) return 75;  // 雨
    return 85; // 強雨
  }

  // 降水量から天気説明を生成
  private mapRainfallToDescription(rainfall: string): string {
    const rainfallValue = parseFloat(rainfall);
    
    if (rainfallValue === 0) return '晴れ';
    if (rainfallValue <= 1) return '小雨';
    if (rainfallValue <= 3) return '雨';
    if (rainfallValue <= 10) return '強雨';
    return '大雨';
  }

  // 降水量から天気状態を生成
  private mapRainfallToCondition(rainfall: string): string {
    const rainfallValue = parseFloat(rainfall);
    
    if (rainfallValue === 0) return 'clear';
    if (rainfallValue <= 1) return 'drizzle';
    return 'rain';
  }

  // 季節と時間帯から気温を推定（簡易版）
  private async estimateTemperature(latitude: number, longitude: number): Promise<number> {
    const now = new Date();
    const month = now.getMonth() + 1; // 1-12
    const hour = now.getHours(); // 0-23
    
    // 日本の平均的な気温を月別で推定
    const monthlyAvgTemp: { [key: number]: number } = {
      1: 5,   // 1月
      2: 7,   // 2月  
      3: 11,  // 3月
      4: 16,  // 4月
      5: 21,  // 5月
      6: 25,  // 6月
      7: 28,  // 7月
      8: 30,  // 8月
      9: 26,  // 9月
      10: 20, // 10月
      11: 14, // 11月
      12: 8   // 12月
    };

    let baseTemp = monthlyAvgTemp[month] || 20;
    
    // 時間帯による補正（日中は+5度、夜間は-5度）
    if (hour >= 6 && hour <= 18) {
      baseTemp += 3; // 日中は少し暖かく
    } else {
      baseTemp -= 3; // 夜間は少し寒く
    }
    
    // 緯度による補正（北に行くほど寒く）
    if (latitude > 36) baseTemp -= 2; // 北日本
    if (latitude < 34) baseTemp += 2; // 南日本
    
    return Math.round(baseTemp);
  }

  // フォールバック天気情報
  private getFallbackWeather(): WeatherInfo {
    const now = new Date();
    const hour = now.getHours();
    
    // 時間帯に基づく簡易的な天気情報
    return {
      temperature: 22,
      humidity: hour >= 6 && hour <= 18 ? 50 : 70,
      description: hour >= 6 && hour <= 18 ? '晴れ' : '曇り',
      condition: 'clear',
      windSpeed: 2,
      windDirection: 180,
    };
  }

  // 天気に基づくアドバイスの生成
  generateWeatherAdvice(weather: WeatherInfo): string[] {
    const advice: string[] = [];

    // 温度に基づくアドバイス
    if (weather.temperature >= 30) {
      advice.push('気温が高いです。水分補給を忘れずに');
    } else if (weather.temperature <= 5) {
      advice.push('とても寒いです。防寒対策をしっかりと');
    } else if (weather.temperature <= 15) {
      advice.push('肌寒いです。上着があると良いでしょう');
    }

    // 天気に基づくアドバイス
    switch (weather.condition) {
      case 'rain':
        advice.push('雨が降っています。傘をお忘れなく');
        break;
      case 'drizzle':
        advice.push('小雨が降っています。傘があると安心です');
        break;
      case 'clear':
        if (weather.temperature >= 25) {
          advice.push('良い天気です。日焼け対策をお忘れなく');
        }
        break;
    }

    // 湿度に基づくアドバイス
    if (weather.humidity >= 80) {
      advice.push('湿度が高いです。熱中症にご注意ください');
    } else if (weather.humidity <= 30) {
      advice.push('空気が乾燥しています。保湿を心がけてください');
    }

    return advice;
  }
}

export default new WeatherService();