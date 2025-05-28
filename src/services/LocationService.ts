import Geolocation from '@react-native-community/geolocation';
import { PermissionsAndroid, Platform, Alert } from 'react-native';
import { LocationInfo } from '../types';

class LocationService {
  
  // Android位置情報権限の確認・要求
  private async requestLocationPermission(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'LifeAssist Glass 位置情報権限',
            message: '現在地に基づいた生活支援のために位置情報を使用します',
            buttonNeutral: '後で',
            buttonNegative: '拒否',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true; // iOS では Info.plist で設定済み
  }

  // 住所情報の取得（簡易版）
  private async reverseGeocode(latitude: number, longitude: number): Promise<string> {
    try {
      // Google Geocoding APIの代替として、簡易的な地域判定
      // 実際の実装では適切なGeocoding APIを使用してください
      
      // 東京都心部の大まかな判定
      if (latitude >= 35.6 && latitude <= 35.8 && longitude >= 139.6 && longitude <= 139.8) {
        if (latitude >= 35.65 && longitude >= 139.7) return '東京都渋谷区周辺';
        if (latitude >= 35.68 && longitude >= 139.75) return '東京都新宿区周辺'; 
        return '東京都心部';
      }
      
      // 大阪の大まかな判定
      if (latitude >= 34.6 && latitude <= 34.8 && longitude >= 135.4 && longitude <= 135.6) {
        return '大阪府大阪市周辺';
      }
      
      // その他の地域
      return `緯度${latitude.toFixed(2)}, 経度${longitude.toFixed(2)}`;
      
    } catch (error) {
      console.error('住所取得エラー:', error);
      return `緯度${latitude.toFixed(2)}, 経度${longitude.toFixed(2)}`;
    }
  }

  // 現在位置の取得
  async getCurrentLocation(): Promise<LocationInfo | null> {
    try {
      // 権限確認
      const hasPermission = await this.requestLocationPermission();
      if (!hasPermission) {
        Alert.alert('権限エラー', '位置情報の権限が必要です');
        return null;
      }

      return new Promise((resolve, reject) => {
        Geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            const address = await this.reverseGeocode(latitude, longitude);
            
            console.log('位置情報取得成功:', { latitude, longitude, address });
            
            resolve({
              latitude,
              longitude,
              address,
              city: address.split('区')[0] + '区', // 簡易的な市区町村抽出
              region: address.includes('東京') ? '東京都' : address.includes('大阪') ? '大阪府' : '不明',
              country: '日本'
            });
          },
          (error) => {
            console.error('位置情報取得エラー:', error);
            Alert.alert('位置情報エラー', '現在地を取得できませんでした');
            resolve(null);
          },
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 300000, // 5分間キャッシュ
          }
        );
      });

    } catch (error) {
      console.error('位置情報サービスエラー:', error);
      return null;
    }
  }
}

export default new LocationService();