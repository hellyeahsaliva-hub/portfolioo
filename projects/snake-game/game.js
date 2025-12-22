// Game constants
const GRID_SIZE = 20;
const TILE_SIZE = 20;
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 400;
const GAME_SPEED = 300; // Much slower speed for better control

// Game variables
let canvas, ctx;
let snake = [];
let food = {};
let cats = [];
let walls = [];
let dx = 0;
let dy = 0;
let nextDx = 0;
let nextDy = 0;
let score = 0;
let lives = 3;
let gameLoop;
let gameStarted = false;
let gameOver = false;

// DOM elements
const scoreElement = document.getElementById('score');
const livesElement = document.getElementById('lives');
const startBtn = document.getElementById('startBtn');
const gameOverScreen = document.createElement('div');

gameOverScreen.className = 'game-over';
gameOverScreen.innerHTML = `
    <h2>Game Over!</h2>
    <p>Your score: <span id="finalScore">0</span></p>
    <button id="restartBtn">Play Again</button>
`;
document.body.appendChild(gameOverScreen);

document.getElementById('restartBtn')?.addEventListener('click', resetGame);

// Initialize game
function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    // Set canvas size
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    
    // Initialize game state
    resetGame();
    
    // Draw initial state
    draw();
    
    // Event listeners
    document.addEventListener('keydown', changeDirection);
    startBtn.addEventListener('click', startGame);
    
    // Mobile controls
    document.getElementById('up').addEventListener('click', () => changeDirection({ key: 'ArrowUp' }));
    document.getElementById('down').addEventListener('click', () => changeDirection({ key: 'ArrowDown' }));
    document.getElementById('left').addEventListener('click', () => changeDirection({ key: 'ArrowLeft' }));
    document.getElementById('right').addEventListener('click', () => changeDirection({ key: 'ArrowRight' }));
    
    resetGame();
}

// Reset game state
function resetGame() {
    // Reset snake
    snake = [
        { x: 10, y: 10 }
    ];
    
    // Reset direction
    dx = 1;
    dy = 0;
    
    // Reset score and lives
    score = 0;
    lives = 3;
    
    // Update UI
    updateScore();
    
    // Generate game elements
    generateMaze();
    generateFood();
    generateCats(2);
    
    // Reset game state flags
    gameStarted = false;
    gameOver = false;
    
    // Hide game over screen
    const gameOverScreen = document.querySelector('.game-over');
    if (gameOverScreen) {
        gameOverScreen.style.display = 'none';
    }
    
    // Enable start button
    const startBtn = document.getElementById('startBtn');
    if (startBtn) {
        startBtn.disabled = false;
    }
    
    if (!gameStarted) {
        draw();
    }
}

// Start the game
function startGame() {
    if (gameStarted) return;
    
    // Reset game state
    resetGame();
    
    gameStarted = true;
    gameOver = false;
    
    // Reset movement
    dx = 0;
    dy = 0;
    nextDx = 0;
    nextDy = 0;
    
    // Start game loop
    clearInterval(gameLoop);
    gameLoop = setInterval(main, GAME_SPEED);
    
    // Initial movement
    dx = 1;
    dy = 0;
    
    // Initial draw
    draw();
}

// Main game loop
function main() {
    if (gameOver) return;
    
    // Apply the next direction at the start of each move
    if (nextDx !== 0 || nextDy !== 0) {
        dx = nextDx;
        dy = nextDy;
    }
    
    // Only move if a direction is set
    if (dx !== 0 || dy !== 0) {
        moveSnake();
        moveCats();
        
        // Check collisions
        if (checkCollision()) {
            return;
        }
    }
    
    draw();
}

// Draw everything
function draw() {
    // Clear canvas
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw walls
    drawWalls();
    
    // Draw food
    drawFood();
    
    // Draw snake
    drawSnake();
    
    // Draw cats
    drawCats();
}

// Snake functions
function drawSnake() {
    snake.forEach((segment, index) => {
        // Draw head
        if (index === 0) {
            // Head
            ctx.fillStyle = '#00f3ff';
            ctx.beginPath();
            ctx.arc(
                segment.x * TILE_SIZE + TILE_SIZE / 2,
                segment.y * TILE_SIZE + TILE_SIZE / 2,
                TILE_SIZE / 2 - 1,
                0,
                Math.PI * 2
            );
            ctx.fill();
            
            // Mouth
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(
                segment.x * TILE_SIZE + TILE_SIZE / 2,
                segment.y * TILE_SIZE + TILE_SIZE / 2 + 2,
                3,
                0,
                Math.PI
            );
            ctx.stroke();
        } else {
            // Draw body segments as connected circles
            const size = TILE_SIZE / 2 - 1;
            const prevSegment = index > 0 ? snake[index - 1] : segment;
            const nextSegment = index < snake.length - 1 ? snake[index + 1] : segment;
            
            // Calculate direction for body segments
            let angle = Math.atan2(
                nextSegment.y - prevSegment.y,
                nextSegment.x - prevSegment.x
            );
            
            // Draw body segment
            ctx.fillStyle = `hsl(${160 - index * 2}, 100%, 50%)`;
            ctx.beginPath();
            ctx.arc(
                segment.x * TILE_SIZE + TILE_SIZE / 2,
                segment.y * TILE_SIZE + TILE_SIZE / 2,
                size * (0.8 - (index / snake.length) * 0.3), // Gradually reduce size
                0,
                Math.PI * 2
            );
            ctx.fill();
            
            // Add some texture to body
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.beginPath();
            ctx.arc(
                segment.x * TILE_SIZE + TILE_SIZE / 2,
                segment.y * TILE_SIZE + TILE_SIZE / 2,
                size * (0.8 - (index / snake.length) * 0.3) * 0.7,
                0,
                Math.PI * 2
            );
            ctx.stroke();
        }
    });
}

function moveSnake() {
    // Only move if a direction is set
    if (dx !== 0 || dy !== 0) {
        // Create new head
        const head = { x: snake[0].x + dx, y: snake[0].y + dy };
        
        // Add new head
        snake.unshift(head);
        
        // Check if food is eaten
        if (head.x === food.x && head.y === food.y) {
            score += 10;
            updateScore();
            generateFood();
        } else {
            // Remove tail if no food eaten
            snake.pop();
        }
    }
}

// Food functions
function drawFood() {
    // Draw main food
    const gradient = ctx.createRadialGradient(
        food.x * TILE_SIZE + TILE_SIZE / 2,
        food.y * TILE_SIZE + TILE_SIZE / 2 - TILE_SIZE / 4,
        0,
        food.x * TILE_SIZE + TILE_SIZE / 2,
        food.y * TILE_SIZE + TILE_SIZE / 2,
        TILE_SIZE / 2
    );
    gradient.addColorStop(0, '#ff2d75');
    gradient.addColorStop(1, '#ff6b9e');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(
        food.x * TILE_SIZE + TILE_SIZE / 2,
        food.y * TILE_SIZE + TILE_SIZE / 2,
        TILE_SIZE / 2.5,
        0,
        Math.PI * 2
    );
    ctx.fill();
    
    // Add shine
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.beginPath();
    ctx.arc(
        food.x * TILE_SIZE + TILE_SIZE / 2 - 3,
        food.y * TILE_SIZE + TILE_SIZE / 2 - 3,
        3,
        0,
        Math.PI * 2
    );
    ctx.fill();
    
    // Draw small sparkles around food
    if (Math.floor(Date.now() / 200) % 2 === 0) {
        for (let i = 0; i < 4; i++) {
            const angle = (Date.now() / 500) + (i * Math.PI / 2);
            const distance = TILE_SIZE / 1.5;
            const x = food.x * TILE_SIZE + TILE_SIZE / 2 + Math.cos(angle) * distance;
            const y = food.y * TILE_SIZE + TILE_SIZE / 2 + Math.sin(angle) * distance;
            
            ctx.fillStyle = `rgba(255, 150, 200, ${0.5 + Math.sin(Date.now() / 200) * 0.5})`;
            ctx.beginPath();
            ctx.arc(x, y, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

function generateFood() {
    let newFood;
    let validPosition = false;
    
    while (!validPosition) {
        newFood = {
            x: Math.floor(Math.random() * (canvas.width / TILE_SIZE)),
            y: Math.floor(Math.random() * (canvas.height / TILE_SIZE))
        };
        
        // Check if food is on snake
        const onSnake = snake.some(segment => segment.x === newFood.x && segment.y === newFood.y);
        
        // Check if food is on wall
        const onWall = walls.some(wall => wall.x === newFood.x && wall.y === newFood.y);
        
        // Check if food is on cat
        const onCat = cats.some(cat => cat.x === newFood.x && cat.y === newFood.y);
        
        if (!onSnake && !onWall && !onCat) {
            validPosition = true;
        }
    }
    
    food = newFood;
}

// Cat functions
function drawCats() {
    cats.forEach(cat => {
        // Draw cat body
        ctx.fillStyle = '#ff9f43';
        ctx.beginPath();
        ctx.arc(
            cat.x * TILE_SIZE + TILE_SIZE / 2,
            cat.y * TILE_SIZE + TILE_SIZE / 2,
            TILE_SIZE / 2 - 1,
            0,
            Math.PI * 2
        );
        ctx.fill();
        
        // Draw ears
        ctx.beginPath();
        ctx.moveTo(cat.x * TILE_SIZE + 5, cat.y * TILE_SIZE + 5);
        ctx.lineTo(cat.x * TILE_SIZE + 10, cat.y * TILE_SIZE);
        ctx.lineTo(cat.x * TILE_SIZE + 15, cat.y * TILE_SIZE + 5);
        ctx.fill();
        
        // Draw eyes
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(
            cat.x * TILE_SIZE + TILE_SIZE / 2 - 3,
            cat.y * TILE_SIZE + TILE_SIZE / 2,
            2,
            0,
            Math.PI * 2
        );
        ctx.arc(
            cat.x * TILE_SIZE + TILE_SIZE / 2 + 3,
            cat.y * TILE_SIZE + TILE_SIZE / 2,
            2,
            0,
            Math.PI * 2
        );
        ctx.fill();
        
        // Draw mouth
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(
            cat.x * TILE_SIZE + TILE_SIZE / 2,
            cat.y * TILE_SIZE + TILE_SIZE / 2 + 2,
            3,
            0,
            Math.PI
        );
        ctx.stroke();
    });
}

function generateCats(count) {
    cats = [];
    for (let i = 0; i < count; i++) {
        let cat;
        let validPosition = false;
        
        while (!validPosition) {
            cat = {
                x: Math.floor(Math.random() * (canvas.width / TILE_SIZE)),
                y: Math.floor(Math.random() * (canvas.height / TILE_SIZE)),
                dx: [1, -1, 0, 0][Math.floor(Math.random() * 4)],
                dy: [0, 0, 1, -1][Math.floor(Math.random() * 4)]
            };
            
            // Check if cat is on snake, food, or wall
            const onSnake = snake.some(segment => segment.x === cat.x && segment.y === cat.y);
            const onFood = food && food.x === cat.x && food.y === cat.y;
            const onWall = walls.some(wall => wall.x === cat.x && wall.y === cat.y);
            
            if (!onSnake && !onFood && !onWall) {
                validPosition = true;
            }
        }
        
        cats.push(cat);
    }
}

function moveCats() {
    cats.forEach((cat, index) => {
        // Simple AI: 70% chance to move towards player, 30% random
        if (Math.random() < 0.7) {
            // Move towards player
            const dxToPlayer = snake[0].x - cat.x;
            const dyToPlayer = snake[0].y - cat.y;
            
            if (Math.abs(dxToPlayer) > Math.abs(dyToPlayer)) {
                cat.dx = dxToPlayer > 0 ? 1 : -1;
                cat.dy = 0;
            } else {
                cat.dx = 0;
                cat.dy = dyToPlayer > 0 ? 1 : -1;
            }
        } else {
            // Random movement
            const directions = [
                { dx: 1, dy: 0 },
                { dx: -1, dy: 0 },
                { dx: 0, dy: 1 },
                { dx: 0, dy: -1 }
            ];
            const randomDir = directions[Math.floor(Math.random() * directions.length)];
            cat.dx = randomDir.dx;
            cat.dy = randomDir.dy;
        }
        
        // Calculate new position
        const newX = cat.x + cat.dx;
        const newY = cat.y + cat.dy;
        
        // Check if new position is valid
        const hitWall = walls.some(wall => wall.x === newX && wall.y === newY);
        const hitOtherCat = cats.some((c, i) => i !== index && c.x === newX && c.y === newY);
        
        if (!hitWall && !hitOtherCat && 
            newX >= 0 && newX < canvas.width / TILE_SIZE && 
            newY >= 0 && newY < canvas.height / TILE_SIZE) {
            cat.x = newX;
            cat.y = newY;
        }
    });
}

// Maze functions
function generateMaze() {
    walls = [];
    
    // Border walls
    for (let x = 0; x < canvas.width / TILE_SIZE; x++) {
        walls.push({ x, y: 0 });
        walls.push({ x, y: (canvas.height / TILE_SIZE) - 1 });
    }
    
    for (let y = 0; y < canvas.height / TILE_SIZE; y++) {
        walls.push({ x: 0, y });
        walls.push({ x: (canvas.width / TILE_SIZE) - 1, y });
    }
    
    // Add some random walls
    const wallCount = Math.floor((canvas.width / TILE_SIZE) * (canvas.height / TILE_SIZE) * 0.1);
    
    for (let i = 0; i < wallCount; i++) {
        const wall = {
            x: Math.floor(Math.random() * (canvas.width / TILE_SIZE - 4)) + 2,
            y: Math.floor(Math.random() * (canvas.height / TILE_SIZE - 4)) + 2
        };
        
        // Make sure wall is not on snake, food, or cats
        const onSnake = snake.some(segment => segment.x === wall.x && segment.y === wall.y);
        const onFood = food && food.x === wall.x && food.y === wall.y;
        const onCat = cats.some(cat => cat.x === wall.x && cat.y === wall.y);
        
        if (!onSnake && !onFood && !onCat) {
            walls.push(wall);
        }
    }
}

function drawWalls() {
    ctx.fillStyle = '#333';
    walls.forEach(wall => {
        ctx.fillRect(
            wall.x * TILE_SIZE,
            wall.y * TILE_SIZE,
            TILE_SIZE,
            TILE_SIZE
        );
        
        // Add some texture to walls
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 1;
        ctx.strokeRect(
            wall.x * TILE_SIZE + 2,
            wall.y * TILE_SIZE + 2,
            TILE_SIZE - 4,
            TILE_SIZE - 4
        );
    });
}

// Collision detection
function checkCollision() {
    const head = snake[0];
    
    // Wall collision
    if (walls.some(wall => wall.x === head.x && wall.y === head.y)) {
        gameOver = true;
    }
    
    // Self collision
    for (let i = 1; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            gameOver = true;
            break;
        }
    }
    
    // Cat collision
    if (cats.some(cat => cat.x === head.x && cat.y === head.y)) {
        lives--;
        updateScore();
        
        if (lives <= 0) {
            gameOver = true;
        } else {
            // Reset snake position but keep score
            const tail = snake[snake.length - 1];
            snake = [tail];
            dx = 1;
            dy = 0;
            return false;
        }
    }
    
    // Boundary collision
    if (head.x < 0 || head.x >= canvas.width / TILE_SIZE || 
        head.y < 0 || head.y >= canvas.height / TILE_SIZE) {
        gameOver = true;
    }
    
    if (gameOver) {
        endGame();
        return true;
    }
    
    return false;
}

// Game control functions
function changeDirection(event) {
    // Prevent default to avoid page scrolling with arrow keys
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
        event.preventDefault();
    }
    
    // Get the key that was pressed
    const key = event.key || event.keyCode;
    
    // Set next direction (will be applied on next move)
    if ((key === 'ArrowLeft' || key === 37 || key === 'a' || key === 'A') && dx === 0) {
        nextDx = -1;
        nextDy = 0;
    } else if ((key === 'ArrowUp' || key === 38 || key === 'w' || key === 'W') && dy === 0) {
        nextDx = 0;
        nextDy = -1;
    } else if ((key === 'ArrowRight' || key === 39 || key === 'd' || key === 'D') && dx === 0) {
        nextDx = 1;
        nextDy = 0;
    } else if ((key === 'ArrowDown' || key === 40 || key === 's' || key === 'S') && dy === 0) {
        nextDx = 0;
        nextDy = 1;
    } else if (key === ' ' || key === 32) {
        // Space to start/pause
        if (!gameStarted) {
            startGame();
        }
    }
    
    // If game hasn't started and this is the first move, start the game
    if (!gameStarted && (nextDx !== 0 || nextDy !== 0)) {
        startGame();
    }
}

function updateScore() {
    scoreElement.textContent = score;
    livesElement.textContent = lives;
}

function endGame() {
    clearInterval(gameLoop);
    gameStarted = false;
    gameOver = true;
    
    // Show game over screen
    document.getElementById('finalScore').textContent = score;
    const gameOverScreen = document.querySelector('.game-over');
    if (gameOverScreen) {
        gameOverScreen.style.display = 'flex';
    }
    
    // Re-enable start button
    const startBtn = document.getElementById('startBtn');
    if (startBtn) {
        startBtn.disabled = false;
    }
}

// Initialize the game when the page loads
window.onload = function() {
    // Set canvas size
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    
    // Initial draw
    resetGame();
    draw();
    
    // Add keyboard event listeners
    document.addEventListener('keydown', changeDirection);
    
    // Prevent touch events from scrolling the page
    document.body.addEventListener('touchmove', function(e) {
        if (e.target.className === 'mobile-controls' || 
            e.target.className === 'mobile-controls-btn') {
            e.preventDefault();
        }
    }, { passive: false });
    
    // Start button
    const startBtn = document.getElementById('startBtn');
    if (startBtn) {
        startBtn.addEventListener('click', startGame);
        startBtn.addEventListener('touchend', startGame);
    }
    
    // Mobile controls with touch events
    const directions = {
        'up': { dx: 0, dy: -1 },
        'down': { dx: 0, dy: 1 },
        'left': { dx: -1, dy: 0 },
        'right': { dx: 1, dy: 0 }
    };
    
    Object.entries(directions).forEach(([dir, {dx: dirDx, dy: dirDy}]) => {
        const btn = document.getElementById(dir);
        if (btn) {
            // Click for desktop
            btn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                if (dx !== -dirDx || dy !== -dirDy) { // Prevent 180° turns
                    dx = dirDx;
                    dy = dirDy;
                }
                if (!gameStarted) startGame();
            });
            
            // Touch for mobile
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (dx !== -dirDx || dy !== -dirDy) { // Prevent 180° turns
                    dx = dirDx;
                    dy = dirDy;
                }
                if (!gameStarted) startGame();
            }, { passive: false });
        }
    });
    
    // Add instructions
    const instructions = document.createElement('div');
    instructions.style.color = '#00f3ff';
    instructions.style.marginTop = '15px';
    instructions.style.fontSize = '16px';
    instructions.innerHTML = 'You are the <span style="color:#00f3ff; text-shadow:0 0 5px #00f3ff">blue snake</span>. Collect <span style="color:#ff2d75">pink food</span> and avoid <span style="color:#ff9f43">orange cats</span>!';
    document.querySelector('.game-container').appendChild(instructions);
};
