// components/AuthInput.jsx
import React from 'react';
import { TextInput, StyleSheet, View, Text } from 'react-native';

export const AuthInput = ({ icon, placeholder, value, onChangeText, ...props }) => {
  return (
    <View style={styles.inputContainer}>
      {icon && <Text style={styles.inputIcon}>{icon}</Text>}
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor="#6b7280"
        {...props}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
  },
  inputIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#111827',
  },
});