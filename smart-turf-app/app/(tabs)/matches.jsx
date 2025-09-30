// app/(tabs)/matches.jsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Alert, ActivityIndicator, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import { PrimaryButton } from '../../components/PrimaryButton';
import { AuthInput } from '../../components/AuthInput';

const API_URL = 'http://192.168.137.155:3000';

export default function MatchesScreen() {
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const isFocused = useIsFocused();
    
    // Form state
    const [sport, setSport] = useState('');
    const [playersNeeded, setPlayersNeeded] = useState('');
    const [contribution, setContribution] = useState('');
    const [matchTime, setMatchTime] = useState(''); // Simple text input for now

    const fetchMatches = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_URL}/api/matches`);
            if (!response.ok) throw new Error('Failed to fetch matches.');
            setMatches(await response.json());
        } catch (error) {
            Alert.alert("Error", error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isFocused) {
            fetchMatches();
        }
    }, [isFocused]);

    const handleJoinMatch = async (matchId) => {
        const token = await AsyncStorage.getItem('userToken');
        try {
            const response = await fetch(`${API_URL}/api/matches/${matchId}/join`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            Alert.alert("Success", "Successfully joined match!");
            fetchMatches(); // Refresh the list
        } catch (e) {
            Alert.alert("Error", e.message);
        }
    };

    const handleCreateMatch = async () => {
        // TODO: Add validation and turf selection
        Alert.alert("Note", "Turf selection needs to be implemented with a picker.");
    };

    if (loading) {
        return <ActivityIndicator size="large" style={{ flex: 1, justifyContent: 'center' }} />;
    }

    if (showCreate) {
        return (
            <ScrollView contentContainerStyle={styles.formContainer}>
                <Text style={styles.title}>Organize a Match</Text>
                {/* Note: A proper turf selector (Picker or Modal) would be needed here */}
                <AuthInput placeholder="Sport (e.g., Football)" value={sport} onChangeText={setSport} />
                <AuthInput placeholder="Players Needed" value={playersNeeded} onChangeText={setPlayersNeeded} keyboardType="numeric" />
                <AuthInput placeholder="Contribution per Person" value={contribution} onChangeText={setContribution} keyboardType="numeric" />
                <AuthInput placeholder="Match Time (e.g., 8:00 PM)" value={matchTime} onChangeText={setMatchTime} />
                <PrimaryButton title="Create Match" onPress={handleCreateMatch} />
                <PrimaryButton title="Cancel" onPress={() => setShowCreate(false)} />
            </ScrollView>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={matches}
                keyExtractor={item => item.id.toString()}
                renderItem={({ item }) => (
                    <View style={styles.card}>
                        <Text style={styles.sport}>{item.sport}</Text>
                        <Text style={styles.details}>📍 {item.turf_name}</Text>
                        <Text style={styles.details}>📅 {new Date(item.match_time).toLocaleString()}</Text>
                        <Text style={styles.details}>💰 ₹{item.contribution_per_person} per person</Text>
                        <View style={styles.footer}>
                            <Text style={styles.spots}>{item.players_needed - (item.current_players || 0)} spots left</Text>
                            <PrimaryButton title="Join" onPress={() => handleJoinMatch(item.id)} />
                        </View>
                    </View>
                )}
                ListHeaderComponent={
                    <View style={styles.header}>
                        <Text style={styles.title}>Join a Match</Text>
                        <PrimaryButton title="Organize Match" onPress={() => setShowCreate(true)} />
                    </View>
                }
                ListEmptyComponent={<Text style={styles.emptyText}>No open matches available.</Text>}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    header: { padding: 16, borderBottomWidth: 1, borderColor: '#eee' },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
    card: { backgroundColor: '#fff', borderRadius: 12, margin: 16, padding: 16, elevation: 2 },
    sport: { fontSize: 18, fontWeight: 'bold', color: '#10b981', marginBottom: 10 },
    details: { fontSize: 15, color: '#374151', marginBottom: 4 },
    footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15, paddingTop: 10, borderTopWidth: 1, borderColor: '#f3f4f6' },
    spots: { fontSize: 14, color: '#6b7280', fontWeight: '500' },
    emptyText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: '#6b7280' },
    formContainer: { padding: 16 },
});