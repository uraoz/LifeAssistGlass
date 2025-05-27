import { GoogleGenAI } from '@google/genai';
import { GEMINI_API_KEY } from '@env';
import { AnalysisResult, LifeAssistContext } from '../types/camera';

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

  // LifeAssist用プロンプト生成（テキストのみ）
  private generateLifeAssistPrompt(context: LifeAssistContext): string {
    return `あなたは装着者の生活をサポートするAIアシスタントです。

【現在時刻】: ${context.currentTime}
【位置情報】: ${context.location || '不明'}
【天気】: ${context.weather || '不明'}

上記の情報を基に、装着者に対する適切なアドバイス・情報提供を日本語で50文字以内で生成してください。

簡潔で実用的なアドバイスをお願いします。`;
  }

  // LifeAssist用プロンプト生成（画像付き）
  private generateImageAnalysisPrompt(context: LifeAssistContext): string {
    return `あなたは装着者の生活をサポートするAIアシスタントです。

【画像情報】: 装着者が現在見ている景色
【現在時刻】: ${context.currentTime}
【位置情報】: ${context.location || '不明'}
【天気】: ${context.weather || '不明'}

この画像を分析して、装着者に対する適切なアドバイス・情報提供を日本語で50文字以内で生成してください。

例：
- 周囲の安全情報
- 物や人の特徴
- 行動提案
- 注意点

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