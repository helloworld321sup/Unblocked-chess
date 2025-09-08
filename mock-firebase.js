// Mock Firebase implementation for testing without real Firebase credentials
// This allows the chess game to work locally for development and testing

class MockFirebaseDatabase {
  constructor() {
    this.data = {};
    this.listeners = {};
  }

  ref(path) {
    return new MockFirebaseRef(this, path);
  }
}

class MockFirebaseRef {
  constructor(database, path) {
    this.database = database;
    this.path = path;
    this.listeners = {};
  }

  child(key) {
    return new MockFirebaseRef(this.database, this.path ? `${this.path}/${key}` : key);
  }

  set(value) {
    return new Promise((resolve) => {
      this.database.setValue(this.path, value);
      resolve();
    });
  }

  update(updates) {
    return new Promise((resolve) => {
      this.database.updateValue(this.path, updates);
      resolve();
    });
  }

  once(eventType) {
    return new Promise((resolve) => {
      const value = this.database.getValue(this.path);
      resolve({ val: () => value });
    });
  }

  on(eventType, callback) {
    const listenerId = Math.random().toString(36);
    this.listeners[listenerId] = callback;
    this.database.addListener(this.path, listenerId, callback);
    
    // Return unsubscribe function
    return () => {
      delete this.listeners[listenerId];
      this.database.removeListener(this.path, listenerId);
    };
  }

  off(eventType) {
    // Remove all listeners for this path
    Object.keys(this.listeners).forEach(listenerId => {
      this.database.removeListener(this.path, listenerId);
    });
    this.listeners = {};
  }

  orderByChild(field) {
    return new MockFirebaseQuery(this, field);
  }
}

class MockFirebaseQuery {
  constructor(ref, orderField) {
    this.ref = ref;
    this.orderField = orderField;
  }

  equalTo(value) {
    return new MockFirebaseQueryWithFilter(this.ref, this.orderField, value);
  }

  on(eventType, callback) {
    return this.ref.on(eventType, callback);
  }
}

class MockFirebaseQueryWithFilter {
  constructor(ref, orderField, filterValue) {
    this.ref = ref;
    this.orderField = orderField;
    this.filterValue = filterValue;
  }

  on(eventType, callback) {
    // Filter the data based on the query
    const originalCallback = callback;
    const filteredCallback = (snapshot) => {
      const allData = snapshot.val() || {};
      const filteredData = {};
      
      Object.keys(allData).forEach(key => {
        const item = allData[key];
        if (item && item[this.orderField] === this.filterValue) {
          filteredData[key] = item;
        }
      });
      
      originalCallback({ val: () => filteredData });
    };
    
    return this.ref.on(eventType, filteredCallback);
  }
}

// Mock Firebase Database implementation
class MockFirebaseDatabaseImpl {
  constructor() {
    this.data = {};
    this.listeners = {};
  }

  setValue(path, value) {
    const keys = path.split('/');
    let current = this.data;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    
    // Notify listeners
    this.notifyListeners(path, value);
  }

  updateValue(path, updates) {
    const keys = path.split('/');
    let current = this.data;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    const target = current[keys[keys.length - 1]] || {};
    Object.assign(target, updates);
    current[keys[keys.length - 1]] = target;
    
    // Notify listeners
    this.notifyListeners(path, target);
  }

  getValue(path) {
    const keys = path.split('/');
    let current = this.data;
    
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return null;
      }
    }
    
    return current;
  }

  addListener(path, listenerId, callback) {
    if (!this.listeners[path]) {
      this.listeners[path] = {};
    }
    this.listeners[path][listenerId] = callback;
  }

  removeListener(path, listenerId) {
    if (this.listeners[path]) {
      delete this.listeners[path][listenerId];
      if (Object.keys(this.listeners[path]).length === 0) {
        delete this.listeners[path];
      }
    }
  }

  notifyListeners(path, value) {
    // Notify exact path listeners
    if (this.listeners[path]) {
      Object.values(this.listeners[path]).forEach(callback => {
        setTimeout(() => callback({ val: () => value }), 0);
      });
    }
    
    // Notify parent path listeners
    const pathParts = path.split('/');
    for (let i = pathParts.length - 1; i > 0; i--) {
      const parentPath = pathParts.slice(0, i).join('/');
      if (this.listeners[parentPath]) {
        const parentValue = this.getValue(parentPath);
        Object.values(this.listeners[parentPath]).forEach(callback => {
          setTimeout(() => callback({ val: () => parentValue }), 0);
        });
      }
    }
  }
}

// Initialize mock Firebase if real Firebase is not available
if (typeof firebase === 'undefined' || !firebase.apps || firebase.apps.length === 0) {
  console.log('Using mock Firebase for local development');
  
  // Create mock firebase object
  window.firebase = {
    initializeApp: function(config) {
      console.log('Mock Firebase initialized with config:', config);
      return {
        database: function() {
          return new MockFirebaseDatabase();
        }
      };
    },
    apps: []
  };
  
  // Create mock database
  const mockDb = new MockFirebaseDatabaseImpl();
  window.firebaseDatabase = new MockFirebaseDatabase();
  
  // Override the database methods to use our mock implementation
  const originalRef = window.firebaseDatabase.ref;
  window.firebaseDatabase.ref = function(path) {
    const ref = originalRef.call(this, path);
    
    // Override methods to use mock implementation
    ref.set = function(value) {
      return new Promise((resolve) => {
        mockDb.setValue(path, value);
        resolve();
      });
    };
    
    ref.update = function(updates) {
      return new Promise((resolve) => {
        mockDb.updateValue(path, updates);
        resolve();
      });
    };
    
    ref.once = function(eventType) {
      return new Promise((resolve) => {
        const value = mockDb.getValue(path);
        resolve({ val: () => value });
      });
    };
    
    ref.on = function(eventType, callback) {
      const listenerId = Math.random().toString(36);
      mockDb.addListener(path, listenerId, callback);
      
      // Return unsubscribe function
      return () => {
        mockDb.removeListener(path, listenerId);
      };
    };
    
    ref.off = function(eventType) {
      // Remove all listeners for this path
      Object.keys(mockDb.listeners[path] || {}).forEach(listenerId => {
        mockDb.removeListener(path, listenerId);
      });
    };
    
    return ref;
  };
}
