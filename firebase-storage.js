// firebase-storage.js - COMPLETE CLOUD STORAGE SOLUTION FOR LIORE VERSE
// This file handles all Firebase operations for storing and syncing story owners globally

class FirebaseStorage {
    constructor() {
        this.initialized = false;
        this.data = null;
        this.db = null;
        this.collectionName = 'storyOwners';
        this.unsubscribe = null; // For real-time listener cleanup
    }

    // Initialize Firebase connection
    async initialize() {
        if (this.initialized) return;
        
        try {
            // Your Firebase configuration
            const firebaseConfig = {
                apiKey: "AIzaSyCxS1M__BSyRwXn2LaOJF_DH5zy2OuaZjs",
                authDomain: "liore-verse.firebaseapp.com",
                projectId: "liore-verse",
                storageBucket: "liore-verse.firebasestorage.app",
                messagingSenderId: "24831740169",
                appId: "1:24831740169:web:7ca285905b1c10cdddebd8",
                measurementId: "G-PWE2Y233K1"
            };

            // Check if Firebase is already initialized
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            
            this.db = firebase.firestore();
            this.initialized = true;
            console.log('✅ Firebase initialized successfully');
            
        } catch (error) {
            console.error('❌ Firebase initialization failed:', error);
            throw error;
        }
    }

    // Load data from Firestore with optional real-time updates
    async loadData(callback = null) {
        try {
            await this.initialize();
            
            console.log('🔄 Loading data from Firebase...');
            
            // If callback provided, set up real-time listener for automatic updates
            if (callback) {
                // Clean up any existing listener
                if (this.unsubscribe) {
                    this.unsubscribe();
                }
                
                // Set up new real-time listener
                this.unsubscribe = this.db.collection(this.collectionName).onSnapshot(
                    (snapshot) => {
                        this.data = snapshot.docs.map(doc => ({
                            id: doc.id,
                            ...doc.data()
                        }));
                        console.log('🔔 Real-time update received:', this.data.length, 'owners');
                        
                        // Update localStorage as backup
                        localStorage.setItem('lioreStoryOwners', JSON.stringify(this.data));
                        
                        // Call the callback with updated data
                        callback(this.data);
                    },
                    (error) => {
                        console.error('❌ Real-time listener error:', error);
                        this.showError('Connection issue. Some updates may be delayed.');
                    }
                );
                
                console.log('👂 Real-time listener activated');
            }
            
            // Initial load from Firestore
            const snapshot = await this.db.collection(this.collectionName).get();
            
            if (snapshot.empty) {
                console.log('📝 No data in Firebase yet');
                this.data = [];
                
                // Check localStorage for backup data
                const localData = localStorage.getItem('lioreStoryOwners');
                if (localData) {
                    this.data = JSON.parse(localData);
                    console.log('📂 Loaded backup from localStorage:', this.data.length, 'owners');
                }
            } else {
                this.data = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                console.log('✅ Loaded from Firebase:', this.data.length, 'owners');
            }
            
            // Always update localStorage as backup
            localStorage.setItem('lioreStoryOwners', JSON.stringify(this.data));
            
            return this.data;
            
        } catch (error) {
            console.error('⚠️ Firebase load failed:', error);
            
            // Fallback to localStorage
            const localData = localStorage.getItem('lioreStoryOwners');
            this.data = localData ? JSON.parse(localData) : [];
            console.log('📂 Using localStorage fallback:', this.data.length, 'owners');
            
            return this.data;
        }
    }

    // Save data to Firestore (batch operation for efficiency)
    async saveData(data) {
        try {
            await this.initialize();
            this.data = data;
            
            console.log('💾 Saving to Firebase...', data.length, 'owners');
            
            // Save to localStorage immediately (instant backup)
            localStorage.setItem('lioreStoryOwners', JSON.stringify(data));
            console.log('✅ Saved to localStorage backup');
            
            // Create batch write for Firestore (more efficient than individual writes)
            const batch = this.db.batch();
            
            // Get all existing documents to identify what needs to be deleted
            const snapshot = await this.db.collection(this.collectionName).get();
            const existingIds = new Set(snapshot.docs.map(doc => doc.id));
            const newIds = new Set(data.map(owner => owner.id));
            
            // Delete owners that were removed
            snapshot.docs.forEach(doc => {
                if (!newIds.has(doc.id)) {
                    console.log('🗑️ Deleting removed owner:', doc.id);
                    batch.delete(doc.ref);
                }
            });
            
            // Add or update all owners
            data.forEach(owner => {
                const docRef = this.db.collection(this.collectionName).doc(owner.id);
                const { id, ...ownerData } = owner; // Remove id from data (it's the document ID)
                batch.set(docRef, ownerData, { merge: true });
            });
            
            // Commit the batch
            await batch.commit();
            console.log('✅ Successfully saved to Firebase!');
            
            this.showSuccess('✓ Changes saved! Everyone worldwide can now see updates.');
            
            return true;
            
        } catch (error) {
            console.error('❌ Firebase save failed:', error);
            this.showError('⚠ Saved locally only. Please check your internet connection.');
            return false;
        }
    }

    // Add a single owner (alternative to batch save)
    async addOwner(owner) {
        try {
            await this.initialize();
            
            console.log('➕ Adding owner to Firebase:', owner.owner_name);
            
            const docRef = this.db.collection(this.collectionName).doc(owner.id);
            const { id, ...ownerData } = owner;
            await docRef.set(ownerData);
            
            console.log('✅ Owner added to Firebase');
            return true;
            
        } catch (error) {
            console.error('❌ Add owner failed:', error);
            return false;
        }
    }

    // Delete a single owner (alternative to batch save)
    async deleteOwner(ownerId) {
        try {
            await this.initialize();
            
            console.log('🗑️ Deleting owner from Firebase:', ownerId);
            
            await this.db.collection(this.collectionName).doc(ownerId).delete();
            
            console.log('✅ Owner deleted from Firebase');
            return true;
            
        } catch (error) {
            console.error('❌ Delete owner failed:', error);
            return false;
        }
    }

    // Update a single owner (alternative to batch save)
    async updateOwner(owner) {
        try {
            await this.initialize();
            
            console.log('📝 Updating owner in Firebase:', owner.owner_name);
            
            const docRef = this.db.collection(this.collectionName).doc(owner.id);
            const { id, ...ownerData } = owner;
            await docRef.set(ownerData, { merge: true });
            
            console.log('✅ Owner updated in Firebase');
            return true;
            
        } catch (error) {
            console.error('❌ Update owner failed:', error);
            return false;
        }
    }

    // Clean up real-time listener when no longer needed
    cleanup() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
            console.log('🔌 Real-time listener disconnected');
        }
    }

    // Show success notification
    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    // Show error notification
    showError(message) {
        this.showNotification(message, 'error');
    }

    // Show info notification
    showInfo(message) {
        this.showNotification(message, 'info');
    }

    // Universal notification system
    showNotification(message, type = 'info') {
        // Remove any existing notifications first
        const existingNotifications = document.querySelectorAll('.firebase-notification');
        existingNotifications.forEach(notif => {
            if (document.body.contains(notif)) {
                document.body.removeChild(notif);
            }
        });

        const notification = document.createElement('div');
        notification.className = 'firebase-notification';
        
        // Icon based on type
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            info: 'info-circle',
            warning: 'exclamation-triangle'
        };
        
        // Color based on type
        const colors = {
            success: '#10B981',
            error: '#EF4444',
            info: '#3B82F6',
            warning: '#F59E0B'
        };
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${colors[type] || colors.info};
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            z-index: 10000;
            font-weight: 600;
            max-width: 350px;
            transform: translateX(120%);
            transition: transform 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            font-family: 'Montserrat', sans-serif;
            font-size: 14px;
        `;
        
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-${icons[type] || icons.info}" style="font-size: 1.2rem;"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => notification.style.transform = 'translateX(0)', 100);
        
        // Animate out and remove
        setTimeout(() => {
            notification.style.transform = 'translateX(120%)';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 400);
        }, 4000);
    }

    // Get connection status
    async getConnectionStatus() {
        try {
            await this.initialize();
            
            // Try to read a document to check connection
            await this.db.collection(this.collectionName).limit(1).get();
            
            return {
                connected: true,
                message: 'Connected to Firebase'
            };
        } catch (error) {
            return {
                connected: false,
                message: 'No internet connection',
                error: error.message
            };
        }
    }

    // Export data as JSON (for backup)
    exportData() {
        if (!this.data) {
            console.warn('No data to export');
            return null;
        }
        
        const jsonString = JSON.stringify(this.data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `liore-verse-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('📥 Data exported successfully');
        this.showSuccess('Data exported successfully!');
    }

    // Import data from JSON (for restore)
    async importData(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            
            if (!Array.isArray(data)) {
                throw new Error('Invalid data format');
            }
            
            await this.saveData(data);
            console.log('📤 Data imported successfully');
            this.showSuccess('Data imported and synced to cloud!');
            
            return true;
        } catch (error) {
            console.error('❌ Import failed:', error);
            this.showError('Import failed: ' + error.message);
            return false;
        }
    }
}

// Create and export global instance
window.cloudStorage = new FirebaseStorage();

// Log initialization
console.log('🚀 Firebase Storage initialized and ready');

// Optional: Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (window.cloudStorage) {
        window.cloudStorage.cleanup();
    }
});