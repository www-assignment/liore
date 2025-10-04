// firebase-storage.js - COMPLETE FIREBASE SOLUTION
class FirebaseStorage {
    constructor() {
        this.initialized = false;
        this.data = null;
        this.db = null;
    }

    // Initialize Firebase
    async initialize() {
        if (this.initialized) return;
        
        try {
            // Your Firebase configuration - REPLACE WITH YOUR ACTUAL CONFIG
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

    // Load data from Firestore
    async loadData() {
        try {
            await this.initialize();
            
            console.log('🔄 Loading data from Firebase...');
            const snapshot = await this.db.collection('storyOwners').get();
            
            if (snapshot.empty) {
                console.log('📝 No data in Firebase, checking localStorage...');
                await this.loadFromLocalStorage();
            } else {
                this.data = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                console.log('✅ Loaded from Firebase:', this.data.length, 'owners');
                
                // Update localStorage as backup
                localStorage.setItem('lioreStoryOwners', JSON.stringify(this.data));
            }
            
            return this.data;
            
        } catch (error) {
            console.warn('⚠️ Firebase load failed, using localStorage:', error);
            await this.loadFromLocalStorage();
            return this.data;
        }
    }

    // Save data to Firestore
    async saveData(data) {
        try {
            await this.initialize();
            this.data = data;
            
            console.log('💾 Saving data to Firebase...');
            
            // Save to localStorage immediately (as backup)
            localStorage.setItem('lioreStoryOwners', JSON.stringify(data));
            
            // Save to Firestore
            const batch = this.db.batch();
            
            // Clear existing documents
            const snapshot = await this.db.collection('storyOwners').get();
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            // Add all new documents
            data.forEach(owner => {
                const docRef = this.db.collection('storyOwners').doc(owner.id);
                // Remove the id from the data since it's the document ID
                const { id, ...ownerData } = owner;
                batch.set(docRef, ownerData);
            });
            
            await batch.commit();
            console.log('✅ Data saved to Firebase successfully');
            this.showSuccess('Data saved successfully! All users will see updates immediately.');
            
            return true;
            
        } catch (error) {
            console.error('❌ Firebase save failed:', error);
            this.showError('Saved locally, but sync failed: ' + error.message);
            return false;
        }
    }

    // Load from localStorage fallback
    async loadFromLocalStorage() {
        try {
            const localData = localStorage.getItem('lioreStoryOwners');
            if (localData) {
                this.data = JSON.parse(localData);
                console.log('✅ Loaded from localStorage backup:', this.data.length, 'owners');
            } else {
                this.data = [];
                console.log('📝 Starting with empty data');
            }
        } catch (error) {
            console.error('❌ Local storage error:', error);
            this.data = [];
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

    // Notification system
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : '#3B82F6'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            font-weight: 500;
            max-width: 400px;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Animate out and remove
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 5000);
    }
}

// Create global instance
window.cloudStorage = new FirebaseStorage();