/**
 * Tetris Game JavaScript
 * Contains all game logic, UI updates, and event handlers
 */

// Global game state object
let gameState = {
    board: [],
    score: 0,
    level: 1,
    lines_cleared: 0,
    lines_to_next_level: 10,
    game_over: false,
    is_paused: false
};

// Game control variables
let fallInterval;
let speedMultiplier = 1;
let currentTheme = 'classic';

/**
 * Shows the new game modal
 */
function showModal() {
    document.getElementById('new-game-modal').style.display = 'flex';
}

/**
 * Hides the new game modal
 */
function hideModal() {
    document.getElementById('new-game-modal').style.display = 'none';
}

/**
 * Applies the selected theme to the document body
 * @param {string} theme - The theme name to apply
 */
function applyTheme(theme) {
    // Remove all theme classes
    document.body.classList.remove('classic-theme', 'neon-theme', 'ocean-theme', 'forest-theme', 'sunset-theme', 'midnight-theme');
    
    // Add the selected theme class
    if (theme !== 'classic') {
        document.body.classList.add(theme + '-theme');
    }
    
    currentTheme = theme;
    
    // Save theme preference to localStorage
    localStorage.setItem('tetris-theme', theme);
}

/**
 * Loads the saved theme from localStorage
 */
function loadSavedTheme() {
    const savedTheme = localStorage.getItem('tetris-theme');
    if (savedTheme) {
        currentTheme = savedTheme;
        applyTheme(savedTheme);
        
        // Update theme selector in modal
        document.querySelectorAll('.theme-option').forEach(option => {
            option.classList.remove('active');
            if (option.dataset.theme === savedTheme) {
                option.classList.add('active');
            }
        });
    }
}

/**
 * Loads the saved speed from localStorage
 */
function loadSavedSpeed() {
    const savedSpeed = localStorage.getItem('tetris-speed');
    if (savedSpeed) {
        speedMultiplier = parseInt(savedSpeed);
        
        // Update speed selector in modal
        document.querySelectorAll('.speed-option').forEach(option => {
            option.classList.remove('active');
            if (option.dataset.speed === savedSpeed) {
                option.classList.add('active');
            }
        });
    }
}

/**
 * Updates the visual representation of the game board
 * Renders the current game state including pieces, next pieces, and overlays
 */
function updateBoard() {
    const board = document.getElementById('board');
    board.innerHTML = '';
    
    // Render each row and cell of the game board
    gameState.board.forEach(row => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'row';
        
        row.forEach(cell => {
            const cellDiv = document.createElement('div');
            cellDiv.className = 'cell';
            if (Array.isArray(cell)) {
                const [value, pieceType] = cell;
                if (value === 1) {
                    // Locked piece
                    cellDiv.classList.add('filled');
                    cellDiv.setAttribute('data-piece', pieceType);
                } else if (value === 2) {
                    // Current falling piece
                    cellDiv.classList.add('current');
                    cellDiv.setAttribute('data-piece', pieceType);
                } else if (value === 3) {
                    // Flashing line (about to be cleared)
                    cellDiv.classList.add('filled');
                    cellDiv.setAttribute('data-piece', pieceType);
                    cellDiv.setAttribute('data-flashing', 'true');
                }
            }
            rowDiv.appendChild(cellDiv);
        });
        
        board.appendChild(rowDiv);
    });

    // Update next pieces preview
    const nextPiecesContainer = document.getElementById('next-pieces-container');
    nextPiecesContainer.innerHTML = '';
    
    // Show the next 3 pieces
    const piecesToShow = gameState.next_pieces.slice(0, 3);
    
    piecesToShow.forEach(([shape, pieceType]) => {
        const pieceContainer = document.createElement('div');
        pieceContainer.className = 'next-piece';
        
        shape.forEach(row => {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'next-piece-row';
            
            row.forEach(cell => {
                const cellDiv = document.createElement('div');
                cellDiv.className = 'next-piece-cell';
                if (cell) {
                    cellDiv.classList.add('filled');
                    cellDiv.setAttribute('data-piece', pieceType);
                }
                rowDiv.appendChild(cellDiv);
            });
            
            pieceContainer.appendChild(rowDiv);
        });
        
        nextPiecesContainer.appendChild(pieceContainer);
    });

    // Update overlay visibility based on game state
    const gameOverOverlay = document.getElementById('game-over-overlay');
    const pauseOverlay = document.getElementById('pause-overlay');
    gameOverOverlay.style.display = gameState.game_over ? 'flex' : 'none';
    pauseOverlay.style.display = gameState.is_paused ? 'flex' : 'none';
}

/**
 * Displays the high scores list in the UI
 * @param {Array} scores - Array of score objects with name and score properties
 */
function displayHighScores(scores) {
    const highScoresList = document.getElementById('high-scores-list');
    highScoresList.innerHTML = scores.map((score, index) => `
        <div class="high-score-entry">
            ${index + 1}. ${score.name}: ${score.score}
        </div>
    `).join('');
}

/**
 * Submits a high score to the server
 * Gets the player name from the input field and sends it with the current score
 */
function submitHighScore() {
    const playerName = document.getElementById('player-name').value.trim() || 'Anonymous';
    fetch('/submit_score', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            name: playerName,
            score: gameState.score
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.high_scores) {
            displayHighScores(data.high_scores);
        }
        document.getElementById('high-score-form').style.display = 'none';
        
        // Show modal after high score submission
        setTimeout(() => {
            showModal();
        }, 2000);
    });
}

/**
 * Updates game information display and button states
 * Handles score, level, lines cleared, and UI state management
 * @param {Object} gameState - Current game state object
 */
function updateGameInfo(gameState) {
    // Update score and level displays
    document.getElementById('score').textContent = gameState.score;
    document.getElementById('level').textContent = gameState.level;
    document.getElementById('level-lines').textContent = `${gameState.lines_cleared % 10}`;
    document.getElementById('total-lines').textContent = gameState.lines_cleared;
    
    // Update game over overlay
    const overlay = document.querySelector('.game-over-overlay');
    overlay.style.display = gameState.game_over ? 'flex' : 'none';

    // Get UI control elements
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const endBtn = document.getElementById('endBtn');

    if (gameState.game_over) {
        // Game is over - enable start button, disable others
        startBtn.disabled = false;
        startBtn.textContent = 'Start Game';
        pauseBtn.disabled = true;
        endBtn.disabled = true;

        // Check if current score qualifies as a high score
        fetch('/get_high_scores')
            .then(response => response.json())
            .then(data => {
                const isHighScore = data.high_scores.length < 10 || 
                                  gameState.score > Math.min(...data.high_scores.map(s => s.score));
                document.getElementById('high-score-form').style.display = isHighScore ? 'block' : 'none';
                displayHighScores(data.high_scores);
                
                // Show modal after a delay if no high score form
                if (!isHighScore) {
                    setTimeout(() => {
                        showModal();
                    }, 2000);
                }
            });
    } else if (fallInterval) {
        // Game is in progress - disable start button
        startBtn.disabled = true;
        startBtn.textContent = 'Playing';
        pauseBtn.disabled = false;
        endBtn.disabled = false;
    } else {
        // Game is not started - enable start button
        startBtn.disabled = false;
        startBtn.textContent = 'Start';
        pauseBtn.disabled = true;
        endBtn.disabled = true;
    }

    // Update pause button text based on current state
    if (pauseBtn) {
        pauseBtn.textContent = gameState.is_paused ? 'Resume' : 'Pause';
    }
}

/**
 * Starts the automatic falling mechanism for pieces
 * Calculates fall speed based on level and speed multiplier
 */
function startFalling() {
    // Clear any existing interval
    if (fallInterval) {
        clearInterval(fallInterval);
    }
    
    // Calculate fall speed based on level and speed multiplier
    const baseSpeed = Math.max(100, 1000 - (gameState.level - 1) * 100);
    const adjustedSpeed = (baseSpeed / speedMultiplier) * 0.9;
    
    fallInterval = setInterval(() => {
        if (!gameState.is_paused) {
            fetch('/move_down', { method: 'POST' })
                .then(response => response.json())
                .then(data => {
                    gameState = data;
                    updateBoard();
                    updateGameInfo(gameState);
                    
                    // Check if there are lines marked for clearing (flashing)
                    const hasFlashingLines = gameState.board.some(row => 
                        row.some(cell => Array.isArray(cell) && cell[0] === 3)
                    );
                    
                    if (hasFlashingLines) {
                        // Pause falling while line clearing animation plays
                        clearInterval(fallInterval);
                        fallInterval = null;
                        
                        // Wait for animation to complete, then remove lines
                        setTimeout(() => {
                            fetch('/remove_lines', { method: 'POST' })
                                .then(response => response.json())
                                .then(data => {
                                    gameState = data;
                                    updateBoard();
                                    updateGameInfo(gameState);
                                    // Restart falling after line removal
                                    startFalling();
                                });
                        }, 500); // 500ms animation duration
                    }
                    
                    // Handle game over
                    if (data.game_over) {
                        clearInterval(fallInterval);
                        fallInterval = null;
                        document.getElementById('startBtn').textContent = 'Start Game';
                        document.getElementById('pauseBtn').disabled = true;
                    }
                });
        }
    }, adjustedSpeed);
}

/**
 * Sends a move command to the server
 * @param {string} direction - Direction to move ('left', 'right', 'down', 'rotate')
 */
function movePiece(direction) {
    // Don't move if game is paused or over
    if (gameState.is_paused || gameState.game_over) return;
    
    fetch('/move', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ direction: direction })
    })
    .then(response => response.json())
    .then(data => {
        gameState = data;
        updateBoard();
        updateGameInfo(gameState);
    });
}

/**
 * Resets the game to initial state
 * Clears the falling interval and requests a new game from the server
 */
function resetGame() {
    clearInterval(fallInterval);
    fallInterval = null;
    fetch('/reset')
        .then(response => response.json())
        .then(data => {
            gameState = data;
            updateBoard();
            updateGameInfo(gameState);
        });
}

/**
 * Starts a new game with current settings
 * Resets game state and begins falling
 */
function startNewGame() {
    hideModal();
    resetGame();
    setTimeout(() => {
        startFalling();
    }, 100);
}

/**
 * Initializes all event listeners when the page loads
 */
function initializeEventListeners() {
    // Modal speed control event listeners
    document.querySelectorAll('.speed-selector .speed-option').forEach(option => {
        option.addEventListener('click', function() {
            // Remove active class from all options
            document.querySelectorAll('.speed-selector .speed-option').forEach(opt => opt.classList.remove('active'));
            // Add active class to clicked option
            this.classList.add('active');
            // Update speed multiplier
            speedMultiplier = parseInt(this.dataset.speed);
            // Save speed preference
            localStorage.setItem('tetris-speed', this.dataset.speed);
        });
    });

    // Theme selector event listeners
    document.querySelectorAll('.theme-option').forEach(option => {
        option.addEventListener('click', function() {
            // Remove active class from all options
            document.querySelectorAll('.theme-option').forEach(opt => opt.classList.remove('active'));
            // Add active class to clicked option
            this.classList.add('active');
            // Apply the selected theme
            applyTheme(this.dataset.theme);
        });
    });

    // Start new game button in modal
    document.getElementById('start-new-game-btn').addEventListener('click', function() {
        startNewGame();
    });

    // End game button event listener
    document.getElementById('endBtn').addEventListener('click', function() {
        if (fallInterval) {
            clearInterval(fallInterval);
            fallInterval = null;
        }
        gameState.game_over = true;
        updateBoard();
        updateGameInfo(gameState);
    });

    // Start game button event listener (existing button)
    document.getElementById('startBtn').addEventListener('click', function() {
        showModal();
    });

    // Pause/Resume button event listener
    document.getElementById('pauseBtn').addEventListener('click', function() {
        fetch('/pause', { method: 'POST' })
            .then(response => response.json())
            .then(data => {
                gameState = data;
                updateBoard();
                updateGameInfo(gameState);
            });
    });

    // Keyboard controls event listener
    document.addEventListener('keydown', (event) => {
        // Ignore keyboard input if game is over
        if (gameState.game_over) return;
        
        switch(event.key.toLowerCase()) {
            case 'arrowleft':
                if (!gameState.is_paused) movePiece('left');
                break;
            case 'arrowright':
                if (!gameState.is_paused) movePiece('right');
                break;
            case 'arrowdown':
                if (!gameState.is_paused) movePiece('down');
                break;
            case 'arrowup':
                if (!gameState.is_paused) movePiece('rotate');
                break;
            case 'p':
                // Toggle pause with 'P' key
                fetch('/pause', { method: 'POST' })
                    .then(response => response.json())
                    .then(data => {
                        gameState = data;
                        updateBoard();
                        updateGameInfo(gameState);
                    });
                break;
        }
    });
}

/**
 * Initializes the game when the page loads
 * Fetches initial game state and sets up the UI
 */
function initializeGame() {
    fetch('/state')
        .then(response => response.json())
        .then(data => {
            gameState = data;
            updateBoard();
            updateGameInfo(gameState);
            
            // Show modal initially
            showModal();
        });
}

// Initialize the game when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    loadSavedTheme();
    loadSavedSpeed();
    initializeEventListeners();
    initializeGame();
}); 