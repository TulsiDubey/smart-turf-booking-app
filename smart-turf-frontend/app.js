import React, { useState, useEffect } from 'react';

// --- API Configuration ---
// Base URL for the backend server.
// If your backend is running on a different port, change it here.
const API_URL = 'http://localhost:3000';


// --- Helper Functions & Initial Data ---

// Generates placeholder slots if the backend isn't running.
function generateMockSlots(startHour, endHour) {
    const slots = [];
    const now = new Date();
    for (let i = 0; i < 3; i++) { // Generate slots for next 3 days
        const date = new Date(now);
        date.setDate(now.getDate() + i);
        const daySlots = [];
        for (let j = startHour; j < endHour; j++) {
            daySlots.push({
                time: `${j}:00 - ${j+1}:00`,
                available: Math.random() > 0.3, // Random availability
            });
        }
        slots.push({ date: date.toISOString().split('T')[0], slots: daySlots });
    }
    return slots;
}

// --- Reusable UI Components ---

const AuthInput = ({ icon, placeholder, value, onChange, type = 'text' }) => (
  <div style={styles.inputContainer}>
    <span style={styles.inputIcon}>{icon}</span>
    <input
      style={styles.input}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      type={type}
      autoComplete={type === 'password' ? 'current-password' : 'email'}
    />
  </div>
);

const PrimaryButton = ({ title, onClick, disabled = false }) => (
  <button
    style={{...styles.button, ...(disabled ? styles.buttonDisabled : {})}}
    onClick={onClick}
    disabled={disabled}
  >
    {title}
  </button>
);

const TurfCard = ({ turf, onClick }) => (
  <div style={styles.card} onClick={onClick}>
    <img src={turf.image_url || 'https://placehold.co/600x400/22c55e/ffffff?text=Image'} alt={turf.name} style={styles.cardImage} />
    <div style={styles.cardContent}>
      <p style={styles.cardTitle}>{turf.name}</p>
      <p style={styles.cardLocation}>{turf.location}</p>
      <div style={styles.cardFooter}>
        <span style={styles.cardRating}>⭐ {turf.rating}</span>
        <span style={styles.cardPrice}>₹{turf.price_per_hour}/hr</span>
      </div>
    </div>
  </div>
);

const CustomAlert = ({ message, visible, onClose }) => {
    if (!visible) return null;
    return (
        <div style={modalStyles.overlay}>
            <div style={modalStyles.alertView}>
                <p style={modalStyles.modalTitle}>Alert</p>
                <p style={modalStyles.modalText}>{message}</p>
                <PrimaryButton title="OK" onClick={onClose} />
            </div>
        </div>
    );
};


// --- Main App Screens ---

const AuthScreen = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [alert, setAlert] = useState({ visible: false, message: '' });

  const showAlert = (message) => setAlert({ visible: true, message });

  const handleAuth = async () => {
    setIsLoading(true);
    const url = isLogin ? `${API_URL}/api/auth/login` : `${API_URL}/api/auth/register`;
    const payload = isLogin ? { email, password } : { name, email, password };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Something went wrong.');
        }

        if (isLogin) {
            onLoginSuccess(data.token, data.user);
        } else {
             // After successful registration, attempt to log in automatically
            const loginResponse = await fetch(`${API_URL}/api/auth/login`, {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({ email, password }),
            });
            const loginData = await loginResponse.json();
            if (!loginResponse.ok) throw new Error(loginData.error || 'Registration successful, but login failed.');
            onLoginSuccess(loginData.token, loginData.user);
        }

    } catch (error) {
        showAlert(error.message);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div style={authStyles.container}>
      <CustomAlert 
        visible={alert.visible} 
        message={alert.message} 
        onClose={() => setAlert({ visible: false, message: ''})} 
      />
      <h1 style={authStyles.logo}>⚽</h1>
      <h2 style={authStyles.title}>{isLogin ? 'Welcome Back!' : 'Create Account'}</h2>
      <p style={authStyles.subtitle}>{isLogin ? 'Log in to continue your journey' : 'Sign up to find your next game'}</p>

      {!isLogin && <AuthInput icon="👤" placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} />}
      <AuthInput icon="✉️" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} type="email" />
      <AuthInput icon="🔒" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} type="password" />

      <PrimaryButton title={isLoading ? 'Loading...' : (isLogin ? 'Log In' : 'Sign Up')} onClick={handleAuth} disabled={isLoading} />

      <button onClick={() => setIsLogin(!isLogin)} style={authStyles.switchButton}>
        <span style={authStyles.switchText}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <span style={authStyles.switchLink}>{isLogin ? 'Sign Up' : 'Log In'}</span>
        </span>
      </button>
    </div>
  );
};

const HomeScreen = ({ onTurfSelect }) => {
    const [turfs, setTurfs] = useState([]);

    useEffect(() => {
        const fetchTurfs = async () => {
            try {
                const response = await fetch(`${API_URL}/api/turfs`);
                if (!response.ok) throw new Error('Failed to fetch turfs.');
                const data = await response.json();
                setTurfs(data);
            } catch (error) {
                console.error(error.message);
                // In case of error, you could show a message to the user
            }
        };
        fetchTurfs();
    }, []);

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <h1 style={styles.headerTitle}>Find a Turf</h1>
                <p style={styles.headerSubtitle}>Thane, Maharashtra</p>
            </header>
            <div style={styles.searchContainer}>
                <input style={styles.searchInput} placeholder="Search for arenas, locations..." />
            </div>

            <h2 style={styles.sectionTitle}>Available Turfs</h2>
            <div style={styles.horizontalScroll}>
                {turfs.map(turf => (
                    <TurfCard key={turf.id} turf={turf} onClick={() => onTurfSelect(turf)} />
                ))}
            </div>
        </div>
    );
};

const TurfDetailScreen = ({ turf, onBack, onBooking }) => {
    const [slotsData, setSlotsData] = useState(null);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [isLoadingSlots, setIsLoadingSlots] = useState(true);

    useEffect(() => {
        const fetchSlots = async () => {
            setIsLoadingSlots(true);
            try {
                const response = await fetch(`${API_URL}/api/bookings/slots/${turf.id}?date=${selectedDate}`);
                if (!response.ok) throw new Error('Failed to fetch slots.');
                const data = await response.json();
                setSlotsData(data.slots);
            } catch (error) {
                console.error(error.message);
                setSlotsData([]); // Set to empty on error
            } finally {
                setIsLoadingSlots(false);
            }
        };
        fetchSlots();
    }, [turf.id, selectedDate]);

    const renderDateTab = (offset) => {
        const date = new Date();
        date.setDate(date.getDate() + offset);
        const dateString = date.toISOString().split('T')[0];
        const isSelected = selectedDate === dateString;

        return (
            <button
                key={offset}
                style={{...slotStyles.dateTab, ...(isSelected ? slotStyles.dateTabSelected : {})}}
                onClick={() => setSelectedDate(dateString)}
            >
                <span style={{...slotStyles.dateTabText, ...(isSelected ? slotStyles.dateTabTextSelected : {})}}>
                    {date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })}
                </span>
            </button>
        );
    };

    return (
        <div>
            <div style={detailStyles.headerContainer}>
                <img src={turf.image_url} alt={turf.name} style={detailStyles.headerImage} />
                <button style={detailStyles.backButton} onClick={onBack}>
                    <span>←</span>
                </button>
            </div>
            
            <div style={detailStyles.content}>
                <h1 style={detailStyles.title}>{turf.name}</h1>
                <p style={detailStyles.location}>📍 {turf.location}</p>
                <h2 style={detailStyles.sectionTitle}>Book a Slot</h2>
            </div>

            <div style={slotStyles.dateTabsContainer}>
                {[0, 1, 2, 3, 4].map(offset => renderDateTab(offset))}
            </div>

            <div style={slotStyles.slotsGrid}>
                {isLoadingSlots ? <p>Loading slots...</p> : 
                    slotsData && slotsData.length > 0 ? slotsData.map(item => (
                        <button
                            key={item.time}
                            style={{...slotStyles.slot, ...(!item.available ? slotStyles.slotUnavailable : {})}}
                            onClick={() => item.available && onBooking(turf, selectedDate, item.time)}
                            disabled={!item.available}
                        >
                            <span style={{...slotStyles.slotText, ...(!item.available ? slotStyles.slotTextUnavailable : {})}}>
                                {item.time}
                            </span>
                        </button>
                    )) : <p>No slots available for this date.</p>
                }
            </div>
        </div>
    );
};


const BookingModal = ({ visible, onClose, onConfirm, turf, date, time, token }) => {
    if (!visible || !turf) return null;
    
    const handleConfirm = async () => {
        const [startHour] = time.split(' ')[0].split(':');
        const startTime = new Date(date);
        startTime.setHours(parseInt(startHour, 10), 0, 0, 0);

        const endTime = new Date(startTime);
        endTime.setHours(startTime.getHours() + 1);

        try {
            await onConfirm({
                turf_id: turf.id,
                start_time: startTime.toISOString(),
                end_time: endTime.toISOString(),
                total_price: turf.price_per_hour,
            });
        } catch (error) {
             console.error("Booking failed from modal:", error);
        }
    };

    return (
        <div style={modalStyles.overlay}>
            <div style={modalStyles.modalView}>
                <h2 style={modalStyles.modalTitle}>Confirm Booking</h2>
                <p style={modalStyles.modalText}>You are booking:</p>
                <p style={modalStyles.bookingDetail}>{turf.name}</p>
                <p style={modalStyles.bookingDetail}>📅 {new Date(date).toDateString()}</p>
                <p style={modalStyles.bookingDetail}>🕒 {time}</p>
                <div style={modalStyles.priceContainer}>
                    <span style={modalStyles.priceLabel}>Price:</span>
                    <span style={modalStyles.priceValue}>₹{turf.price_per_hour}</span>
                </div>
                
                <PrimaryButton title="Confirm & Pay" onClick={handleConfirm} />
                <button onClick={onClose} style={modalStyles.cancelButton}>
                    Cancel
                </button>
            </div>
        </div>
    );
};

// --- Main App Component ---
export default function App() {
  const [authToken, setAuthToken] = useState(null);
  const [user, setUser] = useState(null);
  const [currentScreen, setCurrentScreen] = useState('auth'); // auth, home, detail
  const [selectedTurf, setSelectedTurf] = useState(null);
  const [bookingDetails, setBookingDetails] = useState(null);
  const [isBookingModalVisible, setBookingModalVisible] = useState(false);
  const [alert, setAlert] = useState({ visible: false, message: '' });

  const showAlert = (message) => setAlert({ visible: true, message });

  const handleLoginSuccess = (token, userData) => {
    setAuthToken(token);
    setUser(userData);
    setCurrentScreen('home');
  };

  const handleTurfSelect = (turf) => {
    setSelectedTurf(turf);
    setCurrentScreen('detail');
  };
  
  const handleBackToHome = () => {
      setSelectedTurf(null);
      setCurrentScreen('home');
  };

  const handleShowBookingModal = (turf, date, time) => {
      setBookingDetails({turf, date, time});
      setBookingModalVisible(true);
  };
  
  const handleConfirmBooking = async (bookingData) => {
      if (!authToken) {
          showAlert("You must be logged in to book.");
          return;
      }
      try {
        const response = await fetch(`${API_URL}/api/bookings`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(bookingData)
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Booking failed");
        
        showAlert("Booking successful!");
        setBookingModalVisible(false);
        setBookingDetails(null);
        // Optionally, navigate to a "My Bookings" screen here
      } catch (error) {
          showAlert(error.message);
      }
  };


  const renderScreen = () => {
    switch (currentScreen) {
        case 'auth':
            return <AuthScreen onLoginSuccess={handleLoginSuccess} />;
        case 'home':
            return <HomeScreen onTurfSelect={handleTurfSelect} />;
        case 'detail':
            if (selectedTurf) {
                return <TurfDetailScreen turf={selectedTurf} onBack={handleBackToHome} onBooking={handleShowBookingModal} />;
            }
        default:
             return <AuthScreen onLoginSuccess={handleLoginSuccess} />;
    }
  };

  return (
    <div style={styles.safeArea}>
      <CustomAlert 
        visible={alert.visible} 
        message={alert.message} 
        onClose={() => setAlert({ visible: false, message: ''})} 
      />
      {renderScreen()}
      <BookingModal 
        visible={isBookingModalVisible}
        onClose={() => setBookingModalVisible(false)}
        onConfirm={handleConfirmBooking}
        turf={bookingDetails?.turf}
        date={bookingDetails?.date}
        time={bookingDetails?.time}
        token={authToken}
      />
    </div>
  );
}


// --- Stylesheets (as JS objects for React web) ---

const styles = {
  safeArea: { flex: 1, backgroundColor: '#f9fafb', fontFamily: 'sans-serif', maxWidth: '425px', margin: '0 auto', border: '1px solid #e5e7eb' },
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { padding: '24px' },
  headerTitle: { fontSize: '28px', fontWeight: 'bold', color: '#111827', margin: 0 },
  headerSubtitle: { fontSize: '16px', color: '#6b7280', margin: 0, marginTop: '4px' },
  searchContainer: { padding: '0 16px 16px 16px' },
  searchInput: {
    backgroundColor: '#fff',
    padding: '12px',
    borderRadius: '12px',
    fontSize: '16px',
    border: '1px solid #e5e7eb',
    width: 'calc(100% - 26px)',
  },
  sectionTitle: { fontSize: '20px', fontWeight: '600', color: '#1f2937', padding: '0 20px', marginBottom: '12px', marginTop: '10px' },
  horizontalScroll: { display: 'flex', overflowX: 'auto', padding: '0 16px 16px 16px', scrollbarWidth: 'none' },
  card: {
    backgroundColor: 'white',
    borderRadius: '16px',
    marginRight: '16px',
    width: '280px',
    flexShrink: 0,
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    cursor: 'pointer',
  },
  cardImage: { width: '100%', height: '150px', borderTopLeftRadius: '16px', borderTopRightRadius: '16px', objectFit: 'cover' },
  cardContent: { padding: '12px' },
  cardTitle: { fontSize: '18px', fontWeight: '600', color: '#111827', margin: 0 },
  cardLocation: { fontSize: '14px', color: '#6b7280', margin: '4px 0' },
  cardFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' },
  cardRating: { fontSize: '14px', fontWeight: 'bold', color: '#10b981' },
  cardPrice: { fontSize: '16px', fontWeight: 'bold', color: '#1f2937' },
  inputContainer: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: '12px',
    padding: '0 12px',
    marginBottom: '12px',
    border: '1px solid #e5e7eb',
  },
  inputIcon: { fontSize: '20px', marginRight: '8px' },
  input: {
    flex: 1,
    height: '50px',
    fontSize: '16px',
    color: '#111827',
    border: 'none',
    background: 'none',
    outline: 'none',
  },
  button: {
    backgroundColor: '#10b981',
    padding: '16px',
    borderRadius: '12px',
    textAlign: 'center',
    marginTop: '10px',
    color: 'white',
    fontSize: '16px',
    fontWeight: 'bold',
    border: 'none',
    cursor: 'pointer',
    width: '100%',
  },
  buttonDisabled: { backgroundColor: '#a7f3d0', cursor: 'not-allowed' },
};

const authStyles = {
  container: { display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '24px', backgroundColor: '#f9fafb', height: '100vh', boxSizing: 'border-box' },
  logo: { fontSize: '60px', textAlign: 'center', marginBottom: '20px', margin: 0 },
  title: { fontSize: '32px', fontWeight: 'bold', textAlign: 'center', color: '#111827', margin: 0 },
  subtitle: { fontSize: '16px', color: '#6b7280', textAlign: 'center', marginBottom: '30px' },
  switchButton: { background: 'none', border: 'none', padding: 0, marginTop: '20px', cursor: 'pointer'},
  switchText: { textAlign: 'center', color: '#6b7280', fontSize: '14px' },
  switchLink: { color: '#10b981', fontWeight: 'bold' },
};

const detailStyles = {
    headerContainer: { position: 'relative' },
    headerImage: { width: '100%', height: '250px', objectFit: 'cover' },
    backButton: { position: 'absolute', top: '20px', left: '20px', backgroundColor: 'rgba(0,0,0,0.5)', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', fontSize: '24px', fontWeight: 'bold', border: 'none', cursor: 'pointer' },
    content: { padding: '20px' },
    title: { fontSize: '28px', fontWeight: 'bold', color: '#111827', margin: 0 },
    location: { fontSize: '16px', color: '#6b7280', margin: '8px 0' },
    sectionTitle: { fontSize: '20px', fontWeight: '600', color: '#1f2937', marginTop: '20px', marginBottom: '10px' },
};

const slotStyles = {
    dateTabsContainer: { display: 'flex', overflowX: 'auto', padding: '0 20px 20px 20px', borderBottom: '1px solid #e5e7eb' },
    dateTab: { padding: '10px 16px', borderRadius: '20px', marginRight: '10px', backgroundColor: '#e5e7eb', border: 'none', cursor: 'pointer', flexShrink: 0 },
    dateTabSelected: { backgroundColor: '#10b981' },
    dateTabText: { color: '#374151', fontWeight: '500' },
    dateTabTextSelected: { color: 'white', fontWeight: 'bold' },
    slotsGrid: { padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' },
    slot: {
        padding: '16px',
        backgroundColor: '#eefcf8',
        borderRadius: '12px',
        textAlign: 'center',
        border: '1px solid #a7f3d0',
        cursor: 'pointer'
    },
    slotUnavailable: { backgroundColor: '#f1f5f9', borderColor: '#e2e8f0', cursor: 'not-allowed' },
    slotText: { color: '#065f46', fontWeight: '600' },
    slotTextUnavailable: { color: '#94a3b8', textDecoration: 'line-through' },
};

const modalStyles = {
    overlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: 'rgba(0,0,0,0.6)',
        zIndex: 1000,
    },
    modalView: {
        backgroundColor: "white",
        borderRadius: '20px',
        padding: '35px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: "center",
        boxShadow: '0 4px 10px rgba(0,0,0,0.25)',
        width: '90%',
        maxWidth: '400px',
    },
     alertView: {
        backgroundColor: "white",
        borderRadius: '20px',
        padding: '25px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: "center",
        boxShadow: '0 4px 10px rgba(0,0,0,0.25)',
        width: '90%',
        maxWidth: '320px',
    },
    modalTitle: {
        marginBottom: '15px',
        textAlign: "center",
        fontSize: '22px',
        fontWeight: 'bold',
        color: '#111827',
        margin: 0,
    },
    modalText: {
        marginBottom: '5px',
        textAlign: "center",
        fontSize: '16px',
        color: '#6b7280'
    },
    bookingDetail: {
        fontSize: '18px',
        fontWeight: '500',
        color: '#1f2937',
        margin: '4px 0',
    },
    priceContainer: {
        display: 'flex',
        justifyContent: 'space-between',
        width: '100%',
        marginTop: '20px',
        marginBottom: '20px',
        paddingTop: '20px',
        borderTop: '1px solid #e5e7eb'
    },
    priceLabel: {
        fontSize: '18px',
        color: '#374151'
    },
    priceValue: {
        fontSize: '20px',
        fontWeight: 'bold',
        color: '#10b981'
    },
    cancelButton: {
        color: '#6b7280',
        fontSize: '14px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        marginTop: '10px'
    }
};

