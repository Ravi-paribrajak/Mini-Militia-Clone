/**
 * ui.js
 * Logic for toggling between the Home, Avatar, Weapon, and Game screens.
 */

document.addEventListener('DOMContentLoaded', () => {

    // Screen Elements
    const homeScreen = document.getElementById('home-screen');
    const avatarScreen = document.getElementById('avatar-screen');
    const weaponScreen = document.getElementById('weapon-screen');
    const hudView = document.getElementById('hud-view');

    // Buttons
    const btnPlay = document.getElementById('btn-play');
    const btnAvatars = document.getElementById('btn-avatars');
    const btnWeapons = document.getElementById('btn-weapons');
    const btnBackAvatars = document.getElementById('btn-back-avatars');
    const btnBackWeapons = document.getElementById('btn-back-weapons');

    // State
    let gameInstance = null;

    // Screen Toggler Helper
    function showScreen(screenToShow) {
        document.querySelectorAll('.menu-screen').forEach(screen => {
            screen.classList.remove('active');
        });

        if (screenToShow) {
            screenToShow.classList.add('active');
        }
    }

    // Event Listeners
    btnAvatars.addEventListener('click', () => {
        showScreen(avatarScreen);
    });

    btnWeapons.addEventListener('click', () => {
        showScreen(weaponScreen);
    });

    btnBackAvatars.addEventListener('click', () => {
        showScreen(homeScreen);
    });

    btnBackWeapons.addEventListener('click', () => {
        showScreen(homeScreen);
    });

    btnPlay.addEventListener('click', () => {
        showScreen(null); // Hide all menu screens

        // Make sure HUD is visible
        hudView.classList.remove('hidden');

        // Initialize and start the game if not already started
        if (!gameInstance && window.GameMap) {
            gameInstance = new window.GameMap();
            gameInstance.start();
        }
    });
});
