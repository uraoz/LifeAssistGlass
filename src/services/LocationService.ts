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

  // エミュレータ検出
  private isEmulator(): boolean {
    // 一般的なエミュレータの検出方法
    if (Platform.OS === 'android') {
      try {
        const constants = Platform.constants as any;
        return (
          constants?.Serial?.includes('emulator') ||
          constants?.Fingerprint?.includes('generic') ||
          constants?.Model?.includes('sdk') ||
          constants?.Brand?.includes('generic')
        );
      } catch (error) {
        console.log('エミュレータ検出エラー:', error);
        return false;
      }
    }
    return false;
  }

  // エミュレータ用のダミー位置情報
  private getEmulatorLocation(): LocationInfo {
    console.log('エミュレータ環境検出：ダミー位置情報を使用');
    return {
      latitude: 35.6762,
      longitude: 139.6503,
      address: '東京都渋谷区（エミュレータ模擬位置）',
      city: '渋谷区',
      region: '東京都',
      country: '日本'
    };
  }

  // 現在位置の取得（エミュレータ対応強化版）
  async getCurrentLocation(): Promise<LocationInfo | null> {
    try {
      console.log('位置情報取得開始...');

      // エミュレータ環境の場合はダミー位置情報を返す
      if (this.isEmulator()) {
        console.log('エミュレータ環境のため、模擬位置情報を使用');
        return this.getEmulatorLocation();
      }

      // 権限確認
      const hasPermission = await this.requestLocationPermission();
      if (!hasPermission) {
        console.warn('位置情報権限が拒否されました');
        return this.getEmulatorLocation(); // フォールバック
      }

      return new Promise((resolve, reject) => {
        console.log('実デバイスでの位置情報取得を試行...');
        
        // タイムアウト処理を追加
        const timeoutId = setTimeout(() => {
          console.warn('位置情報取得タイムアウト - フォールバックを使用');
          resolve(this.getEmulatorLocation());
        }, 8000); // 8秒でタイムアウト

        Geolocation.getCurrentPosition(
          async (position) => {
            clearTimeout(timeoutId);
            const { latitude, longitude } = position.coords;
            const address = await this.reverseGeocode(latitude, longitude);
            
            console.log('実位置情報取得成功:', { latitude, longitude, address });
            
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
            clearTimeout(timeoutId);
            console.warn('位置情報取得エラー - フォールバックを使用:', error);
            resolve(this.getEmulatorLocation()); // エラー時もフォールバック
          },
          {
            enableHighAccuracy: false, // エミュレータでは false の方が安定
            timeout: 7000, // タイムアウトを短縮
            maximumAge: 300000, // 5分間キャッシュ
          }
        );
      });

    } catch (error) {
      console.error('位置情報サービスエラー - フォールバックを使用:', error);
      return this.getEmulatorLocation(); // 最終フォールバック
    }
  }
}

export default new LocationService();