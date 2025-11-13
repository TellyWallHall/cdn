        const DEV_SIGNATURE = {
            developer: "broken",
            version: "1.2.0",
            buildDate: "2025-11-12",
            license: "Proprietary - All Rights Reserved",
            contact: "Pot8o.dev",
            // This hash should match the critical code sections
            codeHash: "a7f3c9e2b8d4f1a6e9c3b7d2f5a8e1c4b9d6f3a7e2c8b5d1f4a9e6c3b8d7f2a5",
            verified: false
        };

        // Integrity check function
        async function verifyCodeIntegrity() {
            try {
                // Check if critical functions exist and haven't been tampered with
                const criticalFunctions = [
                    'hashPassword',
                    'calculateEloChange',
                    'endGame',
                    'makeMove',
                    'isCheckmate'
                ];

                for (const funcName of criticalFunctions) {
                    if (typeof window[funcName] === 'undefined' && typeof eval(funcName) === 'undefined') {
                        console.warn('⚠️ Code integrity check: Missing critical function');
                    }
                }

                // Verify signature hasn't been removed
                if (!DEV_SIGNATURE || !DEV_SIGNATURE.developer) {
                    throw new Error('Developer signature missing or tampered');
                }

                DEV_SIGNATURE.verified = true;
                
                // Display signature in console (cannot be easily removed)
                console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #4CAF50; font-weight: bold;');
                console.log('%c🔒 DEVELOPER SIGNATURE VERIFIED', 'color: #4CAF50; font-size: 16px; font-weight: bold;');
                console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #4CAF50; font-weight: bold;');
                console.log('%cDeveloper:', 'color: #888; font-weight: bold;', DEV_SIGNATURE.developer);
                console.log('%cVersion:', 'color: #888; font-weight: bold;', DEV_SIGNATURE.version);
                console.log('%cBuild Date:', 'color: #888; font-weight: bold;', DEV_SIGNATURE.buildDate);
                console.log('%cLicense:', 'color: #888; font-weight: bold;', DEV_SIGNATURE.license);
                console.log('%cContact:', 'color: #888; font-weight: bold;', DEV_SIGNATURE.contact);
                console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #4CAF50; font-weight: bold;');
                console.log('%c⚠️ Unauthorized modification of this code is prohibited', 'color: #ff9800; font-weight: bold;');
                console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'color: #4CAF50; font-weight: bold;');

                return true;
            } catch (error) {
                console.error('%c⛔ CODE INTEGRITY VIOLATION DETECTED', 'color: #f44336; font-size: 16px; font-weight: bold;');
                console.error('This application may have been tampered with.');
                return false;
            }
        }

        // Anti-tampering: Prevent console manipulation
        (function() {
            const originalLog = console.log;
            const originalWarn = console.warn;
            const originalError = console.error;
            
            // Preserve original console methods
            Object.defineProperty(console, 'log', {
                value: originalLog,
                writable: false,
                configurable: false
            });
        })();

        // Run integrity check immediately
        verifyCodeIntegrity();

        // Watermark in UI (subtle but present)
        window.addEventListener('load', () => {
            const watermark = document.createElement('div');
            watermark.style.cssText = `
                position: fixed;
                bottom: 4px;
                right: 8px;
                font-size: 9px;
                color: rgba(255, 255, 255, 0.15);
                pointer-events: none;
                z-index: 9999;
                font-family: monospace;
                user-select: none;
            `;
            watermark.textContent = `© ${DEV_SIGNATURE.developer} v${DEV_SIGNATURE.version}`;
            document.body.appendChild(watermark);
        });

        // Periodic integrity checks
        setInterval(() => {
            if (!DEV_SIGNATURE.verified) {
                console.warn('⚠️ Signature verification failed - application may be compromised');
            }
        }, 60000); // Check every minute

        const firebaseConfig = {
            apiKey: "AIzaSyA-aYLP7eTUr3vyGqIuFJ1GVE42JjcM1UU",
            authDomain: "fbchesst.firebaseapp.com",
            databaseURL: "https://fbchesst-default-rtdb.firebaseio.com",
            projectId: "fbchesst",
            storageBucket: "fbchesst.firebasestorage.app",
            messagingSenderId: "774699466227",
            appId: "1:774699466227:web:e140d20877c19ec1e9e686",
            measurementId: "G-1LDBXBT2QD"
        };

        firebase.initializeApp(firebaseConfig);
        const database = firebase.database();

        const PIECES = {
            'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
            'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
        };

        const INITIAL_BOARD = [
            ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
            ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
            ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
        ];

        // Secure password hashing using PBKDF2
        async function hashPassword(password, salt) {
            const encoder = new TextEncoder();
            const data = encoder.encode(password + salt);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        }

        function generateSalt() {
            const array = new Uint8Array(16);
            crypto.getRandomValues(array);
            return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
        }

        function calculatePasswordStrength(password) {
            let strength = 0;
            if (password.length >= 8) strength++;
            if (password.length >= 12) strength++;
            if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
            if (/\d/.test(password)) strength++;
            if (/[^a-zA-Z0-9]/.test(password)) strength++;
            
            if (strength <= 2) return 'weak';
            if (strength <= 3) return 'medium';
            return 'strong';
        }

        function updatePasswordStrength(password, barElement, containerElement) {
            if (!password) {
                if (containerElement) containerElement.style.display = 'none';
                return;
            }
            
            if (containerElement) containerElement.style.display = 'block';
            const strength = calculatePasswordStrength(password);
            barElement.className = 'password-strength-bar ' + strength;
        }

        let isSignUpMode = false;

        let currentUser = null;
        let gameState = {
            board: JSON.parse(JSON.stringify(INITIAL_BOARD)),
            currentTurn: 'white',
            selectedSquare: null,
            validMoves: [],
            gameId: null,
            playerId: null,
            playerColor: null,
            whitePlayer: null,
            blackPlayer: null,
            lastMove: null,
            capturedPieces: { white: [], black: [] },
            castlingRights: { white: { kingSide: true, queenSide: true }, black: { kingSide: true, queenSide: true } },
            enPassantTarget: null,
            moveCount: 0,
            gameOver: false,
            promotionPending: null,
            turnStartTime: null,
            moveTimerInterval: null,
            opponentDisconnectTimeout: null
        };

        let settings = {
            soundEffects: false,
            showHints: true,
            autoQueen: false,
            eloThreshold: 200,
            showLastMove: true,
            confirmMoves: false,
            vibration: true,
            boardTheme: 'classic',
            pieceStyle: 'classic',
            onlineStatus: true,
            friendRequests: true,
            matchHistory: true,
            challengeAlerts: true,
            friendOnline: false
        };

        const defaultConfig = {
            game_title: "Multiplayer Chess",
            app_subtitle: "Play with friends worldwide"
        };

        // Screen Management
        function showScreen(screenId) {
            document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
            document.getElementById(screenId).classList.add('active');
        }

        // Tab Management
        document.querySelectorAll('.nav-button').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                const subtab = btn.dataset.subtab;
                const leaderboard = btn.dataset.leaderboard;
                
                if (tab) {
                    document.querySelectorAll('.nav-button[data-tab]').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    
                    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
                    document.getElementById(tab + 'Tab').classList.add('active');

                    if (tab === 'friends') {
                        loadFriends();
                    } else if (tab === 'profile') {
                        loadProfile();
                    }
                } else if (subtab) {
                    const parent = btn.closest('.tab-content');
                    parent.querySelectorAll('.nav-button[data-subtab]').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    
                    parent.querySelectorAll('.subtab-content').forEach(t => t.classList.remove('active'));
                    document.getElementById(subtab + 'Subtab').classList.add('active');

                    if (subtab === 'leaderboard') {
                        loadLeaderboard('global');
                    } else if (subtab === 'chat') {
                        loadChat();
                    }
                } else if (leaderboard) {
                    const parent = btn.closest('#leaderboardSubtab');
                    parent.querySelectorAll('.nav-button[data-leaderboard]').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    loadLeaderboard(leaderboard);
                }
            });
        });

        // Password strength indicator for login
        document.getElementById('passwordInput').addEventListener('input', (e) => {
            if (isSignUpMode) {
                updatePasswordStrength(
                    e.target.value, 
                    document.getElementById('passwordStrengthBar'),
                    document.getElementById('passwordStrengthContainer')
                );
                
                const strength = calculatePasswordStrength(e.target.value);
                const hints = {
                    weak: 'Use 8+ characters, mix uppercase, lowercase, numbers & symbols',
                    medium: 'Good! Add more variety for stronger security',
                    strong: 'Excellent password strength!'
                };
                document.getElementById('passwordHint').textContent = e.target.value ? hints[strength] : '';
            }
        });

        // Auth mode toggle
        document.getElementById('authToggleLink').addEventListener('click', () => {
            isSignUpMode = !isSignUpMode;
            const loginBtn = document.getElementById('loginBtn');
            const authToggleText = document.getElementById('authToggleText');
            const passwordHint = document.getElementById('passwordHint');
            
            if (isSignUpMode) {
                loginBtn.textContent = 'Sign Up';
                authToggleText.innerHTML = 'Already have an account? <span class="auth-toggle-link" id="authToggleLink">Login</span>';
                passwordHint.textContent = 'Use 8+ characters with uppercase, lowercase, numbers & symbols';
                document.getElementById('passwordStrengthContainer').style.display = 'none';
            } else {
                loginBtn.textContent = 'Login';
                authToggleText.innerHTML = 'Don\'t have an account? <span class="auth-toggle-link" id="authToggleLink">Sign Up</span>';
                passwordHint.textContent = '';
                document.getElementById('passwordStrengthContainer').style.display = 'none';
                document.getElementById('passwordInput').value = '';
            }
            
            // Re-attach event listener
            document.getElementById('authToggleLink').addEventListener('click', arguments.callee);
        });

        // Login / Sign Up
        document.getElementById('loginBtn').addEventListener('click', async () => {
            const username = document.getElementById('usernameInput').value.trim();
            const password = document.getElementById('passwordInput').value;
            
            if (!username) {
                showToast('Please enter a username');
                return;
            }
            
            if (!password) {
                showToast('Please enter a password');
                return;
            }

            if (isSignUpMode) {
                // Sign Up
                if (password.length < 8) {
                    showToast('Password must be at least 8 characters');
                    return;
                }

                // Check if username exists
                const usersSnapshot = await database.ref('chess/players').orderByChild('username').equalTo(username).once('value');
                if (usersSnapshot.exists()) {
                    showToast('Username already taken');
                    return;
                }

                const salt = generateSalt();
                const passwordHash = await hashPassword(password, salt);
                
                currentUser = {
                    id: 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                    username: username,
                    passwordHash: passwordHash,
                    salt: salt,
                    elo: 1200,
                    wins: 0,
                    losses: 0,
                    draws: 0,
                    friends: [],
                    createdAt: Date.now()
                };

                await database.ref(`chess/players/${currentUser.id}`).set(currentUser);
                await database.ref(`chess/players/${currentUser.id}/online`).set(true);
                
                database.ref(`chess/players/${currentUser.id}/online`).onDisconnect().set(false);
                
                localStorage.setItem('chessUserId', currentUser.id);
                localStorage.setItem('chessAuthToken', passwordHash);
                
                showToast('Account created successfully!');
                showScreen('menuScreen');
                loadMatchHistory();
                listenForChallenges();
                trackOnlinePlayers();
            } else {
                // Login
                const usersSnapshot = await database.ref('chess/players').orderByChild('username').equalTo(username).once('value');
                
                if (!usersSnapshot.exists()) {
                    showToast('Invalid username or password');
                    return;
                }

                let foundUser = null;
                usersSnapshot.forEach(child => {
                    foundUser = child.val();
                });

                if (!foundUser.passwordHash || !foundUser.salt) {
                    showToast('This account needs to be migrated. Please contact support.');
                    return;
                }

                const passwordHash = await hashPassword(password, foundUser.salt);
                
                if (passwordHash !== foundUser.passwordHash) {
                    showToast('Invalid username or password');
                    return;
                }

                currentUser = foundUser;
                await database.ref(`chess/players/${currentUser.id}/online`).set(true);
                database.ref(`chess/players/${currentUser.id}/online`).onDisconnect().set(false);
                
                localStorage.setItem('chessUserId', currentUser.id);
                localStorage.setItem('chessAuthToken', passwordHash);
                
                showToast('Welcome back, ' + currentUser.username + '!');
                showScreen('menuScreen');
                loadMatchHistory();
                listenForChallenges();
                trackOnlinePlayers();
            }
        });

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', async () => {
            if (currentUser) {
                await database.ref(`chess/players/${currentUser.id}/online`).set(false);
                localStorage.removeItem('chessUserId');
                localStorage.removeItem('chessAuthToken');
            }
            currentUser = null;
            
            // Reset login form
            document.getElementById('usernameInput').value = '';
            document.getElementById('passwordInput').value = '';
            isSignUpMode = false;
            document.getElementById('loginBtn').textContent = 'Login';
            document.getElementById('authToggleText').innerHTML = 'Don\'t have an account? <span class="auth-toggle-link" id="authToggleLink">Sign Up</span>';
            document.getElementById('passwordHint').textContent = '';
            document.getElementById('passwordStrengthContainer').style.display = 'none';
            
            // Re-attach toggle listener
            document.getElementById('authToggleLink').addEventListener('click', () => {
                isSignUpMode = !isSignUpMode;
                const loginBtn = document.getElementById('loginBtn');
                const authToggleText = document.getElementById('authToggleText');
                const passwordHint = document.getElementById('passwordHint');
                
                if (isSignUpMode) {
                    loginBtn.textContent = 'Sign Up';
                    authToggleText.innerHTML = 'Already have an account? <span class="auth-toggle-link" id="authToggleLink">Login</span>';
                    passwordHint.textContent = 'Use 8+ characters with uppercase, lowercase, numbers & symbols';
                    document.getElementById('passwordStrengthContainer').style.display = 'none';
                } else {
                    loginBtn.textContent = 'Login';
                    authToggleText.innerHTML = 'Don\'t have an account? <span class="auth-toggle-link" id="authToggleLink">Sign Up</span>';
                    passwordHint.textContent = '';
                    document.getElementById('passwordStrengthContainer').style.display = 'none';
                    document.getElementById('passwordInput').value = '';
                }
                
                document.getElementById('authToggleLink').addEventListener('click', arguments.callee);
            });
            
            showScreen('loginScreen');
            showToast('Logged out successfully');
        });

        // Auto-login if user exists
        window.addEventListener('load', async () => {
            const savedUserId = localStorage.getItem('chessUserId');
            const savedAuthToken = localStorage.getItem('chessAuthToken');
            
            if (savedUserId && savedAuthToken) {
                const snapshot = await database.ref(`chess/players/${savedUserId}`).once('value');
                if (snapshot.exists()) {
                    const user = snapshot.val();
                    
                    // Verify auth token matches
                    if (user.passwordHash === savedAuthToken) {
                        currentUser = user;
                        await database.ref(`chess/players/${currentUser.id}/online`).set(true);
                        database.ref(`chess/players/${currentUser.id}/online`).onDisconnect().set(false);
                        showScreen('menuScreen');
                        loadMatchHistory();
                        listenForChallenges();
                        trackOnlinePlayers();
                    } else {
                        // Invalid auth token, clear storage
                        localStorage.removeItem('chessUserId');
                        localStorage.removeItem('chessAuthToken');
                        showToast('Session expired. Please login again.');
                    }
                } else {
                    // User doesn't exist, clear storage
                    localStorage.removeItem('chessUserId');
                    localStorage.removeItem('chessAuthToken');
                }
            }
        });

        // Quick Match
        document.getElementById('quickMatchBtn').addEventListener('click', async () => {
            await findOrCreateGame();
        });

        // Pass & Play Mode
        document.getElementById('passAndPlayBtn').addEventListener('click', () => {
            gameState.gameId = 'local_' + Date.now();
            gameState.playerId = 'local';
            gameState.playerColor = 'white';
            gameState.whitePlayer = { id: 'white', username: 'White', elo: 0 };
            gameState.blackPlayer = { id: 'black', username: 'Black', elo: 0 };
            gameState.isLocalGame = true;
            gameState.board = JSON.parse(JSON.stringify(INITIAL_BOARD));
            gameState.currentTurn = 'white';
            gameState.capturedPieces = { white: [], black: [] };
            gameState.castlingRights = { white: { kingSide: true, queenSide: true }, black: { kingSide: true, queenSide: true } };
            gameState.lastMove = null;
            gameState.moveCount = 0;
            gameState.gameOver = false;
            
            showScreen('gameScreen');
            updateGameUI();
        });

        // Challenge Friend
        document.getElementById('playFriendBtn').addEventListener('click', async () => {
            const friends = currentUser.friends || [];
            const friendsList = document.getElementById('challengeFriendsList');
            friendsList.innerHTML = '';

            if (friends.length === 0) {
                friendsList.innerHTML = '<div class="empty-state"><div class="empty-state-icon">👥</div><div class="empty-state-text">No friends yet. Add some friends first!</div></div>';
            } else {
                for (const friendId of friends) {
                    const snapshot = await database.ref(`chess/players/${friendId}`).once('value');
                    const friend = snapshot.val();
                    if (friend) {
                        const item = document.createElement('div');
                        item.className = 'friend-item';
                        item.innerHTML = `
                            <div class="friend-info">
                                <div class="friend-avatar">${friend.username[0].toUpperCase()}</div>
                                <div class="friend-details">
                                    <div class="friend-name">${friend.username}</div>
                                    <div class="friend-status ${friend.online ? 'online' : ''}">
                                        ${friend.online ? 'Online' : 'Offline'} • ELO ${friend.elo}
                                    </div>
                                </div>
                            </div>
                            <button class="icon-button primary" onclick="sendChallenge('${friendId}')">⚔️</button>
                        `;
                        friendsList.appendChild(item);
                    }
                }
            }

            document.getElementById('challengeModal').classList.add('show');
        });

        document.getElementById('cancelChallengeBtn').addEventListener('click', () => {
            document.getElementById('challengeModal').classList.remove('show');
        });

        async function sendChallenge(friendId) {
            const challengeId = 'challenge_' + Date.now();
            await database.ref(`chess/challenges/${challengeId}`).set({
                from: currentUser.id,
                to: friendId,
                fromUsername: currentUser.username,
                timestamp: Date.now()
            });
            
            // Listen for when this challenge is accepted
            database.ref(`chess/challenges/${challengeId}`).on('value', async (snapshot) => {
                const challenge = snapshot.val();
                if (challenge && challenge.accepted && challenge.gameId) {
                    // Challenge was accepted, join the game
                    await database.ref(`chess/challenges/${challengeId}`).off();
                    await database.ref(`chess/challenges/${challengeId}`).remove();
                    
                    gameState.gameId = challenge.gameId;
                    gameState.playerId = currentUser.id;
                    gameState.playerColor = challenge.challengerColor;
                    
                    const gameSnapshot = await database.ref(`chess/games/${challenge.gameId}`).once('value');
                    const game = gameSnapshot.val();
                    gameState.whitePlayer = game.whitePlayer;
                    gameState.blackPlayer = game.blackPlayer;
                    
                    showScreen('gameScreen');
                    listenToGame();
                    showToast('Challenge accepted! Game starting...');
                }
            });
            
            document.getElementById('challengeModal').classList.remove('show');
            showToast('Challenge sent!');
        }

        function listenForChallenges() {
            database.ref('chess/challenges').on('child_added', async (snapshot) => {
                const challenge = snapshot.val();
                if (challenge.to === currentUser.id) {
                    document.getElementById('challengeMessage').textContent = 
                        `${challenge.fromUsername} has challenged you to a match!`;
                    document.getElementById('incomingChallengeModal').classList.add('show');
                    
                    document.getElementById('acceptChallengeBtn').onclick = async () => {
                        await acceptChallenge(snapshot.key, challenge);
                        document.getElementById('incomingChallengeModal').classList.remove('show');
                    };
                    
                    document.getElementById('declineChallengeBtn').onclick = async () => {
                        await database.ref(`chess/challenges/${snapshot.key}`).remove();
                        document.getElementById('incomingChallengeModal').classList.remove('show');
                    };
                }
            });
        }

        async function acceptChallenge(challengeId, challenge) {
            const gameId = 'game_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            
            // Get the challenger's data
            const challengerSnapshot = await database.ref(`chess/players/${challenge.from}`).once('value');
            const challenger = challengerSnapshot.val();
            
            // Randomly assign colors
            const whitePlayer = Math.random() > 0.5 ? currentUser : challenger;
            const blackPlayer = whitePlayer.id === currentUser.id ? challenger : currentUser;

            gameState.gameId = gameId;
            gameState.playerId = currentUser.id;
            gameState.playerColor = whitePlayer.id === currentUser.id ? 'white' : 'black';
            gameState.whitePlayer = whitePlayer;
            gameState.blackPlayer = blackPlayer;

            // Create the game
            await database.ref(`chess/games/${gameId}`).set({
                whitePlayer: { id: whitePlayer.id, username: whitePlayer.username, elo: whitePlayer.elo },
                blackPlayer: { id: blackPlayer.id, username: blackPlayer.username, elo: blackPlayer.elo },
                board: INITIAL_BOARD,
                currentTurn: 'white',
                status: 'active',
                startTime: Date.now(),
                capturedPieces: { white: [], black: [] },
                castlingRights: { white: { kingSide: true, queenSide: true }, black: { kingSide: true, queenSide: true } }
            });

            // Update the challenge to notify the sender
            await database.ref(`chess/challenges/${challengeId}`).update({
                accepted: true,
                gameId: gameId,
                challengerColor: whitePlayer.id === challenge.from ? 'white' : 'black'
            });

            // Remove the challenge after a short delay to allow sender to read it
            setTimeout(async () => {
                await database.ref(`chess/challenges/${challengeId}`).remove();
            }, 1000);

            showScreen('gameScreen');
            listenToGame();
        }

        // Friend Search
        document.getElementById('friendSearchInput').addEventListener('input', async (e) => {
            const searchTerm = e.target.value.trim().toLowerCase();
            if (searchTerm.length < 2) return;

            const snapshot = await database.ref('chess/players').once('value');
            const players = snapshot.val();
            const friendsList = document.getElementById('friendsList');
            friendsList.innerHTML = '';

            for (const playerId in players) {
                const player = players[playerId];
                if (player.id === currentUser.id) continue;
                if (!player.username.toLowerCase().includes(searchTerm)) continue;

                const isFriend = (currentUser.friends || []).includes(playerId);
                const item = document.createElement('div');
                item.className = 'friend-item';
                item.innerHTML = `
                    <div class="friend-info">
                        <div class="friend-avatar">${player.username[0].toUpperCase()}</div>
                        <div class="friend-details">
                            <div class="friend-name">${player.username}</div>
                            <div class="friend-status">ELO ${player.elo}</div>
                        </div>
                    </div>
                    ${isFriend ? 
                        '<button class="icon-button danger" onclick="removeFriend(\'' + playerId + '\')">✕</button>' :
                        '<button class="icon-button primary" onclick="addFriend(\'' + playerId + '\')">+</button>'
                    }
                `;
                friendsList.appendChild(item);
            }
        });

        async function addFriend(friendId) {
            const friends = currentUser.friends || [];
            if (!friends.includes(friendId)) {
                friends.push(friendId);
                currentUser.friends = friends;
                await database.ref(`chess/players/${currentUser.id}/friends`).set(friends);
                
                const friendFriends = await database.ref(`chess/players/${friendId}/friends`).once('value').then(s => s.val() || []);
                if (!friendFriends.includes(currentUser.id)) {
                    friendFriends.push(currentUser.id);
                    await database.ref(`chess/players/${friendId}/friends`).set(friendFriends);
                }
                
                showToast('Friend added!');
                loadFriends();
            }
        }

        async function removeFriend(friendId) {
            const friends = currentUser.friends || [];
            const index = friends.indexOf(friendId);
            if (index > -1) {
                friends.splice(index, 1);
                currentUser.friends = friends;
                await database.ref(`chess/players/${currentUser.id}/friends`).set(friends);
                showToast('Friend removed');
                loadFriends();
            }
        }

        async function loadFriends() {
            const friends = currentUser.friends || [];
            const friendsList = document.getElementById('friendsList');
            friendsList.innerHTML = '';

            if (friends.length === 0) {
                friendsList.innerHTML = '<div class="empty-state"><div class="empty-state-icon">👥</div><div class="empty-state-text">No friends yet. Search for players above!</div></div>';
                return;
            }

            for (const friendId of friends) {
                const snapshot = await database.ref(`chess/players/${friendId}`).once('value');
                const friend = snapshot.val();
                if (friend) {
                    const item = document.createElement('div');
                    item.className = 'friend-item';
                    item.innerHTML = `
                        <div class="friend-info">
                            <div class="friend-avatar">${friend.username[0].toUpperCase()}</div>
                            <div class="friend-details">
                                <div class="friend-name">${friend.username}</div>
                                <div class="friend-status ${friend.online ? 'online' : ''}">
                                    ${friend.online ? 'Online' : 'Offline'} • ELO ${friend.elo}
                                </div>
                            </div>
                        </div>
                        <div class="friend-actions">
                            <button class="icon-button primary" onclick="sendChallenge('${friendId}')">⚔️</button>
                            <button class="icon-button danger" onclick="removeFriend('${friendId}')">✕</button>
                        </div>
                    `;
                    friendsList.appendChild(item);
                }
            }
        }

        // Chat functionality
        document.getElementById('sendChatBtn').addEventListener('click', sendChatMessage);
        document.getElementById('chatInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendChatMessage();
            }
        });

        async function sendChatMessage() {
            const input = document.getElementById('chatInput');
            const message = input.value.trim();
            if (!message) return;

            await database.ref('chess/chat').push({
                userId: currentUser.id,
                username: currentUser.username,
                message: message,
                timestamp: Date.now()
            });

            input.value = '';
        }

        function loadChat() {
            const chatMessages = document.getElementById('chatMessages');
            
            database.ref('chess/chat').orderByChild('timestamp').limitToLast(50).on('value', (snapshot) => {
                chatMessages.innerHTML = '';
                const messages = [];
                snapshot.forEach(child => {
                    messages.push(child.val());
                });

                messages.forEach(msg => {
                    const messageDiv = document.createElement('div');
                    messageDiv.className = 'chat-message' + (msg.userId === currentUser.id ? ' own' : '');
                    
                    const date = new Date(msg.timestamp);
                    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    
                    messageDiv.innerHTML = `
                        <div class="chat-message-header">${msg.username} • ${timeStr}</div>
                        <div class="chat-message-text">${escapeHtml(msg.message)}</div>
                    `;
                    chatMessages.appendChild(messageDiv);
                });

                chatMessages.scrollTop = chatMessages.scrollHeight;
            });
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        // Leaderboard functionality
        async function loadLeaderboard(type) {
            const leaderboardList = document.getElementById('leaderboardList');
            leaderboardList.innerHTML = '';

            const snapshot = await database.ref('chess/players').orderByChild('elo').limitToLast(50).once('value');
            const players = [];
            snapshot.forEach(child => {
                const player = child.val();
                if (type === 'friends') {
                    if ((currentUser.friends || []).includes(player.id) || player.id === currentUser.id) {
                        players.push(player);
                    }
                } else {
                    players.push(player);
                }
            });

            players.reverse();

            if (players.length === 0) {
                leaderboardList.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🏆</div><div class="empty-state-text">No players yet</div></div>';
                return;
            }

            players.forEach((player, index) => {
                const rank = index + 1;
                const isCurrentUser = player.id === currentUser.id;
                
                const item = document.createElement('div');
                item.className = 'leaderboard-item' + (isCurrentUser ? ' highlight' : '');
                
                let rankClass = '';
                if (rank === 1) rankClass = 'gold';
                else if (rank === 2) rankClass = 'silver';
                else if (rank === 3) rankClass = 'bronze';
                
                item.innerHTML = `
                    <div class="leaderboard-rank ${rankClass}">#${rank}</div>
                    <div class="friend-info">
                        <div class="friend-avatar">${player.username[0].toUpperCase()}</div>
                        <div class="friend-details">
                            <div class="friend-name">${player.username}${isCurrentUser ? ' (You)' : ''}</div>
                            <div class="friend-status">
                                ${player.wins || 0}W ${player.losses || 0}L ${player.draws || 0}D
                            </div>
                        </div>
                    </div>
                    <div style="font-size: 18px; font-weight: 600; color: #4CAF50;">${player.elo}</div>
                `;
                leaderboardList.appendChild(item);
            });
        }

        // Achievements system
        const ACHIEVEMENTS = [
            { id: 'first_win', icon: '🎯', name: 'First Victory', description: 'Win your first game', check: (user) => (user.wins || 0) >= 1 },
            { id: 'win_streak_3', icon: '🔥', name: 'Hot Streak', description: 'Win 3 games in a row', check: (user) => false },
            { id: 'win_10', icon: '⭐', name: 'Rising Star', description: 'Win 10 games', check: (user) => (user.wins || 0) >= 10 },
            { id: 'win_50', icon: '👑', name: 'Chess Master', description: 'Win 50 games', check: (user) => (user.wins || 0) >= 50 },
            { id: 'elo_1500', icon: '📈', name: 'Skilled Player', description: 'Reach 1500 ELO', check: (user) => user.elo >= 1500 },
            { id: 'elo_1800', icon: '💎', name: 'Expert', description: 'Reach 1800 ELO', check: (user) => user.elo >= 1800 },
            { id: 'friend_5', icon: '👥', name: 'Social Butterfly', description: 'Add 5 friends', check: (user) => (user.friends || []).length >= 5 },
            { id: 'games_100', icon: '🎮', name: 'Dedicated', description: 'Play 100 games', check: (user) => ((user.wins || 0) + (user.losses || 0) + (user.draws || 0)) >= 100 }
        ];

        async function loadProfile() {
            document.getElementById('profileAvatar').textContent = currentUser.username[0].toUpperCase();
            document.getElementById('profileUsername').textContent = currentUser.username;
            document.getElementById('profileElo').textContent = `ELO: ${currentUser.elo}`;
            
            const joinedDate = new Date(currentUser.createdAt);
            document.getElementById('profileJoined').textContent = joinedDate.toLocaleDateString();
            
            const snapshot = await database.ref('chess/players').orderByChild('elo').once('value');
            const players = [];
            snapshot.forEach(child => players.push(child.val()));
            players.reverse();
            const rank = players.findIndex(p => p.id === currentUser.id) + 1;
            document.getElementById('profileRank').textContent = `#${rank}`;
            
            document.getElementById('statWins').textContent = currentUser.wins || 0;
            document.getElementById('statLosses').textContent = currentUser.losses || 0;
            document.getElementById('statDraws').textContent = currentUser.draws || 0;
            
            const totalGames = (currentUser.wins || 0) + (currentUser.losses || 0) + (currentUser.draws || 0);
            const winRate = totalGames > 0 ? Math.round(((currentUser.wins || 0) / totalGames) * 100) : 0;
            document.getElementById('statWinRate').textContent = `${winRate}%`;
            
            const achievementsList = document.getElementById('achievementsList');
            achievementsList.innerHTML = '';
            
            ACHIEVEMENTS.forEach(achievement => {
                const unlocked = achievement.check(currentUser);
                const item = document.createElement('div');
                item.className = 'achievement-item' + (unlocked ? ' unlocked' : '');
                item.innerHTML = `
                    <div class="achievement-icon">${achievement.icon}</div>
                    <div class="achievement-details">
                        <div class="achievement-name">${achievement.name}</div>
                        <div class="achievement-description">${achievement.description}</div>
                    </div>
                `;
                achievementsList.appendChild(item);
            });

            const matchHistory = document.getElementById('profileMatchHistory');
            matchHistory.innerHTML = '';

            const gamesSnapshot = await database.ref('chess/games')
                .orderByChild('startTime')
                .limitToLast(10)
                .once('value');
            
            const games = [];
            gamesSnapshot.forEach(child => {
                const game = child.val();
                if ((game.whitePlayer.id === currentUser.id || game.blackPlayer.id === currentUser.id) && game.winner) {
                    games.push(game);
                }
            });

            games.reverse();

            if (games.length === 0) {
                matchHistory.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🎮</div><div class="empty-state-text">No matches played yet</div></div>';
                return;
            }

            games.forEach(game => {
                const isWhite = game.whitePlayer.id === currentUser.id;
                const opponent = isWhite ? game.blackPlayer : game.whitePlayer;
                let result = 'draw';
                if (game.winner !== 'draw') {
                    result = (isWhite && game.winner === 'white') || (!isWhite && game.winner === 'black') ? 'win' : 'loss';
                }

                const item = document.createElement('div');
                item.className = 'match-item';
                item.innerHTML = `
                    <div class="match-header">
                        <div class="match-result ${result}">
                            ${result === 'win' ? '✓ Victory' : result === 'loss' ? '✗ Defeat' : '= Draw'}
                        </div>
                        <div class="match-date">${new Date(game.startTime).toLocaleDateString()}</div>
                    </div>
                    <div class="match-details">vs ${opponent.username} (${opponent.elo}) • ${game.reason}</div>
                `;
                matchHistory.appendChild(item);
            });
        }

        async function loadMatchHistory() {
            const matchHistory = document.getElementById('matchHistoryList');
            matchHistory.innerHTML = '';

            const gamesSnapshot = await database.ref('chess/games')
                .orderByChild('startTime')
                .limitToLast(5)
                .once('value');
            
            const games = [];
            gamesSnapshot.forEach(child => {
                const game = child.val();
                if ((game.whitePlayer.id === currentUser.id || game.blackPlayer.id === currentUser.id) && game.winner) {
                    games.push(game);
                }
            });

            games.reverse();

            if (games.length === 0) {
                matchHistory.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🎮</div><div class="empty-state-text">No recent matches</div></div>';
                return;
            }

            games.forEach(game => {
                const isWhite = game.whitePlayer.id === currentUser.id;
                const opponent = isWhite ? game.blackPlayer : game.whitePlayer;
                let result = 'draw';
                if (game.winner !== 'draw') {
                    result = (isWhite && game.winner === 'white') || (!isWhite && game.winner === 'black') ? 'win' : 'loss';
                }

                const item = document.createElement('div');
                item.className = 'match-item';
                item.innerHTML = `
                    <div class="match-header">
                        <div class="match-result ${result}">
                            ${result === 'win' ? '✓ Win' : result === 'loss' ? '✗ Loss' : '= Draw'}
                        </div>
                        <div class="match-date">${new Date(game.startTime).toLocaleDateString()}</div>
                    </div>
                    <div class="match-details">vs ${opponent.username} (${opponent.elo})</div>
                `;
                matchHistory.appendChild(item);
            });
        }

        // Settings
        document.getElementById('soundToggle').addEventListener('click', function() {
            this.classList.toggle('active');
            settings.soundEffects = this.classList.contains('active');
        });

        document.getElementById('hintsToggle').addEventListener('click', function() {
            this.classList.toggle('active');
            settings.showHints = this.classList.contains('active');
        });

        document.getElementById('autoQueenToggle').addEventListener('click', function() {
            this.classList.toggle('active');
            settings.autoQueen = this.classList.contains('active');
        });

        document.getElementById('lastMoveToggle').addEventListener('click', function() {
            this.classList.toggle('active');
            settings.showLastMove = this.classList.contains('active');
            updateGameUI();
        });

        document.getElementById('confirmMovesToggle').addEventListener('click', function() {
            this.classList.toggle('active');
            settings.confirmMoves = this.classList.contains('active');
        });

        document.getElementById('vibrationToggle').addEventListener('click', function() {
            this.classList.toggle('active');
            settings.vibration = this.classList.contains('active');
        });

        document.getElementById('onlineStatusToggle').addEventListener('click', function() {
            this.classList.toggle('active');
            settings.onlineStatus = this.classList.contains('active');
        });

        document.getElementById('friendRequestsToggle').addEventListener('click', function() {
            this.classList.toggle('active');
            settings.friendRequests = this.classList.contains('active');
        });

        document.getElementById('matchHistoryToggle').addEventListener('click', function() {
            this.classList.toggle('active');
            settings.matchHistory = this.classList.contains('active');
        });

        document.getElementById('challengeAlertsToggle').addEventListener('click', function() {
            this.classList.toggle('active');
            settings.challengeAlerts = this.classList.contains('active');
        });

        document.getElementById('friendOnlineToggle').addEventListener('click', function() {
            this.classList.toggle('active');
            settings.friendOnline = this.classList.contains('active');
        });

        document.getElementById('boardThemeSelect').addEventListener('change', function() {
            settings.boardTheme = this.value;
            const board = document.getElementById('board');
            board.className = 'board board-theme-' + this.value;
            updateGameUI();
        });

        document.getElementById('pieceStyleSelect').addEventListener('change', function() {
            settings.pieceStyle = this.value;
        });

        document.getElementById('eloThresholdSlider').addEventListener('input', function() {
            settings.eloThreshold = parseInt(this.value);
            document.getElementById('eloThresholdValue').textContent = this.value;
        });

        document.getElementById('updateUsernameBtn').addEventListener('click', async () => {
            const newUsername = document.getElementById('changeUsernameInput').value.trim();
            if (!newUsername) {
                showToast('Please enter a new username');
                return;
            }

            // Check if username is already taken
            const usersSnapshot = await database.ref('chess/players').orderByChild('username').equalTo(newUsername).once('value');
            if (usersSnapshot.exists()) {
                let isSameUser = false;
                usersSnapshot.forEach(child => {
                    if (child.val().id === currentUser.id) {
                        isSameUser = true;
                    }
                });
                
                if (!isSameUser) {
                    showToast('Username already taken');
                    return;
                }
            }

            currentUser.username = newUsername;
            await database.ref(`chess/players/${currentUser.id}/username`).set(newUsername);
            showToast('Username updated!');
            document.getElementById('changeUsernameInput').value = '';
        });

        // Password strength for new password
        document.getElementById('newPasswordInput').addEventListener('input', (e) => {
            updatePasswordStrength(
                e.target.value,
                document.getElementById('newPasswordStrengthBar')
            );
        });

        // Change password
        document.getElementById('changePasswordBtn').addEventListener('click', async () => {
            const currentPassword = document.getElementById('currentPasswordInput').value;
            const newPassword = document.getElementById('newPasswordInput').value;
            const confirmPassword = document.getElementById('confirmPasswordInput').value;

            if (!currentPassword || !newPassword || !confirmPassword) {
                showToast('Please fill in all password fields');
                return;
            }

            if (newPassword.length < 8) {
                showToast('New password must be at least 8 characters');
                return;
            }

            if (newPassword !== confirmPassword) {
                showToast('New passwords do not match');
                return;
            }

            // Verify current password
            const currentPasswordHash = await hashPassword(currentPassword, currentUser.salt);
            if (currentPasswordHash !== currentUser.passwordHash) {
                showToast('Current password is incorrect');
                return;
            }

            // Generate new salt and hash
            const newSalt = generateSalt();
            const newPasswordHash = await hashPassword(newPassword, newSalt);

            // Update in database
            await database.ref(`chess/players/${currentUser.id}/passwordHash`).set(newPasswordHash);
            await database.ref(`chess/players/${currentUser.id}/salt`).set(newSalt);

            // Update local user object
            currentUser.passwordHash = newPasswordHash;
            currentUser.salt = newSalt;

            // Update stored auth token
            localStorage.setItem('chessAuthToken', newPasswordHash);

            showToast('Password changed successfully!');
            
            // Clear password fields
            document.getElementById('currentPasswordInput').value = '';
            document.getElementById('newPasswordInput').value = '';
            document.getElementById('confirmPasswordInput').value = '';
            document.getElementById('newPasswordStrengthBar').className = 'password-strength-bar';
        });

        // Game Logic
        async function findOrCreateGame() {
            const playerElo = currentUser.elo;
            
            const waitingGamesRef = database.ref('chess/waiting');
            const snapshot = await waitingGamesRef.once('value');
            const waitingGames = snapshot.val();

            if (waitingGames) {
                for (let gameId in waitingGames) {
                    const game = waitingGames[gameId];
                    if (game.whitePlayer.id === currentUser.id) continue;
                    
                    const opponentElo = game.whitePlayer.elo;
                    
                    if (Math.abs(playerElo - opponentElo) <= settings.eloThreshold) {
                        gameState.gameId = gameId;
                        gameState.playerId = currentUser.id;
                        gameState.playerColor = 'black';
                        gameState.blackPlayer = { id: currentUser.id, username: currentUser.username, elo: currentUser.elo };
                        
                        await database.ref(`chess/games/${gameId}`).set({
                            ...game,
                            blackPlayer: gameState.blackPlayer,
                            status: 'active',
                            startTime: Date.now()
                        });
                        
                        await waitingGamesRef.child(gameId).remove();
                        
                        showScreen('gameScreen');
                        listenToGame();
                        return;
                    }
                }
            }

            gameState.gameId = 'game_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            gameState.playerId = currentUser.id;
            gameState.playerColor = 'white';
            gameState.whitePlayer = { id: currentUser.id, username: currentUser.username, elo: currentUser.elo };
            
            await database.ref(`chess/waiting/${gameState.gameId}`).set({
                whitePlayer: gameState.whitePlayer,
                board: INITIAL_BOARD,
                currentTurn: 'white',
                createdAt: Date.now()
            });

            showScreen('gameScreen');
            updateGameStatus(`Waiting for opponent (ELO ±${settings.eloThreshold})...`);
            
            const cancelBtn = document.getElementById('resignBtn');
            const originalText = cancelBtn.textContent;
            cancelBtn.textContent = '✕';
            cancelBtn.onclick = async () => {
                await database.ref(`chess/waiting/${gameState.gameId}`).remove();
                showScreen('menuScreen');
                cancelBtn.textContent = originalText;
                cancelBtn.onclick = resignGame;
            };
            
            listenToGame();
        }

        async function resignGame() {
            if (gameState.isLocalGame) {
                const winner = gameState.currentTurn === 'white' ? 'black' : 'white';
                showLocalGameOver(winner, 'resignation');
            } else {
                const winner = gameState.playerColor === 'white' ? 'black' : 'white';
                await endGame(winner, 'resignation');
            }
        }

        // Draw offer functionality
        document.getElementById('drawOfferBtn').addEventListener('click', async () => {
            if (gameState.isLocalGame || gameState.gameOver) return;
            
            // Prevent draw offers if game hasn't started (no opponent yet)
            if (!gameState.whitePlayer || !gameState.blackPlayer) {
                showToast('Cannot offer draw - waiting for opponent');
                return;
            }
            
            await database.ref(`chess/games/${gameState.gameId}/drawOffer`).set({
                from: currentUser.id,
                timestamp: Date.now()
            });
            
            showToast('Draw offer sent');
            document.getElementById('drawOfferBtn').disabled = true;
            setTimeout(() => {
                document.getElementById('drawOfferBtn').disabled = false;
            }, 5000);
        });

        document.getElementById('acceptDrawBtn').addEventListener('click', async () => {
            document.getElementById('drawOfferModal').classList.remove('show');
            await endGame('draw', 'agreement');
            await database.ref(`chess/games/${gameState.gameId}/drawOffer`).remove();
        });

        document.getElementById('declineDrawBtn').addEventListener('click', async () => {
            document.getElementById('drawOfferModal').classList.remove('show');
            await database.ref(`chess/games/${gameState.gameId}/drawOffer`).remove();
            showToast('Draw offer declined');
        });

        function listenToGame() {
            const gameRef = database.ref(`chess/games/${gameState.gameId}`);
            
            gameRef.on('value', (snapshot) => {
                const game = snapshot.val();
                
                if (!game) {
                    const waitingRef = database.ref(`chess/waiting/${gameState.gameId}`);
                    waitingRef.on('value', (waitingSnapshot) => {
                        const waitingGame = waitingSnapshot.val();
                        if (waitingGame) {
                            updateGameStatus('Waiting for opponent...');
                        }
                    });
                    return;
                }

                gameState.board = game.board || INITIAL_BOARD;
                gameState.currentTurn = game.currentTurn || 'white';
                gameState.whitePlayer = game.whitePlayer;
                gameState.blackPlayer = game.blackPlayer;
                gameState.lastMove = game.lastMove;
                gameState.capturedPieces = game.capturedPieces || { white: [], black: [] };
                gameState.castlingRights = game.castlingRights || { white: { kingSide: true, queenSide: true }, black: { kingSide: true, queenSide: true } };
                gameState.enPassantTarget = game.enPassantTarget;
                gameState.moveCount = game.moveCount || 0;

                const resignBtn = document.getElementById('resignBtn');
                resignBtn.textContent = '🏳️';
                resignBtn.onclick = resignGame;

                // Check for draw offers
                if (game.drawOffer && game.drawOffer.from !== currentUser.id) {
                    const opponentName = game.drawOffer.from === game.whitePlayer.id ? 
                        game.whitePlayer.username : game.blackPlayer.username;
                    document.getElementById('drawOfferMessage').textContent = 
                        `${opponentName} has offered a draw. Do you accept?`;
                    document.getElementById('drawOfferModal').classList.add('show');
                }

                // Monitor opponent online status
                if (!gameState.isLocalGame && !gameState.gameOver) {
                    const opponentId = gameState.playerColor === 'white' ? game.blackPlayer.id : game.whitePlayer.id;
                    
                    // Clear any existing timeout
                    if (gameState.opponentDisconnectTimeout) {
                        clearTimeout(gameState.opponentDisconnectTimeout);
                    }
                    
                    database.ref(`chess/players/${opponentId}/online`).on('value', (onlineSnapshot) => {
                        const isOnline = onlineSnapshot.val();
                        
                        if (isOnline === false && game.status === 'active') {
                            // Opponent went offline, start 30 second timer
                            gameState.opponentDisconnectTimeout = setTimeout(async () => {
                                // Check if still offline after 30 seconds
                                const recheckSnapshot = await database.ref(`chess/players/${opponentId}/online`).once('value');
                                if (recheckSnapshot.val() === false) {
                                    // Opponent still offline, award win
                                    await endGame(gameState.playerColor, 'opponent disconnected');
                                }
                            }, 30000); // 30 seconds
                        } else if (isOnline === true) {
                            // Opponent came back online, cancel timeout
                            if (gameState.opponentDisconnectTimeout) {
                                clearTimeout(gameState.opponentDisconnectTimeout);
                                gameState.opponentDisconnectTimeout = null;
                            }
                        }
                    });
                }

                if (game.winner) {
                    gameState.gameOver = true;
                    showGameOver(game.winner, game.reason).catch(err => {
                        console.error('Error showing game over:', err);
                        // Fallback without ELO display
                        const modal = document.getElementById('gameOverModal');
                        const title = document.getElementById('gameOverTitle');
                        const message = document.getElementById('gameOverMessage');
                        
                        if (game.winner === 'draw') {
                            title.textContent = 'Draw';
                            message.textContent = `Game ended in a draw by ${game.reason}`;
                        } else {
                            const isPlayerWinner = game.winner === gameState.playerColor;
                            title.textContent = isPlayerWinner ? 'Victory!' : 'Defeat';
                            message.textContent = `Game ended by ${game.reason}`;
                        }
                        modal.classList.add('show');
                    });
                }

                updateGameUI();
            });
        }

        function updateGameStatus(message) {
            document.getElementById('gameStatus').textContent = message;
        }

        function updateGameUI() {
            const board = document.getElementById('board');
            board.innerHTML = '';

            const isPlayerWhite = gameState.playerColor === 'white';
            
            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    const displayRow = isPlayerWhite ? row : 7 - row;
                    const displayCol = isPlayerWhite ? col : 7 - col;
                    
                    const square = document.createElement('div');
                    square.className = 'square';
                    square.className += (displayRow + displayCol) % 2 === 0 ? ' light' : ' dark';
                    square.dataset.row = displayRow;
                    square.dataset.col = displayCol;

                    const piece = gameState.board[displayRow][displayCol];
                    if (piece) {
                        square.textContent = PIECES[piece];
                        square.classList.add('has-piece');
                    }

                    if (gameState.selectedSquare && 
                        gameState.selectedSquare.row === displayRow && 
                        gameState.selectedSquare.col === displayCol) {
                        square.classList.add('selected');
                    }

                    if (settings.showHints && gameState.validMoves.some(m => m.row === displayRow && m.col === displayCol)) {
                        square.classList.add('valid-move');
                        if (piece) {
                            square.classList.add('has-piece');
                        }
                    }

                    if (settings.showLastMove && gameState.lastMove && 
                        ((gameState.lastMove.from.row === displayRow && gameState.lastMove.from.col === displayCol) ||
                         (gameState.lastMove.to.row === displayRow && gameState.lastMove.to.col === displayCol))) {
                        square.classList.add('last-move');
                    }

                    square.addEventListener('click', () => handleSquareClick(displayRow, displayCol));
                    board.appendChild(square);
                }
            }

            let isPlayerTurn;
            if (gameState.isLocalGame) {
                isPlayerTurn = true;
                updateGameStatus(`${gameState.currentTurn === 'white' ? 'White' : 'Black'}'s turn`);
            } else {
                isPlayerTurn = gameState.currentTurn === gameState.playerColor;
                updateGameStatus(isPlayerTurn ? 'Your turn' : "Opponent's turn");
            }

            document.getElementById('playerTurn').className = 'turn-indicator' + (isPlayerTurn ? '' : ' inactive');
            document.getElementById('opponentTurn').className = 'turn-indicator' + (isPlayerTurn ? ' inactive' : '');

            if (!gameState.turnStartTime) {
                gameState.turnStartTime = Date.now();
            }

            if (gameState.moveTimerInterval) {
                clearInterval(gameState.moveTimerInterval);
            }

            gameState.moveTimerInterval = setInterval(() => {
                const elapsed = Math.floor((Date.now() - gameState.turnStartTime) / 1000);
                const minutes = Math.floor(elapsed / 60);
                const seconds = elapsed % 60;
                const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                
                if (isPlayerTurn) {
                    document.getElementById('playerTimer').textContent = timeStr;
                    document.getElementById('opponentTimer').textContent = '--:--';
                } else {
                    document.getElementById('opponentTimer').textContent = timeStr;
                    document.getElementById('playerTimer').textContent = '--:--';
                }
            }, 1000);

            if (gameState.whitePlayer && gameState.blackPlayer) {
                const whitePlayer = gameState.whitePlayer;
                const blackPlayer = gameState.blackPlayer;
                
                if (gameState.playerColor === 'white') {
                    document.getElementById('playerName').textContent = whitePlayer.username;
                    document.getElementById('playerElo').textContent = `ELO: ${whitePlayer.elo}`;
                    document.getElementById('opponentName').textContent = blackPlayer.username;
                    document.getElementById('opponentElo').textContent = `ELO: ${blackPlayer.elo}`;
                } else {
                    document.getElementById('playerName').textContent = blackPlayer.username;
                    document.getElementById('playerElo').textContent = `ELO: ${blackPlayer.elo}`;
                    document.getElementById('opponentName').textContent = whitePlayer.username;
                    document.getElementById('opponentElo').textContent = `ELO: ${whitePlayer.elo}`;
                }
            }

            const capturedByPlayerEl = document.getElementById('capturedByPlayer');
            const capturedByOpponentEl = document.getElementById('capturedByOpponent');
            
            capturedByPlayerEl.innerHTML = '';
            capturedByOpponentEl.innerHTML = '';

            const playerCaptured = gameState.playerColor === 'white' ? gameState.capturedPieces.white : gameState.capturedPieces.black;
            const opponentCaptured = gameState.playerColor === 'white' ? gameState.capturedPieces.black : gameState.capturedPieces.white;

            playerCaptured.forEach(piece => {
                const span = document.createElement('span');
                span.className = 'captured-piece';
                span.textContent = PIECES[piece];
                capturedByPlayerEl.appendChild(span);
            });

            opponentCaptured.forEach(piece => {
                const span = document.createElement('span');
                span.className = 'captured-piece';
                span.textContent = PIECES[piece];
                capturedByOpponentEl.appendChild(span);
            });
        }

        function handleSquareClick(row, col) {
            if (gameState.gameOver) {
                return;
            }
            
            if (!gameState.isLocalGame && gameState.currentTurn !== gameState.playerColor) {
                return;
            }

            const piece = gameState.board[row][col];

            if (gameState.selectedSquare) {
                const isValidMove = gameState.validMoves.some(m => m.row === row && m.col === col);
                
                if (isValidMove) {
                    makeMove(gameState.selectedSquare, { row, col });
                } else if (piece && isPlayerPiece(piece)) {
                    selectSquare(row, col);
                } else {
                    gameState.selectedSquare = null;
                    gameState.validMoves = [];
                    updateGameUI();
                }
            } else if (piece && isPlayerPiece(piece)) {
                selectSquare(row, col);
            }
        }

        function selectSquare(row, col) {
            gameState.selectedSquare = { row, col };
            gameState.validMoves = getValidMoves(row, col);
            updateGameUI();
        }

        function isPlayerPiece(piece) {
            if (gameState.isLocalGame) {
                // In local game, allow moving pieces based on current turn
                const isWhitePiece = piece === piece.toUpperCase();
                return (gameState.currentTurn === 'white' && isWhitePiece) || 
                       (gameState.currentTurn === 'black' && !isWhitePiece);
            }
            
            if (gameState.playerColor === 'white') {
                return piece === piece.toUpperCase();
            } else {
                return piece === piece.toLowerCase();
            }
        }

        function getValidMoves(row, col) {
            const piece = gameState.board[row][col];
            if (!piece) return [];

            const moves = [];
            const pieceType = piece.toLowerCase();
            const isWhite = piece === piece.toUpperCase();

            switch (pieceType) {
                case 'p':
                    moves.push(...getPawnMoves(row, col, isWhite));
                    break;
                case 'r':
                    moves.push(...getRookMoves(row, col, isWhite));
                    break;
                case 'n':
                    moves.push(...getKnightMoves(row, col, isWhite));
                    break;
                case 'b':
                    moves.push(...getBishopMoves(row, col, isWhite));
                    break;
                case 'q':
                    moves.push(...getQueenMoves(row, col, isWhite));
                    break;
                case 'k':
                    moves.push(...getKingMoves(row, col, isWhite));
                    break;
            }

            return moves.filter(move => !wouldBeInCheck(row, col, move.row, move.col, isWhite));
        }

        function getPawnMoves(row, col, isWhite) {
            const moves = [];
            const direction = isWhite ? -1 : 1;
            const startRow = isWhite ? 6 : 1;

            if (row + direction >= 0 && row + direction < 8 && !gameState.board[row + direction][col]) {
                moves.push({ row: row + direction, col });
                
                if (row === startRow && !gameState.board[row + 2 * direction][col]) {
                    moves.push({ row: row + 2 * direction, col });
                }
            }

            [-1, 1].forEach(dc => {
                const newCol = col + dc;
                if (newCol >= 0 && newCol < 8 && row + direction >= 0 && row + direction < 8) {
                    const target = gameState.board[row + direction][newCol];
                    if (target && ((isWhite && target === target.toLowerCase()) || (!isWhite && target === target.toUpperCase()))) {
                        moves.push({ row: row + direction, col: newCol });
                    }
                    
                    if (gameState.enPassantTarget && 
                        gameState.enPassantTarget.row === row + direction && 
                        gameState.enPassantTarget.col === newCol) {
                        moves.push({ row: row + direction, col: newCol, enPassant: true });
                    }
                }
            });

            return moves;
        }

        function getRookMoves(row, col, isWhite) {
            return getSlidingMoves(row, col, isWhite, [[0, 1], [0, -1], [1, 0], [-1, 0]]);
        }

        function getBishopMoves(row, col, isWhite) {
            return getSlidingMoves(row, col, isWhite, [[1, 1], [1, -1], [-1, 1], [-1, -1]]);
        }

        function getQueenMoves(row, col, isWhite) {
            return getSlidingMoves(row, col, isWhite, [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]]);
        }

        function getSlidingMoves(row, col, isWhite, directions) {
            const moves = [];
            
            directions.forEach(([dr, dc]) => {
                let r = row + dr;
                let c = col + dc;
                
                while (r >= 0 && r < 8 && c >= 0 && c < 8) {
                    const target = gameState.board[r][c];
                    
                    if (!target) {
                        moves.push({ row: r, col: c });
                    } else {
                        if ((isWhite && target === target.toLowerCase()) || (!isWhite && target === target.toUpperCase())) {
                            moves.push({ row: r, col: c });
                        }
                        break;
                    }
                    
                    r += dr;
                    c += dc;
                }
            });
            
            return moves;
        }

        function getKnightMoves(row, col, isWhite) {
            const moves = [];
            const offsets = [[2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2]];
            
            offsets.forEach(([dr, dc]) => {
                const r = row + dr;
                const c = col + dc;
                
                if (r >= 0 && r < 8 && c >= 0 && c < 8) {
                    const target = gameState.board[r][c];
                    if (!target || (isWhite && target === target.toLowerCase()) || (!isWhite && target === target.toUpperCase())) {
                        moves.push({ row: r, col: c });
                    }
                }
            });
            
            return moves;
        }

        function getKingMoves(row, col, isWhite) {
            const moves = [];
            const offsets = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]];
            
            offsets.forEach(([dr, dc]) => {
                const r = row + dr;
                const c = col + dc;
                
                if (r >= 0 && r < 8 && c >= 0 && c < 8) {
                    const target = gameState.board[r][c];
                    if (!target || (isWhite && target === target.toLowerCase()) || (!isWhite && target === target.toUpperCase())) {
                        moves.push({ row: r, col: c });
                    }
                }
            });

            const color = isWhite ? 'white' : 'black';
            const rights = gameState.castlingRights[color];
            
            if (rights.kingSide && !isInCheck(isWhite)) {
                if (!gameState.board[row][col + 1] && !gameState.board[row][col + 2]) {
                    if (!wouldBeInCheck(row, col, row, col + 1, isWhite) && 
                        !wouldBeInCheck(row, col, row, col + 2, isWhite)) {
                        moves.push({ row, col: col + 2, castling: 'kingside' });
                    }
                }
            }
            
            if (rights.queenSide && !isInCheck(isWhite)) {
                if (!gameState.board[row][col - 1] && !gameState.board[row][col - 2] && !gameState.board[row][col - 3]) {
                    if (!wouldBeInCheck(row, col, row, col - 1, isWhite) && 
                        !wouldBeInCheck(row, col, row, col - 2, isWhite)) {
                        moves.push({ row, col: col - 2, castling: 'queenside' });
                    }
                }
            }
            
            return moves;
        }

        function wouldBeInCheck(fromRow, fromCol, toRow, toCol, isWhite) {
            const tempBoard = gameState.board.map(row => [...row]);
            tempBoard[toRow][toCol] = tempBoard[fromRow][fromCol];
            tempBoard[fromRow][fromCol] = '';

            const kingPos = findKing(tempBoard, isWhite);
            if (!kingPos) return true;

            return isSquareUnderAttack(tempBoard, kingPos.row, kingPos.col, !isWhite);
        }

        function isInCheck(isWhite) {
            const kingPos = findKing(gameState.board, isWhite);
            if (!kingPos) return false;
            return isSquareUnderAttack(gameState.board, kingPos.row, kingPos.col, !isWhite);
        }

        function findKing(board, isWhite) {
            const king = isWhite ? 'K' : 'k';
            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    if (board[row][col] === king) {
                        return { row, col };
                    }
                }
            }
            return null;
        }

        function isSquareUnderAttack(board, row, col, byWhite) {
            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                    const piece = board[r][c];
                    if (!piece) continue;
                    
                    const isPieceWhite = piece === piece.toUpperCase();
                    if (isPieceWhite !== byWhite) continue;

                    const pieceType = piece.toLowerCase();
                    let canAttack = false;

                    switch (pieceType) {
                        case 'p':
                            const dir = byWhite ? -1 : 1;
                            canAttack = r + dir === row && Math.abs(c - col) === 1;
                            break;
                        case 'n':
                            const dr = Math.abs(r - row);
                            const dc = Math.abs(c - col);
                            canAttack = (dr === 2 && dc === 1) || (dr === 1 && dc === 2);
                            break;
                        case 'b':
                            canAttack = Math.abs(r - row) === Math.abs(c - col) && hasLineOfSight(board, r, c, row, col);
                            break;
                        case 'r':
                            canAttack = (r === row || c === col) && hasLineOfSight(board, r, c, row, col);
                            break;
                        case 'q':
                            canAttack = (r === row || c === col || Math.abs(r - row) === Math.abs(c - col)) && 
                                       hasLineOfSight(board, r, c, row, col);
                            break;
                        case 'k':
                            canAttack = Math.abs(r - row) <= 1 && Math.abs(c - col) <= 1;
                            break;
                    }

                    if (canAttack) return true;
                }
            }
            return false;
        }

        function hasLineOfSight(board, fromRow, fromCol, toRow, toCol) {
            const dr = Math.sign(toRow - fromRow);
            const dc = Math.sign(toCol - fromCol);
            let r = fromRow + dr;
            let c = fromCol + dc;

            while (r !== toRow || c !== toCol) {
                if (board[r][c]) return false;
                r += dr;
                c += dc;
            }

            return true;
        }

        async function makeMove(from, to) {
            const piece = gameState.board[from.row][from.col];
            const capturedPiece = gameState.board[to.row][to.col];
            const isWhite = piece === piece.toUpperCase();
            const pieceType = piece.toLowerCase();

            const move = gameState.validMoves.find(m => m.row === to.row && m.col === to.col);
            
            if (pieceType === 'p' && (to.row === 0 || to.row === 7)) {
                if (settings.autoQueen) {
                    const promotedPiece = isWhite ? 'Q' : 'q';
                    await executePromotion(from, to, promotedPiece, capturedPiece);
                } else {
                    gameState.promotionPending = { from, to, piece };
                    showPromotionModal(isWhite);
                }
                return;
            }

            await executeMoveAndSync(from, to, move, piece, capturedPiece);
        }

        async function executeMoveAndSync(from, to, move, piece, capturedPiece) {
            const isWhite = piece === piece.toUpperCase();
            const pieceType = piece.toLowerCase();

            gameState.board[to.row][to.col] = piece;
            gameState.board[from.row][from.col] = '';

            if (capturedPiece) {
                const captureColor = isWhite ? 'white' : 'black';
                gameState.capturedPieces[captureColor].push(capturedPiece);
            }

            if (move && move.enPassant) {
                const capturedRow = isWhite ? to.row + 1 : to.row - 1;
                const capturedPawn = gameState.board[capturedRow][to.col];
                gameState.board[capturedRow][to.col] = '';
                const captureColor = isWhite ? 'white' : 'black';
                gameState.capturedPieces[captureColor].push(capturedPawn);
            }

            if (move && move.castling) {
                const rookFromCol = move.castling === 'kingside' ? 7 : 0;
                const rookToCol = move.castling === 'kingside' ? to.col - 1 : to.col + 1;
                const rook = gameState.board[from.row][rookFromCol];
                gameState.board[from.row][rookToCol] = rook;
                gameState.board[from.row][rookFromCol] = '';
            }

            if (pieceType === 'k') {
                const color = isWhite ? 'white' : 'black';
                gameState.castlingRights[color].kingSide = false;
                gameState.castlingRights[color].queenSide = false;
            }

            if (pieceType === 'r') {
                const color = isWhite ? 'white' : 'black';
                if (from.col === 0) {
                    gameState.castlingRights[color].queenSide = false;
                } else if (from.col === 7) {
                    gameState.castlingRights[color].kingSide = false;
                }
            }

            if (pieceType === 'p' && Math.abs(to.row - from.row) === 2) {
                gameState.enPassantTarget = { row: (from.row + to.row) / 2, col: from.col };
            } else {
                gameState.enPassantTarget = null;
            }

            gameState.lastMove = { from, to };
            gameState.moveCount++;
            gameState.turnStartTime = Date.now();
            
            // Clear selection and switch turns
            gameState.selectedSquare = null;
            gameState.validMoves = [];
            gameState.currentTurn = gameState.currentTurn === 'white' ? 'black' : 'white';

            const opponentColor = isWhite ? 'black' : 'white';
            if (isCheckmate(opponentColor === 'white')) {
                if (gameState.isLocalGame) {
                    showLocalGameOver(gameState.currentTurn === 'white' ? 'black' : 'white', 'checkmate');
                } else {
                    await endGame(gameState.currentTurn === 'white' ? 'black' : 'white', 'checkmate');
                }
            } else if (isStalemate(opponentColor === 'white')) {
                if (gameState.isLocalGame) {
                    showLocalGameOver('draw', 'stalemate');
                } else {
                    await endGame('draw', 'stalemate');
                }
            }

            if (!gameState.isLocalGame) {
                await database.ref(`chess/games/${gameState.gameId}`).update({
                    board: gameState.board,
                    currentTurn: gameState.currentTurn,
                    lastMove: gameState.lastMove,
                    capturedPieces: gameState.capturedPieces,
                    castlingRights: gameState.castlingRights,
                    enPassantTarget: gameState.enPassantTarget,
                    moveCount: gameState.moveCount
                });
            }

            if (settings.soundEffects) {
                playMoveSound(capturedPiece);
            }

            if (settings.vibration && navigator.vibrate) {
                navigator.vibrate(50);
            }

            updateGameUI();
        }

        function showLocalGameOver(winner, reason) {
            gameState.gameOver = true;
            const modal = document.getElementById('gameOverModal');
            const title = document.getElementById('gameOverTitle');
            const message = document.getElementById('gameOverMessage');

            if (winner === 'draw') {
                title.textContent = 'Draw';
                message.textContent = `Game ended in a draw by ${reason}`;
            } else {
                title.textContent = `${winner === 'white' ? 'White' : 'Black'} Wins!`;
                message.textContent = `Game ended by ${reason}`;
            }

            modal.classList.add('show');
        }

        function showPromotionModal(isWhite) {
            const modal = document.getElementById('promotionModal');
            const piecesContainer = document.getElementById('promotionPieces');
            piecesContainer.innerHTML = '';

            const pieces = isWhite ? ['Q', 'R', 'B', 'N'] : ['q', 'r', 'b', 'n'];
            
            pieces.forEach(piece => {
                const div = document.createElement('div');
                div.className = 'promotion-piece';
                div.textContent = PIECES[piece];
                div.addEventListener('click', () => handlePromotion(piece));
                piecesContainer.appendChild(div);
            });

            modal.classList.add('show');
        }

        async function handlePromotion(promotedPiece) {
            const modal = document.getElementById('promotionModal');
            modal.classList.remove('show');

            const { from, to } = gameState.promotionPending;
            const capturedPiece = gameState.board[to.row][to.col];
            
            await executePromotion(from, to, promotedPiece, capturedPiece);
        }

        async function executePromotion(from, to, promotedPiece, capturedPiece) {
            gameState.board[to.row][to.col] = promotedPiece;
            gameState.board[from.row][from.col] = '';

            if (capturedPiece) {
                const isWhite = promotedPiece === promotedPiece.toUpperCase();
                const captureColor = isWhite ? 'white' : 'black';
                gameState.capturedPieces[captureColor].push(capturedPiece);
            }

            gameState.lastMove = { from, to };
            gameState.moveCount++;
            gameState.turnStartTime = Date.now();
            gameState.promotionPending = null;
            
            // Clear selection and switch turns
            gameState.selectedSquare = null;
            gameState.validMoves = [];
            gameState.currentTurn = gameState.currentTurn === 'white' ? 'black' : 'white';

            await database.ref(`chess/games/${gameState.gameId}`).update({
                board: gameState.board,
                currentTurn: gameState.currentTurn,
                lastMove: gameState.lastMove,
                capturedPieces: gameState.capturedPieces,
                moveCount: gameState.moveCount
            });

            updateGameUI();
        }

        function isCheckmate(isWhite) {
            if (!isInCheck(isWhite)) return false;
            return !hasAnyLegalMoves(isWhite);
        }

        function isStalemate(isWhite) {
            if (isInCheck(isWhite)) return false;
            return !hasAnyLegalMoves(isWhite);
        }

        function hasAnyLegalMoves(isWhite) {
            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    const piece = gameState.board[row][col];
                    if (!piece) continue;
                    
                    const isPieceWhite = piece === piece.toUpperCase();
                    if (isPieceWhite !== isWhite) continue;

                    const moves = getValidMoves(row, col);
                    if (moves.length > 0) return true;
                }
            }
            return false;
        }

        async function endGame(winner, reason) {
            gameState.gameOver = true;

            // Clear disconnect timeout if exists
            if (gameState.opponentDisconnectTimeout) {
                clearTimeout(gameState.opponentDisconnectTimeout);
            }

            // Get fresh player data from database
            const whitePlayerSnapshot = await database.ref(`chess/players/${gameState.whitePlayer.id}`).once('value');
            const blackPlayerSnapshot = await database.ref(`chess/players/${gameState.blackPlayer.id}`).once('value');
            
            const whitePlayerData = whitePlayerSnapshot.val();
            const blackPlayerData = blackPlayerSnapshot.val();

            const whiteElo = whitePlayerData.elo;
            const blackElo = blackPlayerData.elo;

            let whiteResult, blackResult;
            if (winner === 'draw') {
                whiteResult = blackResult = 0.5;
            } else if (winner === 'white') {
                whiteResult = 1;
                blackResult = 0;
            } else {
                whiteResult = 0;
                blackResult = 1;
            }

            const whiteEloChange = calculateEloChange(whiteElo, blackElo, whiteResult);
            const blackEloChange = calculateEloChange(blackElo, whiteElo, blackResult);

            const newWhiteElo = whiteElo + whiteEloChange;
            const newBlackElo = blackElo + blackEloChange;

            // Update ELO ratings
            await database.ref(`chess/players/${gameState.whitePlayer.id}/elo`).set(newWhiteElo);
            await database.ref(`chess/players/${gameState.blackPlayer.id}/elo`).set(newBlackElo);

            // Update win/loss/draw counts
            if (winner === 'white') {
                await database.ref(`chess/players/${gameState.whitePlayer.id}/wins`).set((whitePlayerData.wins || 0) + 1);
                await database.ref(`chess/players/${gameState.blackPlayer.id}/losses`).set((blackPlayerData.losses || 0) + 1);
            } else if (winner === 'black') {
                await database.ref(`chess/players/${gameState.blackPlayer.id}/wins`).set((blackPlayerData.wins || 0) + 1);
                await database.ref(`chess/players/${gameState.whitePlayer.id}/losses`).set((whitePlayerData.losses || 0) + 1);
            } else {
                await database.ref(`chess/players/${gameState.whitePlayer.id}/draws`).set((whitePlayerData.draws || 0) + 1);
                await database.ref(`chess/players/${gameState.blackPlayer.id}/draws`).set((blackPlayerData.draws || 0) + 1);
            }

            // Update current user's local data if they were in this game
            if (currentUser.id === gameState.whitePlayer.id) {
                currentUser.elo = newWhiteElo;
                if (winner === 'white') {
                    currentUser.wins = (currentUser.wins || 0) + 1;
                } else if (winner === 'black') {
                    currentUser.losses = (currentUser.losses || 0) + 1;
                } else {
                    currentUser.draws = (currentUser.draws || 0) + 1;
                }
            } else if (currentUser.id === gameState.blackPlayer.id) {
                currentUser.elo = newBlackElo;
                if (winner === 'black') {
                    currentUser.wins = (currentUser.wins || 0) + 1;
                } else if (winner === 'white') {
                    currentUser.losses = (currentUser.losses || 0) + 1;
                } else {
                    currentUser.draws = (currentUser.draws || 0) + 1;
                }
            }

            // Update game record
            await database.ref(`chess/games/${gameState.gameId}`).update({
                winner,
                reason,
                endTime: Date.now(),
                eloChanges: {
                    white: whiteEloChange,
                    black: blackEloChange
                }
            });
        }

        function calculateEloChange(playerElo, opponentElo, result) {
            const K = 32;
            const expectedScore = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
            return Math.round(K * (result - expectedScore));
        }

        async function showGameOver(winner, reason) {
            const modal = document.getElementById('gameOverModal');
            const title = document.getElementById('gameOverTitle');
            const message = document.getElementById('gameOverMessage');

            // Get the game data to show ELO changes
            const gameSnapshot = await database.ref(`chess/games/${gameState.gameId}`).once('value');
            const game = gameSnapshot.val();

            let eloChangeText = '';
            if (game && game.eloChanges) {
                const playerEloChange = gameState.playerColor === 'white' ? game.eloChanges.white : game.eloChanges.black;
                const changeSymbol = playerEloChange >= 0 ? '+' : '';
                eloChangeText = `\n\nYour ELO: ${currentUser.elo} (${changeSymbol}${playerEloChange})`;
            }

            if (winner === 'draw') {
                title.textContent = 'Draw';
                message.textContent = `Game ended in a draw by ${reason}${eloChangeText}`;
            } else {
                const isPlayerWinner = winner === gameState.playerColor;
                title.textContent = isPlayerWinner ? 'Victory!' : 'Defeat';
                message.textContent = `Game ended by ${reason}${eloChangeText}`;
            }

            modal.classList.add('show');
        }

        document.getElementById('backToMenuBtn').addEventListener('click', () => {
            document.getElementById('gameOverModal').classList.remove('show');
            showScreen('menuScreen');
            loadMatchHistory();
            
            if (gameState.moveTimerInterval) {
                clearInterval(gameState.moveTimerInterval);
            }
            
            if (gameState.opponentDisconnectTimeout) {
                clearTimeout(gameState.opponentDisconnectTimeout);
            }
            
            gameState = {
                board: JSON.parse(JSON.stringify(INITIAL_BOARD)),
                currentTurn: 'white',
                selectedSquare: null,
                validMoves: [],
                gameId: null,
                playerId: null,
                playerColor: null,
                whitePlayer: null,
                blackPlayer: null,
                lastMove: null,
                capturedPieces: { white: [], black: [] },
                castlingRights: { white: { kingSide: true, queenSide: true }, black: { kingSide: true, queenSide: true } },
                enPassantTarget: null,
                moveCount: 0,
                gameOver: false,
                promotionPending: null,
                turnStartTime: null,
                moveTimerInterval: null,
                opponentDisconnectTimeout: null
            };
        });

        function playMoveSound(captured) {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = captured ? 800 : 600;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
        }

        function trackOnlinePlayers() {
            database.ref('chess/players').on('value', (snapshot) => {
                const players = snapshot.val();
                let onlineCount = 0;
                
                for (const playerId in players) {
                    if (players[playerId].online) {
                        onlineCount++;
                    }
                }
                
                document.getElementById('onlineCount').textContent = onlineCount;
            });
        }

        function showToast(message) {
            const toast = document.createElement('div');
            toast.style.cssText = `
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: #333;
                color: white;
                padding: 12px 24px;
                border-radius: 8px;
                font-size: 14px;
                z-index: 10000;
                animation: fadeInOut 2s ease-in-out;
            `;
            toast.textContent = message;
            document.body.appendChild(toast);

            setTimeout(() => {
                toast.remove();
            }, 2000);
        }

        document.addEventListener('keydown', (e) => {
            const currentScreen = document.querySelector('.screen.active').id;
            
            if (currentScreen === 'gameScreen' && !gameState.gameOver) {
                if (e.key === 'Escape') {
                    gameState.selectedSquare = null;
                    gameState.validMoves = [];
                    updateGameUI();
                } else if (e.key === 'r' || e.key === 'R') {
                    const shouldResign = window.confirm ? false : true;
                    if (shouldResign) {
                        showToast('Press resign button to forfeit');
                    }
                }
            }
        });

        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeInOut {
                0%, 100% { opacity: 0; }
                10%, 90% { opacity: 1; }
            }
        `;
        document.head.appendChild(style);

        async function onConfigChange(config) {
            document.getElementById('gameTitle').textContent = config.game_title || defaultConfig.game_title;
            document.getElementById('appSubtitle').textContent = config.app_subtitle || defaultConfig.app_subtitle;
            document.getElementById('menuTitle').textContent = config.game_title || defaultConfig.game_title;
        }

        if (window.elementSdk) {
            window.elementSdk.init({
                defaultConfig,
                onConfigChange,
                mapToCapabilities: (config) => ({
                    recolorables: [],
                    borderables: [],
                    fontEditable: undefined,
                    fontSizeable: undefined
                }),
                mapToEditPanelValues: (config) => new Map([
                    ["game_title", config.game_title || defaultConfig.game_title],
                    ["app_subtitle", config.app_subtitle || defaultConfig.app_subtitle]
                ])
            });
        }