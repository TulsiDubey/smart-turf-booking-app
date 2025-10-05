// app/(tabs)/home.jsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { Link } from 'expo-router';

const API_URL = 'http://192.168.75.155:3000'; // Remember to use your IP!
const DEFAULT_IMAGE = 'https://placehold.co/600x400/22c55e/ffffff?text=Image+Not+Available';

const TurfCard = ({ turf }) => (
    // Use the Link component to navigate to a detail screen.
    // We pass the turf data via `pathname` and `params`.
    <Link href={{ pathname: "/(tabs)/turf/[id]", params: { id: turf.id, name: turf.name } }} asChild>
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

    useEffect(() => {
        const fetchTurfs = async () => {
            try {
                const response = await fetch(`${API_URL}/api/turfs`);
                if (!response.ok) throw new Error('Failed to fetch turfs.');
                setTurfs(await response.json());
            } catch (error) { 
                console.error(error.message);
                Alert.alert("Error", "Could not fetch turfs.");
            } finally {
                setLoading(false);
            }
        };
        fetchTurfs();
    }, []);

    if (loading) {
        return <ActivityIndicator size="large" style={{ flex: 1 }} />;
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={turfs}
                renderItem={({ item }) => <TurfCard turf={item} />}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={{ padding: 16 }}
                ListHeaderComponent={<Text style={styles.sectionTitle}>Available Turfs</Text>}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    sectionTitle: { fontSize: 24, fontWeight: 'bold', color: '#1f2937', marginBottom: 16, paddingHorizontal: 8 },
    cardVertical: { backgroundColor: 'white', borderRadius: 16, marginBottom: 16, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
    cardImageVertical: { width: '100%', height: 180, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
    cardContent: { padding: 12 },
    cardTitle: { fontSize: 18, fontWeight: '600', color: '#111827' },
    cardLocation: { fontSize: 14, color: '#6b7280', marginVertical: 4 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
    cardRating: { fontSize: 14, fontWeight: 'bold', color: '#10b981' },
    cardPrice: { fontSize: 16, fontWeight: 'bold', color: '#1f2937' },
});