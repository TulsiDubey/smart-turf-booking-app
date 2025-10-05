// app/(tabs)/bookings.jsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, Alert, ActivityIndicator, Pressable } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';

const API_URL = 'http://192.168.75.155:3000';
const DEFAULT_IMAGE = 'https://placehold.co/600x400/22c55e/ffffff?text=Image+Not+Available';

export default function BookingHistoryScreen() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const isFocused = useIsFocused(); // Re-fetches data when you navigate to the screen

    useEffect(() => {
        const fetchBookings = async () => {
            setLoading(true);
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                setLoading(false);
                return;
            }
            try {
                const response = await fetch(`${API_URL}/api/my-bookings`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) throw new Error('Failed to fetch bookings.');
                setBookings(await response.json());
            } catch (error) {
                Alert.alert("Error", error.message);
            } finally {
                setLoading(false);
            }
        };

        if (isFocused) {
            fetchBookings();
        }
    }, [isFocused]);

    const generateReceipt = (booking) => {
        // Browser APIs like window.print() don't work in native.
        // This would require a dedicated library like react-native-print.
        Alert.alert(
            `Receipt for ${booking.turf_name}`,
            `Date: ${new Date(booking.start_time).toDateString()}\nPrice: ₹${booking.total_price}`
        );
    };

    if (loading) {
        return <ActivityIndicator size="large" style={{ flex: 1, justifyContent: 'center' }} />;
    }

    return (
        <FlatList
            data={bookings}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
                <View style={styles.card}>
                    <Image source={{ uri: item.image_url || DEFAULT_IMAGE }} style={styles.image} />
                    <View style={styles.details}>
                        <Text style={styles.turfName}>{item.turf_name}</Text>
                        <Text style={styles.text}>📅 {new Date(item.start_time).toDateString()}</Text>
                        <Text style={styles.text}>🕒 {new Date(item.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                        <Pressable onPress={() => generateReceipt(item)} style={styles.pdfButton}>
                            <Text style={styles.pdfButtonText}>View Receipt</Text>
                        </Pressable>
                    </View>
                </View>
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>You have no bookings yet.</Text>}
        />
    );
}

const styles = StyleSheet.create({
    list: { padding: 16 },
    card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, marginBottom: 12, padding: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, shadowOffset: { width: 0, height: 1 } },
    image: { width: 80, height: 80, borderRadius: 8, marginRight: 12 },
    details: { flex: 1, justifyContent: 'center' },
    turfName: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
    text: { fontSize: 14, color: '#6b7280', marginTop: 4 },
    pdfButton: { marginTop: 8, backgroundColor: '#eefcf8', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 20, alignSelf: 'flex-start' },
    pdfButtonText: { color: '#10b981', fontWeight: '500' },
    emptyText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: '#6b7280' },
});