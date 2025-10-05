// app/login.jsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 🚨 IMPORTANT: Replace 'localhost' with your computer's local IP address.
// On Windows, run `ipconfig` in Command Prompt. On Mac, run `ifconfig` in Terminal.
// Your phone and computer must be on the same Wi-Fi network.
const API_URL = 'http://192.168.75.155:3000';

export default function LoginScreen() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleAuth = async () => {
        setIsLoading(true);
        const payload = isLogin ? { email, password } : { name, email, password };
        const url = isLogin ? `${API_URL}/api/auth/login` : `${API_URL}/api/auth/register`;
        try {
            const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Something went wrong.');

            let token, user;
            if (isLogin) {
                token = data.token;
                user = data.user;
            } else {
                const loginResponse = await fetch(`${API_URL}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
                const loginData = await loginResponse.json();
                if (!loginResponse.ok) throw new Error(loginData.error || 'Login failed.');
                token = loginData.token;
                user = loginData.user;
            }
            
            await AsyncStorage.setItem('userToken', token);
            await AsyncStorage.setItem('userData', JSON.stringify(user));

            // Navigate to the main app after success
            router.replace('/(tabs)/home');

        } catch (error) { 
            Alert.alert('Authentication Error', error.message);
        } finally { 
            setIsLoading(false); 
        }
    };

    return (
        <View style={authStyles.container}>
            <Text style={authStyles.logo}>⚽</Text>
            <Text style={authStyles.title}>{isLogin ? 'Welcome Back!' : 'Create Account'}</Text>
            <Text style={authStyles.subtitle}>{isLogin ? 'Log in to continue' : 'Sign up to play'}</Text>

            {!isLogin && (
                <TextInput
                    style={styles.input}
                    placeholder="Full Name"
                    value={name}
                    onChangeText={setName}
                    placeholderTextColor="#6b7280"
                />
            )}
            <TextInput
                style={styles.input}
                placeholder="Email Address"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#6b7280"
            />
            <TextInput
                style={styles.input}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholderTextColor="#6b7280"
            />

            <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleAuth}
                disabled={isLoading}
            >
                {isLoading 
                    ? <ActivityIndicator color="#fff" /> 
                    : <Text style={styles.buttonText}>{isLogin ? 'Log In' : 'Sign Up'}</Text>
                }
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={authStyles.switchButton}>
                <Text style={authStyles.switchText}>
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <Text style={authStyles.switchLink}>{isLogin ? 'Sign Up' : 'Log In'}</Text>
                </Text>
            </TouchableOpacity>
        </View>
    );
}

// Using StyleSheet for performance and organization
const styles = StyleSheet.create({
    input: {
        height: 50,
        backgroundColor: '#f3f4f6',
        borderRadius: 12,
        paddingHorizontal: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        fontSize: 16,
    },
    button: {
        backgroundColor: '#10b981',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 10,
    },
    buttonDisabled: { backgroundColor: '#a7f3d0' },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

const authStyles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#f9fafb' },
    logo: { fontSize: 60, textAlign: 'center', marginBottom: 20 },
    title: { fontSize: 32, fontWeight: 'bold', textAlign: 'center', color: '#111827' },
    subtitle: { fontSize: 16, color: '#6b7280', textAlign: 'center', marginBottom: 30 },
    switchButton: { marginTop: 20 },
    switchText: { textAlign: 'center', color: '#6b7280', fontSize: 14 },
    switchLink: { color: '#10b981', fontWeight: 'bold' },
});