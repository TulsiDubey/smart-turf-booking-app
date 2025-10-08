// app/(tabs)/bookings.jsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, Alert, ActivityIndicator, Pressable } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import { API_URL } from '../../config';

const DEFAULT_IMAGE = 'https://placehold.co/600x400/22c55e/ffffff?text=Image+Not+Available';

export default function BookingHistoryScreen() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const isFocused = useIsFocused();

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
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to fetch bookings.');
            setBookings(data);
        } catch (error) {
            Alert.alert("Error", error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isFocused) {
            fetchBookings();
        }
    }, [isFocused]);

    const generateReceipt = (booking) => {
        let receiptDetails = `Turf: ${booking.turf_name}\nDate: ${new Date(booking.start_time).toDateString()}\n`;
        if (booking.kit_name) {
            receiptDetails += `Kit: ${booking.kit_name}\n`;
        }
        receiptDetails += `Total Price: ₹${booking.total_price}`;
        
        Alert.alert(
            `Receipt for Booking`,
            receiptDetails
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
                    <Image source={{ uri: item.turf_image_url || DEFAULT_IMAGE }} style={styles.image} />
                    <View style={styles.details}>
                        <Text style={styles.turfName}>{item.turf_name}</Text>
                        {item.kit_name && (
                            <Text style={styles.kitName}>+ {item.kit_name}</Text>
                        )}
                        <Text style={styles.text}>📅 {new Date(item.start_time).toDateString()}</Text>
                        <Text style={styles.text}>🕒 {new Date(item.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                         <Text style={styles.price}>💰 ₹{item.total_price}</Text>
                        <Pressable onPress={() => generateReceipt(item)} style={styles.pdfButton}>
                            <Text style={styles.pdfButtonText}>View Receipt</Text>
                        </Pressable>
                    </View>
                </View>
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>You have no bookings yet.</Text>}
            onRefresh={fetchBookings}
            refreshing={loading}
        />
    );
}

const styles = StyleSheet.create({
    list: { padding: 16 },
    card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, marginBottom: 12, padding: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, shadowOffset: { width: 0, height: 1 } },
    image: { width: 80, height: 80, borderRadius: 8, marginRight: 12 },
    details: { flex: 1, justifyContent: 'center' },
    turfName: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
    kitName: { fontSize: 14, color: '#10b981', fontStyle: 'italic' },
    text: { fontSize: 14, color: '#6b7280', marginTop: 4 },
    price: { fontSize: 14, color: '#374151', fontWeight: '500', marginTop: 4 },
    pdfButton: { marginTop: 8, backgroundColor: '#eefcf8', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 20, alignSelf: 'flex-start' },
    pdfButtonText: { color: '#10b981', fontWeight: '500' },
    emptyText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: '#6b7280' },
});