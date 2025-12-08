localStorage.setItem('pot8o watermark', `${localStorage.getItem('pot8o watermark') || ''} tetris`);
    const defaultConfig = {
      game_title: "EXTREME TETRIS",
      score_label: "SCORE",
      lines_label: "LINES",
      level_label: "LEVEL",
      primary_color: "#ff00ff",
      secondary_color: "#00ffff",
      accent_color: "#ffff00",
      text_color: "#ffffff",
      background_color: "#1a0033"
    };

    let config = {};

    
    let database = null;
    let firebaseEnabled = false;

    // Initialize Firebase
    try {
      if (typeof firebase !== 'undefined') {
        firebase.initializeApp(wemjnonmomo);
        database = firebase.database();
        firebaseEnabled = true;
        console.log('Firebase initialized successfully');
      }
    } catch (error) {
      console.warn('Firebase initialization failed, continuing without scoreboard:', error);
      firebaseEnabled = false;
    }

    // Game constants
    const COLS = 10;
    const ROWS = 20;
    const BLOCK_SIZE = 20;
    
    // Tetromino shapes
    const SHAPES = [
      [[1,1,1,1]], // I
      [[1,1],[1,1]], // O
      [[1,1,1],[0,1,0]], // T
      [[1,1,1],[1,0,0]], // L
      [[1,1,1],[0,0,1]], // J
      [[1,1,0],[0,1,1]], // S
      [[0,1,1],[1,1,0]]  // Z
    ];
    
    const COLORS = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ff8800'];
    
    // Game state
    let board = [];
    let currentPiece = null;
    let nextPiece = null;
    let currentX = 0;
    let currentY = 0;
    let score = 0;
    let lines = 0;
    let level = 0;
    let gameOver = false;
    let dropCounter = 0;
    let dropInterval = 1000;
    let lastTime = 0;
    let pieceBag = [];
    
    const nextCanvas = document.getElementById('next-canvas');
    const nextCtx = nextCanvas.getContext('2d');
    
    // Classic Tetris speed formula: frames per drop at 60fps
    function getDropSpeed(level) {
      const speedTable = [
        48, 43, 38, 33, 28, 23, 18, 13, 8, 6, // Levels 0-9
        5, 5, 5, 4, 4, 4, 3, 3, 3, 2, // Levels 10-19
        2, 2, 2, 2, 2, 2, 2, 2, 2, 1  // Levels 20-29+
      ];
      const frames = level < speedTable.length ? speedTable[level] : 1;
      return (frames / 60) * 1000; // Convert to milliseconds
    }
    
    // Canvas setup
    const gameCanvas = document.getElementById('game-canvas');
    const gameCtx = gameCanvas.getContext('2d');
    
    function resizeCanvases() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      gameCanvas.width = width;
      gameCanvas.height = height;
    }
    
    resizeCanvases();
    window.addEventListener('resize', resizeCanvases);
    
    // Initialize board
    function initBoard() {
      board = Array(ROWS).fill().map(() => Array(COLS).fill(0));
    }
    
    // Firebase functions
    async function submitScore(playerName, playerScore) {
      if (!firebaseEnabled || !database) {
        console.warn('Firebase not available, cannot submit score');
        return false;
      }

      try {
        const scoresRef = database.ref('tetris_scores');
        await scoresRef.push({
          name: playerName,
          score: playerScore,
          timestamp: Date.now()
        });
        return true;
      } catch (error) {
        console.error('Error submitting score:', error);
        return false;
      }
    }

    async function loadScoreboard() {
      if (!firebaseEnabled || !database) {
        document.getElementById('scoreboard-list').innerHTML = '<li style="text-align: center; color: #fff; padding: 20px;">Scoreboard unavailable</li>';
        return;
      }

      try {
        const scoresRef = database.ref('tetris_scores');
        const snapshot = await scoresRef.orderByChild('score').limitToLast(10).once('value');
        const scores = [];
        
        snapshot.forEach((childSnapshot) => {
          scores.push(childSnapshot.val());
        });
        
        scores.sort((a, b) => b.score - a.score);
        
        const scoreboardList = document.getElementById('scoreboard-list');
        scoreboardList.innerHTML = '';
        
        if (scores.length === 0) {
          scoreboardList.innerHTML = '<li style="text-align: center; color: #fff; padding: 20px;">No scores yet!</li>';
          return;
        }
        
        scores.forEach((score, index) => {
          const li = document.createElement('li');
          li.className = 'score-entry';
          li.innerHTML = `
            <span class="score-rank">#${index + 1}</span>
            <span class="score-name">${score.name || 'Anonymous'}</span>
            <span class="score-value">${score.score}</span>
          `;
          scoreboardList.appendChild(li);
        });
      } catch (error) {
        console.error('Error loading scoreboard:', error);
        document.getElementById('scoreboard-list').innerHTML = '<li style="text-align: center; color: #fff; padding: 20px;">Error loading scores</li>';
      }
    }

    async function checkIfHighScore(playerScore) {
      if (!firebaseEnabled || !database) {
        return false;
      }

      try {
        const scoresRef = database.ref('tetris_scores');
        const snapshot = await scoresRef.orderByChild('score').limitToLast(10).once('value');
        const scores = [];
        
        snapshot.forEach((childSnapshot) => {
          scores.push(childSnapshot.val().score);
        });
        
        if (scores.length < 10) {
          return true;
        }
        
        const lowestScore = Math.min(...scores);
        return playerScore > lowestScore;
      } catch (error) {
        console.error('Error checking high score:', error);
        return false;
      }
    }

    // Bag randomizer (modern Tetris standard)
    function fillBag() {
      pieceBag = [0, 1, 2, 3, 4, 5, 6];
      // Fisher-Yates shuffle
      for (let i = pieceBag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pieceBag[i], pieceBag[j]] = [pieceBag[j], pieceBag[i]];
      }
    }
    
    function getNextPieceFromBag() {
      if (pieceBag.length === 0) {
        fillBag();
      }
      const shapeIndex = pieceBag.pop();
      return {
        shape: SHAPES[shapeIndex],
        color: COLORS[shapeIndex]
      };
    }
    
    // Create new piece
    function newPiece() {
      if (!nextPiece) {
        nextPiece = getNextPieceFromBag();
      }
      
      currentPiece = nextPiece;
      nextPiece = getNextPieceFromBag();
      
      currentX = Math.floor(COLS / 2) - Math.floor(currentPiece.shape[0].length / 2);
      currentY = 0;
      
      drawNextPiece();
      
      if (collision()) {
        gameOver = true;
        handleGameOver();
      }
    }
    
    function drawNextPiece() {
      nextCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      nextCtx.fillRect(0, 0, 80, 80);
      
      if (nextPiece) {
        const pieceWidth = nextPiece.shape[0].length;
        const pieceHeight = nextPiece.shape.length;
        const blockSize = 15;
        const offsetX = (80 - pieceWidth * blockSize) / 2;
        const offsetY = (80 - pieceHeight * blockSize) / 2;
        
        nextCtx.shadowBlur = 20;
        nextCtx.shadowColor = nextPiece.color;
        nextCtx.fillStyle = nextPiece.color;
        
        for (let y = 0; y < nextPiece.shape.length; y++) {
          for (let x = 0; x < nextPiece.shape[y].length; x++) {
            if (nextPiece.shape[y][x]) {
              nextCtx.fillRect(
                offsetX + x * blockSize, 
                offsetY + y * blockSize, 
                blockSize - 1, 
                blockSize - 1
              );
            }
          }
        }
        nextCtx.shadowBlur = 0;
      }
    }

    async function handleGameOver() {
      document.getElementById('game-over-screen').classList.add('show');
      document.getElementById('final-score-value').textContent = score;

      if (firebaseEnabled && score > 0) {
        const isHighScore = await checkIfHighScore(score);
        if (isHighScore) {
          setTimeout(() => {
            document.getElementById('final-score-display').textContent = score;
            document.getElementById('name-input-modal').classList.add('show');
          }, 1000);
        }
      }
    }
    
    // Check collision
    function collision() {
      for (let y = 0; y < currentPiece.shape.length; y++) {
        for (let x = 0; x < currentPiece.shape[y].length; x++) {
          if (currentPiece.shape[y][x]) {
            const newX = currentX + x;
            const newY = currentY + y;
            
            if (newX < 0 || newX >= COLS || newY >= ROWS) return true;
            if (newY >= 0 && board[newY][newX]) return true;
          }
        }
      }
      return false;
    }
    
    // Merge piece to board
    function merge() {
      for (let y = 0; y < currentPiece.shape.length; y++) {
        for (let x = 0; x < currentPiece.shape[y].length; x++) {
          if (currentPiece.shape[y][x]) {
            const boardY = currentY + y;
            const boardX = currentX + x;
            if (boardY >= 0) {
              board[boardY][boardX] = currentPiece.color;
            }
          }
        }
      }
    }
    
    // Clear lines
    function clearLines() {
      let linesCleared = 0;
      
      for (let y = ROWS - 1; y >= 0; y--) {
        if (board[y].every(cell => cell !== 0)) {
          linesCleared++;
          board.splice(y, 1);
          board.unshift(Array(COLS).fill(0));
          y++;
        }
      }
      
      if (linesCleared > 0) {
        lines += linesCleared;
        
        // Classic NES Tetris scoring
        const linePoints = [0, 40, 100, 300, 1200]; // 0, single, double, triple, tetris
        score += linePoints[linesCleared] * (level + 1);
        
        // Level up every 10 lines
        const newLevel = Math.floor(lines / 10);
        if (newLevel !== level) {
          level = newLevel;
          dropInterval = getDropSpeed(level);
        }
        
        document.getElementById('lines-value').textContent = lines;
        document.getElementById('level-value').textContent = level;
        document.getElementById('score-value').textContent = score;
        
        if (linesCleared > 1) {
          const comboDisplay = document.getElementById('combo-display');
          comboDisplay.textContent = linesCleared === 4 ? 'TETRIS!' : `${linesCleared}x COMBO!`;
          comboDisplay.classList.remove('show');
          void comboDisplay.offsetWidth;
          comboDisplay.classList.add('show');
        }
      }
    }
    
    // Rotate piece with wall kicks
    function rotate() {
      const rotated = currentPiece.shape[0].map((_, i) =>
        currentPiece.shape.map(row => row[i]).reverse()
      );
      const previousShape = currentPiece.shape;
      const previousX = currentX;
      
      currentPiece.shape = rotated;
      
      // Try wall kicks: 0, left 1, right 1, left 2, right 2
      const kicks = [0, -1, 1, -2, 2];
      let rotated_successfully = false;
      
      for (let kick of kicks) {
        currentX = previousX + kick;
        if (!collision()) {
          rotated_successfully = true;
          break;
        }
      }
      
      if (!rotated_successfully) {
        currentPiece.shape = previousShape;
        currentX = previousX;
      }
    }
    
    // Move piece
    function move(dir) {
      currentX += dir;
      if (collision()) {
        currentX -= dir;
      }
    }
    
    function drop() {
      currentY++;
      if (collision()) {
        currentY--;
        merge();
        clearLines();
        newPiece();
        dropCounter = 0;
      }
    }
    
    function hardDrop() {
      let dropDistance = 0;
      while (!collision()) {
        currentY++;
        dropDistance++;
      }
      currentY--;
      score += dropDistance * 2; // 2 points per cell dropped
      document.getElementById('score-value').textContent = score;
      merge();
      clearLines();
      newPiece();
      dropCounter = 0;
    }
    
    // Calculate ghost piece position
    function getGhostY() {
      let ghostY = currentY;
      currentY = ghostY;
      while (!collision()) {
        ghostY++;
        currentY = ghostY;
      }
      currentY = ghostY - 1;
      return currentY;
    }
    
    // Draw game
    function draw() {
      const centerX = gameCanvas.width / 2 - (COLS * BLOCK_SIZE / 2);
      const centerY = gameCanvas.height / 2 - (ROWS * BLOCK_SIZE / 2);
      
      gameCtx.fillStyle = config.background_color || defaultConfig.background_color;
      gameCtx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
      
      // Draw board with glow
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          if (board[y][x]) {
            const posX = centerX + x * BLOCK_SIZE;
            const posY = centerY + y * BLOCK_SIZE;
            
            gameCtx.shadowBlur = 15;
            gameCtx.shadowColor = board[y][x];
            gameCtx.fillStyle = board[y][x];
            gameCtx.fillRect(posX, posY, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
          }
        }
      }
      
      // Draw ghost piece (landing preview)
      if (currentPiece) {
        const savedY = currentY;
        const ghostY = getGhostY();
        
        if (ghostY > savedY) {
          gameCtx.fillStyle = currentPiece.color;
          gameCtx.globalAlpha = 0.3;
          
          for (let y = 0; y < currentPiece.shape.length; y++) {
            for (let x = 0; x < currentPiece.shape[y].length; x++) {
              if (currentPiece.shape[y][x]) {
                const posX = centerX + (currentX + x) * BLOCK_SIZE;
                const posY = centerY + (ghostY + y) * BLOCK_SIZE;
                gameCtx.fillRect(posX, posY, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
              }
            }
          }
          gameCtx.globalAlpha = 1;
        }
        
        currentY = savedY;
      }
      
      // Draw current piece with mega glow
      if (currentPiece) {
        gameCtx.shadowBlur = 25;
        gameCtx.shadowColor = currentPiece.color;
        gameCtx.fillStyle = currentPiece.color;
        
        for (let y = 0; y < currentPiece.shape.length; y++) {
          for (let x = 0; x < currentPiece.shape[y].length; x++) {
            if (currentPiece.shape[y][x]) {
              const posX = centerX + (currentX + x) * BLOCK_SIZE;
              const posY = centerY + (currentY + y) * BLOCK_SIZE;
              gameCtx.fillRect(posX, posY, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
            }
          }
        }
      }
      
      gameCtx.shadowBlur = 0;
      
      // Draw grid with glow
      gameCtx.strokeStyle = config.primary_color || defaultConfig.primary_color;
      gameCtx.lineWidth = 1;
      gameCtx.globalAlpha = 0.3;
      for (let i = 0; i <= COLS; i++) {
        gameCtx.beginPath();
        gameCtx.moveTo(centerX + i * BLOCK_SIZE, centerY);
        gameCtx.lineTo(centerX + i * BLOCK_SIZE, centerY + ROWS * BLOCK_SIZE);
        gameCtx.stroke();
      }
      for (let i = 0; i <= ROWS; i++) {
        gameCtx.beginPath();
        gameCtx.moveTo(centerX, centerY + i * BLOCK_SIZE);
        gameCtx.lineTo(centerX + COLS * BLOCK_SIZE, centerY + i * BLOCK_SIZE);
        gameCtx.stroke();
      }
      gameCtx.globalAlpha = 1;
    }
    
    // Game loop
    function update(time = 0) {
      if (!gameOver) {
        const deltaTime = time - lastTime;
        lastTime = time;
        dropCounter += deltaTime;
        
        if (dropCounter > dropInterval) {
          drop();
          dropCounter = 0;
        }
      }
      
      draw();
      requestAnimationFrame(update);
    }
    
    // Controls
    document.getElementById('left-btn').addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (!gameOver) move(-1);
    });
    
    document.getElementById('right-btn').addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (!gameOver) move(1);
    });
    
    document.getElementById('down-btn').addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (!gameOver) drop();
    });
    
    document.getElementById('rotate-btn').addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (!gameOver) rotate();
    });
    
    document.getElementById('drop-btn').addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (!gameOver) hardDrop();
    });
    
    document.getElementById('left-btn').addEventListener('click', () => { if (!gameOver) move(-1); });
    document.getElementById('right-btn').addEventListener('click', () => { if (!gameOver) move(1); });
    document.getElementById('down-btn').addEventListener('click', () => { if (!gameOver) drop(); });
    document.getElementById('rotate-btn').addEventListener('click', () => { if (!gameOver) rotate(); });
    document.getElementById('drop-btn').addEventListener('click', () => { if (!gameOver) hardDrop(); });
    
    // Keyboard controls
    document.addEventListener('keydown', (e) => {
      if (gameOver) return;
      if (e.key === 'ArrowLeft') move(-1);
      if (e.key === 'ArrowRight') move(1);
      if (e.key === 'ArrowDown') drop();
      if (e.key === 'ArrowUp') rotate();
      if (e.key === ' ') {
        e.preventDefault();
        hardDrop();
      }
    });
    
    // Scoreboard controls
    document.getElementById('scoreboard-btn').addEventListener('click', () => {
      document.getElementById('scoreboard-modal').classList.add('show');
      loadScoreboard();
    });

    document.getElementById('close-scoreboard').addEventListener('click', () => {
      document.getElementById('scoreboard-modal').classList.remove('show');
    });

    // Letter spinner controls
    const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let playerLetters = ['A', 'A', 'A'];

    function updateLetterDisplay(index) {
      const display = document.querySelector(`.letter-display[data-letter="${index}"]`);
      display.textContent = playerLetters[index];
    }

    document.querySelectorAll('.spinner-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const letterIndex = parseInt(btn.getAttribute('data-letter'));
        const direction = btn.getAttribute('data-dir');
        
        const currentIndex = ALPHABET.indexOf(playerLetters[letterIndex]);
        let newIndex;
        
        if (direction === 'up') {
          newIndex = (currentIndex + 1) % ALPHABET.length;
        } else {
          newIndex = (currentIndex - 1 + ALPHABET.length) % ALPHABET.length;
        }
        
        playerLetters[letterIndex] = ALPHABET[newIndex];
        updateLetterDisplay(letterIndex);
      });
    });

    document.getElementById('submit-score-btn').addEventListener('click', async () => {
      const playerName = playerLetters.join('');
      const submitBtn = document.getElementById('submit-score-btn');
      const loadingMsg = document.getElementById('submit-loading');

      submitBtn.disabled = true;
      loadingMsg.style.display = 'block';

      const success = await submitScore(playerName, score);
      
      loadingMsg.style.display = 'none';
      submitBtn.disabled = false;

      if (success) {
        document.getElementById('name-input-modal').classList.remove('show');
        playerLetters = ['A', 'A', 'A'];
        updateLetterDisplay(0);
        updateLetterDisplay(1);
        updateLetterDisplay(2);
      } else {
        loadingMsg.textContent = 'Failed to submit. Try again.';
        loadingMsg.style.display = 'block';
        setTimeout(() => {
          loadingMsg.style.display = 'none';
          loadingMsg.textContent = 'Submitting...';
        }, 3000);
      }
    });

    document.getElementById('skip-submit-btn').addEventListener('click', () => {
      document.getElementById('name-input-modal').classList.remove('show');
      playerLetters = ['A', 'A', 'A'];
      updateLetterDisplay(0);
      updateLetterDisplay(1);
      updateLetterDisplay(2);
    });

    // Restart
    document.getElementById('restart-btn').addEventListener('click', () => {
      gameOver = false;
      score = 0;
      lines = 0;
      level = 0;
      dropInterval = getDropSpeed(0);
      pieceBag = [];
      nextPiece = null;
      initBoard();
      newPiece();
      document.getElementById('score-value').textContent = '0';
      document.getElementById('lines-value').textContent = '0';
      document.getElementById('level-value').textContent = '0';
      document.getElementById('game-over-screen').classList.remove('show');
    });
    
    // Element SDK Implementation
    async function onConfigChange(newConfig) {
      config = newConfig;
      
      const gameTitle = config.game_title || defaultConfig.game_title;
      const scoreLabel = config.score_label || defaultConfig.score_label;
      const linesLabel = config.lines_label || defaultConfig.lines_label;
      const levelLabel = config.level_label || defaultConfig.level_label;
      const primaryColor = config.primary_color || defaultConfig.primary_color;
      const secondaryColor = config.secondary_color || defaultConfig.secondary_color;
      const textColor = config.text_color || defaultConfig.text_color;
      
      document.getElementById('score-label').textContent = scoreLabel;
      document.getElementById('lines-label').textContent = linesLabel;
      document.getElementById('level-label').textContent = levelLabel;
      
      document.getElementById('score-display').style.textShadow = `0 0 20px ${primaryColor}, 0 0 40px ${primaryColor}`;
      document.getElementById('score-value').style.color = secondaryColor;
      document.getElementById('score-value').style.textShadow = `0 0 20px ${secondaryColor}, 0 0 40px ${secondaryColor}`;
      
      document.querySelectorAll('.stat-label').forEach(el => {
        el.style.textShadow = `0 0 10px ${primaryColor}`;
      });
      
      document.querySelectorAll('.stat-value').forEach(el => {
        el.style.color = secondaryColor;
        el.style.textShadow = `0 0 10px ${secondaryColor}`;
      });
      
      document.querySelectorAll('.control-btn').forEach(btn => {
        btn.style.borderColor = secondaryColor;
        btn.style.color = secondaryColor;
        btn.style.boxShadow = `0 0 20px ${secondaryColor}, inset 0 0 20px rgba(0, 255, 255, 0.2)`;
      });
    }
    
    if (window.elementSdk) {
      window.elementSdk.init({
        defaultConfig,
        onConfigChange,
        mapToCapabilities: (config) => ({
          recolorables: [
            {
              get: () => config.primary_color || defaultConfig.primary_color,
              set: (value) => {
                config.primary_color = value;
                window.elementSdk.setConfig({ primary_color: value });
              }
            },
            {
              get: () => config.secondary_color || defaultConfig.secondary_color,
              set: (value) => {
                config.secondary_color = value;
                window.elementSdk.setConfig({ secondary_color: value });
              }
            },
            {
              get: () => config.accent_color || defaultConfig.accent_color,
              set: (value) => {
                config.accent_color = value;
                window.elementSdk.setConfig({ accent_color: value });
              }
            },
            {
              get: () => config.text_color || defaultConfig.text_color,
              set: (value) => {
                config.text_color = value;
                window.elementSdk.setConfig({ text_color: value });
              }
            },
            {
              get: () => config.background_color || defaultConfig.background_color,
              set: (value) => {
                config.background_color = value;
                window.elementSdk.setConfig({ background_color: value });
              }
            }
          ],
          borderables: [],
          fontEditable: undefined,
          fontSizeable: undefined
        }),
        mapToEditPanelValues: (config) => new Map([
          ["game_title", config.game_title || defaultConfig.game_title],
          ["score_label", config.score_label || defaultConfig.score_label],
          ["lines_label", config.lines_label || defaultConfig.lines_label],
          ["level_label", config.level_label || defaultConfig.level_label]
        ])
      });
    }
    
    // Start game
    dropInterval = getDropSpeed(0);
    initBoard();
    newPiece();
    update();