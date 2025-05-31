import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  PhotoFile,
  TakePhotoOptions,
} from 'react-native-vision-camera';
import ImageAnalysisService from '../services/ImageAnalysisService';
import ContextService, { EnhancedLifeAssistContext } from '../services/ContextService';
import { AnalysisResult, LifeAssistContext, LocationInfo, WeatherInfo, CalendarInfo } from '../types';

const CameraScreen: React.FC = () => {
  const [capturedPhoto, setCapturedPhoto] = useState<PhotoFile | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationInfo | null>(null);
  const [currentWeather, setCurrentWeather] = useState<WeatherInfo | null>(null);
  const [currentCalendar, setCurrentCalendar] = useState<CalendarInfo | null>(null);
  const [enhancedContext, setEnhancedContext] = useState<EnhancedLifeAssistContext | null>(null);
  const [contextQuality, setContextQuality] = useState<any>(null);
  const [loadingStage, setLoadingStage] = useState<string>('');

  const camera = useRef<Camera>(null);
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();

  // 権限確認
  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  // 写真撮影
  const takePhoto = async () => {
    if (!camera.current || !device) {
      Alert.alert('エラー', 'カメラが利用できません');
      return;
    }

    try {
      const options: TakePhotoOptions = {
        qualityPrioritization: 'speed',
        enableShutterSound: true,
      };

      const photo = await camera.current.takePhoto(options);
      setCapturedPhoto(photo);
      setShowPreview(true);
      
      console.log('撮影完了:', photo.path);
    } catch (error) {
      console.error('撮影エラー:', error);
      Alert.alert('エラー', '撮影に失敗しました');
    }
  };

  // 画像解析実行（個人化対応・統合コンテキスト版）
  const analyzePhoto = async () => {
    if (!capturedPhoto) return;

    setIsAnalyzing(true);
    setLoadingStage('統合コンテキストを収集中...');
    
    try {
      console.log('統合コンテキスト収集開始');
      
      // 統合コンテキストの収集
      const context = await ContextService.collectEnhancedContext({
        includeLocation: true,
        includeWeather: true,
        includeCalendar: true,
        includePersonalization: true,
        timeout: 15000,
      });

      setEnhancedContext(context);
      
      // 個別データの状態更新（UI表示用）
      setCurrentLocation(context.location);
      setCurrentWeather(context.weather);
      setCurrentCalendar(context.calendar);

      // コンテキスト品質評価
      const quality = ContextService.assessContextQuality(context);
      setContextQuality(quality);
      
      console.log('コンテキスト品質:', quality);
      console.log(ContextService.summarizeContext(context));

      setLoadingStage('個人化AIアドバイスを生成中...');

      // 個人化対応画像解析実行
      const result = await ImageAnalysisService.analyzeImageWithPhoto(capturedPhoto.path, context);
      setAnalysisResult(result);

      console.log('個人化アドバイス生成完了:', result);

    } catch (error) {
      console.error('統合解析エラー:', error);
      Alert.alert('エラー', 'コンテキスト情報の取得に失敗しました');
      
      // フォールバック：基本コンテキストで解析
      try {
        setLoadingStage('基本コンテキストで解析中...');
        const basicContext = await ContextService.collectBasicContext();
        const result = await ImageAnalysisService.analyzeImageWithPhoto(capturedPhoto.path, basicContext);
        setAnalysisResult(result);
      } catch (fallbackError) {
        console.error('フォールバック解析エラー:', fallbackError);
        const errorResult = {
          text: '解析に失敗しました。ネットワーク接続を確認してください。',
          timestamp: new Date(),
          success: false,
          error: fallbackError instanceof Error ? fallbackError.message : '不明なエラー'
        };
        setAnalysisResult(errorResult);
      }
    } finally {
      setIsAnalyzing(false);
      setLoadingStage('');
    }
  };

  // 統合コンテキストテスト（画像なし）
  const testAPIWithLocation = async () => {
    setIsAnalyzing(true);
    setLoadingStage('統合コンテキストを収集中...');
    
    try {
      console.log('統合コンテキストテスト開始');
      
      // 統合コンテキストの収集
      const context = await ContextService.collectEnhancedContext({
        includeLocation: true,
        includeWeather: true,
        includeCalendar: true,
        includePersonalization: true,
        timeout: 15000,
      });

      setEnhancedContext(context);
      
      // 個別データの状態更新（UI表示用）
      setCurrentLocation(context.location);
      setCurrentWeather(context.weather);
      setCurrentCalendar(context.calendar);

      // コンテキスト品質評価
      const quality = ContextService.assessContextQuality(context);
      setContextQuality(quality);
      
      console.log('テスト - コンテキスト品質:', quality);
      console.log('テスト - コンテキスト要約:', ContextService.summarizeContext(context));

      setLoadingStage('個人化AIアドバイスを生成中...');

      // 個人化対応テキスト解析実行
      const result = await ImageAnalysisService.analyzeImage('', context);
      setAnalysisResult(result);

      console.log('個人化テストアドバイス:', result);

    } catch (error) {
      console.error('統合テストエラー:', error);
      Alert.alert('エラー', 'コンテキスト情報の取得に失敗しました');
      
      // フォールバック
      try {
        setLoadingStage('基本テスト実行中...');
        const basicContext = await ContextService.collectBasicContext();
        const result = await ImageAnalysisService.analyzeImage('', basicContext);
        setAnalysisResult(result);
      } catch (fallbackError) {
        console.error('フォールバックテストエラー:', fallbackError);
        const errorResult = {
          text: 'テストに失敗しました。設定を確認してください。',
          timestamp: new Date(),
          success: false,
          error: fallbackError instanceof Error ? fallbackError.message : '不明なエラー'
        };
        setAnalysisResult(errorResult);
      }
    } finally {
      setIsAnalyzing(false);
      setLoadingStage('');
    }
  };

  // 新しい撮影
  const resetCamera = () => {
    setCapturedPhoto(null);
    setAnalysisResult(null);
    setShowPreview(false);
  };

  // 簡易APIテスト（画像なし・フォールバック用）
  const testAPI = async () => {
    setIsAnalyzing(true);
    setLoadingStage('簡易テスト実行中...');
    
    const context: LifeAssistContext = {
      currentTime: new Date().toLocaleString('ja-JP'),
    };

    const result = await ImageAnalysisService.analyzeImage('', context);
    setAnalysisResult(result);
    setIsAnalyzing(false);
    setLoadingStage('');
  };

  // 権限がない場合
  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>カメラの権限が必要です</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>権限を許可</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.testButton]} onPress={testAPIWithLocation}>
          <Text style={styles.buttonText}>統合APIテスト</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // デバイスがない場合
  if (!device) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>カメラデバイスが見つかりません</Text>
        <TouchableOpacity style={[styles.button, styles.testButton]} onPress={testAPIWithLocation}>
          <Text style={styles.buttonText}>統合APIテスト</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {showPreview && capturedPhoto ? (
        // 撮影結果表示画面
        <ScrollView style={styles.previewContainer}>
          <Image source={{ uri: `file://${capturedPhoto.path}` }} style={styles.previewImage} />
          
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.button} onPress={resetCamera}>
              <Text style={styles.buttonText}>再撮影</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.analyzeButton]} 
              onPress={analyzePhoto}
              disabled={isAnalyzing}
            >
              <Text style={styles.buttonText}>
                {isAnalyzing ? '解析中...' : 'AI解析'}
              </Text>
            </TouchableOpacity>
          </View>

          {isAnalyzing && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>
                {loadingStage || '画像を解析しています...'}
              </Text>
            </View>
          )}

          {/* コンテキスト品質評価表示 */}
          {contextQuality && (
            <View style={styles.qualityContainer}>
              <Text style={styles.qualityLabel}>🎯 個人化品質スコア: {contextQuality.score}/100</Text>
              <View style={styles.qualityBar}>
                <View style={[styles.qualityFill, { width: `${contextQuality.score}%` }]} />
              </View>
              <Text style={styles.qualityDetails}>
                完成度: {contextQuality.completeness}% | 
                個人化: {contextQuality.personalizationLevel === 'high' ? '🟢 高' : 
                        contextQuality.personalizationLevel === 'medium' ? '🟡 中' : 
                        contextQuality.personalizationLevel === 'basic' ? '🟠 基本' : '🔴 なし'}
              </Text>
              {contextQuality.recommendations.length > 0 && (
                <Text style={styles.qualityRecommendations}>
                  💡 {contextQuality.recommendations[0]}
                </Text>
              )}
            </View>
          )}

          {/* 個人化コンテキスト表示 */}
          {enhancedContext && (
            <View style={styles.contextContainer}>
              <Text style={styles.contextLabel}>
                🧠 個人化コンテキスト ({enhancedContext.personalSchedule.isPersonalized ? '有効' : '基本'})
              </Text>
              
              <View style={styles.infoBox}>
                <Text style={styles.infoTitle}>時間的コンテキスト</Text>
                <Text style={styles.infoText}>
                  📅 {enhancedContext.timeContext.dayOfWeek} | 
                  🕐 {enhancedContext.timeContext.timeOfDay} | 
                  🗓️ {enhancedContext.timeContext.season}
                </Text>
              </View>

              {enhancedContext.personalSchedule.isPersonalized && (
                <View style={styles.infoBox}>
                  <Text style={styles.infoTitle}>個人スケジュール</Text>
                  <Text style={styles.infoText}>
                    段階: {enhancedContext.personalSchedule.schedulePhase}
                  </Text>
                  {enhancedContext.personalSchedule.currentPattern && (
                    <Text style={styles.infoSubText}>
                      パターン: {enhancedContext.personalSchedule.currentPattern}
                    </Text>
                  )}
                </View>
              )}
            </View>
          )}

          {/* 基本情報表示 */}
          {(currentLocation || currentWeather || currentCalendar) && (
            <View style={styles.contextContainer}>
              <Text style={styles.contextLabel}>📍 基本情報:</Text>
              
              {currentLocation && (
                <View style={styles.infoBox}>
                  <Text style={styles.infoTitle}>位置情報</Text>
                  <Text style={styles.infoText}>
                    📍 {currentLocation.address || `${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)}`}
                  </Text>
                </View>
              )}
              
              {currentWeather && (
                <View style={styles.infoBox}>
                  <Text style={styles.infoTitle}>天気情報</Text>
                  <Text style={styles.infoText}>
                    🌡️ {currentWeather.temperature}°C / {currentWeather.description}
                  </Text>
                  <Text style={styles.infoSubText}>
                    💧 湿度: {currentWeather.humidity}% | 🌬️ 風速: {currentWeather.windSpeed}m/s
                  </Text>
                </View>
              )}

              {currentCalendar && (
                <View style={styles.infoBox}>
                  <Text style={styles.infoTitle}>スケジュール情報</Text>
                  {currentCalendar.currentEvent && (
                    <Text style={styles.infoText}>
                      🔴 現在: {currentCalendar.currentEvent.summary}
                    </Text>
                  )}
                  {currentCalendar.nextEvent && (
                    <Text style={styles.infoText}>
                      ⏰ 次: {currentCalendar.nextEvent.summary}
                    </Text>
                  )}
                  <Text style={styles.infoSubText}>
                    📅 今日の予定: {currentCalendar.totalEventsToday}件
                  </Text>
                </View>
              )}
            </View>
          )}

          {analysisResult && (
            <View style={styles.resultContainer}>
              <Text style={styles.resultLabel}>📱 LifeAssist アドバイス:</Text>
              <View style={[styles.resultBox, analysisResult.success ? styles.resultSuccess : styles.resultError]}>
                <Text style={styles.resultText}>{analysisResult.text}</Text>
                <Text style={styles.timestamp}>
                  {analysisResult.timestamp.toLocaleString('ja-JP')}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      ) : (
        // カメラプレビュー画面
        <View style={styles.cameraContainer}>
          <Camera
            ref={camera}
            style={styles.camera}
            device={device}
            isActive={true}
            photo={true}
          />
          
          <View style={styles.cameraControls}>
            <TouchableOpacity style={styles.testAPIButton} onPress={testAPIWithLocation}>
              <Text style={styles.testAPIText}>統合テスト</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.captureButton} onPress={takePhoto}>
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>
            
            <View style={styles.placeholder} />
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraControls: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  testAPIButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'white',
  },
  testAPIText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'white',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
  },
  placeholder: {
    width: 60,
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  previewImage: {
    width: '100%',
    height: 400,
    resizeMode: 'contain',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
  },
  analyzeButton: {
    backgroundColor: '#34C759',
  },
  testButton: {
    backgroundColor: '#FF9500',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  resultContainer: {
    margin: 20,
  },
  resultLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  resultBox: {
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
  },
  resultSuccess: {
    backgroundColor: '#f0f9ff',
    borderColor: '#34C759',
  },
  resultError: {
    backgroundColor: '#fff5f5',
    borderColor: '#FF3B30',
  },
  resultText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    marginBottom: 10,
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
  },
  permissionText: {
    fontSize: 18,
    textAlign: 'center',
    color: 'white',
    margin: 20,
  },
  contextContainer: {
    margin: 20,
    marginTop: 10,
  },
  contextLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  infoBox: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  infoSubText: {
    fontSize: 12,
    color: '#777',
    marginTop: 2,
  },
  qualityContainer: {
    margin: 20,
    marginTop: 10,
    backgroundColor: '#f0f9ff',
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  qualityLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  qualityBar: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    marginBottom: 8,
  },
  qualityFill: {
    height: '100%',
    backgroundColor: '#34C759',
    borderRadius: 3,
  },
  qualityDetails: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  qualityRecommendations: {
    fontSize: 11,
    color: '#007AFF',
    fontStyle: 'italic',
  },
});

export default CameraScreen;