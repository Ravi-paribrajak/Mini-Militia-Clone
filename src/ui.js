/**
 * ui.js
 * Logic for toggling between the Game, Arsenal, and Avatar DOM views.
 */

document.addEventListener('DOMContentLoaded', () => {
    
    // View Elements
    const avatarView = document.getElementById('avatar-view');
    const arsenalView = document.getElementById('arsenal-view');
    const hudView = document.getElementById('hud-view');
    const gameContainerElement = document.getElementById('game-container');

    // Buttons
    const btnArsenal = document.getElementById('btn-arsenal');
    const btnPlay = document.getElementById('btn-play');
    const btnBackAvatar = document.getElementById('btn-back-avatar');

    // State
    let gameInstance = null;

    // View Toggler Helper
    function showView(viewToShow) {
        document.querySelectorAll('.view').forEach(view => {
            if (view !== hudView) { // Keep HUD hidden unless playing
                view.classList.remove('active');
            }
        });
        
        if (viewToShow) {
            viewToShow.classList.add('active');
        }
    }

    // Event Listeners
    btnArsenal.addEventListener('click', () => {
        showView(arsenalView);
        populateArsenalDummyData();
    });

    btnBackAvatar.addEventListener('click', () => {
        showView(avatarView);
    });

    btnPlay.addEventListener('click', () => {
        showView(null); // Hide all overlay views
        
        // Make sure HUD is visible
        hudView.classList.remove('hidden');

        // Initialize and start the game if not already started
        if (!gameInstance && window.GameMap) {
            gameInstance = new window.GameMap();
            gameInstance.start();
        }
    });

    function populateArsenalDummyData() {
        // Populate the arsenal grid with some dummy slots if empty
        const grid = document.querySelector('.arsenal-grid');
        if (grid.children.length === 0) {
            for (let i = 1; i <= 6; i++) {
                const slot = document.createElement('div');
                slot.innerHTML = `Weapon ${i}`;
                grid.appendChild(slot);
            }
        }
    }
});
