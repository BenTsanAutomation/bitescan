// Nature-inspired Leaf Particle Animation using React Native's built-in Animated API
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated, Easing } from 'react-native';
import { colors } from '../theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface LeafProps {
  delay: number;
  startX: number;
  size: number;
  duration: number;
}

const Leaf: React.FC<LeafProps> = ({ delay, startX, size, duration }) => {
  const progress = useRef(new Animated.Value(0)).current;
  const rotation = useRef(new Animated.Value(0)).current;
  const sway = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Main falling animation
    Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration,
        delay,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Rotation
    Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: duration * 0.8,
        delay,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Side-to-side sway
    Animated.loop(
      Animated.sequence([
        Animated.timing(sway, {
          toValue: 1,
          duration: 1500,
          delay,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(sway, {
          toValue: -1,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-50, SCREEN_HEIGHT + 50],
  });

  const translateX = Animated.add(
    startX,
    Animated.multiply(sway, 30)
  );

  const rotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const opacity = progress.interpolate({
    inputRange: [0, 0.1, 0.9, 1],
    outputRange: [0, 1, 1, 0],
  });

  return (
    <Animated.View
      style={[
        styles.leaf,
        {
          width: size,
          height: size,
          opacity,
          transform: [{ translateY }, { translateX: translateX as any }, { rotate }],
        },
      ]}
    >
      <View
        style={[
          styles.leafShape,
          {
            borderRadius: size / 2,
            backgroundColor: colors.primary[400],
          },
        ]}
      />
    </Animated.View>
  );
};

interface LeafParticlesProps {
  count?: number;
  enabled?: boolean;
}

export const LeafParticles: React.FC<LeafParticlesProps> = ({ 
  count = 8, 
  enabled = true 
}) => {
  if (!enabled) return null;

  const leaves = React.useMemo(() => Array.from({ length: count }, (_, i) => ({
    id: i,
    delay: Math.random() * 5000,
    startX: Math.random() * SCREEN_WIDTH,
    size: 12 + Math.random() * 12,
    duration: 8000 + Math.random() * 4000,
  })), [count]);

  return (
    <View style={styles.container} pointerEvents="none">
      {leaves.map((leaf) => (
        <Leaf key={leaf.id} {...leaf} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  leaf: {
    position: 'absolute',
  },
  leafShape: {
    flex: 1,
    transform: [{ scaleX: 0.6 }],
  },
});

export default LeafParticles;
