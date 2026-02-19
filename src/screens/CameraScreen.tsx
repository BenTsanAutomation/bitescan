// Camera Screen with Viewfinder Frame
import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { BarcodeScanningResult, BarcodeType, CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { spacing, borderRadius, typography, ThemeColors } from '../theme';
import { LeafParticles } from '../animations/LeafParticles';
import { useThemeContext } from '../contexts/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const VIEWFINDER_SIZE = SCREEN_WIDTH * 0.75;

const SUPPORTED_BARCODE_TYPES: BarcodeType[] = ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'];

interface CameraScreenProps {
  onCapture: (imageUri: string) => void;
  onCaptureMenu?: (imageUri: string) => void;
  onBarcodeDetected?: (barcode: string) => Promise<void> | void;
  initialMode?: CaptureMode;
  onClose: () => void;
}

export type CaptureMode = 'food' | 'menu' | 'packaged';

export const CameraScreen: React.FC<CameraScreenProps> = ({
  onCapture,
  onCaptureMenu,
  onBarcodeDetected,
  initialMode = 'food',
  onClose,
}) => {
  const { colors } = useThemeContext();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const [isResolvingBarcode, setIsResolvingBarcode] = useState(false);
  const [barcodeError, setBarcodeError] = useState<string | null>(null);
  const [manualBarcode, setManualBarcode] = useState('');
  const [mode, setMode] = useState<CaptureMode>(initialMode);
  const cameraRef = useRef<CameraView>(null);
  const lastBarcodeRef = useRef<string>('');
  const lastBarcodeAtRef = useRef<number>(0);
  const scanLineY = useRef(new Animated.Value(0)).current;
  const fadeOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineY, {
          toValue: VIEWFINDER_SIZE - 4,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scanLineY, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.timing(fadeOpacity, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeOpacity, scanLineY]);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  const handleCapturedImage = (imageUri: string) => {
    if (mode === 'menu' && onCaptureMenu) {
      onCaptureMenu(imageUri);
      return;
    }
    onCapture(imageUri);
  };

  const handleCapture = async () => {
    if (!cameraRef.current || isCapturing || mode === 'packaged') return;

    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      if (photo?.uri) {
        handleCapturedImage(photo.uri);
      }
    } catch (error) {
      console.error('Capture error:', error);
    } finally {
      setIsCapturing(false);
    }
  };

  const handlePickImage = async () => {
    if (mode === 'packaged') return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      handleCapturedImage(result.assets[0].uri);
    }
  };

  const handleBarcodeSubmit = useCallback(
    async (rawBarcode: string) => {
      const cleanBarcode = rawBarcode.replace(/\s+/g, '');
      if (!onBarcodeDetected) {
        setBarcodeError('Barcode lookup is unavailable on this build.');
        return;
      }
      if (!/^\d{8,14}$/.test(cleanBarcode)) {
        setBarcodeError('Enter a valid barcode (8 to 14 digits).');
        return;
      }

      setBarcodeError(null);
      setIsResolvingBarcode(true);
      try {
        await onBarcodeDetected(cleanBarcode);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Could not find this barcode. Try entering nutrition manually.';
        setBarcodeError(message);
      } finally {
        setIsResolvingBarcode(false);
      }
    },
    [onBarcodeDetected]
  );

  const handleBarcodeScanned = useCallback(
    async (event: BarcodeScanningResult) => {
      if (mode !== 'packaged' || isResolvingBarcode || !event.data) return;
      const now = Date.now();
      if (event.data === lastBarcodeRef.current && now - lastBarcodeAtRef.current < 2000) {
        return;
      }
      lastBarcodeRef.current = event.data;
      lastBarcodeAtRef.current = now;
      await handleBarcodeSubmit(event.data);
    },
    [handleBarcodeSubmit, isResolvingBarcode, mode]
  );

  const isMenuMode = mode === 'menu';
  const isPackagedMode = mode === 'packaged';
  const activeTitle = isPackagedMode ? '📦 Packaged Food Mode' : isMenuMode ? '📋 Menu Mode' : '🍽️ Food Mode';
  const activeHint = isPackagedMode
    ? 'Align barcode inside the frame'
    : isMenuMode
      ? 'Point at the full menu board'
      : 'Position your meal in the frame';
  const viewfinderColor = isPackagedMode ? '#38bdf8' : isMenuMode ? '#F59E0B' : colors.primary[400];

  const renderManualFallback = () => (
    <View style={styles.manualFallbackWrap}>
      <Text style={styles.manualFallbackTitle}>Manual barcode fallback</Text>
      <Text style={styles.manualFallbackBody}>
        If scanner is unavailable, enter the barcode number to continue.
      </Text>
      <View style={styles.manualInputRow}>
        <TextInput
          value={manualBarcode}
          onChangeText={setManualBarcode}
          style={styles.manualInput}
          placeholder="0123456789012"
          placeholderTextColor="rgba(255,255,255,0.6)"
          keyboardType="number-pad"
          maxLength={14}
          editable={!isResolvingBarcode}
          accessibilityLabel="Barcode manual input"
        />
        <Pressable
          style={[styles.manualSubmit, isResolvingBarcode && styles.manualSubmitDisabled]}
          onPress={() => void handleBarcodeSubmit(manualBarcode)}
          disabled={isResolvingBarcode}
          accessibilityRole="button"
          accessibilityLabel="Lookup barcode"
        >
          <Text style={styles.manualSubmitText}>Lookup</Text>
        </Pressable>
      </View>
      {barcodeError ? <Text style={styles.errorText}>{barcodeError}</Text> : null}
      {isResolvingBarcode ? (
        <View style={styles.lookupLoaderWrap}>
          <ActivityIndicator size="small" color={colors.primary[200]} />
          <Text style={styles.lookupLoaderText}>Looking up nutrition...</Text>
        </View>
      ) : null}
    </View>
  );

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionTitle}>Camera Access Needed</Text>
        <Text style={styles.permissionText}>BiteScan needs camera access for scans and barcode capture.</Text>
        <Pressable style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Access</Text>
        </Pressable>
        {renderManualFallback()}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
        onBarcodeScanned={isPackagedMode ? handleBarcodeScanned : undefined}
        barcodeScannerSettings={isPackagedMode ? { barcodeTypes: SUPPORTED_BARCODE_TYPES } : undefined}
      >
        <View style={styles.overlay}>
          <View style={styles.topBar}>
            <Pressable onPress={onClose} style={styles.closeButton} accessibilityRole="button" accessibilityLabel="Close camera">
              <Text style={styles.closeIcon}>✕</Text>
            </Pressable>
            <View style={styles.titleBlock}>
              <Text style={styles.title}>{activeTitle}</Text>
              <View style={styles.modeTabs}>
                {(['food', 'menu', 'packaged'] as CaptureMode[]).map((value) => {
                  const selected = mode === value;
                  const label = value === 'food' ? 'Food' : value === 'menu' ? 'Menu' : 'Barcode';
                  return (
                    <Pressable
                      key={value}
                      style={[styles.modeTab, selected && styles.modeTabActive]}
                      onPress={() => {
                        setMode(value);
                        setBarcodeError(null);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Switch to ${label} mode`}
                    >
                      <Text style={[styles.modeTabText, selected && styles.modeTabTextActive]}>{label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <View style={styles.placeholder} />
          </View>

          <Animated.View style={[styles.viewfinderContainer, { opacity: fadeOpacity }]}>
            <View style={styles.viewfinder}>
              <View style={[styles.corner, styles.cornerTL, { borderColor: viewfinderColor }]} />
              <View style={[styles.corner, styles.cornerTR, { borderColor: viewfinderColor }]} />
              <View style={[styles.corner, styles.cornerBL, { borderColor: viewfinderColor }]} />
              <View style={[styles.corner, styles.cornerBR, { borderColor: viewfinderColor }]} />

              <Animated.View
                style={[
                  styles.scanLine,
                  {
                    transform: [{ translateY: scanLineY }],
                    backgroundColor: viewfinderColor,
                    shadowColor: viewfinderColor,
                  },
                ]}
              />
            </View>

            <Text style={styles.hint}>{activeHint}</Text>
            {isPackagedMode ? renderManualFallback() : null}
          </Animated.View>

          <View style={styles.controls}>
            {isPackagedMode ? (
              <View style={styles.packagedHelperWrap}>
                <Text style={styles.packagedHelperText}>
                  Scan starts automatically. If unavailable, use manual barcode input.
                </Text>
              </View>
            ) : (
              <>
                <Pressable style={styles.galleryButton} onPress={handlePickImage}>
                  <Text style={styles.galleryIcon}>🖼️</Text>
                </Pressable>

                <Pressable
                  style={[styles.captureButton, isCapturing && styles.captureButtonActive]}
                  onPress={handleCapture}
                  disabled={isCapturing}
                >
                  <View style={styles.captureButtonInner}>
                    {isCapturing ? <Text style={styles.capturingText}>📸</Text> : <View style={styles.captureButtonCenter} />}
                  </View>
                </Pressable>

                <View style={styles.galleryButton} />
              </>
            )}
          </View>
        </View>

        <LeafParticles count={5} />
      </CameraView>
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.neutral[900],
    },
    camera: {
      flex: 1,
    },
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.3)',
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 60,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
    },
    closeButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    closeIcon: {
      color: colors.text.inverse,
      fontSize: 20,
    },
    title: {
      color: colors.text.inverse,
      fontSize: typography.fontSizes.lg,
      fontWeight: typography.fontWeights.semibold,
      textAlign: 'center',
      marginBottom: spacing.xs,
    },
    titleBlock: {
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
      marginHorizontal: spacing.sm,
    },
    modeTabs: {
      flexDirection: 'row',
      backgroundColor: 'rgba(0,0,0,0.55)',
      borderRadius: borderRadius.full,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.35)',
      overflow: 'hidden',
    },
    modeTab: {
      paddingVertical: 6,
      paddingHorizontal: spacing.sm,
    },
    modeTabActive: {
      backgroundColor: 'rgba(255,255,255,0.2)',
    },
    modeTabText: {
      color: colors.text.inverse,
      fontSize: typography.fontSizes.xs,
      fontWeight: typography.fontWeights.semibold,
    },
    modeTabTextActive: {
      color: '#ffffff',
    },
    placeholder: {
      width: 44,
    },
    viewfinderContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    viewfinder: {
      width: VIEWFINDER_SIZE,
      height: VIEWFINDER_SIZE,
      position: 'relative',
    },
    corner: {
      position: 'absolute',
      width: 30,
      height: 30,
      borderColor: colors.primary[400],
    },
    cornerTL: {
      top: 0,
      left: 0,
      borderTopWidth: 4,
      borderLeftWidth: 4,
      borderTopLeftRadius: 12,
    },
    cornerTR: {
      top: 0,
      right: 0,
      borderTopWidth: 4,
      borderRightWidth: 4,
      borderTopRightRadius: 12,
    },
    cornerBL: {
      bottom: 0,
      left: 0,
      borderBottomWidth: 4,
      borderLeftWidth: 4,
      borderBottomLeftRadius: 12,
    },
    cornerBR: {
      bottom: 0,
      right: 0,
      borderBottomWidth: 4,
      borderRightWidth: 4,
      borderBottomRightRadius: 12,
    },
    scanLine: {
      position: 'absolute',
      left: 10,
      right: 10,
      height: 2,
      backgroundColor: colors.primary[400],
      shadowColor: colors.primary[400],
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 10,
    },
    hint: {
      marginTop: spacing.lg,
      color: colors.text.inverse,
      fontSize: typography.fontSizes.md,
      textAlign: 'center',
      opacity: 0.9,
      fontWeight: typography.fontWeights.medium,
    },
    controls: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.xl,
      paddingBottom: 50,
    },
    galleryButton: {
      width: 50,
      height: 50,
      borderRadius: 12,
      backgroundColor: 'rgba(255,255,255,0.2)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    galleryIcon: {
      fontSize: 24,
    },
    captureButton: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: 'rgba(255,255,255,0.3)',
      padding: 4,
      marginHorizontal: spacing.xl,
    },
    captureButtonActive: {
      backgroundColor: 'rgba(255,255,255,0.5)',
    },
    captureButtonInner: {
      flex: 1,
      borderRadius: 36,
      backgroundColor: colors.text.inverse,
      justifyContent: 'center',
      alignItems: 'center',
    },
    captureButtonCenter: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: colors.primary[500],
    },
    capturingText: {
      fontSize: 32,
    },
    packagedHelperWrap: {
      width: '86%',
      borderRadius: borderRadius.md,
      backgroundColor: 'rgba(0,0,0,0.55)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.35)',
      padding: spacing.sm,
    },
    packagedHelperText: {
      color: colors.text.inverse,
      textAlign: 'center',
      fontSize: typography.fontSizes.sm,
    },
    manualFallbackWrap: {
      width: Math.min(380, SCREEN_WIDTH - spacing.xl),
      marginTop: spacing.md,
      backgroundColor: 'rgba(0,0,0,0.56)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.35)',
      borderRadius: borderRadius.md,
      padding: spacing.sm,
      gap: spacing.xs,
    },
    manualFallbackTitle: {
      color: colors.text.inverse,
      fontSize: typography.fontSizes.sm,
      fontWeight: typography.fontWeights.semibold,
    },
    manualFallbackBody: {
      color: 'rgba(255,255,255,0.86)',
      fontSize: typography.fontSizes.xs,
      lineHeight: 16,
    },
    manualInputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    manualInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.35)',
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
      color: colors.text.inverse,
      fontSize: typography.fontSizes.sm,
      backgroundColor: 'rgba(255,255,255,0.08)',
    },
    manualSubmit: {
      borderRadius: borderRadius.md,
      backgroundColor: colors.primary[500],
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      justifyContent: 'center',
      alignItems: 'center',
    },
    manualSubmitDisabled: {
      opacity: 0.6,
    },
    manualSubmitText: {
      color: colors.text.inverse,
      fontSize: typography.fontSizes.sm,
      fontWeight: typography.fontWeights.semibold,
    },
    lookupLoaderWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    lookupLoaderText: {
      color: colors.primary[100],
      fontSize: typography.fontSizes.xs,
    },
    errorText: {
      color: '#fecaca',
      fontSize: typography.fontSizes.xs,
    },
    permissionContainer: {
      flex: 1,
      backgroundColor: colors.background.primary,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xl,
    },
    permissionTitle: {
      fontSize: typography.fontSizes.xl,
      fontWeight: typography.fontWeights.bold,
      color: colors.text.primary,
      marginBottom: spacing.md,
      textAlign: 'center',
    },
    permissionText: {
      fontSize: typography.fontSizes.md,
      color: colors.text.secondary,
      textAlign: 'center',
      marginBottom: spacing.lg,
    },
    permissionButton: {
      backgroundColor: colors.primary[500],
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
      borderRadius: borderRadius.full,
      marginBottom: spacing.md,
    },
    permissionButtonText: {
      color: colors.text.inverse,
      fontSize: typography.fontSizes.md,
      fontWeight: typography.fontWeights.semibold,
    },
  });

export default CameraScreen;
