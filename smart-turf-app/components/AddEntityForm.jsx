// components/AddEntityForm.jsx
import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import { AuthInput } from './AuthInput';
import { PrimaryButton } from './PrimaryButton';
import * as ImagePicker from 'expo-image-picker';

export default function AddEntityForm({ fields, onSubmit, isLoading, buttonTitle }) {
  const initialState = fields.reduce((acc, field) => {
    acc[field.name] = field.defaultValue || '';
    return acc;
  }, {});
  
  const [data, setData] = useState(initialState);
  const [imageUri, setImageUri] = useState(null);

  const handleChange = (name, value) => {
    setData(prev => ({ ...prev, [name]: value }));
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Sorry, we need camera roll permissions to make this work!');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
  // This is the correct property name
    mediaTypes: ImagePicker.MediaTypeOptions.Images, 
    allowsEditing: true,
    aspect: [16, 9],
    quality: 0.8,
});

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };
  
  const handleFinalSubmit = () => {
    onSubmit({ ...data, imageUri });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {fields.map(field => (
        <AuthInput
          key={field.name}
          placeholder={field.placeholder}
          value={data[field.name]}
          onChangeText={(text) => handleChange(field.name, text)}
          keyboardType={field.type === 'number' ? 'numeric' : 'default'}
        />
      ))}
      
      <TouchableOpacity style={styles.imagePicker} onPress={handlePickImage}>
        <Text style={styles.imagePickerText}>
          {imageUri ? 'Change Image' : 'Pick an Image'}
        </Text>
      </TouchableOpacity>
      
      {imageUri && <Image source={{ uri: imageUri }} style={styles.imagePreview} />}
      
      <View style={{ marginTop: 20 }}>
        <PrimaryButton
          title={buttonTitle}
          onPress={handleFinalSubmit}
          isLoading={isLoading}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#f9fafb' },
  imagePicker: { backgroundColor: '#e5e7eb', padding: 15, borderRadius: 12, alignItems: 'center', marginBottom: 15, marginTop: 5 },
  imagePickerText: { fontSize: 16, color: '#374151', fontWeight: '500' },
  imagePreview: { width: '100%', height: 200, borderRadius: 12, marginBottom: 10, resizeMode: 'cover', backgroundColor: '#eee' },
});