// app/(tabs)/matches.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Alert, ActivityIndicator, ScrollView, TouchableOpacity, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import { PrimaryButton } from '../../components/PrimaryButton';
import { AuthInput } from '../../components/AuthInput';
import { Picker } from '@react-native-picker/picker';
import { API_URL } from '../../config';

export default function MatchesScreen() {
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showCreate, setShowCreate] = useState(false);
    const isFocused = useIsFocused();
    
    const [turfs, setTurfs] = useState([]);
    const [selectedTurfId, setSelectedTurfId] = useState(null);
    const [sport, setSport] = useState('');
    const [playersNeeded, setPlayersNeeded] = useState('');
    const [contribution, setContribution] = useState('');
    const [matchTime, setMatchTime] = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [matchesResponse, turfsResponse] = await Promise.all([
                fetch(`${API_URL}/api/matches`),
                fetch(`${API_URL}/api/turfs`)
            ]);

            const matchesData = await matchesResponse.json();
            if (!matchesResponse.ok) throw new Error(matchesData.error || 'Failed to fetch matches.');
            
            const turfsData = await turfsResponse.json();
            if (!turfsResponse.ok) throw new Error(turfsData.error || 'Failed to fetch turfs.');
            
            setMatches(matchesData);
            setTurfs(turfsData);

            if (turfsData.length > 0 && !selectedTurfId) {
                setSelectedTurfId(turfsData[0].id);
            }
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [selectedTurfId]);

    useEffect(() => {
        if (isFocused) {
            fetchData();
        }
    }, [isFocused, fetchData]);

    const handleCreateMatch = async () => {
        if (!selectedTurfId || !sport || !playersNeeded || !matchTime) {
            Alert.alert("Validation Error", "Please fill in all required fields.");
            return;
        }

        const token = await AsyncStorage.getItem('userToken');
        // Improved date validation
        const isoMatchTime = new Date(matchTime.replace(' ', 'T')).toISOString();
        if (isNaN(new Date(isoMatchTime).getTime())) {
            Alert.alert("Invalid Date", "Please use the format YYYY-MM-DD HH:MM for the date and time.");
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/matches`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    turf_id: selectedTurfId,
                    sport: sport,
                    players_needed: parseInt(playersNeeded, 10),
                    contribution_per_person: parseFloat(contribution) || 0,
                    match_time: isoMatchTime,
                }),
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Failed to create match.");

            Alert.alert("Success!", "Match created successfully!");
            setShowCreate(false);
            fetchData(); // Refresh the list
        } catch (err) {
            Alert.alert("Error", err.message);
        }
    };
    
    const handleJoinMatch = async (matchId) => {
        const token = await AsyncStorage.getItem('userToken');
        try {
            const response = await fetch(`${API_URL}/api/matches/${matchId}/join`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Could not join match.");
            Alert.alert("Success", "Successfully joined match!");
            fetchData(); // Refresh the list
        } catch (e) {
            Alert.alert("Error", e.message);
        }
    };

    if (loading && !showCreate) {
        return <ActivityIndicator size="large" style={styles.centerScreen} />;
    }

    if (error) {
        return (
            <View style={styles.centerScreen}>
                <Text style={styles.emptyText}>Error: {error}</Text>
                <PrimaryButton title="Try Again" onPress={fetchData} />
            </View>
        );
    }

    if (showCreate) {
        return (
            <ScrollView contentContainerStyle={styles.formContainer}>
                <Text style={styles.title}>Organize a Match</Text>
                
                <Text style={styles.label}>Select a Turf</Text>
                <View style={styles.pickerContainer}>
                    <Picker
                        selectedValue={selectedTurfId}
                        onValueChange={(itemValue) => setSelectedTurfId(itemValue)}
                    >
                        {turfs.map(turf => (
                            <Picker.Item key={turf.id} label={`${turf.name} - ${turf.location}`} value={turf.id} />
                        ))}
                    </Picker>
                </View>

                <AuthInput placeholder="Sport (e.g., Football)" value={sport} onChangeText={setSport} />
                <AuthInput placeholder="Players Needed" value={playersNeeded} onChangeText={setPlayersNeeded} keyboardType="numeric" />
                <AuthInput placeholder="Contribution per Person (₹)" value={contribution} onChangeText={setContribution} keyboardType="numeric" />
                <AuthInput placeholder="Date & Time (YYYY-MM-DD HH:MM)" value={matchTime} onChangeText={setMatchTime} />

                <PrimaryButton title="Create Match" onPress={handleCreateMatch} />
                <TouchableOpacity style={styles.cancelButton} onPress={() => setShowCreate(false)}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
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
                        <Text style={styles.details}>🕒 {new Date(item.match_time).toLocaleString()}</Text>
                        <Text style={styles.details}>💰 ₹{item.contribution_per_person} per person</Text>
                        <View style={styles.footer}>
                            <Text style={styles.spots}>{item.players_needed - item.current_players} spots left</Text>
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
                onRefresh={fetchData}
                refreshing={loading}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    centerScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    header: { padding: 16, borderBottomWidth: 1, borderColor: '#eee', backgroundColor: 'white' },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
    card: { backgroundColor: '#fff', borderRadius: 12, marginHorizontal: 16, marginVertical: 8, padding: 16, elevation: 2 },
    sport: { fontSize: 18, fontWeight: 'bold', color: '#10b981', marginBottom: 10 },
    details: { fontSize: 15, color: '#374151', marginBottom: 4 },
    footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15, paddingTop: 10, borderTopWidth: 1, borderColor: '#f3f4f6' },
    spots: { fontSize: 14, color: '#6b7280', fontWeight: '500' },
    emptyText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: '#6b7280' },
    formContainer: { padding: 20, paddingBottom: 50, backgroundColor: '#f9fafb' },
    label: { fontSize: 16, fontWeight: '500', color: '#374151', marginBottom: 8, marginLeft: 4 },
    pickerContainer: { backgroundColor: '#f3f4f6', borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb', justifyContent: 'center' },
    cancelButton: { marginTop: 10, alignItems: 'center', paddingVertical: 10 },
    cancelButtonText: { color: '#ef4444', fontSize: 16, fontWeight: '500' },
});