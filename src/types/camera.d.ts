export interface CapturedPhoto {
  path: string;
  width: number;
  height: number;
  isRawPhoto: boolean;
  orientation: 'portrait' | 'landscape-left' | 'landscape-right' | 'portrait-upside-down';
  isMirrored: boolean;
}