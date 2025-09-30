// app/(tabs)/_layout.jsx
import { Tabs, useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { Pressable } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function TabsLayout() {
  const router = useRouter();

  const handleLogout = async () => {
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userData');
    router.replace('/login');
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#10b981',
        headerRight: () => (
          <Pressable onPress={handleLogout} style={{ marginRight: 15 }}>
            <FontAwesome name="sign-out" size={25} color="#6b7280" />
          </Pressable>
        ),
      }}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <FontAwesome size={28} name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: 'Matches',
          tabBarIcon: ({ color }) => <FontAwesome size={28} name="soccer-ball-o" color={color} />,
        }}
      />
       <Tabs.Screen
        name="bookings"
        options={{
          title: 'My Bookings',
          tabBarIcon: ({ color }) => <FontAwesome size={28} name="list" color={color} />,
        }}
      />
      {/* ADD THE TWO NEW SCREENS HERE */}
      <Tabs.Screen
        name="addTurf"
        options={{
          title: 'Add Turf',
          tabBarIcon: ({ color }) => <FontAwesome size={28} name="plus" color={color} />,
        }}
      />
      <Tabs.Screen
        name="addKit"
        options={{
          title: 'Add Kit',
          tabBarIcon: ({ color }) => <FontAwesome size={28} name="futbol-o" color={color} />, // Example icon
        }}
      />
      {/* This screen is in the tab layout but hidden from the tab bar */}
      <Tabs.Screen
        name="turf/[id]"
        options={{
          href: null, // Hides this screen from the tab bar
          title: 'Turf Details',
        }}
      />
    </Tabs>
  );
}