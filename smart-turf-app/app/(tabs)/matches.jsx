// app/(tabs)/matches.jsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Alert, ActivityIndicator, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import { PrimaryButton } from '../../components/PrimaryButton';
import { AuthInput } from '../../components/AuthInput';
import { Picker } from '@react-native-picker/picker';

const API_URL = 'http://192.168.75.155:3000'; // Make sure this is your correct IP

export default function MatchesScreen() {
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const isFocused = useIsFocused();
    
    // --- NEW STATE FOR THE FORM ---
    const [turfs, setTurfs] = useState([]);
    const [selectedTurfId, setSelectedTurfId] = useState(null);
    const [sport, setSport] = useState('');
    const [playersNeeded, setPlayersNeeded] = useState('');
    const [contribution, setContribution] = useState('');
    const [matchTime, setMatchTime] = useState(''); // e.g., "2025-10-28 20:00"

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
    
    // --- NEW FUNCTION TO FETCH TURFS FOR THE PICKER ---
    const fetchTurfsForPicker = async () => {
        try {
            const response = await fetch(`${API_URL}/api/turfs`);
            if (!response.ok) throw new Error('Failed to fetch turfs.');
            const turfsData = await response.json();
            setTurfs(turfsData);
            if (turfsData.length > 0) {
                setSelectedTurfId(turfsData[0].id); // Default to the first turf
            }
        } catch (error) { 
            Alert.alert("Error", "Could not load turfs for selection.");
        }
    };

    useEffect(() => {
        if (isFocused) {
            fetchMatches();
            fetchTurfsForPicker(); // Fetch turfs when screen is focused
        }
    }, [isFocused]);

    const handleJoinMatch = async (matchId) => {
        // ... (your existing handleJoinMatch function - no changes needed)
    };
    
    // --- UPDATED FUNCTION TO HANDLE MATCH CREATION ---
    const handleCreateMatch = async () => {
        if (!selectedTurfId || !sport || !playersNeeded || !matchTime) {
            Alert.alert("Validation Error", "Please fill in all fields.");
            return;
        }

        const token = await AsyncStorage.getItem('userToken');
        // Convert user-friendly time to ISO string for the backend
        const isoMatchTime = new Date(matchTime.replace(' ', 'T')).toISOString();

        try {
            const response = await fetch(`${API_URL}/api/matches`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
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
            setShowCreate(false); // Hide form
            fetchMatches(); // Refresh the list of matches
        } catch (error) {
            Alert.alert("Error", error.message);
        }
    };

    if (loading) {
        return <ActivityIndicator size="large" style={{ flex: 1, justifyContent: 'center' }} />;
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
                <AuthInput placeholder="Match Time (e.g., 2025-10-28 20:00)" value={matchTime} onChangeText={setMatchTime} />

                <PrimaryButton title="Create Match" onPress={handleCreateMatch} />
                <TouchableOpacity style={styles.cancelButton} onPress={() => setShowCreate(false)}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
            </ScrollView>
        );
    }

    return (
        <View style={styles.container}>
            {/* ... (Your existing FlatList to display matches - no changes needed) ... */}
        </View>
    );
}

// Add/Update these styles to your StyleSheet.create call
const styles = StyleSheet.create({
    // ... (your existing styles: container, header, title, card, etc.)
    formContainer: { padding: 20 },
    label: { fontSize: 16, fontWeight: '500', color: '#374151', marginBottom: 8, marginLeft: 4 },
    pickerContainer: {
        backgroundColor: '#f3f4f6',
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        justifyContent: 'center',
    },
    cancelButton: {
        marginTop: 10,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: '#ef4444',
        fontSize: 16,
        fontWeight: '500',
    },
});