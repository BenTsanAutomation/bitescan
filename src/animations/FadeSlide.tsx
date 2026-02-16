// Smooth fade and slide animations using React Native's built-in Animated API
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, ViewStyle } from 'react-native';

// Spring config for organic feel
const ORGANIC_SPRING = {
  tension: 100,
  friction: 15,
  useNativeDriver: true,
};

interface AnimatedContainerProps {
  children: React.ReactNode;
  delay?: number;
  style?: ViewStyle;
}

// Fade in from bottom with gentle float
export const FloatIn: React.FC<AnimatedContainerProps> = ({ 
  children, 
  delay = 0, 
  style 
}) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        delay,
        ...ORGANIC_SPRING,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
};

// Scale in with bounce
export const PopIn: React.FC<AnimatedContainerProps> = ({ 
  children, 
  delay = 0, 
  style 
}) => {
  const scale = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        delay,
        tension: 150,
        friction: 12,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[style, { opacity, transform: [{ scale }] }]}>
      {children}
    </Animated.View>
  );
};

// Stagger children animations
export const StaggerContainer: React.FC<{
  children: React.ReactNode[];
  staggerMs?: number;
  style?: ViewStyle;
}> = ({ children, staggerMs = 100, style }) => {
  return (
    <Animated.View style={style}>
      {React.Children.map(children, (child, index) => (
        <FloatIn delay={index * staggerMs}>
          {child}
        </FloatIn>
      ))}
    </Animated.View>
  );
};

// Pulse animation for loading states
export const Pulse: React.FC<AnimatedContainerProps> = ({ 
  children, 
  style 
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.05,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={[style, { transform: [{ scale }] }]}>
      {children}
    </Animated.View>
  );
};
