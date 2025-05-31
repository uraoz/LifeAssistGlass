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
import LocationService from '../services/LocationService';
import WeatherService from '../services/WeatherService';
import GoogleCalendarService from '../services/GoogleCalendarService';
import { AnalysisResult, LifeAssistContext, LocationInfo, WeatherInfo, CalendarInfo } from '../types';

const CameraScreen: React.FC = () => {
  const [capturedPhoto, setCapturedPhoto] = useState<PhotoFile | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationInfo | null>(null);
  const [currentWeather, setCurrentWeather] = useState<WeatherInfo | null>(null);
  const [currentCalendar, setCurrentCalendar] = useState<CalendarInfo | null>(null);
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

  // 画像解析実行（位置情報・天気情報統合版）
  const analyzePhoto = async () => {
    if (!capturedPhoto) return;

    setIsAnalyzing(true);
    setLoadingStage('位置情報を取得中...');
    
    try {
      // 1. 位置情報の取得
      console.log('位置情報取得開始');
      const location = await LocationService.getCurrentLocation();
      setCurrentLocation(location);
      
      let weather: WeatherInfo | null = null;
      
      if (location) {
        // 2. 天気情報の取得
        setLoadingStage('天気情報を取得中...');
        console.log('天気情報取得開始:', location);
        weather = await WeatherService.getWeatherInfo(location);
        setCurrentWeather(weather);
      }

      // 3. カレンダー情報の取得
      let calendar: CalendarInfo | null = null;
      setLoadingStage('カレンダー情報を取得中...');
      console.log('カレンダー情報取得開始');
      
      try {
        const isAuthRequired = await GoogleCalendarService.isAuthenticationRequired();
        
        if (!isAuthRequired) {
          calendar = await GoogleCalendarService.getTodayCalendarInfo();
          setCurrentCalendar(calendar);
          console.log('カレンダー情報取得:', calendar ? `今日の予定${calendar.totalEventsToday}件` : '情報なし');
        }
      } catch (calendarError) {
        console.log('カレンダー情報取得をスキップ:', calendarError);
      }

      // 4. LifeAssistコンテキストの生成
      setLoadingStage('画像を解析中...');
      
      const context: LifeAssistContext = {
        currentTime: new Date().toLocaleString('ja-JP', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          timeZone: 'Asia/Tokyo'
        }),
        location: location,
        weather: weather,
        calendar: calendar,
      };

      console.log('統合コンテキスト:', context);

      // 4. 画像解析実行
      const result = await ImageAnalysisService.analyzeImageWithPhoto(capturedPhoto.path, context);
      setAnalysisResult(result);

    } catch (error) {
      console.error('統合解析エラー:', error);
      Alert.alert('エラー', '位置情報または天気情報の取得に失敗しました');
      
      // フォールバック：基本情報のみで解析
      const fallbackContext: LifeAssistContext = {
        currentTime: new Date().toLocaleString('ja-JP'),
      };
      
      const result = await ImageAnalysisService.analyzeImageWithPhoto(capturedPhoto.path, fallbackContext);
      setAnalysisResult(result);
    } finally {
      setIsAnalyzing(false);
      setLoadingStage('');
    }
  };

  // 位置情報・天気情報統合テスト（画像なし）
  const testAPIWithLocation = async () => {
    setIsAnalyzing(true);
    setLoadingStage('位置情報を取得中...');
    
    try {
      // 位置情報取得
      const location = await LocationService.getCurrentLocation();
      setCurrentLocation(location);
      
      let weather: WeatherInfo | null = null;
      
      if (location) {
        // 天気情報取得
        setLoadingStage('天気情報を取得中...');
        weather = await WeatherService.getWeatherInfo(location);
        setCurrentWeather(weather);
      }

      // カレンダー情報取得
      let calendar: CalendarInfo | null = null;
      setLoadingStage('カレンダー情報を取得中...');
      
      try {
        const isAuthRequired = await GoogleCalendarService.isAuthenticationRequired();
        
        if (!isAuthRequired) {
          calendar = await GoogleCalendarService.getTodayCalendarInfo();
          setCurrentCalendar(calendar);
        }
      } catch (calendarError) {
        console.log('カレンダー情報取得をスキップ:', calendarError);
      }

      // 統合コンテキストでテスト
      setLoadingStage('AIアドバイスを生成中...');
      
      const context: LifeAssistContext = {
        currentTime: new Date().toLocaleString('ja-JP'),
        location: location,
        weather: weather,
        calendar: calendar,
      };

      const result = await ImageAnalysisService.analyzeImage('', context);
      setAnalysisResult(result);

    } catch (error) {
      console.error('統合テストエラー:', error);
      Alert.alert('エラー', '位置情報または天気情報の取得に失敗しました');
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

          {/* 位置情報・天気情報・カレンダー情報表示 */}
          {(currentLocation || currentWeather || currentCalendar) && (
            <View style={styles.contextContainer}>
              <Text style={styles.contextLabel}>📍 取得した情報:</Text>
              
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
});

export default CameraScreen;