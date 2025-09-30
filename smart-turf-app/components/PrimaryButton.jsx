// components/PrimaryButton.jsx
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';

export const PrimaryButton = ({ title, onPress, disabled = false, isLoading = false }) => {
  return (
    <TouchableOpacity
      style={[styles.button, (disabled || isLoading) && styles.buttonDisabled]}
      onPress={onPress}
      disabled={disabled || isLoading}>
      {isLoading 
        ? <ActivityIndicator color="#fff" />
        : <Text style={styles.buttonText}>{title}</Text>
      }
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    width: '100%',
  },
  buttonDisabled: {
    backgroundColor: '#a7f3d0',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});