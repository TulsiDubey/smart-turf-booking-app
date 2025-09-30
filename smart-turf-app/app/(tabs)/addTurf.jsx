// app/(tabs)/addTurf.jsx
import React, { useState } from 'react';
import { Alert, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AddEntityForm } from '../../components/AddEntityForm';

const API_URL = 'http://192.168.137.155:3000';

export default function AddTurfScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const fields = [
    { name: 'name', placeholder: 'Turf Name' },
    { name: 'location', placeholder: 'Location (e.g., Thane West)' },
    { name: 'price_per_hour', placeholder: 'Price per Hour', type: 'number' },
    { name: 'image_url', placeholder: 'Image URL (Optional)' },
    { name: 'latitude', placeholder: 'Latitude (e.g., 19.2183)', type: 'number', defaultValue: '19.2183' },
    { name: 'longitude', placeholder: 'Longitude (e.g., 72.9781)', type: 'number', defaultValue: '72.9781' },
  ];

  const handleSubmit = async (data) => {
    setIsLoading(true);
    const token = await AsyncStorage.getItem('userToken');
    try {
      const response = await fetch(`${API_URL}/api/turfs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to add turf.");
      
      Alert.alert("Success!", "Turf added successfully!");
      router.back(); // Go back to the previous screen
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
        buttonTitle="Add Turf"
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