

        localStorage.setItem('pot8o watermark', `${localStorage.getItem('pot8o watermark') || ''} tank-mp`);

        const defaultConfig = {
            game_title: "TANK BATTLE ARENA",
            player_name_label: "Tank Commander"
        };

        let config = { ...defaultConfig };

        const canvas = document.getElementById('game-canvas');
        const ctx = canvas.getContext('2d');
        
        let gameState = {
            gameId: null,
            playerId: null,
            playerName: '',
            isHost: false,
            currentTurn: null,
            myTurn: false,
            gameStarted: false,
            mode: 'menu',
            selectedAction: null,
            tanks: {},
            projectiles: [],
            terrain: [],
            movesLeft: 3,
            shotPower: 50,
            shotAngle: 45,
            aimingAngle: 45,
            windSpeed: 0,
            windDirection: 1,
            selectedWeapon: 'normal',
            showTrajectory: false,
            totalDamage: 0,
            consecutiveHits: 0,
            missedShots: 0
        };

        function resizeCanvas() {
            const container = document.getElementById('game-canvas-container');
            const rect = container.getBoundingClientRect();
            const aspectRatio = 16 / 9;
            
            let width = rect.width - 20;
            let height = width / aspectRatio;
            
            if (height > rect.height - 20) {
                height = rect.height - 20;
                width = height * aspectRatio;
            }
            
            canvas.width = 800;
            canvas.height = 450;
            canvas.style.width = width + 'px';
            canvas.style.height = height + 'px';
        }

        function generateGameCode() {
            return Math.random().toString(36).substring(2, 8).toUpperCase();
        }

        function generatePlayerId() {
            return 'player_' + Math.random().toString(36).substring(2, 15);
        }

        function switchScreen(screenId) {
            document.querySelectorAll('#menu-screen, #lobby-screen, #game-screen').forEach(screen => {
                screen.classList.remove('active');
            });
            document.getElementById(screenId).classList.add('active');
            
            if (screenId === 'game-screen') {
                resizeCanvas();
                generateTerrain();
                gameLoop();
            }
        }

        function showStatus(message, duration = 2000) {
            const status = document.getElementById('lobby-status');
            if (status) {
                status.textContent = message;
            }
        }

        document.getElementById('quick-match-btn').addEventListener('click', async () => {
            const nameInput = document.getElementById('player-name-input');
            const playerName = nameInput.value.trim() || config.player_name_label;
            
            gameState.playerName = playerName;
            gameState.playerId = generatePlayerId();

            showStatus('🔍 Finding opponent...');
            switchScreen('lobby-screen');
            document.getElementById('lobby-code').textContent = 'MATCHING';

            const queueRef = database.ref('matchmaking_queue');
            const snapshot = await queueRef.once('value');
            const queue = snapshot.val() || {};
            
            const availablePlayers = Object.entries(queue).filter(([id, data]) => {
                return Date.now() - data.timestamp < 30000 && id !== gameState.playerId;
            });

            if (availablePlayers.length > 0) {
                const [opponentId, opponentData] = availablePlayers[0];
                
                await queueRef.child(opponentId).remove();
                
                gameState.gameId = generateGameCode();
                gameState.isHost = true;

                const gameRef = database.ref('games/' + gameState.gameId);
                await gameRef.set({
                    host: gameState.playerId,
                    matchmaking: true,
                    players: {
                        [gameState.playerId]: {
                            name: playerName,
                            ready: true,
                            health: 100,
                            x: 100,
                            y: 0,
                            angle: 45
                        },
                        [opponentId]: {
                            name: opponentData.name,
                            ready: true,
                            health: 100,
                            x: 700,
                            y: 0,
                            angle: 135
                        }
                    },
                    currentTurn: gameState.playerId,
                    started: false,
                    createdAt: Date.now()
                });

                await database.ref('matchmaking_notify/' + opponentId).set({
                    gameId: gameState.gameId,
                    timestamp: Date.now()
                });

                document.getElementById('lobby-code').textContent = '✓ MATCHED';
                showStatus('Opponent found! Starting...');
                
                setTimeout(async () => {
                    await gameRef.update({ started: true });
                }, 1500);
                
                listenToLobby();
            } else {
                await queueRef.child(gameState.playerId).set({
                    name: playerName,
                    timestamp: Date.now()
                });

                showStatus('🔍 Searching for opponent...');
                listenForMatch();
            }
        });

        function listenForMatch() {
            const notifyRef = database.ref('matchmaking_notify/' + gameState.playerId);
            
            notifyRef.on('value', async (snapshot) => {
                if (!snapshot.exists()) return;
                
                const data = snapshot.val();
                gameState.gameId = data.gameId;
                gameState.isHost = false;
                
                await notifyRef.remove();
                await database.ref('matchmaking_queue/' + gameState.playerId).remove();
                
                document.getElementById('lobby-code').textContent = '✓ MATCHED';
                showStatus('Opponent found! Starting...');
                
                listenToLobby();
            });

            setTimeout(async () => {
                const queueRef = database.ref('matchmaking_queue/' + gameState.playerId);
                const snapshot = await queueRef.once('value');
                
                if (snapshot.exists() && gameState.mode !== 'game') {
                    await queueRef.remove();
                    notifyRef.off('value');
                    showStatus('No opponents found. Try again!');
                    
                    setTimeout(() => {
                        switchScreen('menu-screen');
                    }, 2000);
                }
            }, 30000);
        }

        document.getElementById('create-game-btn').addEventListener('click', async () => {
            const nameInput = document.getElementById('player-name-input');
            const playerName = nameInput.value.trim() || config.player_name_label;
            
            gameState.playerName = playerName;
            gameState.playerId = generatePlayerId();
            gameState.gameId = generateGameCode();
            gameState.isHost = true;

            const gameRef = database.ref('games/' + gameState.gameId);
            await gameRef.set({
                host: gameState.playerId,
                matchmaking: false,
                players: {
                    [gameState.playerId]: {
                        name: playerName,
                        ready: true,
                        health: 100,
                        x: 100,
                        y: 0,
                        angle: 45
                    }
                },
                currentTurn: gameState.playerId,
                started: false,
                createdAt: Date.now()
            });

            document.getElementById('lobby-code').textContent = gameState.gameId;
            document.getElementById('start-game-btn').style.display = 'block';
            switchScreen('lobby-screen');
            listenToLobby();
        });

        document.getElementById('join-game-btn').addEventListener('click', async () => {
            const nameInput = document.getElementById('player-name-input');
            const playerName = nameInput.value.trim() || config.player_name_label;
            const gameCode = prompt('Enter game code:');
            
            if (!gameCode) return;

            const gameRef = database.ref('games/' + gameCode.toUpperCase());
            const snapshot = await gameRef.once('value');
            
            if (!snapshot.exists()) {
                showStatus('Game not found!');
                return;
            }

            const gameData = snapshot.val();
            if (Object.keys(gameData.players).length >= 2) {
                showStatus('Game is full!');
                return;
            }

            gameState.playerName = playerName;
            gameState.playerId = generatePlayerId();
            gameState.gameId = gameCode.toUpperCase();
            gameState.isHost = false;

            await gameRef.child('players/' + gameState.playerId).set({
                name: playerName,
                ready: true,
                health: 100,
                x: 700,
                y: 0,
                angle: 135
            });

            document.getElementById('lobby-code').textContent = gameState.gameId;
            switchScreen('lobby-screen');
            listenToLobby();
        });

        function listenToLobby() {
            const gameRef = database.ref('games/' + gameState.gameId);
            
            gameRef.on('value', (snapshot) => {
                if (!snapshot.exists()) return;
                
                const data = snapshot.val();
                const playerList = document.getElementById('player-list');
                playerList.innerHTML = '';
                
                Object.entries(data.players).forEach(([id, player]) => {
                    const playerDiv = document.createElement('div');
                    playerDiv.className = 'player-item';
                    playerDiv.innerHTML = `
                        <div class="player-indicator ${player.ready ? 'ready' : ''}"></div>
                        <span>${player.name}</span>
                    `;
                    playerList.appendChild(playerDiv);
                });

                const playerCount = Object.keys(data.players).length;
                if (playerCount === 2 && !data.started) {
                    showStatus('Ready to start!');
                } else if (!data.started) {
                    showStatus('Waiting for opponent...');
                }

                if (data.started && gameState.mode !== 'game') {
                    gameState.mode = 'game';
                    gameState.currentTurn = data.currentTurn;
                    gameState.gameStarted = true;
                    gameRef.off('value');
                    switchScreen('game-screen');
                    listenToGame();
                }
            });
        }

        document.getElementById('start-game-btn').addEventListener('click', async () => {
            const gameRef = database.ref('games/' + gameState.gameId);
            const snapshot = await gameRef.once('value');
            const data = snapshot.val();
            
            if (Object.keys(data.players).length < 2) {
                showStatus('Need 2 players to start!');
                return;
            }

            await gameRef.update({
                started: true,
                currentTurn: gameState.playerId
            });
        });

        document.getElementById('leave-lobby-btn').addEventListener('click', async () => {
            if (gameState.gameId) {
                const gameRef = database.ref('games/' + gameState.gameId);
                await gameRef.child('players/' + gameState.playerId).remove();
                
                const snapshot = await gameRef.once('value');
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    if (!data.players || Object.keys(data.players).length === 0) {
                        await gameRef.remove();
                    }
                }
            }
            
            gameState = {
                gameId: null,
                playerId: null,
                playerName: '',
                isHost: false,
                currentTurn: null,
                myTurn: false,
                gameStarted: false,
                mode: 'menu',
                selectedAction: null,
                tanks: {},
                projectiles: [],
                terrain: [],
                movesLeft: 3,
                shotPower: 50,
                shotAngle: 45,
                aimingAngle: 45
            };
            
            switchScreen('menu-screen');
        });

        function listenToGame() {
            const gameRef = database.ref('games/' + gameState.gameId);
            
            gameRef.on('value', (snapshot) => {
                if (!snapshot.exists()) {
                    switchScreen('menu-screen');
                    return;
                }
                
                const data = snapshot.val();
                const wasMyturn = gameState.myTurn;
                
                gameState.tanks = data.players;
                gameState.currentTurn = data.currentTurn;
                gameState.myTurn = gameState.currentTurn === gameState.playerId;
                
                if (!wasMyturn && gameState.myTurn) {
                    gameState.movesLeft = 3;
                    gameState.selectedAction = null;
                    gameState.showTrajectory = false;
                    moveDistance = 0;
                    shotFired = false;
                    updateButtonSelection();
                    updateActionButtons();
                }
                
                updateTurnIndicator();
                updateActionButtons();
                updateGameInfo();
                
                Object.entries(data.players).forEach(([id, player]) => {
                    if (player.health <= 0 && id !== gameState.playerId) {
                        endGame(true);
                    } else if (player.health <= 0 && id === gameState.playerId) {
                        endGame(false);
                    }
                });
            });
        }

        function updateTurnIndicator() {
            const indicator = document.getElementById('turn-indicator');
            if (gameState.myTurn) {
                indicator.textContent = 'YOUR TURN';
                indicator.style.background = 'rgba(76, 175, 80, 0.9)';
                indicator.classList.add('active');
            } else {
                indicator.textContent = 'OPPONENT\'S TURN';
                indicator.style.background = 'rgba(255, 107, 53, 0.9)';
                indicator.classList.add('active');
            }
        }

        function updateActionButtons() {
            const buttons = document.querySelectorAll('.action-btn');
            buttons.forEach(btn => {
                if (gameState.myTurn && !shotFired) {
                    btn.classList.add('active');
                    btn.style.pointerEvents = 'auto';
                } else {
                    btn.classList.remove('active');
                    btn.style.pointerEvents = 'none';
                }
            });
        }

        function updateGameInfo() {
            const myTank = gameState.tanks[gameState.playerId];
            if (myTank) {
                document.getElementById('player-health').textContent = myTank.health;
                document.getElementById('shot-power').textContent = gameState.shotPower;
                document.getElementById('shot-angle').textContent = Math.round(gameState.shotAngle) + '°';
                document.getElementById('moves-left').textContent = gameState.movesLeft;
                document.getElementById('total-damage').textContent = gameState.totalDamage;
            }
        }

        function generateTerrain() {
            gameState.terrain = [];
            for (let x = 0; x < canvas.width; x += 20) {
                const baseHeight = 350;
                const variation = Math.sin(x / 80) * 30 + Math.cos(x / 50) * 20;
                gameState.terrain.push({
                    x: x,
                    height: baseHeight + variation
                });
            }
            
            generateWind();
        }

        function generateWind() {
            gameState.windSpeed = Math.floor(Math.random() * 6) + 1;
            gameState.windDirection = Math.random() > 0.5 ? 1 : -1;
            updateWindDisplay();
        }

        function updateWindDisplay() {
            const windArrow = document.getElementById('wind-arrow');
            const windSpeed = document.getElementById('wind-speed');
            const windIndicator = document.querySelector('.wind-indicator');
            
            if (windIndicator) windIndicator.classList.add('active');
            if (windSpeed) windSpeed.textContent = gameState.windSpeed;
            
            if (windArrow) {
                if (gameState.windDirection > 0) {
                    windArrow.textContent = '→';
                    windArrow.style.transform = 'rotate(0deg)';
                } else {
                    windArrow.textContent = '←';
                    windArrow.style.transform = 'rotate(180deg)';
                }
            }
        }

        document.querySelectorAll('.weapon-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (!gameState.myTurn) return;
                
                document.querySelectorAll('.weapon-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                gameState.selectedWeapon = btn.dataset.weapon;
            });
        });

        const powerSlider = document.getElementById('power-slider');
        const powerDisplay = document.getElementById('power-display');
        
        powerSlider.addEventListener('input', (e) => {
            gameState.shotPower = parseInt(e.target.value);
            powerDisplay.textContent = gameState.shotPower + '%';
            updateGameInfo();
        });

        document.getElementById('move-btn').addEventListener('click', () => {
            if (!gameState.myTurn) return;
            gameState.selectedAction = gameState.selectedAction === 'move' ? null : 'move';
            gameState.showTrajectory = false;
            updateButtonSelection();
        });

        document.getElementById('aim-btn').addEventListener('click', () => {
            if (!gameState.myTurn) return;
            gameState.selectedAction = gameState.selectedAction === 'aim' ? null : 'aim';
            gameState.showTrajectory = gameState.selectedAction === 'aim';
            updateButtonSelection();
        });

        document.getElementById('fire-btn').addEventListener('click', async () => {
            if (!gameState.myTurn || shotFired) return;
            
            const myTank = gameState.tanks[gameState.playerId];
            if (!myTank) return;

            shotFired = true;
            gameState.selectedAction = null;
            gameState.showTrajectory = false;
            updateButtonSelection();
            
            const baseVX = Math.cos(myTank.angle * Math.PI / 180) * gameState.shotPower / 5;
            const baseVY = -Math.sin(myTank.angle * Math.PI / 180) * gameState.shotPower / 5;

            if (gameState.selectedWeapon === 'normal') {
                gameState.projectiles.push({
                    x: myTank.x,
                    y: myTank.y - 20,
                    vx: baseVX,
                    vy: baseVY,
                    gravity: 0.3,
                    damage: 25,
                    type: 'normal'
                });
            } else if (gameState.selectedWeapon === 'heavy') {
                gameState.projectiles.push({
                    x: myTank.x,
                    y: myTank.y - 20,
                    vx: baseVX * 0.8,
                    vy: baseVY * 0.8,
                    gravity: 0.4,
                    damage: 40,
                    radius: 8,
                    type: 'heavy'
                });
            } else if (gameState.selectedWeapon === 'triple') {
                for (let i = -1; i <= 1; i++) {
                    const angle = (myTank.angle + i * 5) * Math.PI / 180;
                    gameState.projectiles.push({
                        x: myTank.x,
                        y: myTank.y - 20,
                        vx: Math.cos(angle) * gameState.shotPower / 5,
                        vy: -Math.sin(angle) * gameState.shotPower / 5,
                        gravity: 0.3,
                        damage: 15,
                        type: 'triple'
                    });
                }
            }

            document.querySelectorAll('.action-btn').forEach(btn => {
                btn.classList.remove('active');
                btn.style.pointerEvents = 'none';
            });
            
            setTimeout(() => {
                shotFired = false;
                endTurn();
                generateWind();
            }, 3500);
        });

        document.getElementById('end-turn-btn').addEventListener('click', () => {
            if (!gameState.myTurn) return;
            endTurn();
        });

        function updateButtonSelection() {
            document.querySelectorAll('.action-btn').forEach(btn => {
                btn.classList.remove('selected');
            });
            
            const powerSliderContainer = document.getElementById('power-slider-container');
            
            if (gameState.selectedAction === 'move') {
                document.getElementById('move-btn').classList.add('selected');
                powerSliderContainer.classList.remove('active');
            } else if (gameState.selectedAction === 'aim') {
                document.getElementById('aim-btn').classList.add('selected');
                powerSliderContainer.classList.add('active');
            } else {
                powerSliderContainer.classList.remove('active');
            }
        }

        let touchStartX = 0;
        let touchStartY = 0;
        let lastMoveX = 0;
        let moveDistance = 0;
        let shotFired = false;

        canvas.addEventListener('touchstart', (e) => {
            if (!gameState.myTurn || !gameState.selectedAction || shotFired) return;
            e.preventDefault();
            
            const touch = e.touches[0];
            const rect = canvas.getBoundingClientRect();
            touchStartX = (touch.clientX - rect.left) * (canvas.width / rect.width);
            touchStartY = (touch.clientY - rect.top) * (canvas.height / rect.height);
            lastMoveX = touchStartX;
            moveDistance = 0;
        });

        canvas.addEventListener('touchmove', (e) => {
            if (!gameState.myTurn || !gameState.selectedAction) return;
            e.preventDefault();
            
            const touch = e.touches[0];
            const rect = canvas.getBoundingClientRect();
            const x = (touch.clientX - rect.left) * (canvas.width / rect.width);
            const y = (touch.clientY - rect.top) * (canvas.height / rect.height);
            
            if (gameState.selectedAction === 'move' && gameState.movesLeft > 0) {
                const dx = x - lastMoveX;
                moveTank(dx);
                lastMoveX = x;
            } else if (gameState.selectedAction === 'aim') {
                const myTank = gameState.tanks[gameState.playerId];
                if (myTank) {
                    const dx = x - myTank.x;
                    const dy = y - (myTank.y - 20);
                    let angle = Math.atan2(-dy, dx) * 180 / Math.PI;
                    
                    angle = Math.max(0, Math.min(180, angle));
                    gameState.shotAngle = angle;
                    gameState.aimingAngle = angle;
                    
                    const myTankRef = gameState.tanks[gameState.playerId];
                    if (myTankRef) {
                        myTankRef.angle = angle;
                    }
                    
                    updateGameInfo();
                }
            }
        });

        canvas.addEventListener('touchend', async (e) => {
            if (!gameState.myTurn || !gameState.selectedAction) return;
            e.preventDefault();
            
            if (gameState.selectedAction === 'move') {
                const myTank = gameState.tanks[gameState.playerId];
                if (myTank && moveDistance > 0) {
                    await database.ref('games/' + gameState.gameId + '/players/' + gameState.playerId).update({
                        x: myTank.x,
                        y: myTank.y
                    });
                }
                moveDistance = 0;
            } else if (gameState.selectedAction === 'aim') {
                const myTank = gameState.tanks[gameState.playerId];
                if (myTank) {
                    await database.ref('games/' + gameState.gameId + '/players/' + gameState.playerId).update({
                        angle: gameState.shotAngle
                    });
                }
            }
        });

        function moveTank(dx) {
            const myTank = gameState.tanks[gameState.playerId];
            if (!myTank || gameState.movesLeft <= 0) return;
            
            const newX = Math.max(50, Math.min(canvas.width - 50, myTank.x + dx));
            const actualMove = Math.abs(newX - myTank.x);
            
            if (actualMove > 0) {
                moveDistance += actualMove;
                myTank.x = newX;
                myTank.y = getTerrainHeight(newX);
                
                if (moveDistance > 30) {
                    gameState.movesLeft = Math.max(0, gameState.movesLeft - 1);
                    moveDistance = 0;
                    updateGameInfo();
                }
            }
        }

        function getTerrainHeight(x) {
            const index = Math.floor(x / 20);
            if (index >= 0 && index < gameState.terrain.length) {
                return gameState.terrain[index].height;
            }
            return 350;
        }

        async function endTurn() {
            gameState.selectedAction = null;
            gameState.movesLeft = 3;
            updateButtonSelection();
            
            const players = Object.keys(gameState.tanks);
            const nextPlayer = players.find(id => id !== gameState.playerId);
            
            await database.ref('games/' + gameState.gameId).update({
                currentTurn: nextPlayer
            });
        }

        function checkProjectileCollision(projectile) {
            let hitEnemy = false;
            
            Object.entries(gameState.tanks).forEach(([id, tank]) => {
                if (id === gameState.playerId) return;
                
                const dist = Math.sqrt(
                    Math.pow(projectile.x - tank.x, 2) + 
                    Math.pow(projectile.y - tank.y, 2)
                );
                
                const hitRadius = projectile.radius || 5;
                const collisionDist = hitRadius + 20;
                
                if (dist < collisionDist) {
                    const baseDamage = projectile.damage || 25;
                    const damage = Math.floor(baseDamage * (1 + Math.random() * 0.3));
                    tank.health = Math.max(0, tank.health - damage);
                    
                    gameState.totalDamage += damage;
                    gameState.consecutiveHits++;
                    hitEnemy = true;
                    
                    database.ref('games/' + gameState.gameId + '/players/' + id).update({
                        health: tank.health
                    });
                    
                    showExplosion(projectile.x, projectile.y, projectile.type);
                    showHitMarker(projectile.x, projectile.y, damage);
                    
                    if (gameState.consecutiveHits >= 3) {
                        showComboMarker(projectile.x, projectile.y, gameState.consecutiveHits);
                    }
                    
                    projectile.dead = true;
                }
            });

            if (projectile.y >= getTerrainHeight(projectile.x)) {
                if (!hitEnemy) {
                    gameState.consecutiveHits = 0;
                    gameState.missedShots++;
                }
                showExplosion(projectile.x, projectile.y, projectile.type);
                projectile.dead = true;
            }
            
            updateGameInfo();
        }

        function showExplosion(x, y, type) {
            const explosion = document.createElement('div');
            explosion.className = 'explosion';
            
            if (type === 'heavy') {
                explosion.textContent = '💥💥💥';
                explosion.style.fontSize = '65px';
            } else if (type === 'triple') {
                explosion.textContent = '⚡💨';
                explosion.style.fontSize = '50px';
            } else {
                explosion.textContent = '💥';
            }
            
            explosion.style.left = (x / canvas.width * 100) + '%';
            explosion.style.top = (y / canvas.height * 100) + '%';
            document.getElementById('game-canvas-container').appendChild(explosion);
            
            setTimeout(() => explosion.remove(), 500);
        }

        function showHitMarker(x, y, damage) {
            const marker = document.createElement('div');
            marker.className = 'hit-marker';
            marker.textContent = '-' + damage;
            marker.style.left = (x / canvas.width * 100) + '%';
            marker.style.top = (y / canvas.height * 100) + '%';
            document.getElementById('game-canvas-container').appendChild(marker);
            
            setTimeout(() => marker.remove(), 800);
        }

        function showComboMarker(x, y, combo) {
            const marker = document.createElement('div');
            marker.className = 'hit-marker';
            marker.textContent = combo + 'x COMBO!';
            marker.style.color = '#f1c40f';
            marker.style.fontSize = '28px';
            marker.style.fontWeight = 'bold';
            marker.style.textShadow = '0 0 10px #f39c12';
            marker.style.left = (x / canvas.width * 100) + '%';
            marker.style.top = (y / canvas.height * 100) + '%';
            document.getElementById('game-canvas-container').appendChild(marker);
            
            setTimeout(() => marker.remove(), 1200);
        }

        function endGame(won) {
            setTimeout(() => {
                const container = document.getElementById('game-canvas-container');
                const victoryScreen = document.createElement('div');
                victoryScreen.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.95);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    z-index: 2000;
                    color: white;
                    padding: 20px;
                `;
                
                const accuracy = gameState.missedShots === 0 ? 100 : 
                    Math.round((gameState.consecutiveHits / (gameState.consecutiveHits + gameState.missedShots)) * 100);
                
                victoryScreen.innerHTML = `
                    <h1 style="font-size: 48px; color: ${won ? '#4caf50' : '#e74c3c'}; margin: 0 0 20px 0; text-shadow: 0 0 20px ${won ? '#4caf50' : '#e74c3c'};">
                        ${won ? '🎉 VICTORY! 🎉' : '💥 DEFEATED 💥'}
                    </h1>
                    <div style="background: rgba(255, 255, 255, 0.1); padding: 30px; border-radius: 15px; margin-bottom: 30px;">
                        <h2 style="margin: 0 0 20px 0; color: #ff6b35;">BATTLE STATS</h2>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; font-size: 18px;">
                            <div>Total Damage:</div><div style="color: #ff6b35; font-weight: bold;">${gameState.totalDamage}</div>
                            <div>Hit Streak:</div><div style="color: #f1c40f; font-weight: bold;">${gameState.consecutiveHits}x</div>
                            <div>Accuracy:</div><div style="color: #4caf50; font-weight: bold;">${accuracy}%</div>
                        </div>
                    </div>
                    <button id="play-again-btn" style="
                        padding: 18px 40px;
                        font-size: 20px;
                        font-weight: bold;
                        background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
                        border: none;
                        border-radius: 12px;
                        color: white;
                        cursor: pointer;
                        box-shadow: 0 4px 15px rgba(255, 107, 53, 0.4);
                    ">PLAY AGAIN</button>
                `;
                
                container.appendChild(victoryScreen);
                
                document.getElementById('play-again-btn').addEventListener('click', () => {
                    window.location.reload();
                });
            }, 1000);
        }

        function drawTerrain() {
            ctx.fillStyle = '#2d3e50';
            ctx.beginPath();
            ctx.moveTo(0, canvas.height);
            
            gameState.terrain.forEach(point => {
                ctx.lineTo(point.x, point.height);
            });
            
            ctx.lineTo(canvas.width, canvas.height);
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = '#34495e';
            ctx.lineWidth = 3;
            ctx.beginPath();
            gameState.terrain.forEach((point, i) => {
                if (i === 0) ctx.moveTo(point.x, point.height);
                else ctx.lineTo(point.x, point.height);
            });
            ctx.stroke();
        }

        function drawTank(tank, isMe) {
            const x = tank.x;
            const y = tank.y;
            
            ctx.fillStyle = isMe ? '#4a90e2' : '#e74c3c';
            ctx.fillRect(x - 20, y - 15, 40, 15);
            
            ctx.fillStyle = isMe ? '#357abd' : '#c0392b';
            ctx.fillRect(x - 15, y - 25, 30, 10);
            
            const barrelLength = 25;
            const angle = tank.angle * Math.PI / 180;
            ctx.strokeStyle = isMe ? '#2c5f8d' : '#a93226';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(x, y - 20);
            ctx.lineTo(
                x + Math.cos(angle) * barrelLength,
                y - 20 - Math.sin(angle) * barrelLength
            );
            ctx.stroke();

            ctx.fillStyle = '#fff';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(tank.health, x, y - 30);
            
            ctx.fillStyle = isMe ? '#4a90e2' : '#e74c3c';
            ctx.fillRect(x - 20, y - 35, 40, 4);
            ctx.fillStyle = '#4caf50';
            ctx.fillRect(x - 20, y - 35, 40 * (tank.health / 100), 4);
        }

        function drawProjectile(projectile) {
            const radius = projectile.radius || 5;
            
            if (projectile.type === 'heavy') {
                ctx.fillStyle = '#e74c3c';
                ctx.beginPath();
                ctx.arc(projectile.x, projectile.y, radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#c0392b';
                ctx.lineWidth = 3;
                ctx.stroke();
            } else if (projectile.type === 'triple') {
                ctx.fillStyle = '#f1c40f';
                ctx.beginPath();
                ctx.arc(projectile.x, projectile.y, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#f39c12';
                ctx.lineWidth = 2;
                ctx.stroke();
            } else {
                ctx.fillStyle = '#ff6b35';
                ctx.beginPath();
                ctx.arc(projectile.x, projectile.y, radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#f7931e';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
            
            ctx.shadowBlur = 10;
            ctx.shadowColor = ctx.fillStyle;
            ctx.shadowBlur = 0;
        }

        function updateProjectiles() {
            gameState.projectiles = gameState.projectiles.filter(p => !p.dead);
            
            gameState.projectiles.forEach(projectile => {
                projectile.vy += projectile.gravity;
                projectile.vx += gameState.windSpeed * gameState.windDirection * 0.02;
                projectile.x += projectile.vx;
                projectile.y += projectile.vy;
                
                checkProjectileCollision(projectile);
                
                if (projectile.x < 0 || projectile.x > canvas.width || projectile.y > canvas.height) {
                    projectile.dead = true;
                }
            });
        }

        function drawTrajectoryPreview() {
            if (!gameState.showTrajectory || !gameState.myTurn) return;
            
            const myTank = gameState.tanks[gameState.playerId];
            if (!myTank) return;
            
            ctx.strokeStyle = 'rgba(255, 107, 53, 0.5)';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            
            let x = myTank.x;
            let y = myTank.y - 20;
            let vx = Math.cos(myTank.angle * Math.PI / 180) * gameState.shotPower / 5;
            let vy = -Math.sin(myTank.angle * Math.PI / 180) * gameState.shotPower / 5;
            
            ctx.moveTo(x, y);
            
            for (let i = 0; i < 25; i++) {
                vy += 0.3;
                vx += gameState.windSpeed * gameState.windDirection * 0.02;
                x += vx;
                y += vy;
                
                if (i % 3 === 0) {
                    ctx.lineTo(x, y);
                }
                
                if (y >= getTerrainHeight(x) || x < 0 || x > canvas.width) break;
            }
            
            ctx.stroke();
            ctx.setLineDash([]);
        }

        function gameLoop() {
            if (gameState.mode !== 'game') return;
            
            ctx.fillStyle = '#1a2332';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            drawTerrain();
            
            Object.entries(gameState.tanks).forEach(([id, tank]) => {
                if (!tank.y || tank.y === 0) {
                    tank.y = getTerrainHeight(tank.x);
                }
                drawTank(tank, id === gameState.playerId);
            });
            
            drawTrajectoryPreview();
            
            updateProjectiles();
            gameState.projectiles.forEach(drawProjectile);
            
            requestAnimationFrame(gameLoop);
        }

        window.addEventListener('resize', () => {
            if (gameState.mode === 'game') {
                resizeCanvas();
            }
        });

        async function onConfigChange(newConfig) {
            config = { ...config, ...newConfig };
            
            const title = document.getElementById('main-title');
            if (title) {
                title.textContent = config.game_title || defaultConfig.game_title;
            }
            
            const nameInput = document.getElementById('player-name-input');
            if (nameInput && !nameInput.value) {
                nameInput.placeholder = config.player_name_label || defaultConfig.player_name_label;
            }
        }

        if (window.elementSdk) {
            window.elementSdk.init({
                defaultConfig: defaultConfig,
                onConfigChange: onConfigChange,
                mapToCapabilities: (config) => ({
                    recolorables: [],
                    borderables: [],
                    fontEditable: undefined,
                    fontSizeable: undefined
                }),
                mapToEditPanelValues: (config) => new Map([
                    ["game_title", config.game_title || defaultConfig.game_title],
                    ["player_name_label", config.player_name_label || defaultConfig.player_name_label]
                ])
            });
        }
