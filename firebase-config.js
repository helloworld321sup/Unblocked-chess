// Firebase configuration
// You'll need to replace these with your actual Firebase project credentials

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

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Get database reference
const database = firebase.database();

// Export for use in other files
window.firebaseDatabase = database;
