// app/(tabs)/addKit.jsx
import React, { useState } from 'react';
import { Alert, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
// FIXED: Changed to a default import without curly braces {}
import AddEntityForm from '../../components/AddEntityForm';
import { API_URL } from '../../config';

export default function AddKitScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const fields = [
    { name: 'name', placeholder: 'Kit Name (e.g., Cricket Kit)' },
    { name: 'description', placeholder: 'Description' },
    { name: 'price_per_hour', placeholder: 'Price per Hour', type: 'number' },
  ];

  const handleSubmit = async (formDataFromChild) => {
    const { imageUri, ...textData } = formDataFromChild;

    if (!imageUri) {
      Alert.alert("Image Required", "Please pick an image for the kit.");
      return;
    }
    
    setIsLoading(true);
    const token = await AsyncStorage.getItem('userToken');
    const formData = new FormData();

    Object.keys(textData).forEach(key => {
      formData.append(key, textData[key]);
    });

    const filename = imageUri.split('/').pop();
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : `image`;

    formData.append('image', { uri: imageUri, name: filename, type });

    try {
      const response = await fetch(`${API_URL}/api/kits`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
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
    container: { flex: 1, backgroundColor: '#f9fafb' },
});