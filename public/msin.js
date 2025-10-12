function replayAnimations() {
            // Remove animation classes
            document.querySelector('.navbar-custom').classList.remove('navbar-custom');
            document.querySelector('.navbar-brand').classList.remove('navbar-brand');
            document.querySelector('.nav-items-container').classList.remove('nav-items-container');
            document.querySelector('.navbar-buttons').classList.remove('navbar-buttons');
            document.querySelector('.content').classList.remove('content');
            
            // Trigger reflow
            void document.querySelector('.navbar-custom').offsetWidth;
            void document.querySelector('.navbar-brand').offsetWidth;
            void document.querySelector('.nav-items-container').offsetWidth;
            void document.querySelector('.navbar-buttons').offsetWidth;
            void document.querySelector('.content').offsetWidth;
            
            // Add animation classes back
            document.querySelector('.navbar-custom').classList.add('navbar-custom');
            document.querySelector('.navbar-brand').classList.add('navbar-brand');
            document.querySelector('.nav-items-container').classList.add('nav-items-container');
            document.querySelector('.navbar-buttons').classList.add('navbar-buttons');
            document.querySelector('.content').classList.add('content');
        }