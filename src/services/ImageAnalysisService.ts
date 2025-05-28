import { GoogleGenAI } from '@google/genai';
import { GEMINI_API_KEY } from '@env';
import { AnalysisResult, LifeAssistContext } from '../types';

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

  // LifeAssist用プロンプト生成（テキストのみ）
  private generateLifeAssistPrompt(context: LifeAssistContext): string {
    const locationText = this.formatLocationInfo(context.location);
    const weatherText = this.formatWeatherInfo(context.weather);

    return `あなたは装着者の生活をサポートするAIアシスタントです。

【現在時刻】: ${context.currentTime}
【現在地】: ${locationText}
【天気状況】: ${weatherText}

上記の情報を基に、装着者に対する適切なアドバイス・情報提供を日本語で50文字以内で生成してください。

現在地と天気を考慮して、以下のような実用的なアドバイスを提供してください：
- 外出時の注意点（天気・気温に応じた服装など）
- 現在地周辺の情報
- 健康・安全面でのアドバイス

簡潔で実用的なアドバイスをお願いします。`;
  }

  // LifeAssist用プロンプト生成（画像付き）
  private generateImageAnalysisPrompt(context: LifeAssistContext): string {
    const locationText = this.formatLocationInfo(context.location);
    const weatherText = this.formatWeatherInfo(context.weather);

    return `あなたは装着者の生活をサポートするAIアシスタントです。

【画像情報】: 装着者が現在見ている景色
【現在時刻】: ${context.currentTime}
【現在地】: ${locationText}
【天気状況】: ${weatherText}

この画像と現在の状況を分析して、装着者に対する適切なアドバイス・情報提供を日本語で50文字以内で生成してください。

画像の内容と現在地・天気情報を組み合わせて、以下のような観点からアドバイスしてください：
- 画像に映っている物や状況に関する情報
- 現在の天気・位置を考慮した安全面でのアドバイス
- 効率的な行動提案
- 健康面での注意点

簡潔で実用的なアドバイスをお願いします。`;
  }

  // 画像解析（テキストのみ）
  async analyzeImage(imagePath: string, context: LifeAssistContext): Promise<AnalysisResult> {
    try {
      console.log('テキスト解析開始:', imagePath);
      
      // APIキーの確認
      if (!GEMINI_API_KEY) {
        throw new Error('APIキーが設定されていません');
      }

      console.log('APIキー確認完了');
      
      // テキストのみでAPI呼び出し
      const prompt = this.generateLifeAssistPrompt(context);
      
      const response = await this.genAI.models.generateContent({
        model: 'gemini-2.0-flash-001',
        contents: prompt,
      });

      const analysisText = response.text;
      
      console.log('テキスト解析結果:', analysisText);

      return {
        text: analysisText,
        timestamp: new Date(),
        success: true
      };

    } catch (error) {
      console.error('テキスト解析エラー:', error);
      return {
        text: `解析に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
        timestamp: new Date(),
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー'
      };
    }
  }

  // 画像付きでGemini Vision APIを呼び出す
  async analyzeImageWithPhoto(imagePath: string, context: LifeAssistContext): Promise<AnalysisResult> {
    try {
      console.log('画像付き解析開始:', imagePath);
      
      // APIキーの確認
      if (!GEMINI_API_KEY) {
        throw new Error('APIキーが設定されていません');
      }

      // 画像をBase64に変換
      const base64Image = await this.imageToBase64(imagePath);
      console.log('Base64変換完了、長さ:', base64Image.length);
      
      // 画像付きプロンプト
      const prompt = this.generateImageAnalysisPrompt(context);

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
      
      console.log('画像解析結果:', analysisText);

      return {
        text: analysisText,
        timestamp: new Date(),
        success: true
      };

    } catch (error) {
      console.error('画像解析エラー:', error);
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