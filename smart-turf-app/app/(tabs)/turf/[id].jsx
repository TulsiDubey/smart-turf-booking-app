// app/(tabs)/turf/[id].jsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Alert, Modal, ActivityIndicator, FlatList } from 'react-native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { PrimaryButton } from '../../../components/PrimaryButton';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../../config';

const DEFAULT_IMAGE = 'https://placehold.co/600x400/22c55e/ffffff?text=Image+Not+Available';

export default function TurfDetailScreen() {
    const params = useLocalSearchParams();
    const turf = params.turf ? JSON.parse(params.turf) : null;
    
    const navigation = useNavigation();
    const router = useRouter();
    
    const [slotsData, setSlotsData] = useState([]);
    const [loadingSlots, setLoadingSlots] = useState(true);
    const [kits, setKits] = useState([]);
    const [loadingKits, setLoadingKits] = useState(true);
    const [selectedKit, setSelectedKit] = useState(null);

    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [modalVisible, setModalVisible] = useState(false);
    const [bookingDetails, setBookingDetails] = useState(null);
    const [isBooking, setIsBooking] = useState(false);

    // ✅ FIX: The useEffect hook was causing an infinite loop.
    // I've separated the logic into two hooks. This one only sets the screen title.
    useEffect(() => {
        if (turf) {
            navigation.setOptions({ title: turf.name });
        }
    }, [turf, navigation]);

    // ✅ FIX: This hook now fetches data and has a stable dependency array, which stops the infinite loop.
    useEffect(() => {
        if (!turf || !turf.id) {
            setLoadingSlots(false);
            setLoadingKits(false);
            return;
        }

        const fetchSlotsAndKits = async () => {
            setLoadingSlots(true);
            setLoadingKits(true);
            try {
                const [slotsResponse, kitsResponse] = await Promise.all([
                    fetch(`${API_URL}/api/bookings/slots/${turf.id}?date=${selectedDate}`),
                    fetch(`${API_URL}/api/kits`)
                ]);

                const slotsData = await slotsResponse.json();
                if (!slotsResponse.ok) throw new Error(slotsData.error || 'Failed to fetch slots.');
                setSlotsData(slotsData.slots || []);

                const kitsData = await kitsResponse.json();
                if (!kitsResponse.ok) throw new Error(kitsData.error || 'Failed to fetch kits.');
                setKits(kitsData || []);

            } catch (error) { 
                console.error(error); 
                Alert.alert("Error", `Could not connect to the server. ${error.message}`);
            } finally {
                setLoadingSlots(false);
                setLoadingKits(false);
            }
        };

        fetchSlotsAndKits();
    }, [turf?.id, selectedDate]); // Depends on stable values: the turf's ID and the selected date.
    
    if (!turf) {
        return (
            <View style={styles.centerScreen}>
                <Text>Turf details not found.</Text>
            </View>
        );
    }
    
    const handleShowBookingModal = (time, full_time) => {
        const totalPrice = parseFloat(turf.price_per_hour) + (selectedKit ? parseFloat(selectedKit.price_per_hour) : 0);
        setBookingDetails({ date: selectedDate, time, full_time, selectedKit, totalPrice });
        setModalVisible(true);
    };

    const handleConfirmBooking = async () => {
        if (!bookingDetails) return;

        setIsBooking(true);
        const token = await AsyncStorage.getItem('userToken');
        if (!token) {
            Alert.alert("Authentication Error", "You must be logged in to book.", [
                { text: "OK", onPress: () => router.replace('/login') }
            ]);
            setIsBooking(false);
            return;
        }

        const startTime = `${bookingDetails.date}T${bookingDetails.full_time}:00.000Z`;

        try {
            const response = await fetch(`${API_URL}/api/bookings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    turf_id: turf.id,
                    start_time: startTime,
                    kit_id: bookingDetails.selectedKit ? bookingDetails.selectedKit.id : null,
                })
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "An unknown error occurred.");

            Alert.alert("Success", "Booking confirmed! You can view it in 'My Bookings'.");
        
        } catch (error) {
            Alert.alert("Error", error.message);
        } finally {
            setModalVisible(false);
            setIsBooking(false);
            // Manually update the specific slot to be unavailable to avoid a full refresh
            setSlotsData(prevSlots => prevSlots.map(slot => 
                slot.full_time === bookingDetails.full_time ? { ...slot, available: false } : slot
            ));
        }
    };

    const toggleKitSelection = (kit) => {
        setSelectedKit(prevSelectedKit => 
            prevSelectedKit?.id === kit.id ? null : kit
        );
    };

    return (
        <ScrollView style={styles.container}>
            <Image source={{ uri: turf.image_url || DEFAULT_IMAGE }} style={styles.headerImage} />
            <View style={styles.content}>
                <Text style={styles.title}>{turf.name}</Text>
                <Text style={styles.location}>📍 {turf.location}</Text>
                <View style={styles.footer}>
                    <Text style={styles.rating}>⭐ {turf.rating}</Text>
                    <Text style={styles.price}>₹{turf.price_per_hour}/hr</Text>
                </View>
            </View>
            
            <Text style={styles.sectionTitle}>1. Select a Slot</Text>
            
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

            {loadingSlots ? (
                <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 20 }} />
            ) : (
                <View style={styles.slotsGrid}>
                    {slotsData.length > 0 ? slotsData.map(item => (
                        <TouchableOpacity
                            key={item.time}
                            style={[styles.slot, !item.available && styles.slotUnavailable]}
                            disabled={!item.available}
                            onPress={() => handleShowBookingModal(item.time, item.full_time)}
                        >
                            <Text style={[styles.slotText, !item.available && styles.slotTextUnavailable]}>{item.time}</Text>
                        </TouchableOpacity>
                    )) : <Text style={styles.emptyText}>No slots available for this day.</Text>}
                </View>
            )}

            <Text style={styles.sectionTitle}>2. Borrow a Kit (Optional)</Text>
            
            {loadingKits ? (
                 <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    horizontal
                    data={kits}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={styles.kitListContainer}
                    renderItem={({ item }) => {
                        const isKitSelected = selectedKit && selectedKit.id === item.id;
                        return (
                            <TouchableOpacity style={[styles.kitCard, isKitSelected && styles.kitCardSelected]} onPress={() => toggleKitSelection(item)}>
                                <Image source={{ uri: item.image_url || DEFAULT_IMAGE }} style={styles.kitImage} />
                                <Text style={styles.kitName}>{item.name}</Text>
                                <Text style={styles.kitPrice}>₹{item.price_per_hour}/hr</Text>
                            </TouchableOpacity>
                        );
                    }}
                    ListEmptyComponent={<Text style={styles.emptyText}>No kits available.</Text>}
                />
            )}
            
            <Modal visible={modalVisible} transparent={true} animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalView}>
                        <Text style={styles.modalTitle}>Confirm Booking</Text>
                        <Text style={styles.modalText}>Turf: {turf.name} (₹{turf.price_per_hour})</Text>
                        {bookingDetails?.selectedKit && (
                             <Text style={styles.modalText}>Kit: {bookingDetails.selectedKit.name} (₹{bookingDetails.selectedKit.price_per_hour})</Text>
                        )}
                        <Text style={styles.modalText}>Date: {bookingDetails?.date}</Text>
                        <Text style={styles.modalText}>Time: {bookingDetails?.time}</Text>
                        <View style={styles.divider} />
                        <Text style={styles.totalPriceText}>Total: ₹{bookingDetails?.totalPrice}</Text>
                        <PrimaryButton title="Confirm Booking" onPress={handleConfirmBooking} isLoading={isBooking} />
                        <TouchableOpacity onPress={() => setModalVisible(false)} style={{padding: 10}}>
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
    centerScreen: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    headerImage: { width: '100%', height: 250 },
    content: { padding: 20 },
    title: { fontSize: 28, fontWeight: 'bold' },
    location: { fontSize: 16, color: '#6b7280', marginVertical: 8 },
    footer: { flexDirection: 'row', justifyContent: 'space-between' },
    rating: { fontSize: 16, fontWeight: 'bold', color: '#10b981' },
    price: { fontSize: 18, fontWeight: 'bold' },
    sectionTitle: { fontSize: 20, fontWeight: '600', paddingHorizontal: 20, marginTop: 20, marginBottom: 10 },
    dateTabsContainer: { paddingHorizontal: 20, paddingVertical: 10 },
    dateTab: { padding: 12, borderRadius: 20, marginRight: 10, backgroundColor: '#f3f4f6' },
    dateTabSelected: { backgroundColor: '#10b981' },
    dateTabText: { color: '#374151', fontWeight: '500' },
    dateTabTextSelected: { color: 'white' },
    slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 15, paddingTop: 10, justifyContent: 'flex-start' },
    slot: { width: '31%', marginHorizontal: '1%', paddingVertical: 16, backgroundColor: '#eefcf8', borderRadius: 12, alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#a7f3d0' },
    slotUnavailable: { backgroundColor: '#f1f5f9', borderColor: '#e2e8f0' },
    slotText: { color: '#065f46', fontWeight: '600' },
    slotTextUnavailable: { color: '#94a3b8', textDecorationLine: 'line-through' },
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalView: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 25, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5, width: '100%' },
    modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    modalText: { fontSize: 16, marginBottom: 8, color: '#374151' },
    divider: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 15 },
    totalPriceText: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    cancelText: { color: '#ef4444', marginTop: 15, fontWeight: '500', textAlign: 'center' },
    emptyText: { textAlign: 'center', width: '100%', marginTop: 20, fontSize: 16, color: '#6b7280', paddingHorizontal: 20 },
    // Kit styles
    kitListContainer: { paddingHorizontal: 20, paddingBottom: 20 },
    kitCard: { width: 140, marginRight: 15, borderWidth: 2, borderColor: '#e5e7eb', borderRadius: 12, padding: 8, alignItems: 'center' },
    kitCardSelected: { borderColor: '#10b981' },
    kitImage: { width: 120, height: 80, borderRadius: 8, marginBottom: 8 },
    kitName: { fontWeight: '600', color: '#1f2937' },
    kitPrice: { color: '#6b7280' },
});