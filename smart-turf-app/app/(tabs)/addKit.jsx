// app/(tabs)/addKit.jsx
import React, { useState } from 'react';
import { Alert, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AddEntityForm } from '../../components/AddEntityForm';

const API_URL = 'http://192.168.137.155:3000';

export default function AddKitScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const fields = [
    { name: 'name', placeholder: 'Kit Name (e.g., Cricket Kit)' },
    { name: 'description', placeholder: 'Description' },
    { name: 'price_per_hour', placeholder: 'Price per Hour', type: 'number' },
    { name: 'image_url', placeholder: 'Image URL (Optional)' },
  ];

  const handleSubmit = async (data) => {
    setIsLoading(true);
    const token = await AsyncStorage.getItem('userToken');
    try {
      const response = await fetch(`${API_URL}/api/kits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to add kit.");
      
      Alert.alert("Success!", "Kit added successfully!");
      router.back();
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <AddEntityForm
        fields={fields}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        buttonTitle="Add Kit"
      />
    </View>
  );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
});