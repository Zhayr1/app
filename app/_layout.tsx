import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";
import Toast from "react-native-toast-message";

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      {/* <SafeAreaProvider> */}
      {/* <SafeAreaView style={{ flex: 1, backgroundColor: "red" }}> */}
      <Stack />
      <StatusBar style="auto" />
      {/* </SafeAreaView> */}
      {/* </SafeAreaProvider> */}
      <Toast />
    </ThemeProvider>
  );
}
