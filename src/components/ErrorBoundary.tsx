import React, { Component, ErrorInfo, ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { spacing, borderRadius, typography, ThemeColors } from "../theme";
import { useThemeContext } from "../contexts/ThemeContext";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

const ErrorView: React.FC<{ message: string; onRetry: () => void }> = ({
  message,
  onRetry,
}) => {
  const { colors } = useThemeContext();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>😵</Text>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.message}>{message}</Text>
      <Pressable style={styles.button} onPress={onRetry}>
        <Text style={styles.buttonText}>Try Again</Text>
      </Pressable>
    </View>
  );
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorView
          message={this.state.error?.message || "An unexpected error occurred."}
          onRetry={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background.secondary,
    padding: spacing.xl,
  },
  emoji: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  message: {
    fontSize: typography.fontSizes.sm,
    color: colors.text.secondary,
    textAlign: "center",
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  button: {
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
  },
  buttonText: {
    color: colors.text.inverse,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
  },
});
