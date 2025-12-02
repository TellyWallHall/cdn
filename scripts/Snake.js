
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        const minimap = document.getElementById('minimap');
        const minimapCtx = minimap.getContext('2d');
        const startScreen = document.getElementById('startScreen');
        const gameOverScreen = document.getElementById('gameOverScreen');
        const nameInput = document.getElementById('nameInput');
        const startButton = document.getElementById('startButton');
        const respawnButton = document.getElementById('respawnButton');
        const scoreDisplay = document.getElementById('score');
        const finalScore = document.getElementById('finalScore');
        const leaderboardList = document.getElementById('leaderboardList');
        const killFeedEl = document.getElementById('killFeed');
        
        minimap.width = 100;
        minimap.height = 100;

        let gameStarted = false;
        let playerId = null;
        let playerName = '';
        let players = {};
        let food = {};
        let mySnake = null;
        let myBotIds = [];
        let adoptedBotIds = [];
        let targetAngle = 0;
        let currentAngle = 0;
        let killMessages = [];

        const CANVAS_WIDTH = 800;
        const CANVAS_HEIGHT = 800;
        const SNAKE_RADIUS = 8;
        const FOOD_RADIUS = 5;
        const BASE_SPEED = 2;
        const BOOST_SPEED = 4;
        const BOT_SPEED = 1.5;
        const TURN_SMOOTHING = 0.15;
        const BOT_TURN_SMOOTHING = 0.05;
        const BOOST_COST = 0.3;
        const MIN_SPEED_MULTIPLIER = 0.6;
        const MAX_RADIUS_MULTIPLIER = 2.0;
        const BOT_NAMES = ['Alex', 'Jordan', 'Casey', 'Sam', 'Taylor', 'Morgan', 'Riley', 'Avery', 'Quinn', 'Blake', 'Rowan', 'Sawyer', 'Cameron', 'Parker', 'Skyler', 'Drew', 'Jamie', 'Jesse', 'Reese', 'Hayden', 'Peyton', 'Sage', 'Logan', 'Emerson'];
        let joystickActive = false;
        let joystickAngle = 0;
        let boosting = false;

        function addKillMessage(killerName, victimName) {
            const message = document.createElement('div');
            message.className = 'kill-message';
            message.innerHTML = `💀 <strong>${killerName}</strong> killed ${victimName}`;
            killFeedEl.appendChild(message);
            
            killMessages.push(message);
            if (killMessages.length > 5) {
                const oldMessage = killMessages.shift();
                oldMessage.classList.add('fade-out');
                setTimeout(() => oldMessage.remove(), 500);
            }
            
            setTimeout(() => {
                if (message.parentNode) {
                    message.classList.add('fade-out');
                    setTimeout(() => {
                        if (message.parentNode) {
                            message.remove();
                        }
                        const index = killMessages.indexOf(message);
                        if (index > -1) killMessages.splice(index, 1);
                    }, 500);
                }
            }, 5000);
        }

        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        function generatePlayerId() {
            return 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }

        function generateBotId() {
            return 'bot_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }

        function randomColor() {
            const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];
            return colors[Math.floor(Math.random() * colors.length)];
        }

        function createSnake(id, name, x, y, isBot = false, ownerId = null) {
            const angle = Math.random() * Math.PI * 2;
            return {
                id: id,
                name: name,
                x: x,
                y: y,
                angle: angle,
                segments: [{x: x, y: y}],
                length: 5,
                color: randomColor(),
                score: 0,
                isBot: isBot,
                ownerId: ownerId,
                targetAngle: angle,
                boostCooldown: 0,
                lastUpdate: Date.now()
            };
        }

        function initializeFood() {
            for (let i = 0; i < 40; i++) {
                const foodId = 'food_' + i;
                food[foodId] = {
                    x: Math.random() * CANVAS_WIDTH,
                    y: Math.random() * CANVAS_HEIGHT,
                    color: randomColor()
                };
            }
            
            database.ref('food').set(food);
        }

        function spawnSnake(isRespawn = false) {
            if (isRespawn) {
                playerId = generatePlayerId();
            }
            
            const startX = Math.random() * (CANVAS_WIDTH - 200) + 100;
            const startY = Math.random() * (CANVAS_HEIGHT - 200) + 100;
            
            mySnake = createSnake(playerId, playerName, startX, startY, false, null);
            currentAngle = mySnake.angle;
            targetAngle = mySnake.angle;
            
            database.ref('players/' + playerId).set(mySnake);
            database.ref('players/' + playerId).onDisconnect().remove();
        }

        function checkForOrphanedBots() {
            for (const id in players) {
                const bot = players[id];
                if (bot && bot.isBot && bot.ownerId && !players[bot.ownerId] && !adoptedBotIds.includes(id) && !myBotIds.includes(id)) {
                    adoptedBotIds.push(id);
                    database.ref('players/' + id + '/ownerId').set(playerId);
                }
            }
        }

        function startGame() {
            playerName = nameInput.value.trim() || 'Player';
            playerId = generatePlayerId();
            
            spawnSnake(false);
            
            for (let i = 0; i < 4; i++) {
                const botId = generateBotId();
                myBotIds.push(botId);
                const botX = Math.random() * (CANVAS_WIDTH - 200) + 100;
                const botY = Math.random() * (CANVAS_HEIGHT - 200) + 100;
                const botName = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
                const botSnake = createSnake(botId, botName, botX, botY, true, playerId);
                
                database.ref('players/' + botId).set(botSnake);
                database.ref('players/' + botId).onDisconnect().remove();
            }
            
            startScreen.classList.add('hidden');
            gameStarted = true;
            
            database.ref('players').on('value', (snapshot) => {
                players = snapshot.val() || {};
                updateLeaderboard();
                checkForOrphanedBots();
            });
            
            database.ref('food').on('value', (snapshot) => {
                food = snapshot.val() || {};
            });
            
            gameLoop();
        }

        startButton.addEventListener('click', () => {
            if (!gameStarted) {
                initializeFood();
                startGame();
            }
        });

        respawnButton.addEventListener('click', () => {
            gameOverScreen.classList.add('hidden');
            spawnSnake(true);
        });

        nameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !gameStarted) {
                initializeFood();
                startGame();
            }
        });

        const joystick = document.getElementById('joystick');
        const joystickKnob = document.getElementById('joystickKnob');
        const boostButton = document.getElementById('boostButton');

        function handleJoystickStart(e) {
            e.preventDefault();
            joystickActive = true;
            updateJoystick(e);
        }

        function handleJoystickMove(e) {
            if (joystickActive) {
                e.preventDefault();
                updateJoystick(e);
            }
        }

        function handleJoystickEnd(e) {
            e.preventDefault();
            joystickActive = false;
            joystickKnob.style.transform = 'translate(-50%, -50%)';
        }

        function updateJoystick(e) {
            const rect = joystick.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            let clientX, clientY;
            if (e.touches && e.touches.length > 0) {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            } else {
                clientX = e.clientX;
                clientY = e.clientY;
            }
            
            const deltaX = clientX - centerX;
            const deltaY = clientY - centerY;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            const maxDistance = 35;
            
            const limitedDistance = Math.min(distance, maxDistance);
            joystickAngle = Math.atan2(deltaY, deltaX);
            
            const knobX = Math.cos(joystickAngle) * limitedDistance;
            const knobY = Math.sin(joystickAngle) * limitedDistance;
            
            joystickKnob.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;
        }

        joystick.addEventListener('touchstart', handleJoystickStart);
        joystick.addEventListener('touchmove', handleJoystickMove);
        joystick.addEventListener('touchend', handleJoystickEnd);
        joystick.addEventListener('mousedown', handleJoystickStart);
        document.addEventListener('mousemove', handleJoystickMove);
        document.addEventListener('mouseup', handleJoystickEnd);

        boostButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            boosting = true;
        });

        boostButton.addEventListener('touchend', (e) => {
            e.preventDefault();
            boosting = false;
        });

        boostButton.addEventListener('mousedown', () => {
            boosting = true;
        });

        boostButton.addEventListener('mouseup', () => {
            boosting = false;
        });

        function getSpeedMultiplier(length) {
            const sizeFactor = Math.min(length / 100, 1);
            return 1 - (sizeFactor * (1 - MIN_SPEED_MULTIPLIER));
        }

        function getRadiusMultiplier(length) {
            const sizeFactor = Math.min(length / 100, 1);
            return 1 + (sizeFactor * (MAX_RADIUS_MULTIPLIER - 1));
        }

        function updateBotMovement(bot) {
            let nearestFood = null;
            let minFoodDist = Infinity;
            
            for (const foodId in food) {
                const f = food[foodId];
                const dist = Math.hypot(f.x - bot.x, f.y - bot.y);
                if (dist < minFoodDist) {
                    minFoodDist = dist;
                    nearestFood = f;
                }
            }
            
            let immediateDanger = false;
            let dangerAngle = null;
            
            for (const id in players) {
                const other = players[id];
                if (!other || !other.segments || other.id === bot.id) continue;
                
                for (let i = 5; i < other.segments.length; i++) {
                    const seg = other.segments[i];
                    const dist = Math.hypot(seg.x - bot.x, seg.y - bot.y);
                    if (dist < 10) {
                        immediateDanger = true;
                        dangerAngle = Math.atan2(seg.y - bot.y, seg.x - bot.x);
                        break;
                    }
                }
                if (immediateDanger) break;
            }
            
            if (immediateDanger && dangerAngle !== null) {
                const avoidAngle = dangerAngle + Math.PI;
                let angleDiff = avoidAngle - bot.angle;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                bot.angle += angleDiff * 0.15;
            } else if (nearestFood) {
                let targetAngle = Math.atan2(nearestFood.y - bot.y, nearestFood.x - bot.x);
                
                if (Math.random() < 0.1) {
                    targetAngle += (Math.random() - 0.5) * 0.5;
                }
                
                bot.targetAngle = targetAngle;
                
                let angleDiff = bot.targetAngle - bot.angle;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                bot.angle += angleDiff * BOT_TURN_SMOOTHING;
            }
            
            const speedMultiplier = getSpeedMultiplier(bot.length);
            let speed = BOT_SPEED * speedMultiplier;
            
            if (bot.boostCooldown > 0) {
                bot.boostCooldown--;
                if (bot.length > 10) {
                    speed = BOT_SPEED * 1.6 * speedMultiplier;
                    bot.length -= BOOST_COST * 0.5;
                }
            } else if (nearestFood && minFoodDist < 80 && minFoodDist > 30 && bot.length > 20 && Math.random() < 0.03) {
                bot.boostCooldown = 20;
            }
            
            bot.x += Math.cos(bot.angle) * speed;
            bot.y += Math.sin(bot.angle) * speed;
            
            if (bot.x < 0) bot.x = CANVAS_WIDTH;
            if (bot.x > CANVAS_WIDTH) bot.x = 0;
            if (bot.y < 0) bot.y = CANVAS_HEIGHT;
            if (bot.y > CANVAS_HEIGHT) bot.y = 0;
        }

        function checkCollision(snake) {
            for (const id in players) {
                const other = players[id];
                if (!other || !other.segments || other.id === snake.id) continue;
                
                const otherRadius = SNAKE_RADIUS * getRadiusMultiplier(other.length);
                const snakeRadius = SNAKE_RADIUS * getRadiusMultiplier(snake.length);
                
                for (let i = 1; i < other.segments.length; i++) {
                    const seg = other.segments[i];
                    const dist = Math.hypot(seg.x - snake.x, seg.y - snake.y);
                    if (dist < (snakeRadius + otherRadius) * 0.8) {
                        return other;
                    }
                }
            }
            return null;
        }

        function handleDeath(killer = null) {
            if (!mySnake) return;
            
            if (killer) {
                addKillMessage(killer.name, mySnake.name);
            }
            
            const orbCount = Math.floor(mySnake.length * 0.7);
            for (let i = 0; i < orbCount; i++) {
                const angle = (Math.PI * 2 * i) / orbCount;
                const distance = Math.random() * 50 + 30;
                const foodId = 'death_' + Date.now() + '_' + i;
                
                database.ref('food/' + foodId).set({
                    x: mySnake.x + Math.cos(angle) * distance,
                    y: mySnake.y + Math.sin(angle) * distance,
                    color: mySnake.color
                });
            }
            
            finalScore.textContent = `Final Score: ${mySnake.score}`;
            gameOverScreen.classList.remove('hidden');
            
            database.ref('players/' + playerId).remove();
            mySnake = null;
        }

        function gameLoop() {
            if (!gameStarted || !mySnake) return;
            
            if (joystickActive) {
                targetAngle = joystickAngle;
            }
            
            let angleDiff = targetAngle - currentAngle;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            
            currentAngle += angleDiff * TURN_SMOOTHING;
            
            const speedMultiplier = getSpeedMultiplier(mySnake.length);
            let speed = BASE_SPEED * speedMultiplier;
            
            if (boosting && mySnake.length > 10) {
                speed = BOOST_SPEED * speedMultiplier;
                mySnake.length -= BOOST_COST;
                mySnake.score = Math.max(0, mySnake.score - 2);
            }
            
            mySnake.x += Math.cos(currentAngle) * speed;
            mySnake.y += Math.sin(currentAngle) * speed;
            mySnake.angle = currentAngle;
            
            if (mySnake.x < 0) mySnake.x = CANVAS_WIDTH;
            if (mySnake.x > CANVAS_WIDTH) mySnake.x = 0;
            if (mySnake.y < 0) mySnake.y = CANVAS_HEIGHT;
            if (mySnake.y > CANVAS_HEIGHT) mySnake.y = 0;
            
            mySnake.segments.unshift({x: mySnake.x, y: mySnake.y});
            while (mySnake.segments.length > mySnake.length) {
                mySnake.segments.pop();
            }
            
            const killer = checkCollision(mySnake);
            if (killer) {
                handleDeath(killer);
                return;
            }
            
            for (const foodId in food) {
                const f = food[foodId];
                const myRadius = SNAKE_RADIUS * getRadiusMultiplier(mySnake.length);
                const dist = Math.hypot(f.x - mySnake.x, f.y - mySnake.y);
                if (dist < myRadius + FOOD_RADIUS) {
                    mySnake.length += 2;
                    mySnake.score += 10;
                    
                    const newFood = {
                        x: Math.random() * CANVAS_WIDTH,
                        y: Math.random() * CANVAS_HEIGHT,
                        color: randomColor()
                    };
                    database.ref('food/' + foodId).set(newFood);
                }
            }
            
            mySnake.lastUpdate = Date.now();
            database.ref('players/' + playerId).set(mySnake);
            
            const allMyBots = [...myBotIds, ...adoptedBotIds];
            for (const botId of allMyBots) {
                if (players[botId]) {
                    const bot = players[botId];
                    updateBotMovement(bot);
                    
                    bot.segments.unshift({x: bot.x, y: bot.y});
                    while (bot.segments.length > bot.length) {
                        bot.segments.pop();
                    }
                    
                    const botKiller = checkCollision(bot);
                    if (botKiller) {
                        addKillMessage(botKiller.name, bot.name);
                        
                        const orbCount = Math.floor(bot.length * 0.7);
                        for (let i = 0; i < orbCount; i++) {
                            const angle = (Math.PI * 2 * i) / orbCount;
                            const distance = Math.random() * 50 + 30;
                            const foodId = 'botdeath_' + Date.now() + '_' + i + '_' + botId;
                            
                            database.ref('food/' + foodId).set({
                                x: bot.x + Math.cos(angle) * distance,
                                y: bot.y + Math.sin(angle) * distance,
                                color: bot.color
                            });
                        }
                        
                        database.ref('players/' + botId).remove();
                        
                        const myBotIndex = myBotIds.indexOf(botId);
                        if (myBotIndex > -1) {
                            myBotIds.splice(myBotIndex, 1);
                        }
                        
                        const adoptedIndex = adoptedBotIds.indexOf(botId);
                        if (adoptedIndex > -1) {
                            adoptedBotIds.splice(adoptedIndex, 1);
                        }
                        
                        continue;
                    }
                    
                    for (const foodId in food) {
                        const f = food[foodId];
                        const botRadius = SNAKE_RADIUS * getRadiusMultiplier(bot.length);
                        const dist = Math.hypot(f.x - bot.x, f.y - bot.y);
                        if (dist < botRadius + FOOD_RADIUS) {
                            bot.length += 2;
                            bot.score += 10;
                            
                            const newFood = {
                                x: Math.random() * CANVAS_WIDTH,
                                y: Math.random() * CANVAS_HEIGHT,
                                color: randomColor()
                            };
                            database.ref('food/' + foodId).set(newFood);
                        }
                    }
                    
                    bot.lastUpdate = Date.now();
                    database.ref('players/' + botId).set(bot);
                }
            }
            
            render();
            scoreDisplay.textContent = `Score: ${mySnake.score}`;
            
            requestAnimationFrame(gameLoop);
        }

        function render() {
            ctx.fillStyle = '#0a0a15';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            if (!mySnake) return;
            
            const cameraX = mySnake.x - canvas.width / 2;
            const cameraY = mySnake.y - canvas.height / 2;
            
            ctx.save();
            ctx.translate(-cameraX, -cameraY);
            
            const viewPadding = 100;
            for (const foodId in food) {
                const f = food[foodId];
                if (f.x >= cameraX - viewPadding && f.x <= cameraX + canvas.width + viewPadding &&
                    f.y >= cameraY - viewPadding && f.y <= cameraY + canvas.height + viewPadding) {
                    ctx.fillStyle = f.color;
                    ctx.beginPath();
                    ctx.arc(f.x, f.y, FOOD_RADIUS, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            
            for (const id in players) {
                const snake = players[id];
                if (!snake || !snake.segments) continue;
                
                const radiusMultiplier = getRadiusMultiplier(snake.length);
                
                ctx.fillStyle = snake.color;
                
                for (let i = 0; i < snake.segments.length; i++) {
                    const seg = snake.segments[i];
                    const baseRadius = SNAKE_RADIUS * radiusMultiplier;
                    const radius = baseRadius * (1 - i / snake.segments.length * 0.3);
                    ctx.beginPath();
                    ctx.arc(seg.x, seg.y, radius, 0, Math.PI * 2);
                    ctx.fill();
                }
                
                if (snake.segments.length > 0) {
                    const head = snake.segments[0];
                    ctx.fillStyle = 'white';
                    ctx.font = 'bold 14px Arial';
                    ctx.textAlign = 'center';
                    ctx.strokeStyle = 'black';
                    ctx.lineWidth = 3;
                    ctx.strokeText(snake.name, head.x, head.y - 15 - (radiusMultiplier * 5));
                    ctx.fillText(snake.name, head.x, head.y - 15 - (radiusMultiplier * 5));
                }
            }
            
            ctx.restore();
            
            renderMinimap();
        }
        
        function renderMinimap() {
            const scale = minimap.width / CANVAS_WIDTH;
            
            minimapCtx.fillStyle = '#0a0a15';
            minimapCtx.fillRect(0, 0, minimap.width, minimap.height);
            
            for (const id in players) {
                const snake = players[id];
                if (!snake || !snake.segments) continue;
                
                minimapCtx.fillStyle = snake.color;
                minimapCtx.globalAlpha = snake.id === mySnake.id ? 1.0 : 0.7;
                
                const x = snake.x * scale;
                const y = snake.y * scale;
                const size = snake.id === mySnake.id ? 5 : 3;
                
                minimapCtx.beginPath();
                minimapCtx.arc(x, y, size, 0, Math.PI * 2);
                minimapCtx.fill();
            }
            
            minimapCtx.globalAlpha = 1.0;
        }

        function updateLeaderboard() {
            const sortedPlayers = Object.values(players).sort((a, b) => b.score - a.score).slice(0, 5);
            
            leaderboardList.innerHTML = sortedPlayers.map((p, i) => 
                `<div class="leaderboard-item">${i + 1}. ${p.name}: ${p.score}</div>`
            ).join('');
        }
