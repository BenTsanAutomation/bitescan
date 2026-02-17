import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { borderRadius, shadows, spacing, typography, ThemeColors } from "../theme";
import { useThemeContext } from "../contexts/ThemeContext";

export type TabKey = "home" | "progress" | "history" | "profile";

interface TabBarProps {
  activeTab: TabKey;
  onTabPress: (tab: TabKey) => void;
  onScanPress: () => void;
}

const items: Array<{ key: TabKey; label: string; icon: string }> = [
  { key: "home", label: "Home", icon: "🏠" },
  { key: "progress", label: "Progress", icon: "📈" },
  { key: "history", label: "History", icon: "🧾" },
  { key: "profile", label: "Profile", icon: "👤" },
];

export const TabBar: React.FC<TabBarProps> = ({ activeTab, onTabPress, onScanPress }) => {
  const { colors } = useThemeContext();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.tabBarWrap}>
      <View style={[styles.tabBar, shadows.lg]}>
        <View style={styles.tabGroup}>
          {items.slice(0, 2).map((item) => (
            <Pressable
              key={item.key}
              style={styles.tabButton}
              onPress={() => onTabPress(item.key)}
            >
              <Text style={styles.tabIcon}>{item.icon}</Text>
              <Text
                style={[
                  styles.tabLabel,
                  activeTab === item.key && styles.tabLabelActive,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.centerGap} />

        <View style={styles.tabGroup}>
          {items.slice(2).map((item) => (
            <Pressable
              key={item.key}
              style={styles.tabButton}
              onPress={() => onTabPress(item.key)}
            >
              <Text style={styles.tabIcon}>{item.icon}</Text>
              <Text
                style={[
                  styles.tabLabel,
                  activeTab === item.key && styles.tabLabelActive,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Pressable style={[styles.scanFab, shadows.lg]} onPress={onScanPress}>
        <Text style={styles.scanFabIcon}>＋</Text>
        <Text style={styles.scanFabText}>Scan</Text>
      </Pressable>
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    tabBarWrap: {
      position: "relative",
    },
    tabBar: {
      minHeight: 74,
      backgroundColor: colors.background.card,
      borderTopWidth: 1,
      borderTopColor: colors.neutral[200],
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
      paddingTop: spacing.sm,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    tabGroup: {
      flex: 1,
      flexDirection: "row",
      justifyContent: "space-around",
    },
    centerGap: {
      width: 76,
    },
    tabButton: {
      alignItems: "center",
      justifyContent: "center",
      minWidth: 56,
    },
    tabIcon: {
      fontSize: typography.fontSizes.md,
      marginBottom: 2,
    },
    tabLabel: {
      fontSize: typography.fontSizes.xs,
      color: colors.text.tertiary,
    },
    tabLabelActive: {
      color: colors.primary[600],
      fontWeight: typography.fontWeights.semibold,
    },
    scanFab: {
      position: "absolute",
      alignSelf: "center",
      top: -20,
      width: 74,
      height: 74,
      borderRadius: borderRadius.full,
      backgroundColor: colors.primary[500],
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 4,
      borderColor: colors.background.secondary,
    },
    scanFabIcon: {
      fontSize: typography.fontSizes.xl,
      color: colors.text.inverse,
      lineHeight: typography.fontSizes.xl,
    },
    scanFabText: {
      fontSize: typography.fontSizes.xs,
      color: colors.text.inverse,
      fontWeight: typography.fontWeights.semibold,
      marginTop: 2,
    },
  });
