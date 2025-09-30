import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-reanimated';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        setIsLoggedIn(!!token);
      } catch (error) {
        console.error('Error checking auth token:', error);
        setIsLoggedIn(false);
      }
    };
    checkAuth();
  }, []);

  if (isLoggedIn === null) {
    return null; // Or a loading spinner
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
  {/* Change this name from "(app)" to "(tabs)" */}
  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
  <Stack.Screen name="login" options={{ presentation: 'modal', headerShown: false }} />
</Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}