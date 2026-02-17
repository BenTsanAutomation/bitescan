// Camera Screen with Viewfinder Frame
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, Animated, Easing } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { spacing, borderRadius, typography, ThemeColors } from '../theme';
import { LeafParticles } from '../animations/LeafParticles';
import { useThemeContext } from '../contexts/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const VIEWFINDER_SIZE = SCREEN_WIDTH * 0.75;

interface CameraScreenProps {
  onCapture: (imageUri: string) => void;
  onClose: () => void;
}

export const CameraScreen: React.FC<CameraScreenProps> = ({
  onCapture,
  onClose,
}) => {
  const { colors } = useThemeContext();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  
  // Scanning animation
  const scanLineY = useRef(new Animated.Value(0)).current;
  // Fade in animation
  const fadeOpacity = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    // Scan line loop
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

    // Fade in viewfinder
    Animated.timing(fadeOpacity, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleCapture = async () => {
    if (!cameraRef.current || isCapturing) return;
    
    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });
      
      if (photo?.uri) {
        onCapture(photo.uri);
      }
    } catch (error) {
      console.error('Capture error:', error);
    } finally {
      setIsCapturing(false);
    }
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      onCapture(result.assets[0].uri);
    }
  };

  // Permission handling
  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionTitle}>Camera Access Needed</Text>
        <Text style={styles.permissionText}>
          BiteScan needs camera access to analyze your food
        </Text>
        <Pressable style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Access</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
      >
        {/* Overlay */}
        <View style={styles.overlay}>
          {/* Top bar */}
          <View style={styles.topBar}>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeIcon}>✕</Text>
            </Pressable>
            <Text style={styles.title}>Scan Food</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Viewfinder */}
          <Animated.View 
            style={[styles.viewfinderContainer, { opacity: fadeOpacity }]}
          >
            <View style={styles.viewfinder}>
              {/* Corner decorations */}
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
              
              {/* Scanning line */}
              <Animated.View style={[styles.scanLine, { transform: [{ translateY: scanLineY }] }]} />
            </View>
            
            <Text style={styles.hint}>
              Position your meal in the frame
            </Text>
          </Animated.View>

          {/* Bottom controls */}
          <View style={styles.controls}>
            {/* Gallery button */}
            <Pressable style={styles.galleryButton} onPress={handlePickImage}>
              <Text style={styles.galleryIcon}>🖼️</Text>
            </Pressable>

            {/* Capture button */}
            <Pressable
              style={[styles.captureButton, isCapturing && styles.captureButtonActive]}
              onPress={handleCapture}
              disabled={isCapturing}
            >
              <View style={styles.captureButtonInner}>
                {isCapturing ? (
                  <Text style={styles.capturingText}>📸</Text>
                ) : (
                  <View style={styles.captureButtonCenter} />
                )}
              </View>
            </Pressable>

            {/* Placeholder for symmetry */}
            <View style={styles.galleryButton} />
          </View>
        </View>

        {/* Subtle leaf particles */}
        <LeafParticles count={5} />
      </CameraView>
    </View>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
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
    opacity: 0.8,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
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
  },
  permissionButtonText: {
    color: colors.text.inverse,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
  },
});

export default CameraScreen;
