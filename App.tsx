import React from "react";
import { ConvexProvider } from "convex/react";
import { convex } from "./src/services/convexClient";
import { ErrorBoundary } from "./src/components/ErrorBoundary";
import { AuthProvider } from "./src/contexts/AuthContext";
import { ThemeProvider } from "./src/contexts/ThemeContext";
import { MealProvider } from "./src/contexts/MealContext";
import { AppNavigator } from "./src/navigation/AppNavigator";

export default function App() {
  return (
    <ErrorBoundary>
      <ConvexProvider client={convex}>
        <AuthProvider>
          <ThemeProvider>
            <MealProvider>
              <AppNavigator />
            </MealProvider>
          </ThemeProvider>
        </AuthProvider>
      </ConvexProvider>
    </ErrorBoundary>
  );
}
