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
import { AnalysisResult, LifeAssistContext } from '../types/camera';

const CameraScreen: React.FC = () => {
  const [capturedPhoto, setCapturedPhoto] = useState<PhotoFile | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

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

  // 画像解析実行
  const analyzePhoto = async () => {
    if (!capturedPhoto) return;

    setIsAnalyzing(true);
    // 現在時刻を正確に取得
    const now = new Date();
    console.log('現在時刻デバッグ:', now, now.toLocaleString('ja-JP'));
    // LifeAssistコンテキストの生成
    const context: LifeAssistContext = {
      currentTime: new Date().toLocaleString('ja-JP'),
      location: '東京都', // 後でGPS連携予定
      weather: '晴れ', // 後で天気API連携予定
    };

    const result = await ImageAnalysisService.analyzeImageWithPhoto(capturedPhoto.path, context);
    setAnalysisResult(result);
    setIsAnalyzing(false);
  };

  // 新しい撮影
  const resetCamera = () => {
    setCapturedPhoto(null);
    setAnalysisResult(null);
    setShowPreview(false);
  };

  // APIテスト（画像なし）
  const testAPI = async () => {
    setIsAnalyzing(true);
    
    const context: LifeAssistContext = {
      currentTime: new Date().toLocaleString('ja-JP'),
      location: '東京都',
      weather: '晴れ',
    };

    const result = await ImageAnalysisService.analyzeImage('', context);
    setAnalysisResult(result);
    setIsAnalyzing(false);
  };

  // 権限がない場合
  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>カメラの権限が必要です</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>権限を許可</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.testButton]} onPress={testAPI}>
          <Text style={styles.buttonText}>APIテスト（権限なし）</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // デバイスがない場合
  if (!device) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>カメラデバイスが見つかりません</Text>
        <TouchableOpacity style={[styles.button, styles.testButton]} onPress={testAPI}>
          <Text style={styles.buttonText}>APIテスト（カメラなし）</Text>
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
              <Text style={styles.loadingText}>画像を解析しています...</Text>
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
            <TouchableOpacity style={styles.testAPIButton} onPress={testAPI}>
              <Text style={styles.testAPIText}>API TEST</Text>
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
});

export default CameraScreen;