export type MainTabParamList = {
  Home: undefined;
  Progress: undefined;
  History: undefined;
  Profile: undefined;
};

export type ManualEntryParams = {
  mealId?: string;
  initialEntry?: {
    foodName: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  title?: string;
  subtitle?: string;
  saveLabel?: string;
};

export type RootStackParamList = {
  Auth: undefined;
  MacroGoals: undefined;
  MainTabs: undefined;
  Camera: { initialMode?: "food" | "menu" | "packaged" } | undefined;
  Results: undefined;
  MenuResults: undefined;
  QuickAdd: undefined;
  ManualEntry: ManualEntryParams | undefined;
  Settings: undefined;
};
