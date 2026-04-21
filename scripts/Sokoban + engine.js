const AlterEngine = (() => {
      // --- EVENT SYSTEM ---
      const listeners = {};

      function on(event, callback) {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(callback);
      }

      function emit(event, data) {
        if (listeners[event]) {
          listeners[event].forEach(cb => cb(data));
        }
      }

      // --- CORE STATE ---
      let config = {
        width: 21,
        height: 20,
        tileSize: { w: 14, h: 24 }
      };

      let gridEl = null;
      let inputsSetup = false;

      // --- INITIALIZATION ---
      function init(userConfig = {}) {
        Object.assign(config, userConfig);
        gridEl = document.getElementById('grid-display');

        if (!gridEl) {
          console.error("AlterEngine: #grid-display element not found!");
          return;
        }

        UI.initUI(document.getElementById('screen'));
        setupInputs();
        emit('ready');
      }

      // --- RENDERER ---
      function render(mapGrid, activeEntities = []) {
        if (!gridEl || !mapGrid) return;

        const drawGrid = mapGrid.map(row => [...row]);

        activeEntities.forEach(ent => {
          if (ent.sprite) {
            ent.sprite.forEach((row, sy) => {
              [...row].forEach((char, sx) => {
                const px = ent.x + sx;
                const py = ent.y + sy;
                if (char !== ' ' && py >= 0 && py < drawGrid.length && px >= 0 && px < drawGrid[0].length) {
                  drawGrid[py][px] = { char: char, color: ent.color, className: ent.tags.join(' ') };
                }
              });
            });
          } else {
            if (ent.y >= 0 && ent.y < drawGrid.length && ent.x >= 0 && ent.x < drawGrid[0].length) {
              drawGrid[ent.y][ent.x] = { char: ent.char, color: ent.color, className: ent.tags.join(' ') };
            }
          }
        });

        let html = '';
        for (let y = 0; y < drawGrid.length; y++) {
          for (let x = 0; x < drawGrid[y].length; x++) {
            const tile = drawGrid[y][x];
            const mapTile = mapGrid[y] ? mapGrid[y][x] : null;

            let char, color, cls;

            if (typeof tile === 'object') {
              char = tile.char || ' ';
              if (char === ' ') {
                color = mapTile === Map.WALL ? '#3a3a3a' : '#556b55';
                cls = mapTile === Map.WALL ? 'wall' : 'floor';
                char = mapTile === Map.WALL ? '■' : '.';
              } else {
                color = tile.color || '#fff';
                cls = tile.className || '';
              }
            } else if (tile === Map.WALL) {
              char = '■'; color = '#3a3a3a'; cls = 'wall';
            } else if (tile === Map.FLOOR) {
              char = '.'; color = '#556b55'; cls = 'floor';
            } else {
              char = tile.toString(); color = '#fff'; cls = '';
            }

            html += `<span class="${cls}" style="color:${color}">${char}</span>`;
          }
          html += '\n';
        }
        gridEl.innerHTML = html;
        emit('rendered');
      }

      // --- INPUT HANDLING ---
      function setupInputs() {
        if (inputsSetup) return;
        inputsSetup = true;

        // Keyboard
        document.addEventListener('keydown', (e) => {
          const dirMap = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
          let input = null;
          if (dirMap[e.key]) input = { type: 'direction', dir: dirMap[e.key] };
          else if (e.key === ' ' || e.key === 'z') input = { type: 'action', action: 'a' };
          else if (e.key === 'x' || e.key === 'Escape') input = { type: 'action', action: 'b' };
          else if (e.key === 'Enter') input = { type: 'action', action: 'start' };
          else if (e.key === 'c' || e.key === 'Shift') input = { type: 'action', action: 'select' };

          if (input) {
            e.preventDefault();
            if (UI.handleUIInput(input)) return;
            emit('input', input);
          }
        });

        // D-Pad Buttons
        document.querySelectorAll('.dpad-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            const dir = btn.getAttribute('data-direction');
            const input = { type: 'direction', dir: dir };
            if (UI.handleUIInput(input)) return;
            emit('input', input);
          });
        });

        // Action Buttons
        document.getElementById('btn-a')?.addEventListener('click', () => {
          const input = { type: 'action', action: 'a' };
          if (UI.handleUIInput(input)) return;
          emit('input', input);
        });
        document.getElementById('btn-b')?.addEventListener('click', () => {
          const input = { type: 'action', action: 'b' };
          if (UI.handleUIInput(input)) return;
          emit('input', input);
        });

        // System Buttons
        document.getElementById('btn-start')?.addEventListener('click', () => {
          const input = { type: 'action', action: 'start' };
          if (UI.handleUIInput(input)) return;
          emit('input', input);
        });
        document.getElementById('btn-select')?.addEventListener('click', () => {
          const input = { type: 'action', action: 'select' };
          if (UI.handleUIInput(input)) return;
          emit('input', input);
        });

        // --- SWIPE & MOUSE DRAG SUPPORT ---
        let xDown = null, yDown = null;
        const screen = document.getElementById('screen');
        
        const handleSwipe = (xUp, yUp) => {
          if (!xDown || !yDown) return;
          const xDiff = xDown - xUp, yDiff = yDown - yUp;
          if (Math.abs(xDiff) < 20 && Math.abs(yDiff) < 20) return; // Too short

          let input;
          if (Math.abs(xDiff) > Math.abs(yDiff)) input = { type: 'direction', dir: xDiff > 0 ? 'left' : 'right' };
          else input = { type: 'direction', dir: yDiff > 0 ? 'up' : 'down' };
          
          xDown = yDown = null; // Reset
          if (UI.handleUIInput(input)) return; 
          emit('input', input);
        };

        // Touch (Mobile)
        screen.addEventListener('touchstart', (e) => { xDown = e.touches[0].clientX; yDown = e.touches[0].clientY; }, { passive: true });
        screen.addEventListener('touchend', (e) => { handleSwipe(e.changedTouches[0].clientX, e.changedTouches[0].clientY); }, { passive: true });
        
        // Mouse (Desktop click-and-drag)
        screen.addEventListener('mousedown', (e) => { e.preventDefault(); xDown = e.clientX; yDown = e.clientY; });
        screen.addEventListener('mouseup', (e) => { e.preventDefault(); handleSwipe(e.clientX, e.clientY); });
      }

      // --- MAP TOOLKIT ---
      const Map = (() => {
        const WALL = 0;
        const FLOOR = 1;

        function generateCellular(width, height, config = {}) {
          const { fillProb = 0.4, smoothSteps = 3, wall = WALL, floor = FLOOR } = config;

          let grid = Array(height).fill().map(() =>
            Array(width).fill().map(() => Math.random() < fillProb ? wall : floor)
          );

          for (let i = 0; i < smoothSteps; i++) {
            let newGrid = Array(height).fill().map(() => Array(width).fill(wall));
            for (let y = 0; y < height; y++) {
              for (let x = 0; x < width; x++) {
                let walls = countAdjacent(grid, x, y, wall, width, height);
                newGrid[y][x] = (walls >= 5 || (i === 0 && walls === 4)) ? wall : floor;
              }
            }
            grid = newGrid;
          }

          let regions = findRegions(grid, floor, width, height);
          while (regions.length > 1) {
            connectRegions(grid, regions, wall, floor, width, height);
            regions = findRegions(grid, floor, width, height);
          }

          return grid;
        }

        function countAdjacent(grid, x, y, target, w, h) {
          let count = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const nx = x + dx, ny = y + dy;
              if (nx < 0 || nx >= w || ny < 0 || ny >= h) count++;
              else if (grid[ny][nx] === target) count++;
            }
          }
          return count;
        }

        function findRegions(grid, floor, w, h) {
          let regions = [];
          let visited = Array(h).fill().map(() => Array(w).fill(false));
          for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
              if (!visited[y][x] && grid[y][x] === floor) {
                let region = floodFill(grid, x, y, visited, floor, w, h);
                regions.push(region);
              }
            }
          }
          return regions;
        }

        function floodFill(grid, x, y, visited, floor, w, h) {
          let queue = [[x, y]];
          let region = [];
          visited[y][x] = true;
          while (queue.length > 0) {
            let [cx, cy] = queue.shift();
            region.push([cx, cy]);
            const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
            for (let [dx, dy] of dirs) {
              let nx = cx + dx, ny = cy + dy;
              if (nx >= 0 && nx < w && ny >= 0 && ny < h && !visited[ny][nx] && grid[ny][nx] === floor) {
                visited[ny][nx] = true;
                queue.push([nx, ny]);
              }
            }
          }
          return region;
        }

        function connectRegions(grid, regions, wall, floor, w, h) {
          let bestDist = Infinity;
          let bestPair = null;
          for (let i = 0; i < regions.length; i++) {
            for (let j = i + 1; j < regions.length; j++) {
              for (let [x1, y1] of regions[i]) {
                for (let [x2, y2] of regions[j]) {
                  let dist = Math.abs(x1 - x2) + Math.abs(y1 - y2);
                  if (dist < bestDist) {
                    bestDist = dist;
                    bestPair = [[x1, y1], [x2, y2]];
                  }
                }
              }
            }
          }
          if (bestPair) {
            let [start, end] = bestPair;
            let [x, y] = start;
            while (x !== end[0] || y !== end[1]) {
              if (x < end[0]) x++;
              else if (x > end[0]) x--;
              if (y < end[1]) y++;
              else if (y > end[1]) y--;
              grid[y][x] = floor;
              if (Math.random() < 0.3) {
                const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
                for (let [dx, dy] of dirs) {
                  const nx = x + dx, ny = y + dy;
                  if (nx > 0 && nx < w - 1 && ny > 0 && ny < h - 1) {
                    grid[ny][nx] = floor;
                  }
                }
              }
            }
          }
        }

        function createRoom(grid, x, y, w, h, tileType = FLOOR) {
          for (let iy = y; iy < y + h; iy++) {
            for (let ix = x; ix < x + w; ix++) {
              if (ix >= 0 && ix < grid[0].length && iy >= 0 && iy < grid.length) {
                grid[iy][ix] = tileType;
              }
            }
          }
        }

        function getLineOfSight(grid, start, end, wall = WALL) {
          let x0 = start.x, y0 = start.y;
          let x1 = end.x, y1 = end.y;
          let dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
          let sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
          let err = dx - dy;
          let points = [{ x: x0, y: y0 }];

          while (true) {
            if (x0 === x1 && y0 === y1) break;
            if (grid[y0]?.[x0] === wall) return { hasLineOfSight: false, points: [] };
            let e2 = 2 * err;
            if (e2 > -dy) { err -= dy; x0 += sx; }
            if (e2 < dx) { err += dx; y0 += sy; }
            points.push({ x: x0, y: y0 });
          }
          return { hasLineOfSight: true, points };
        }

        function findFarthestPoint(grid, start, floor = FLOOR) {
          if (!grid[start.y] || grid[start.y][start.x] !== floor) {
            for (let y = 0; y < grid.length; y++) {
              for (let x = 0; x < grid[0].length; x++) {
                if (grid[y][x] === floor) { start = { x, y }; break; }
              }
              if (grid[start.y] && grid[start.y][start.x] === floor) break;
            }
          }
          
          let queue = [[start.x, start.y]];
          let visited = Array(grid.length).fill().map(() => Array(grid[0].length).fill(false));
          let farthest = start;
          visited[start.y][start.x] = true;
          while (queue.length > 0) {
            let [x, y] = queue.shift();
            farthest = { x, y };
            const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
            for (let [dx, dy] of dirs) {
              let nx = x + dx, ny = y + dy;
              if (nx >= 0 && nx < grid[0].length && ny >= 0 && ny < grid.length && !visited[ny][nx] && grid[ny][nx] === floor) {
                visited[ny][nx] = true;
                queue.push([nx, ny]);
              }
            }
          }
          return farthest;
        }

        return { generateCellular, createRoom, getLineOfSight, findFarthestPoint, WALL, FLOOR };
      })();

      // --- ENTITY SYSTEM ---
      const Entities = (() => {
        let entities = [];
        let nextId = 1;

        function create(config = {}) {
          const entity = {
            id: nextId++,
            x: config.x || 0,
            y: config.y || 0,
            char: config.char || '?',
            color: config.color || '#fff',
            tags: config.tags || [],
            data: config.data || {},
            onTick: config.onTick || null,
            onDestroy: config.onDestroy || null,
            persistent: config.persistent || false,
            facing: config.facing || 'down',
            sprite: config.sprite || null
          };
          entities.push(entity);
          return entity;
        }

        function remove(entity) {
          if (!entity) return;
          entities = entities.filter(e => e.id !== entity.id);
          if (entity.onDestroy) entity.onDestroy(entity);
        }

        function getAt(x, y, tags = []) {
          return entities.find(e => {
            const matchPos = e.sprite 
              ? (x >= e.x && x < e.x + e.sprite[0].length && y >= e.y && y < e.y + e.sprite.length)
              : (e.x === x && e.y === y);
            
            if (tags.length === 0) return matchPos;
            return matchPos && tags.some(tag => e.tags.includes(tag));
          });
        }

        function query(tags = []) {
          if (tags.length === 0) return [...entities];
          return entities.filter(e => tags.every(tag => e.tags.includes(tag)));
        }

        function clear() {
          entities.forEach(e => {
            if (!e.persistent && e.onDestroy) e.onDestroy(e);
          });
          entities = entities.filter(e => e.persistent);
        }

        function getInFront(entity) {
          const dx = entity.facing === 'left' ? -1 : entity.facing === 'right' ? 1 : 0;
          const dy = entity.facing === 'up' ? -1 : entity.facing === 'down' ? 1 : 0;
          return getAt(entity.x + dx, entity.y + dy);
        }

        return { create, remove, getAt, query, clear, getInFront };
      })();

      // --- UI SYSTEM ---
      const UI = (() => {
        let isPaused = false;
        let activeDialog = null;
        let activeMenu = null;
        let hudTop = null;
        let hudBottom = null;
        let activeTextInput = null;
        let logEl = null;
        let activeKeyboard = null;
        let activeGridMenu = null;

        function initUI(screenEl) {
          if (!document.getElementById('hud-top')) {
            hudTop = document.createElement('div');
            hudTop.id = 'hud-top';
            hudTop.style.display = 'none';
            screenEl.appendChild(hudTop);
          } else {
            hudTop = document.getElementById('hud-top');
          }

          if (!document.getElementById('hud-bottom')) {
            hudBottom = document.createElement('div');
            hudBottom.id = 'hud-bottom';
            hudBottom.style.display = 'none';
            screenEl.appendChild(hudBottom);
          } else {
            hudBottom = document.getElementById('hud-bottom');
          }

          if (!screenEl.querySelector('.ui-log')) {
            logEl = document.createElement('div');
            logEl.className = 'ui-log';
            screenEl.appendChild(logEl);
          } else {
            logEl = screenEl.querySelector('.ui-log');
          }
        }

        function setHUD(topText, bottomText) {
          if (topText !== null && topText !== undefined) {
            hudTop.textContent = topText;
            hudTop.style.display = 'block';
          } else {
            hudTop.style.display = 'none';
          }

          if (bottomText !== null && bottomText !== undefined) {
            hudBottom.textContent = bottomText;
            hudBottom.style.display = 'block';
          } else {
            hudBottom.style.display = 'none';
          }
        }

        function toast(message, duration = 1500) {
          const screenEl = document.getElementById('screen');
          const t = document.createElement('div');
          t.className = 'ui-toast';
          t.textContent = message;
          screenEl.appendChild(t);
          setTimeout(() => t.remove(), duration);
        }

        function showDialog(config = {}) {
          if (activeDialog) advanceDialog();
          
          isPaused = true;
          const screenEl = document.getElementById('screen');
          const box = document.createElement('div');
          box.className = 'ui-dialog-box';

          if (config.speaker) {
            const sp = document.createElement('div');
            sp.className = 'ui-dialog-speaker';
            sp.textContent = config.speaker;
            box.appendChild(sp);
          }

          const textEl = document.createElement('div');
          box.appendChild(textEl);

          const indicator = document.createElement('div');
          indicator.className = 'ui-dialog-indicator';
          indicator.textContent = '▼';
          indicator.style.display = 'none';
          box.appendChild(indicator);

          screenEl.appendChild(box);

          let charIndex = 0;
          let isTyping = true;

          const typeInterval = setInterval(() => {
            if (charIndex < config.text.length) {
              textEl.textContent += config.text[charIndex];
              charIndex++;
            } else {
              clearInterval(typeInterval);
              if (activeDialog) {
                activeDialog.isTyping = false;
                indicator.style.display = 'block';
              }
            }
          }, 30);

          activeDialog = { box, textEl, indicator, isTyping, onEnd: config.onEnd, typeInterval, fullText: config.text };
        }

        function advanceDialog() {
          if (!activeDialog) return;
          if (activeDialog.isTyping) {
            clearInterval(activeDialog.typeInterval);
            activeDialog.textEl.textContent = activeDialog.fullText;
            activeDialog.isTyping = false;
            activeDialog.indicator.style.display = 'block';
            return;
          }
          clearInterval(activeDialog.typeInterval);
          activeDialog.box.remove();
          const callback = activeDialog.onEnd;
          activeDialog = null;
          isPaused = false;
          if (callback) callback();
        }

        function cancelMenu() {
          if (!activeMenu) return;
          activeMenu.box.remove();
          const cancelCb = activeMenu.config?.onCancel;
          activeMenu = null;
          isPaused = false;
          if (cancelCb) cancelCb();
        }

        function showMenu(config = {}) {
          if (activeMenu) cancelMenu();
          
          isPaused = true;
          const screenEl = document.getElementById('screen');
          const box = document.createElement('div');
          box.className = 'ui-menu-box';

          const title = document.createElement('div');
          title.className = 'ui-menu-title';
          title.textContent = config.title || 'MENU';
          box.appendChild(title);

          const optionsContainer = document.createElement('div');
          box.appendChild(optionsContainer);

          screenEl.appendChild(box);

          let selectedIndex = 0;
          activeMenu = { box, optionsContainer, config, selectedIndex };

          renderMenuOptions();
        }

        function renderMenuOptions() {
          if (!activeMenu) return;
          const { optionsContainer, config, selectedIndex } = activeMenu;
          optionsContainer.innerHTML = '';

          config.options.forEach((opt, i) => {
            const div = document.createElement('div');
            div.className = `ui-menu-option ${i === selectedIndex ? 'selected' : ''}`;
            div.textContent = `${i === selectedIndex ? '▶ ' : '  '}${opt.text}`;
            optionsContainer.appendChild(div);
          });
        }

        function navigateMenu(dir) {
          if (!activeMenu) return;
          if (dir === 'up') activeMenu.selectedIndex = Math.max(0, activeMenu.selectedIndex - 1);
          if (dir === 'down') activeMenu.selectedIndex = Math.min(activeMenu.config.options.length - 1, activeMenu.selectedIndex + 1);
          renderMenuOptions();
        }

        function selectMenu() {
          if (!activeMenu) return;
          const opt = activeMenu.config.options[activeMenu.selectedIndex];
          activeMenu.box.remove();
          activeMenu = null;
          isPaused = false;
          if (opt && opt.onSelect) opt.onSelect();
        }

        function handleUIInput(input) {
          if (Cutscene.getIsActive()) {
            if (input.type === 'action') Cutscene.advance();
            return true;
          }

          if (activeKeyboard) {
            if (input.type === 'direction') navigateKeyboard(input.dir);
            if (input.type === 'action' && input.action === 'a') selectKeyboard();
            if (input.type === 'action' && input.action === 'b') {
              if (activeKeyboard.text.length > 0) {
                activeKeyboard.text = activeKeyboard.text.slice(0, -1);
                updateKeyboardText();
              }
            }
            return true;
          }

          if (activeDialog) {
            if (input.type === 'action') advanceDialog();
            return true;
          }

          if (activeMenu) {
            if (input.type === 'direction') navigateMenu(input.dir);
            if (input.type === 'action' && input.action === 'a') selectMenu();
            if (input.type === 'action' && input.action === 'b') cancelMenu();
            return true;
          }

          if (activeGridMenu) {
            if (input.type === 'direction') navigateGridMenu(input.dir);
            if (input.type === 'action' && input.action === 'a') selectGridMenu();
            if (input.type === 'action' && input.action === 'b') closeGridMenu();
            return true;
          }

          return false;
        }

        function getIsPaused() {
          return isPaused;
        }

        function showTextInput(config = {}) {
          isPaused = true;
          const screenEl = document.getElementById('screen');
          const box = document.createElement('div');
          box.className = 'ui-text-input-box';
          box.innerHTML = `
            <div style="color:#9fb982;font-size:11px;margin-bottom:4px">${config.prompt || 'Enter text:'}</div>
            <input type="text" id="ae-text-input" maxlength="${config.maxLength || 100}" value="${config.default || ''}" autocomplete="off">
            <div class="ui-text-input-hint">ENTER to send · ESC to cancel</div>
          `;
          screenEl.appendChild(box);

          const input = document.getElementById('ae-text-input');
          input.focus();

          activeTextInput = { box, config };

          input.addEventListener('keydown', (e) => {
            e.stopPropagation();
            if (e.key === 'Enter') {
              const val = input.value.trim();
              box.remove();
              activeTextInput = null;
              isPaused = false;
              if (config.onComplete) config.onComplete(val);
            } else if (e.key === 'Escape') {
              box.remove();
              activeTextInput = null;
              isPaused = false;
              if (config.onCancel) config.onCancel();
            }
          });
        }

        function showLog() { if (logEl) logEl.style.display = 'block'; }
        function hideLog() { if (logEl) logEl.style.display = 'none'; }
        function clearLog() { if (logEl) logEl.innerHTML = ''; }

        function addLogEntry(text, type = 'system') {
          if (!logEl) return;
          const entry = document.createElement('div');
          entry.className = `ui-log-entry ${type}`;
          entry.textContent = text;
          logEl.appendChild(entry);
          logEl.scrollTop = logEl.scrollHeight;
        }

        const KB_KEYS = [
          'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
          'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
          'U', 'V', 'W', 'X', 'Y', 'Z', '.', ' ', ',', '!',
          'DEL', 'CLR', 'END'
        ];

        function showKeyboard(config = {}) {
          if (activeKeyboard) closeKeyboard(true);
          
          isPaused = true;
          const screenEl = document.getElementById('screen');
          const box = document.createElement('div');
          box.className = 'ui-keyboard-box';

          box.innerHTML = `
            <div class="ui-keyboard-prompt">${config.prompt || 'Enter text:'}</div>
            <div class="ui-keyboard-text"><span class="ui-keyboard-text-cursor"></span></div>
            <div class="ui-keyboard-grid"></div>
          `;

          screenEl.appendChild(box);

          activeKeyboard = {
            box,
            config,
            text: config.default || '',
            cursor: 0,
            gridEl: box.querySelector('.ui-keyboard-grid'),
            textEl: box.querySelector('.ui-keyboard-text')
          };

          KB_KEYS.forEach((key, i) => {
            const keyEl = document.createElement('div');
            keyEl.className = `ui-keyboard-key ${key.length > 1 ? 'action' : ''} ${i === 0 ? 'selected' : ''}`;
            keyEl.textContent = key;
            activeKeyboard.gridEl.appendChild(keyEl);
          });

          updateKeyboardText();
        }

        function navigateKeyboard(dir) {
          if (!activeKeyboard) return;
          const keys = activeKeyboard.gridEl.children;
          keys[activeKeyboard.cursor].classList.remove('selected');

          let move = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
          let rowJump = dir === 'up' ? -10 : dir === 'down' ? 10 : 0;

          let newIndex = activeKeyboard.cursor + move + rowJump;

          if (newIndex < 0) newIndex = 0;
          if (newIndex >= KB_KEYS.length) newIndex = KB_KEYS.length - 1;

          if (KB_KEYS[newIndex] === 'DEL' && dir === 'right') newIndex -= 1;

          activeKeyboard.cursor = newIndex;
          keys[activeKeyboard.cursor].classList.add('selected');
        }

        function selectKeyboard() {
          if (!activeKeyboard) return;
          const key = KB_KEYS[activeKeyboard.cursor];

          if (key === 'END') {
            closeKeyboard(false);
          } else if (key === 'DEL') {
            activeKeyboard.text = activeKeyboard.text.slice(0, -1);
            updateKeyboardText();
          } else if (key === 'CLR') {
            activeKeyboard.text = '';
            updateKeyboardText();
          } else {
            if (activeKeyboard.text.length < (activeKeyboard.config.maxLength || 50)) {
              activeKeyboard.text += key;
              updateKeyboardText();
            }
          }
        }

        function updateKeyboardText() {
          if (!activeKeyboard) return;
          activeKeyboard.textEl.innerHTML = `${activeKeyboard.text}<span class="ui-keyboard-text-cursor"></span>`;
        }

        function closeKeyboard(cancelled = false) {
          if (!activeKeyboard) return;
          activeKeyboard.box.remove();
          const cb = cancelled ? activeKeyboard.config.onCancel : activeKeyboard.config.onComplete;
          const text = activeKeyboard.text;
          activeKeyboard = null;
          isPaused = false;
          if (cb) cb(cancelled ? null : text);
        }

        function showGridMenu(config = {}) {
          if (activeGridMenu) closeGridMenu();
          
          isPaused = true;
          const screenEl = document.getElementById('screen');
          const box = document.createElement('div');
          box.className = 'ui-grid-menu';

          let slots = [];

          config.slots.forEach((slot, i) => {
            const el = document.createElement('div');
            el.className = `ui-grid-slot ${i === 0 ? 'selected' : ''}`;
            el.style.left = slot.x + 'px';
            el.style.top = slot.y + 'px';
            el.textContent = slot.text;
            box.appendChild(el);
            slots.push({ ...slot, el });
          });

          screenEl.appendChild(box);
          activeGridMenu = { box, slots, selectedIndex: 0, onCancel: config.onCancel };
        }

        function navigateGridMenu(dir) {
          if (!activeGridMenu) return;
          const { slots } = activeGridMenu;
          const current = slots[activeGridMenu.selectedIndex];

          let bestDist = Infinity;
          let bestIdx = -1;

          slots.forEach((slot, i) => {
            if (i === activeGridMenu.selectedIndex) return;
            const dx = slot.x - current.x;
            const dy = slot.y - current.y;

            let isValid = false;
            if (dir === 'up' && dy < 0 && Math.abs(dy) >= Math.abs(dx)) isValid = true;
            if (dir === 'down' && dy > 0 && Math.abs(dy) >= Math.abs(dx)) isValid = true;
            if (dir === 'left' && dx < 0 && Math.abs(dx) >= Math.abs(dy)) isValid = true;
            if (dir === 'right' && dx > 0 && Math.abs(dx) >= Math.abs(dy)) isValid = true;

            if (isValid) {
              const dist = Math.abs(dx) + Math.abs(dy);
              if (dist < bestDist) {
                bestDist = dist;
                bestIdx = i;
              }
            }
          });

          if (bestIdx !== -1) {
            slots[activeGridMenu.selectedIndex].el.classList.remove('selected');
            activeGridMenu.selectedIndex = bestIdx;
            slots[activeGridMenu.selectedIndex].el.classList.add('selected');
          }
        }

        function selectGridMenu() {
          if (!activeGridMenu) return;
          const slot = activeGridMenu.slots[activeGridMenu.selectedIndex];
          closeGridMenu();
          if (slot && slot.onSelect) slot.onSelect();
        }

        function closeGridMenu() {
          if (!activeGridMenu) return;
          activeGridMenu.box.remove();
          const cb = activeGridMenu.onCancel;
          activeGridMenu = null;
          isPaused = false;
          if (cb) cb();
        }

        return { initUI, setHUD, toast, showDialog, showMenu, handleUIInput, isPaused: getIsPaused, showKeyboard, showLog, hideLog, clearLog, addLogEntry, showGridMenu };
      })();

      // --- HAPTICS SYSTEM ---
      const Haptics = (() => {
        const isSupported = 'vibrate' in navigator;
        function vibrate(pattern) { if (isSupported) navigator.vibrate(pattern); }
        return {
          light: () => vibrate(30),
          medium: () => vibrate(80),
          heavy: () => vibrate(150),
          custom: (pattern) => vibrate(pattern),
          stop: () => vibrate(0)
        };
      })();

      // --- AI SYSTEM ---
      const AI = (() => {
        let aiConfig = { baseUrl: '', apiKey: '', model: '' };
        function setup(config) { Object.assign(aiConfig, config); }

        async function prompt(systemPrompt, message, maxTokens = 50) {
          if (!aiConfig.apiKey) return "AI not configured.";

          try {
            const res = await fetch(aiConfig.baseUrl + aiConfig.model, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${aiConfig.apiKey}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                messages: [{ role: "system", content: systemPrompt }, { role: "user", content: message }],
                max_tokens: maxTokens,
                stream: false
              })
            });

            if (!res.ok) {
              console.error("AI HTTP Error:", res.status, await res.text());
              return "...";
            }

            const data = await res.json();

            if (data.result?.response) return data.result.response;
            if (typeof data.result === 'string') return data.result;
            if (data.response) return data.response;

            console.log("AI Raw Response:", data);
            return "...";

          } catch (e) {
            console.error("AI Error:", e);
            return "...";
          }
        }

        return { setup, prompt };
      })();

      // --- CUTSCENE SYSTEM ---
      const Cutscene = (() => {
        let isActive = false;
        let overlayEl = null;
        let currentScene = 0;
        let scenes = [];
        let options = {};
        let timeoutId = null;
        let waitingForClick = false;
        let progressInterval = null;

        function play(sceneList, config = {}) {
          if (isActive) endCutscene();

          scenes = sceneList;
          options = {
            timesList: config.timesList || null,
            both: config.both || false,
            typewriter: config.typewriter || false,
            textSpeed: config.textSpeed || 40,
            onEnd: config.onEnd || null
          };

          isActive = true;
          currentScene = 0;

          overlayEl = document.createElement('div');
          overlayEl.className = 'cutscene-overlay';
          document.getElementById('screen').appendChild(overlayEl);

          showScene();
        }

        function showScene() {
          if (currentScene >= scenes.length) {
            endCutscene();
            return;
          }

          clearTimeout(timeoutId);
          clearInterval(progressInterval);
          waitingForClick = false;

          overlayEl.innerHTML = '';

          const textEl = document.createElement('div');
          textEl.className = 'cutscene-text';
          overlayEl.appendChild(textEl);

          const text = scenes[currentScene];
          const time = options.timesList ? options.timesList[currentScene] : null;

          if (options.typewriter) {
            let charIndex = 0;
            const typeInterval = setInterval(() => {
              if (charIndex < text.length) {
                textEl.textContent += text[charIndex];
                charIndex++;
              } else {
                clearInterval(typeInterval);
                handleTypingComplete(time);
              }
            }, options.textSpeed);
          } else {
            textEl.textContent = text;
            handleTypingComplete(time);
          }
        }

        function handleTypingComplete(time) {
          if (time != null) {
            showProgress(time);
            timeoutId = setTimeout(() => {
              if (options.both) {
                waitingForClick = true;
                showIndicator('▼');
              } else {
                currentScene++;
                showScene();
              }
            }, time * 1000);
          } else {
            waitingForClick = true;
            showIndicator('▼');
          }
        }

        function showProgress(duration) {
          const prog = document.createElement('div');
          prog.className = 'cutscene-progress';
          overlayEl.appendChild(prog);

          let start = Date.now();
          progressInterval = setInterval(() => {
            const elapsed = Date.now() - start;
            const pct = Math.min(elapsed / (duration * 1000), 1);
            const deg = pct * 360;
            prog.style.background = `conic-gradient(#3a3a3a ${deg}deg, #5a5a5a ${deg}deg)`;
            if (pct >= 1) clearInterval(progressInterval);
          }, 16);
        }

        function showIndicator(text) {
          const ind = document.createElement('div');
          ind.className = 'cutscene-indicator';
          ind.textContent = text;
          overlayEl.appendChild(ind);
        }

        function advance() {
          if (!isActive) return;
          if (waitingForClick) {
            currentScene++;
            showScene();
          }
        }

        function endCutscene() {
          isActive = false;
          clearTimeout(timeoutId);
          clearInterval(progressInterval);
          if (overlayEl) overlayEl.remove();
          overlayEl = null;
          if (options.onEnd) options.onEnd();
        }

        function getIsActive() { return isActive; }

        return { play, advance, getIsActive };
      })();

      // --- GAME LOOP ---
      const Loop = (() => {
        let running = false;
        let rafId = null;
        let lastTime = 0;
        let tickCount = 0;

        function start() {
          running = true;
          lastTime = performance.now();
          tickCount = 0;
          tick();
        }

        function stop() {
          running = false;
          if (rafId) cancelAnimationFrame(rafId);
          rafId = null;
        }

        function tick() {
          if (!running) return;
          const now = performance.now();
          const dt = (now - lastTime) / 1000;
          lastTime = now;
          tickCount++;
          emit('tick', { dt, time: now, tick: tickCount });
          rafId = requestAnimationFrame(tick);
        }

        return { start, stop, isRunning: () => running };
      })();

      // --- STORAGE SYSTEM ---
      const Storage = (() => {
        function save(key, val) {
          try { localStorage.setItem('ae_' + key, JSON.stringify(val)); return true; }
          catch (e) { console.error("Storage save error", e); return false; }
        }
        function load(key) {
          try { const d = localStorage.getItem('ae_' + key); return d ? JSON.parse(d) : null; }
          catch (e) { return null; }
        }
        function remove(key) { localStorage.removeItem('ae_' + key); }
        return { save, load, remove };
      })();

      // --- PHYSICS SYSTEM ---
      const Physics = (() => {
        function canMove(x, y, map, solidTags = ['solid', 'enemy', 'npc']) {
          if (!map[y] || map[y][x] === undefined) return false;
          if (map[y][x] === Map.WALL) return false;
          const ent = Entities.getAt(x, y, solidTags);
          return !ent;
        }

        function tryMove(entity, dir, map, solidTags = ['solid', 'enemy', 'npc']) {
          const dx = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
          const dy = dir === 'up' ? -1 : dir === 'down' ? 1 : 0;
          const nx = entity.x + dx, ny = entity.y + dy;

          if (!canMove(nx, ny, map, solidTags)) {
            return { moved: false, blockedBy: Entities.getAt(nx, ny, solidTags) || map[ny]?.[nx] };
          }

          entity.facing = dir;
          entity.x = nx;
          entity.y = ny;
          return { moved: true, blockedBy: null };
        }

        return { canMove, tryMove };
      })();

      // --- CARTRIDGE SYSTEM ---
      const Cartridge = (config) => {
        listeners['ready'] = [];
        listeners['input'] = [];
        listeners['tick'] = [];

        const ctx = {
          _map: null,
          
          set map(m) { this._map = m; },
          get map() { return this._map; },
          
          add(x, y, char, color, tags = [], data = {}) { 
            return Entities.create({ x, y, char, color, tags, ...data }); 
          },
          remove(ent) { Entities.remove(ent); },
          query(tags) { return Entities.query(tags); },
          getAt(x, y) { return Entities.getAt(x, y); },
          
          move(ent, dir, solidTags = ['solid', 'enemy', 'npc']) {
            if (!ent || !this._map) return { moved: false, blockedBy: null };
            return Physics.tryMove(ent, dir, this._map, solidTags);
          },
          look(ent) { return Entities.getInFront(ent); },
          
          render(mapGrid, ents) {
            const m = mapGrid || this._map;
            const e = ents || Entities.query();
            if (m) render(m, e);
          },
          
          toast(msg) { UI.toast(msg); },
          haptic(level = 'light') { Haptics[level](); },
          dialog(cfg) { UI.showDialog(cfg); },
          menu(cfg) { UI.showMenu(cfg); },
          cutscene(scenes, cfg) { Cutscene.play(scenes, cfg); },
          
          save(key, val) { Storage.save(config.title + '_' + key, val); },
          load(key) { return Storage.load(config.title + '_' + key); }
        };

        for (const key in config) {
          if (typeof config[key] === 'function') {
            ctx[key] = config[key].bind(ctx);
          } else if (!(key in ctx)) {
            ctx[key] = config[key];
          }
        }

        if (gridEl) {
          if (config.create) config.create.call(ctx);
          if (config.draw) config.draw.call(ctx);
        } else {
          on('ready', () => {
            if (config.create) config.create.call(ctx);
            if (config.draw) config.draw.call(ctx);
          });
        }

        on('input', (input) => {
          if (UI.isPaused() || Cutscene.getIsActive()) return;
          if (config.update) {
            config.update.call(ctx, input);
            if (config.draw) config.draw.call(ctx);
          }
        });

        if (config.tick) {
          on('tick', (data) => {
            if (UI.isPaused() || Cutscene.getIsActive()) return;
            config.tick.call(ctx, data);
            if (config.draw) config.draw.call(ctx);
          });
        }
      };

      // --- PUBLIC API ---
      return {
        on, emit, init, render,
        Map, Entities, UI, Haptics, AI, Cutscene, Loop, Storage, Physics,
        Cartridge,
        getConfig: () => config
      };
    })();

AlterEngine.Cartridge({
  title: "SOKOBAN",
  
  state: 'menu',
  player: null,
  boxes: [],
  targets: [],
  map: [],
  moves: 0,
  currentLevel: 0,
  undoStack: [],
  
  levels: [
    // Level 1: First Push (Straight line)
    [
      "#####",
      "#   #",
      "# $ #",
      "# . #",
      "# @ #",
      "#####"
    ],
    // Level 2: The L-Shape (Navigate around the box)
    [
      "######",
      "#  . #",
      "#    #",
      "# $  #",
      "#  @ #",
      "######"
    ],
    // Level 3: Parallel Parking (Two boxes, simple pushes)
    [
      "######",
      "# .  #",
      "# $  #",
      "#    #",
      "# $  #",
      "# .@ #",
      "######"
    ],
    // Level 4: The Cross (Order matters! Don't block yourself)
    [
      "######",
      "#    #",
      "# $. #",
      "# .$ #",
      "#  @ #",
      "######"
    ],
    // Level 5: The Trifecta (3 boxes, tight quarters)
    [
      "#####",
      "# . #",
      "# $ #",
      "#.$ #",
      "#.$ #",
      "# @ #",
      "#####"
    ]
  ],

  // --- Lifecycle ---
  create() {
    this.state = 'menu';
    this.showMainMenu();
  },
  
  showMainMenu() {
    this.state = 'menu';
    const best = this.load('highestLevel') || 0;
    
    // Generate a cool background
    this.map = AlterEngine.Map.generateCellular(9, 9, { fillProb: 0.45, smoothSteps: 5 });
    this.render();
    
    this.menu({
      title: "📦 SOKOBAN",
      options: [
        { text: "Play Game", onSelect: () => this.startLevel(0) },
        { text: "How to Play", onSelect: () => this.showHelp() },
        { text: `Reached Level: ${best + 1}`, onSelect: () => {} }
      ]
    });
  },
  
  showHelp() {
    this.dialog({
      speaker: "HOW TO PLAY",
      text: "D-Pad: Move player.\n\nPush boxes (□) onto targets (·).\n\nB Button: Undo last move.\n\nYou can only push, never pull!\nDon't corner yourself!",
      onEnd: () => this.showMainMenu()
    });
  },
  
  startLevel(levelIdx) {
    this.currentLevel = levelIdx;
    this.moves = 0;
    this.undoStack = [];
    this.boxes = [];
    this.targets = [];
    this.player = null;
    
    // Create empty map
    this.map = Array(9).fill().map(() => Array(9).fill(AlterEngine.Map.WALL));
    
    const layout = this.levels[levelIdx];
    
    for (let y = 0; y < layout.length; y++) {
      for (let x = 0; x < layout[y].length; x++) {
        const char = layout[y][x];
        // Keep a 1-tile border of walls around the edge
        const px = x + 1; 
        const py = y + 1;
        
        if (char === '#') {
          this.map[py][px] = AlterEngine.Map.WALL;
        } else {
          this.map[py][px] = AlterEngine.Map.FLOOR;
          
          if (char === '@') this.player = { x: px, y: py };
          if (char === '$') this.boxes.push({ x: px, y: py });
          if (char === '.') this.targets.push({ x: px, y: py });
          if (char === '*') { // Box already on target
            this.boxes.push({ x: px, y: py });
            this.targets.push({ x: px, y: py });
          }
          if (char === '+') { // Player on target
            this.player = { x: px, y: py };
            this.targets.push({ x: px, y: py });
          }
        }
      }
    }
    
    this.state = 'playing';
    this.draw(); // Force initial render
  },
  
  // --- Input (Turn-Based) ---
  update(input) {
    if (this.state !== 'playing') return;
    
    // Undo
    if (input.type === 'action' && input.action === 'b') {
      if (this.undoStack.length > 0) {
        const prev = this.undoStack.pop();
        this.player.x = prev.px;
        this.player.y = prev.py;
        if (prev.bi !== null) {
          this.boxes[prev.bi].x = prev.bx;
          this.boxes[prev.bi].y = prev.by;
        }
        this.moves--;
        this.haptic('light');
      }
      return;
    }
    
    // Movement
    if (input.type === 'direction') {
      const dx = input.dir === 'left' ? -1 : input.dir === 'right' ? 1 : 0;
      const dy = input.dir === 'up' ? -1 : input.dir === 'down' ? 1 : 0;
      
      const nx = this.player.x + dx;
      const ny = this.player.y + dy;
      
      // Check wall collision
      if (this.map[ny][nx] === AlterEngine.Map.WALL) return;
      
      // Check box collision
      const boxIdx = this.boxes.findIndex(b => b.x === nx && b.y === ny);
      
      if (boxIdx !== -1) {
        // There is a box. Can we push it?
        const bx = nx + dx;
        const by = ny + dy;
        
        // Check if box destination is wall or another box
        if (this.map[by][bx] === AlterEngine.Map.WALL) return;
        if (this.boxes.some(b => b.x === bx && b.y === by)) return;
        
        // Push the box!
        this.undoStack.push({ px: this.player.x, py: this.player.y, bx: nx, by: ny, bi: boxIdx });
        this.boxes[boxIdx].x = bx;
        this.boxes[boxIdx].y = by;
        this.player.x = nx;
        this.player.y = ny;
        this.moves++;
        this.haptic('medium');
        
      } else {
        // Just move player
        this.undoStack.push({ px: this.player.x, py: this.player.y, bx: null, by: null, bi: null });
        this.player.x = nx;
        this.player.y = ny;
        this.moves++;
        this.haptic('light');
      }
      
      // Check Win Condition
      const won = this.targets.every(t => this.boxes.some(b => b.x === t.x && b.y === t.y));
      
      if (won) {
        this.state = 'levelcomplete';
        this.haptic('heavy');
        
        const best = this.load('highestLevel') || 0;
        if (this.currentLevel >= best) {
          this.save('highestLevel', this.currentLevel + 1);
        }
        
        if (this.currentLevel < this.levels.length - 1) {
          this.toast("Level Complete!");
          setTimeout(() => this.startLevel(this.currentLevel + 1), 1500);
        } else {
          this.cutscene(["🎉 YOU WIN! 🎉", `Total Moves: ${this.moves}`, "All puzzles solved!"], {
            typewriter: true, both: true, timesList: [3, 3, 4], onEnd: () => this.showMainMenu()
          });
        }
      }
    }
    
    // Pause menu
    if (input.type === 'action' && input.action === 'start') {
      this.menu({
        title: "PAUSED",
        options: [
          { text: "Resume", onSelect: () => { this.state = 'playing'; } },
          { text: "Restart Level", onSelect: () => this.startLevel(this.currentLevel) },
          { text: "Quit", onSelect: () => this.showMainMenu() }
        ]
      });
    }
  },
  
  // --- Rendering ---
  draw() {
    if (this.state === 'menu') return;
    
    // Custom dark dungeon aesthetic
    const v = Array(9).fill().map(() => Array(9).fill().map(() => ({ char: ' ', color: '#111122' })));
    
    // Map
    for (let y = 0; y < 9; y++) {
      for (let x = 0; x < 9; x++) {
        if (this.map[y][x] === AlterEngine.Map.WALL) {
          v[y][x] = { char: '█', color: '#444466' };
        } else if (this.map[y][x] === AlterEngine.Map.FLOOR) {
          v[y][x] = { char: '·', color: '#222233' }; // Subtle floor dots
        }
      }
    }
    
    // Targets
    this.targets.forEach(t => {
      const boxOnTop = this.boxes.some(b => b.x === t.x && b.y === t.y);
      if (!boxOnTop) {
        v[t.y][t.x] = { char: '○', color: '#ffcc00' }; // Empty target
      }
    });
    
    // Boxes
    this.boxes.forEach(b => {
      const onTarget = this.targets.some(t => t.x === b.x && t.y === b.y);
      v[b.y][b.x] = { char: '□', color: onTarget ? '#44ff44' : '#ff8844' }; // Green if done, orange if not
    });
    
    // Player
    if (this.player) {
      v[this.player.y][this.player.x] = { char: '@', color: '#9fb982' };
    }
    
    AlterEngine.render(v);
    AlterEngine.UI.setHUD(`Level: ${this.currentLevel + 1}/${this.levels.length}`, `Moves: ${this.moves} | B:Undo`);
  }
});
AlterEngine.init({ width: 9, height: 9 });