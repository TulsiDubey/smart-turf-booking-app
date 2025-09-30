// app/(tabs)/turf/[id].jsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Alert, Modal } from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { PrimaryButton } from '../../../components/PrimaryButton';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://192.168.137.155:3000';
const DEFAULT_IMAGE = 'https://placehold.co/600x400/22c55e/ffffff?text=Image+Not+Available';

export default function TurfDetailScreen() {
    const { id, name } = useLocalSearchParams();
    const navigation = useNavigation();
    
    // We will assume turf details are fetched or passed fully. For now, using passed name.
    // In a real app, you would fetch the full turf object by `id`.
    const [turf, setTurf] = useState({ id, name, price_per_hour: '1200', rating: '4.5', location: 'Unknown' });
    const [slotsData, setSlotsData] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [modalVisible, setModalVisible] = useState(false);
    const [bookingDetails, setBookingDetails] = useState(null);

    useEffect(() => {
        navigation.setOptions({ title: name });
        const fetchSlots = async () => {
            try {
                const response = await fetch(`${API_URL}/api/bookings/slots/${id}?date=${selectedDate}`);
                setSlotsData((await response.json()).slots || []);
            } catch (error) { console.error(error); }
        };
        fetchSlots();
    }, [id, name, selectedDate]);
    
    const handleShowBookingModal = (time, full_time) => {
        setBookingDetails({ date: selectedDate, time, full_time });
        setModalVisible(true);
    };

    const handleConfirmBooking = async () => {
        const token = await AsyncStorage.getItem('userToken');
        //... logic to post booking
        Alert.alert("Success", "Booking confirmed!");
        setModalVisible(false);
    };

    return (
        <ScrollView style={styles.container}>
            <Image source={{ uri: DEFAULT_IMAGE }} style={styles.headerImage} />
            <View style={styles.content}>
                <Text style={styles.title}>{turf.name}</Text>
                <Text style={styles.location}>📍 {turf.location}</Text>
                <View style={styles.footer}>
                    <Text style={styles.rating}>⭐ {turf.rating}</Text>
                    <Text style={styles.price}>₹{turf.price_per_hour}/hr</Text>
                </View>
            </View>
            
            <Text style={styles.sectionTitle}>Select a Slot</Text>
            {/* Date Tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateTabsContainer}>
                {[0, 1, 2, 3, 4].map(offset => {
                    const d = new Date();
                    d.setDate(d.getDate() + offset);
                    const ds = d.toISOString().split('T')[0];
                    const isSelected = selectedDate === ds;
                    return (
                        <TouchableOpacity 
                            key={offset} 
                            style={[styles.dateTab, isSelected && styles.dateTabSelected]} 
                            onPress={() => setSelectedDate(ds)}>
                            <Text style={[styles.dateTabText, isSelected && styles.dateTabTextSelected]}>
                                {d.toLocaleString('en-US', { weekday: 'short', day: 'numeric' })}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {/* Slots Grid */}
            <View style={styles.slotsGrid}>
                {slotsData.map(item => (
                    <TouchableOpacity
                        key={item.time}
                        style={[styles.slot, !item.available && styles.slotUnavailable]}
                        disabled={!item.available}
                        onPress={() => handleShowBookingModal(item.time, item.full_time)}
                    >
                        <Text style={[styles.slotText, !item.available && styles.slotTextUnavailable]}>{item.time}</Text>
                    </TouchableOpacity>
                ))}
            </View>
            
            <Modal visible={modalVisible} transparent={true} animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalView}>
                        <Text style={styles.modalTitle}>Confirm Booking</Text>
                        <Text style={styles.modalText}>Turf: {turf.name}</Text>
                        <Text style={styles.modalText}>Date: {bookingDetails?.date}</Text>
                        <Text style={styles.modalText}>Time: {bookingDetails?.time}</Text>
                        <PrimaryButton title="Confirm & Pay" onPress={handleConfirmBooking} />
                        <TouchableOpacity onPress={() => setModalVisible(false)}>
                            <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    headerImage: { width: '100%', height: 250 },
    content: { padding: 20 },
    title: { fontSize: 28, fontWeight: 'bold' },
    location: { fontSize: 16, color: '#6b7280', marginVertical: 8 },
    footer: { flexDirection: 'row', justifyContent: 'space-between' },
    rating: { fontSize: 16, fontWeight: 'bold', color: '#10b981' },
    price: { fontSize: 18, fontWeight: 'bold' },
    sectionTitle: { fontSize: 20, fontWeight: '600', paddingHorizontal: 20, marginTop: 10 },
    dateTabsContainer: { paddingHorizontal: 20, paddingVertical: 10 },
    dateTab: { padding: 12, borderRadius: 20, marginRight: 10, backgroundColor: '#f3f4f6' },
    dateTabSelected: { backgroundColor: '#10b981' },
    dateTabText: { color: '#374151', fontWeight: '500' },
    dateTabTextSelected: { color: 'white' },
    slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 20, justifyContent: 'space-around' },
    slot: { width: '30%', paddingVertical: 16, backgroundColor: '#eefcf8', borderRadius: 12, alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#a7f3d0' },
    slotUnavailable: { backgroundColor: '#f1f5f9', borderColor: '#e2e8f0' },
    slotText: { color: '#065f46', fontWeight: '600' },
    slotTextUnavailable: { color: '#94a3b8', textDecorationLine: 'line-through' },
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalView: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 35, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
    modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 15 },
    modalText: { fontSize: 16, marginBottom: 10 },
    cancelText: { color: 'red', marginTop: 15 },
});