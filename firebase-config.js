// Firebase configuration
// You'll need to replace these with your actual Firebase project credentials

// Replace these with your actual Firebase project credentials
// Get them from: https://console.firebase.google.com/ → Project Settings → Your apps
const firebaseConfig = {
  apiKey: "AIzaSyC2Pew6LMoK-ezwuYdPfd62Htwr5ugVpgw",
  authDomain: "chess-game-multiplayer-2a4d3.firebaseapp.com",
  databaseURL: "https://chess-game-multiplayer-2a4d3-default-rtdb.firebaseio.com",
  projectId: "chess-game-multiplayer-2a4d3",
  storageBucket: "chess-game-multiplayer-2a4d3.firebasestorage.app",
  messagingSenderId: "641401869509",
  appId: "1:641401869509:web:3d040836e96fae800f4cac",
  measurementId: "G-LXCVPDSTZC"
};

// Initialize Firebase with retry mechanism
function initializeFirebase() {
  try {
    console.log('Initializing Firebase with config:', firebaseConfig);
    
    // Check if Firebase is available
    if (typeof firebase === 'undefined') {
      throw new Error('Firebase SDK not loaded');
    }
    
    const app = firebase.initializeApp(firebaseConfig);
    console.log('Firebase app initialized:', app);
    
    // Get database reference
    const database = firebase.database();
    console.log('Firebase database initialized:', database);
    
    // Export for use in other files
    window.firebaseDatabase = database;
    console.log('Firebase database exported to window.firebaseDatabase');
    
    // Test the connection and set ready flag when connected
    database.ref('.info/connected').on('value', (snapshot) => {
      if (snapshot.val() === true) {
        console.log('✅ Firebase connected successfully!');
        // Signal that Firebase is ready
        window.firebaseReady = true;
        console.log('✅ Firebase initialization complete!');
      } else {
        console.log('❌ Firebase not connected');
      }
    });
    
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    console.error('Firebase object:', typeof firebase);
    console.error('Firebase config:', firebaseConfig);
    
    // Retry after a short delay
    setTimeout(initializeFirebase, 100);
  }
}

// Start initialization
initializeFirebase();

