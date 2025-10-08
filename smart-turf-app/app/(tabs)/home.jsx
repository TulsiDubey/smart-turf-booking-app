// app/(tabs)/home.jsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { Link } from 'expo-router';
import { useIsFocused } from '@react-navigation/native'; // ✅ Correct
import { API_URL } from '../../config';

const DEFAULT_IMAGE = 'https://placehold.co/600x400/22c55e/ffffff?text=Image+Not+Available';

const TurfCard = ({ turf }) => (
    // Pass the entire turf object as a serialized string. This is more robust.
    <Link 
      href={{ 
        pathname: "/(tabs)/turf/[id]", 
        params: { turf: JSON.stringify(turf) } 
      }} 
      asChild
    >
        <TouchableOpacity style={styles.cardVertical}>
           <Image 
             source={{ uri: turf.image_url || DEFAULT_IMAGE }} 
             style={styles.cardImageVertical} 
           /> 
            <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{turf.name}</Text>
                <Text style={styles.cardLocation}>{turf.location}</Text>
                <View style={styles.cardFooter}>
                    <Text style={styles.cardRating}>⭐ {turf.rating}</Text>
                    <Text style={styles.cardPrice}>₹{turf.price_per_hour}/hr</Text>
                </View>
            </View>
        </TouchableOpacity>
    </Link>
);

export default function HomeScreen() {
    const [turfs, setTurfs] = useState([]);
    const [loading, setLoading] = useState(true);
    const isFocused = useIsFocused();

    const fetchTurfs = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/turfs`);
            if (!response.ok) throw new Error('Failed to fetch turfs.');
            setTurfs(await response.json());
        } catch (error) { 
            console.error(error.message);
            Alert.alert("Error", "Could not connect to the server. Please check your network and server status.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isFocused) {
            fetchTurfs();
        }
    }, [isFocused]);

    if (loading) {
        return <ActivityIndicator size="large" style={styles.centerScreen} />;
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={turfs}
                renderItem={({ item }) => <TurfCard turf={item} />}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={styles.listContainer}
                ListHeaderComponent={<Text style={styles.sectionTitle}>Available Turfs</Text>}
                ListEmptyComponent={<Text style={styles.emptyText}>No turfs available at the moment.</Text>}
                onRefresh={fetchTurfs}
                refreshing={loading}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    centerScreen: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContainer: { padding: 16 },
    sectionTitle: { fontSize: 24, fontWeight: 'bold', color: '#1f2937', marginBottom: 16, paddingHorizontal: 8 },
    cardVertical: { backgroundColor: 'white', borderRadius: 16, marginBottom: 16, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
    cardImageVertical: { width: '100%', height: 180, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
    cardContent: { padding: 12 },
    cardTitle: { fontSize: 18, fontWeight: '600', color: '#111827' },
    cardLocation: { fontSize: 14, color: '#6b7280', marginVertical: 4 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
    cardRating: { fontSize: 14, fontWeight: 'bold', color: '#10b981' },
    cardPrice: { fontSize: 16, fontWeight: 'bold', color: '#1f2937' },
    emptyText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: '#6b7280' },
});