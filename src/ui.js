// ui.js

// Global state to store what the user picked
window.gameState = {
    selectedAvatar: '/src/assets/avatar-01.png', // Default
    selectedWeapon: 'Uzi.webp' // Default
};

document.addEventListener('DOMContentLoaded', () => {
    // --- UI Elements ---
    const homeScreen = document.getElementById('home-screen');
    const avatarScreen = document.getElementById('avatar-screen');
    const weaponScreen = document.getElementById('weapon-screen');
    const gameHud = document.getElementById('game-hud');
    const uiLayer = document.getElementById('ui-layer');

    const btnPlay = document.getElementById('btn-play');
    const btnAvatars = document.getElementById('btn-avatars');
    const btnWeapons = document.getElementById('btn-weapons');
    const btnBackAvatar = document.getElementById('btn-back-avatar');
    const btnBackWeapon = document.getElementById('btn-back-weapon');

    const avatarGrid = document.getElementById('avatar-grid');
    const weaponGrid = document.getElementById('weapon-grid');
    const heroPreview = document.getElementById('hero-avatar-preview'); // Live preview image

    // --- NAVIGATION LOGIC ---
    btnAvatars.addEventListener('click', () => {
        homeScreen.classList.add('hidden');
        avatarScreen.classList.remove('hidden');
    });

    btnWeapons.addEventListener('click', () => {
        homeScreen.classList.add('hidden');
        weaponScreen.classList.remove('hidden');
    });

    btnBackAvatar.addEventListener('click', () => {
        avatarScreen.classList.add('hidden');
        homeScreen.classList.remove('hidden');
        if (heroPreview) heroPreview.src = window.gameState.selectedAvatar; // Sync preview
    });

    btnBackWeapon.addEventListener('click', () => {
        weaponScreen.classList.add('hidden');
        homeScreen.classList.remove('hidden');
    });

    btnPlay.addEventListener('click', () => {
        // Hide the entire UI layer
        uiLayer.classList.add('hidden');
        // Show the HUD
        gameHud.classList.remove('hidden');
        
        // Start the game!
        if (window.GameMap) {
            const game = new window.GameMap();
            game.start();
        }
    });

    // --- POPULATE AVATARS DYNAMICALLY ---
    for (let i = 1; i <= 15; i++) {
        // Format number to be '01', '02', etc.
        const num = i.toString().padStart(2, '0'); 
        const avatarPath = `/src/assets/avatar-${num}.png`;
        
        const div = document.createElement('div');
        div.className = 'grid-item';
        if (window.gameState.selectedAvatar === avatarPath) div.classList.add('selected');
        
        div.innerHTML = `<img src="${avatarPath}" alt="Avatar ${num}">`;
        
        div.addEventListener('click', () => {
            // Remove 'selected' class from all, add to this one
            document.querySelectorAll('#avatar-grid .grid-item').forEach(el => el.classList.remove('selected'));
            div.classList.add('selected');
            // Save the choice globally
            window.gameState.selectedAvatar = avatarPath;
            if (heroPreview) heroPreview.src = avatarPath; // instant visual feedback
        });

        avatarGrid.appendChild(div);
    }

    // --- POPULATE WEAPONS DYNAMICALLY ---
    const weapons = ['Uzi.webp', 'Ak47.webp', 'Mp5.webp', 'Shotgun.webp', 'Sniper.webp'];
    
    weapons.forEach(weapon => {
        const weaponPath = `/src/assets/${weapon}`;
        
        const div = document.createElement('div');
        div.className = 'grid-item';
        if (window.gameState.selectedWeapon === weapon) div.classList.add('selected');
        
        div.innerHTML = `<img src="${weaponPath}" alt="${weapon}">`;
        
        div.addEventListener('click', () => {
            // Remove 'selected' class from all, add to this one
            document.querySelectorAll('#weapon-grid .grid-item').forEach(el => el.classList.remove('selected'));
            div.classList.add('selected');
            // Save the choice globally
            window.gameState.selectedWeapon = weapon;
        });

        weaponGrid.appendChild(div);
    });
});
