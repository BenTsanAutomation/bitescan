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
};

export type RootStackParamList = {
  Auth: undefined;
  MacroGoals: undefined;
  MainTabs: undefined;
  Camera: undefined;
  Results: undefined;
  ManualEntry: ManualEntryParams | undefined;
  Settings: undefined;
};
