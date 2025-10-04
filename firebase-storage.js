// firebase-storage.js - SIMPLIFIED & ENHANCED FIREBASE SOLUTION
class FirebaseStorage {
    constructor() {
        this.initialized = false;
        this.db = null;
        this.collectionName = 'storyOwners';
        this.localStorageKey = 'lioreStoryOwners';
    }

    // Initialize Firebase with error handling
    async initialize() {
        if (this.initialized) return true;
        
        try {
            // Firebase configuration - SAME AS IN YOUR OTHER FILES
            const firebaseConfig = {
                apiKey: "AIzaSyCxS1M__BSyRwXn2LaOJF_DH5zy2OuaZjs",
                authDomain: "liore-verse.firebaseapp.com",
                projectId: "liore-verse",
                storageBucket: "liore-verse.firebasestorage.app",
                messagingSenderId: "24831740169",
                appId: "1:24831740169:web:7ca285905b1c10cdddebd8",
                measurementId: "G-PWE2Y233K1"
            };

            // Initialize Firebase only if not already initialized
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            
            this.db = firebase.firestore();
            this.initialized = true;
            
            console.log('✅ Firebase initialized successfully');
            return true;
            
        } catch (error) {
            console.error('❌ Firebase initialization failed:', error);
            this.showError('Firebase connection failed. Using local storage only.');
            return false;
        }
    }

    // ==================== SIMPLIFIED DATA OPERATIONS ====================

    // Load all story owners from Firebase
    async loadStoryOwners() {
        try {
            await this.initialize();
            
            console.log('🔄 Loading story owners from Firebase...');
            const snapshot = await this.db.collection(this.collectionName).get();
            
            let owners = [];
            
            if (snapshot.empty) {
                console.log('📝 No data found in Firebase, checking local storage...');
                owners = this.loadFromLocalStorage();
            } else {
                owners = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                console.log(`✅ Loaded ${owners.length} owners from Firebase`);
                
                // Update localStorage as backup
                this.saveToLocalStorage(owners);
            }
            
            return owners;
            
        } catch (error) {
            console.warn('⚠️ Firebase load failed, using localStorage:', error);
            return this.loadFromLocalStorage();
        }
    }

    // Save a single story owner (add or update)
    async saveStoryOwner(ownerData) {
        try {
            await this.initialize();
            
            console.log('💾 Saving story owner to Firebase...');
            
            const ownerToSave = { ...ownerData };
            
            // Generate ID if new owner
            if (!ownerToSave.id) {
                ownerToSave.id = this.generateId();
                ownerToSave.date_added = new Date().toISOString().split('T')[0];
            }
            
            ownerToSave.last_updated = new Date().toISOString().split('T')[0];
            
            // Remove the id from the data since it's the document ID
            const { id, ...ownerDataWithoutId } = ownerToSave;
            
            // Save to Firebase
            await this.db.collection(this.collectionName).doc(id).set(ownerDataWithoutId);
            
            // Update localStorage
            const currentOwners = await this.loadStoryOwners();
            const existingIndex = currentOwners.findIndex(owner => owner.id === id);
            
            if (existingIndex >= 0) {
                currentOwners[existingIndex] = ownerToSave;
            } else {
                currentOwners.push(ownerToSave);
            }
            
            this.saveToLocalStorage(currentOwners);
            
            console.log(`✅ Owner "${ownerToSave.owner_name}" saved successfully`);
            this.showSuccess(`Owner ${ownerData.id ? 'updated' : 'added'} successfully!`);
            
            return ownerToSave.id;
            
        } catch (error) {
            console.error('❌ Error saving story owner:', error);
            this.showError(`Failed to save owner: ${error.message}`);
            return null;
        }
    }

    // Delete a story owner
    async deleteStoryOwner(ownerId) {
        try {
            await this.initialize();
            
            console.log(`🗑️ Deleting story owner ${ownerId}...`);
            
            // Delete from Firebase
            await this.db.collection(this.collectionName).doc(ownerId).delete();
            
            // Update localStorage
            const currentOwners = await this.loadStoryOwners();
            const updatedOwners = currentOwners.filter(owner => owner.id !== ownerId);
            this.saveToLocalStorage(updatedOwners);
            
            console.log(`✅ Owner ${ownerId} deleted successfully`);
            this.showSuccess('Owner deleted successfully!');
            
            return true;
            
        } catch (error) {
            console.error('❌ Error deleting story owner:', error);
            this.showError(`Failed to delete owner: ${error.message}`);
            return false;
        }
    }

    // ==================== BULK OPERATIONS (For Admin Panel) ====================

    // Save multiple owners at once (for admin panel backup/restore)
    async saveMultipleOwners(ownersArray) {
        try {
            await this.initialize();
            
            console.log(`💾 Saving ${ownersArray.length} owners to Firebase...`);
            
            const batch = this.db.batch();
            
            // Clear existing documents first
            const snapshot = await this.db.collection(this.collectionName).get();
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            // Add all new documents
            ownersArray.forEach(owner => {
                const docRef = this.db.collection(this.collectionName).doc(owner.id);
                const { id, ...ownerData } = owner;
                batch.set(docRef, ownerData);
            });
            
            await batch.commit();
            
            // Update localStorage
            this.saveToLocalStorage(ownersArray);
            
            console.log(`✅ ${ownersArray.length} owners saved successfully`);
            this.showSuccess(`All ${ownersArray.length} owners saved successfully!`);
            
            return true;
            
        } catch (error) {
            console.error('❌ Error saving multiple owners:', error);
            this.showError(`Failed to save owners: ${error.message}`);
            return false;
        }
    }

    // ==================== REAL-TIME LISTENERS ====================

    // Set up real-time listener for story owners
    setupRealtimeListener(callback) {
        try {
            if (!this.initialized) {
                console.warn('⚠️ Firebase not initialized, cannot set up real-time listener');
                return null;
            }
            
            console.log('👂 Setting up real-time listener for story owners...');
            
            return this.db.collection(this.collectionName)
                .onSnapshot((snapshot) => {
                    const owners = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    
                    console.log('🔄 Real-time update received:', owners.length, 'owners');
                    
                    // Update localStorage with latest data
                    this.saveToLocalStorage(owners);
                    
                    if (callback && typeof callback === 'function') {
                        callback(owners);
                    }
                }, (error) => {
                    console.error('❌ Real-time listener error:', error);
                });
                
        } catch (error) {
            console.error('❌ Error setting up real-time listener:', error);
            return null;
        }
    }

    // ==================== LOCAL STORAGE MANAGEMENT ====================

    // Load data from localStorage
    loadFromLocalStorage() {
        try {
            const localData = localStorage.getItem(this.localStorageKey);
            if (localData) {
                const owners = JSON.parse(localData);
                console.log(`✅ Loaded ${owners.length} owners from localStorage backup`);
                return owners;
            } else {
                console.log('📝 No data found in localStorage');
                return [];
            }
        } catch (error) {
            console.error('❌ Error loading from localStorage:', error);
            return [];
        }
    }

    // Save data to localStorage
    saveToLocalStorage(owners) {
        try {
            localStorage.setItem(this.localStorageKey, JSON.stringify(owners));
            console.log(`💾 Saved ${owners.length} owners to localStorage`);
        } catch (error) {
            console.error('❌ Error saving to localStorage:', error);
        }
    }

    // Clear all data (for testing/reset)
    async clearAllData() {
        try {
            await this.initialize();
            
            console.log('🧹 Clearing all data...');
            
            // Clear Firebase
            const snapshot = await this.db.collection(this.collectionName).get();
            const batch = this.db.batch();
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
            
            // Clear localStorage
            localStorage.removeItem(this.localStorageKey);
            
            console.log('✅ All data cleared successfully');
            this.showSuccess('All data cleared successfully!');
            
            return true;
            
        } catch (error) {
            console.error('❌ Error clearing data:', error);
            this.showError(`Failed to clear data: ${error.message}`);
            return false;
        }
    }

    // ==================== UTILITY FUNCTIONS ====================

    // Generate unique ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }

    // Export data for backup
    async exportData() {
        const owners = await this.loadStoryOwners();
        const dataStr = JSON.stringify(owners, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        // Create download link
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `liore-story-owners-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        this.showSuccess(`Exported ${owners.length} owners successfully!`);
    }

    // Import data from backup
    async importData(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    const owners = JSON.parse(e.target.result);
                    
                    if (!Array.isArray(owners)) {
                        throw new Error('Invalid backup file format');
                    }
                    
                    console.log(`📥 Importing ${owners.length} owners from backup...`);
                    const success = await this.saveMultipleOwners(owners);
                    
                    if (success) {
                        this.showSuccess(`Imported ${owners.length} owners successfully!`);
                        resolve(true);
                    } else {
                        this.showError('Failed to import backup data');
                        resolve(false);
                    }
                    
                } catch (error) {
                    console.error('❌ Error importing backup:', error);
                    this.showError('Invalid backup file format');
                    resolve(false);
                }
            };
            
            reader.onerror = () => {
                this.showError('Error reading backup file');
                resolve(false);
            };
            
            reader.readAsText(file);
        });
    }

    // ==================== NOTIFICATION SYSTEM ====================

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

    // Notification system
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `firebase-notification firebase-notification-${type}`;
        
        // Set styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : '#3B82F6'};
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 12px;
            font-weight: 500;
            font-family: 'Montserrat', sans-serif;
            transform: translateX(400px);
            transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            max-width: 400px;
            border-left: 4px solid ${type === 'success' ? '#059669' : type === 'error' ? '#DC2626' : '#2563EB'};
        `;
        
        // Set icon based on type
        const icon = type === 'success' ? 'fa-check-circle' : 
                    type === 'error' ? 'fa-exclamation-circle' : 
                    'fa-info-circle';
        
        notification.innerHTML = `
            <i class="fas ${icon}" style="font-size: 1.2rem;"></i>
            <span>${message}</span>
        `;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Auto remove after delay
        setTimeout(() => {
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 400);
        }, 4000);
    }

    // ==================== HEALTH CHECK ====================

    // Check Firebase connection status
    async checkConnection() {
        try {
            await this.initialize();
            
            // Test a simple query
            await this.db.collection(this.collectionName).limit(1).get();
            
            return {
                connected: true,
                message: '✅ Connected to Firebase successfully'
            };
            
        } catch (error) {
            return {
                connected: false,
                message: `❌ Firebase connection failed: ${error.message}`
            };
        }
    }

    // Get storage statistics
    async getStats() {
        const owners = await this.loadStoryOwners();
        const localStorageSize = JSON.stringify(owners).length;
        
        return {
            totalOwners: owners.length,
            localStorageSize: `${(localStorageSize / 1024).toFixed(2)} KB`,
            firebaseConnected: this.initialized,
            lastSync: new Date().toLocaleString()
        };
    }
}

// ==================== GLOBAL INSTANCE & COMPATIBILITY ====================

// Create global instance with backward compatibility
window.cloudStorage = new FirebaseStorage();

// Backward compatibility with old function names
window.cloudStorage.loadData = window.cloudStorage.loadStoryOwners;
window.cloudStorage.saveData = window.cloudStorage.saveMultipleOwners;

console.log('🚀 Firebase Storage initialized successfully');
console.log('💡 Available methods:');
console.log('   - cloudStorage.loadStoryOwners()');
console.log('   - cloudStorage.saveStoryOwner(ownerData)');
console.log('   - cloudStorage.deleteStoryOwner(ownerId)');
console.log('   - cloudStorage.setupRealtimeListener(callback)');
console.log('   - cloudStorage.exportData()');
console.log('   - cloudStorage.checkConnection()');

// Auto-initialize and show status
document.addEventListener('DOMContentLoaded', async () => {
    setTimeout(async () => {
        const status = await window.cloudStorage.checkConnection();
        console.log(status.message);
        
        if (status.connected) {
            window.cloudStorage.showInfo('Connected to cloud storage successfully!');
        }
    }, 1000);
});