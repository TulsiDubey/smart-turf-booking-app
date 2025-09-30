// app/index.js
import { Redirect } from 'expo-router';

// This component will immediately redirect the user.
// Expo Router's _layout.tsx will handle the actual screen presentation.
export default function StartPage() {
  return <Redirect href="/(tabs)/home" />;
}