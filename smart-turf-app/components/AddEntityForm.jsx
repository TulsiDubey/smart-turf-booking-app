// components/AddEntityForm.jsx
import React, {useState} from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import { AuthInput } from './AuthInput';
import { PrimaryButton } from './PrimaryButton';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

export const AddEntityForm = ({ fields, onSubmit, isLoading, buttonTitle }) => {
  const initialState = fields.reduce((acc, field) => {
    acc[field.name] = field.defaultValue || '';
    return acc;
  }, {});
  
  const [data, setData] = useState(initialState);
  const [imageUri, setImageUri] = useState(null); // State to hold the chosen image URI

  const handleChange = (name, value) => {
    setData(prev => ({ ...prev, [name]: value }));
  };

  // New function to handle picking an image
  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Sorry, we need camera roll permissions to make this work!');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });

    if (!result.canceled) {
      // The user picked an image. The URI is in result.assets[0].uri
      setImageUri(result.assets[0].uri);
    }
  };

  // New function to handle the final submission
  const handleFinalSubmit = async () => {
    let finalData = { ...data };
    
    // If an image was selected, save it locally and add its path to the data
    if (imageUri) {
      const filename = `image_${Date.now()}.jpg`;
      const permanentUri = `${FileSystem.documentDirectory}${filename}`;
      
      try {
        await FileSystem.copyAsync({
          from: imageUri,
          to: permanentUri,
        });
        // We will send this permanent file path to the backend
        finalData.image_url = permanentUri;
      } catch (error) {
        console.error("Error saving image:", error);
        Alert.alert("Error", "Could not save the image.");
        return; // Stop submission if image saving fails
      }
    }
    
    // Call the original onSubmit prop with the final data (including image_url if present)
    onSubmit(finalData);
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
      
      {/* New UI for picking an image */}
      <TouchableOpacity style={styles.imagePicker} onPress={handlePickImage}>
        <Text style={styles.imagePickerText}>
          {imageUri ? 'Change Image' : 'Pick an Image'}
        </Text>
      </TouchableOpacity>
      
      {/* Display the selected image as a preview */}
      {imageUri && <Image source={{ uri: imageUri }} style={styles.imagePreview} />}
      
      <View style={{ marginTop: 20 }}>
        <PrimaryButton
          title={buttonTitle}
          onPress={handleFinalSubmit} // Use the new handler
          isLoading={isLoading}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f9fafb',
  },
  imagePicker: {
    backgroundColor: '#e5e7eb',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
    marginTop: 5,
  },
  imagePickerText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 10,
    resizeMode: 'cover',
  },
});