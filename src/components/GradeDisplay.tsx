// S-tier Grade Display Component (enhanced dopamine animations)
import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { colors, borderRadius, typography, shadows } from '../theme';
import { HealthGrade } from '../types';

interface GradeDisplayProps {
  grade: HealthGrade;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  animated?: boolean;
}

const gradeLabels: Record<HealthGrade, string> = {
  S: 'Perfect',
  A: 'Excellent',
  B: 'Good',
  C: 'Okay',
  D: 'Poor',
  F: 'Avoid',
};

const sizeConfig = {
  sm: { container: 40, font: 20, label: 10 },
  md: { container: 64, font: 32, label: 12 },
  lg: { container: 96, font: 48, label: 14 },
};

const gradeScaleBoost: Record<HealthGrade, number> = {
  S: 1.08,
  A: 1.04,
  B: 1.0,
  C: 0.98,
  D: 0.95,
  F: 0.93,
};

export const GradeDisplay: React.FC<GradeDisplayProps> = ({
  grade,
  size = 'md',
  showLabel = true,
  animated = true,
}) => {
  const scale = useRef(new Animated.Value(animated ? 0.5 : 1)).current;
  const rotation = useRef(new Animated.Value(animated ? -10 : 0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) return;

    scale.setValue(0.5);
    rotation.setValue(-10);
    pulse.setValue(0);
    glow.setValue(0);
    shake.setValue(0);

    Animated.parallel([
      Animated.spring(scale, {
        toValue: gradeScaleBoost[grade],
        delay: 140,
        friction: 7,
        tension: 170,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.spring(rotation, {
          toValue: 5,
          delay: 130,
          friction: 4,
          useNativeDriver: true,
        }),
        Animated.spring(rotation, {
          toValue: 0,
          friction: 9,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      Animated.spring(scale, {
        toValue: 1,
        friction: 8,
        tension: 120,
        useNativeDriver: true,
      }).start();
    });

    if (grade === 'S' || grade === 'A') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1,
            duration: grade === 'S' ? 900 : 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 0,
            duration: grade === 'S' ? 900 : 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(glow, { toValue: 1, duration: 900, useNativeDriver: true }),
          Animated.timing(glow, { toValue: 0.2, duration: 900, useNativeDriver: true }),
        ])
      ).start();
    }

    if (grade === 'D' || grade === 'F') {
      Animated.sequence([
        Animated.timing(shake, { toValue: 8, duration: 40, useNativeDriver: true }),
        Animated.timing(shake, { toValue: -8, duration: 40, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 5, duration: 40, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 0, duration: 40, useNativeDriver: true }),
      ]).start();
    }
  }, [grade, animated]);

  const rotate = rotation.interpolate({
    inputRange: [-10, 10],
    outputRange: ['-10deg', '10deg'],
  });

  const pulseScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, grade === 'S' ? 1.12 : 1.07],
  });

  const glowOpacity = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.15, 0.5],
  });

  const config = sizeConfig[size];
  const gradeColor = colors.grade[grade];

  return (
    <View style={styles.wrapper}>
      {(grade === 'S' || grade === 'A') && (
        <Animated.View
          style={[
            styles.glow,
            {
              width: config.container + 18,
              height: config.container + 18,
              borderRadius: (config.container + 18) / 2,
              opacity: glowOpacity,
              backgroundColor: grade === 'S' ? '#FFD166' : '#C7D2FE',
              transform: [{ scale: pulseScale }],
            },
          ]}
        />
      )}

      <Animated.View
        style={[
          styles.container,
          {
            width: config.container,
            height: config.container,
            borderRadius: config.container / 2,
            backgroundColor: gradeColor,
            transform: [{ translateX: shake }, { scale }, { rotate }, { scale: pulseScale }],
          },
          shadows.lg,
        ]}
      >
        <Text style={[styles.grade, { fontSize: config.font }]}>{grade}</Text>
        {grade === 'S' && (
          <View style={styles.sparkle}><Text style={styles.sparkleEmoji}>✨🎉</Text></View>
        )}
        {grade === 'A' && (
          <View style={styles.sparkle}><Text style={styles.sparkleEmoji}>✨</Text></View>
        )}
      </Animated.View>

      {showLabel && <Text style={[styles.label, { fontSize: config.label }]}>{gradeLabels[grade]}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
  },
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  grade: {
    color: colors.text.inverse,
    fontWeight: typography.fontWeights.bold,
  },
  label: {
    marginTop: 4,
    color: colors.text.secondary,
    fontWeight: typography.fontWeights.medium,
  },
  sparkle: {
    position: 'absolute',
    top: -8,
    right: -6,
  },
  sparkleEmoji: {
    fontSize: 14,
  },
});

export default GradeDisplay;
