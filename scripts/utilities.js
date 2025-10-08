        // 🎲 MATH & RANDOM UTILITIES
        function randomNum(min, max) {
            return Math.random() * (max - min) + min;
        }

        function randomInt(min, max) {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }

        function randomChoice(array) {
            return array[Math.floor(Math.random() * array.length)];
        }

        function shuffle(array) {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
            return array;
        }

        function clamp(value, min, max) {
            return Math.min(Math.max(value, min), max);
        }

        function lerp(start, end, t) {
            return start + (end - start) * t;
        }

        function map(value, inMin, inMax, outMin, outMax) {
            return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
        }

        function distance(x1, y1, x2, y2) {
            return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
        }

        function distance3D(x1, y1, z1, x2, y2, z2) {
            return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2 + (z2 - z1) ** 2);
        }

        function randomGaussian(mean = 0, stdDev = 1) {
            let u = 0, v = 0;
            while(u === 0) u = Math.random();
            while(v === 0) v = Math.random();
            const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
            return z * stdDev + mean;
        }
        // String Utilities
        function capitalize(str) {
            return str.replace(/\w\S*/g, (txt) => 
                txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
            );
        }
        function randomBool(probability = 0.5) {
            return Math.random() < probability;
        }

        function degToRad(degrees) {
            return degrees * (Math.PI / 180);
        }

        function radToDeg(radians) {
            return radians * (180 / Math.PI);
        }

        function isPrime(n) {
            if (n <= 1) return false;
            if (n <= 3) return true;
            if (n % 2 === 0 || n % 3 === 0) return false;
            for (let i = 5; i * i <= n; i += 6) {
                if (n % i === 0 || n % (i + 2) === 0) return false;
            }
            return true;
        }

        function factorial(n) {
            if (n <= 1) return 1;
            return n * factorial(n - 1);
        }

        function gcd(a, b) {
            return b === 0 ? a : gcd(b, a % b);
        }

        // 🎨 COLOR UTILITIES
        function hexToRgb(hex) {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : null;
        }

        function rgbToHex(r, g, b) {
            return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
        }

        function randomColor() {
            return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
        }

        function colorLerp(color1, color2, t) {
            const rgb1 = hexToRgb(color1);
            const rgb2 = hexToRgb(color2);
            const r = Math.round(lerp(rgb1.r, rgb2.r, t));
            const g = Math.round(lerp(rgb1.g, rgb2.g, t));
            const b = Math.round(lerp(rgb1.b, rgb2.b, t));
            return rgbToHex(r, g, b);
        }

        function rgbToHsl(r, g, b) {
            r /= 255; g /= 255; b /= 255;
            const max = Math.max(r, g, b), min = Math.min(r, g, b);
            let h, s, l = (max + min) / 2;
            
            if (max === min) {
                h = s = 0;
            } else {
                const d = max - min;
                s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                switch (max) {
                    case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                    case g: h = (b - r) / d + 2; break;
                    case b: h = (r - g) / d + 4; break;
                }
                h /= 6;
            }
            return { h: h * 360, s: s * 100, l: l * 100 };
        }

        function hslToRgb(h, s, l) {
            h /= 360; s /= 100; l /= 100;
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            
            let r, g, b;
            if (s === 0) {
                r = g = b = l;
            } else {
                const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                const p = 2 * l - q;
                r = hue2rgb(p, q, h + 1/3);
                g = hue2rgb(p, q, h);
                b = hue2rgb(p, q, h - 1/3);
            }
            return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
        }

        function lightenColor(color, amount) {
            const rgb = hexToRgb(color);
            const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
            hsl.l = Math.min(100, hsl.l + amount);
            const newRgb = hslToRgb(hsl.h, hsl.s, hsl.l);
            return rgbToHex(newRgb.r, newRgb.g, newRgb.b);
        }

        function darkenColor(color, amount) {
            const rgb = hexToRgb(color);
            const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
            hsl.l = Math.max(0, hsl.l - amount);
            const newRgb = hslToRgb(hsl.h, hsl.s, hsl.l);
            return rgbToHex(newRgb.r, newRgb.g, newRgb.b);
        }

        function getContrastColor(color) {
            const rgb = hexToRgb(color);
            const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
            return brightness > 128 ? '#000000' : '#ffffff';
        }

        function colorPalette(baseColor, count = 5) {
            const rgb = hexToRgb(baseColor);
            const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
            const palette = [];
            
            for (let i = 0; i < count; i++) {
                const newHsl = {
                    h: (hsl.h + (360 / count) * i) % 360,
                    s: hsl.s,
                    l: hsl.l
                };
                const newRgb = hslToRgb(newHsl.h, newHsl.s, newHsl.l);
                palette.push(rgbToHex(newRgb.r, newRgb.g, newRgb.b));
            }
            return palette;
        }

        function isValidColor(color) {
            return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
        }

        // ⏱️ TIME & ANIMATION UTILITIES
        function delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        function debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }

        function throttle(func, limit) {
            let inThrottle;
            return function() {
                const args = arguments;
                const context = this;
                if (!inThrottle) {
                    func.apply(context, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        }

        function easeInOut(t) {
            return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        }

        function easeIn(t) {
            return t * t;
        }

        function easeOut(t) {
            return 1 - (1 - t) * (1 - t);
        }

        function elasticEase(t) {
            const c4 = (2 * Math.PI) / 3;
            return t === 0 ? 0 : t === 1 ? 1 : 
                   -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4);
        }

        function formatTime(seconds) {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const secs = Math.floor(seconds % 60);
            
            if (hours > 0) {
                return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            }
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }

        class Timer {
            constructor(duration, callback) {
                this.duration = duration;
                this.callback = callback;
                this.remaining = duration;
                this.startTime = null;
                this.pausedTime = 0;
                this.running = false;
                this.intervalId = null;
            }

            start() {
                if (this.running) return;
                this.running = true;
                this.startTime = Date.now() - this.pausedTime;
                this.intervalId = setInterval(() => {
                    this.remaining = Math.max(0, this.duration - (Date.now() - this.startTime));
                    if (this.remaining <= 0) {
                        this.stop();
                        this.callback();
                    }
                }, 16);
            }

            pause() {
                if (!this.running) return;
                this.running = false;
                this.pausedTime = Date.now() - this.startTime;
                clearInterval(this.intervalId);
            }

            stop() {
                this.running = false;
                clearInterval(this.intervalId);
                this.remaining = this.duration;
                this.pausedTime = 0;
            }

            getRemaining() {
                return this.remaining;
            }
        }

        class Stopwatch {
            constructor() {
                this.startTime = null;
                this.elapsed = 0;
                this.running = false;
                this.laps = [];
            }

            start() {
                if (this.running) return;
                this.running = true;
                this.startTime = Date.now() - this.elapsed;
            }

            stop() {
                if (!this.running) return;
                this.running = false;
                this.elapsed = Date.now() - this.startTime;
            }

            reset() {
                this.running = false;
                this.elapsed = 0;
                this.startTime = null;
                this.laps = [];
            }

            lap() {
                if (!this.running) return;
                const lapTime = Date.now() - this.startTime;
                this.laps.push(lapTime);
                return lapTime;
            }

            getTime() {
                if (this.running) {
                    return Date.now() - this.startTime;
                }
                return this.elapsed;
            }
        }

        let fpsCounter = { frames: 0, lastTime: performance.now() };
        function fps() {
            fpsCounter.frames++;
            const now = performance.now();
            if (now - fpsCounter.lastTime >= 1000) {
                const currentFps = fpsCounter.frames;
                fpsCounter.frames = 0;
                fpsCounter.lastTime = now;
                return currentFps;
            }
            return null;
        }

        function timeAgo(date) {
            const now = new Date();
            const diff = now - new Date(date);
            const seconds = Math.floor(diff / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);
            
            if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
            if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
            if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
            return `${seconds} second${seconds > 1 ? 's' : ''} ago`;
        }

        // 🔧 OBJECT & ARRAY UTILITIES
        function deepClone(obj) {
            if (obj === null || typeof obj !== "object") return obj;
            if (obj instanceof Date) return new Date(obj.getTime());
            if (obj instanceof Array) return obj.map(item => deepClone(item));
            if (typeof obj === "object") {
                const clonedObj = {};
                for (const key in obj) {
                    if (obj.hasOwnProperty(key)) {
                        clonedObj[key] = deepClone(obj[key]);
                    }
                }
                return clonedObj;
            }
        }
        function quickSort(arr) {
            if (arr.length <= 1) return arr;
            
            const pivot = arr[Math.floor(arr.length / 2)];
            const left = arr.filter(x => x < pivot);
            const middle = arr.filter(x => x === pivot);
            const right = arr.filter(x => x > pivot);
            
            return [...quickSort(left), ...middle, ...quickSort(right)];
        }
        function chunk(array, size) {
            const chunks = [];
            for (let i = 0; i < array.length; i += size) {
                chunks.push(array.slice(i, i + size));
            }
            return chunks;
        }

        function unique(array) {
            return [...new Set(array)];
        }

        function flatten(array) {
            return array.reduce((flat, item) => 
                flat.concat(Array.isArray(item) ? flatten(item) : item), []);
        }

        function groupBy(array, key) {
            return array.reduce((groups, item) => {
                const group = item[key];
                groups[group] = groups[group] || [];
                groups[group].push(item);
                return groups;
            }, {});
        }

        function sortBy(array, key, desc = false) {
            return array.sort((a, b) => {
                const aVal = typeof key === 'function' ? key(a) : a[key];
                const bVal = typeof key === 'function' ? key(b) : b[key];
                if (aVal < bVal) return desc ? 1 : -1;
                if (aVal > bVal) return desc ? -1 : 1;
                return 0;
            });
        }

        function pick(obj, keys) {
            const result = {};
            keys.forEach(key => {
                if (key in obj) result[key] = obj[key];
            });
            return result;
        }

        function omit(obj, keys) {
            const result = { ...obj };
            keys.forEach(key => delete result[key]);
            return result;
        }

        function merge(target, ...sources) {
            if (!sources.length) return target;
            const source = sources.shift();
            
            if (typeof target === 'object' && typeof source === 'object') {
                for (const key in source) {
                    if (typeof source[key] === 'object' && !Array.isArray(source[key])) {
                        if (!target[key]) target[key] = {};
                        merge(target[key], source[key]);
                    } else {
                        target[key] = source[key];
                    }
                }
            }
            return merge(target, ...sources);
        }

        function isEmpty(value) {
            if (value == null) return true;
            if (Array.isArray(value) || typeof value === 'string') return value.length === 0;
            if (typeof value === 'object') return Object.keys(value).length === 0;
            return false;
        }

        function isEqual(a, b) {
            if (a === b) return true;
            if (a == null || b == null) return false;
            if (Array.isArray(a) && Array.isArray(b)) {
                if (a.length !== b.length) return false;
                return a.every((val, i) => isEqual(val, b[i]));
            }
            if (typeof a === 'object' && typeof b === 'object') {
                const keysA = Object.keys(a);
                const keysB = Object.keys(b);
                if (keysA.length !== keysB.length) return false;
                return keysA.every(key => isEqual(a[key], b[key]));
            }
            return false;
        }

        function findIndex(array, predicate) {
            for (let i = 0; i < array.length; i++) {
                if (predicate(array[i], i, array)) return i;
            }
            return -1;
        }

        function partition(array, predicate) {
            const truthy = [];
            const falsy = [];
            array.forEach(item => {
                (predicate(item) ? truthy : falsy).push(item);
            });
            return [truthy, falsy];
        }

        function zip(...arrays) {
            const length = Math.min(...arrays.map(arr => arr.length));
            return Array.from({ length }, (_, i) => arrays.map(arr => arr[i]));
        }

        // 🎮 GAME DEVELOPMENT UTILITIES
        class Vector2 {
            constructor(x = 0, y = 0) {
                this.x = x;
                this.y = y;
            }

            add(other) {
                return new Vector2(this.x + other.x, this.y + other.y);
            }

            subtract(other) {
                return new Vector2(this.x - other.x, this.y - other.y);
            }

            multiply(scalar) {
                return new Vector2(this.x * scalar, this.y * scalar);
            }

            magnitude() {
                return Math.sqrt(this.x * this.x + this.y * this.y);
            }

            normalize() {
                const mag = this.magnitude();
                return mag > 0 ? new Vector2(this.x / mag, this.y / mag) : new Vector2(0, 0);
            }

            dot(other) {
                return this.x * other.x + this.y * other.y;
            }

            angle() {
                return Math.atan2(this.y, this.x);
            }

            rotate(angle) {
                const cos = Math.cos(angle);
                const sin = Math.sin(angle);
                return new Vector2(
                    this.x * cos - this.y * sin,
                    this.x * sin + this.y * cos
                );
            }
        }

        class Vector3 {
            constructor(x = 0, y = 0, z = 0) {
                this.x = x;
                this.y = y;
                this.z = z;
            }

            add(other) {
                return new Vector3(this.x + other.x, this.y + other.y, this.z + other.z);
            }

            subtract(other) {
                return new Vector3(this.x - other.x, this.y - other.y, this.z - other.z);
            }

            multiply(scalar) {
                return new Vector3(this.x * scalar, this.y * scalar, this.z * scalar);
            }

            magnitude() {
                return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
            }

            normalize() {
                const mag = this.magnitude();
                return mag > 0 ? new Vector3(this.x / mag, this.y / mag, this.z / mag) : new Vector3(0, 0, 0);
            }

            dot(other) {
                return this.x * other.x + this.y * other.y + this.z * other.z;
            }

            cross(other) {
                return new Vector3(
                    this.y * other.z - this.z * other.y,
                    this.z * other.x - this.x * other.z,
                    this.x * other.y - this.y * other.x
                );
            }

            distance(other) {
                return this.subtract(other).magnitude();
            }
        }

        function collision(rect1, rect2) {
            return rect1.x < rect2.x + rect2.width &&
                   rect1.x + rect1.width > rect2.x &&
                   rect1.y < rect2.y + rect2.height &&
                   rect1.y + rect1.height > rect2.y;
        }

        function circleCollision(c1, c2) {
            const dx = c1.x - c2.x;
            const dy = c1.y - c2.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            return distance < (c1.radius + c2.radius);
        }

        function pointInRect(x, y, rect) {
            return x >= rect.x && x <= rect.x + rect.width &&
                   y >= rect.y && y <= rect.y + rect.height;
        }

        function pointInCircle(x, y, circle) {
            const dx = x - circle.x;
            const dy = y - circle.y;
            return (dx * dx + dy * dy) <= (circle.radius * circle.radius);
        }

        class GameLoop {
            constructor(callback) {
                this.callback = callback;
                this.lastTime = 0;
                this.running = false;
                this.animationId = null;
            }

            start() {
                if (this.running) return;
                this.running = true;
                this.lastTime = performance.now();
                this.loop();
            }

            stop() {
                this.running = false;
                if (this.animationId) {
                    cancelAnimationFrame(this.animationId);
                }
            }

            loop() {
                if (!this.running) return;
                
                const currentTime = performance.now();
                const deltaTime = (currentTime - this.lastTime) / 1000;
                this.lastTime = currentTime;
                
                this.callback(deltaTime);
                this.animationId = requestAnimationFrame(() => this.loop());
            }
        }

        class Entity {
            constructor(x = 0, y = 0, width = 32, height = 32) {
                this.position = new Vector2(x, y);
                this.velocity = new Vector2(0, 0);
                this.acceleration = new Vector2(0, 0);
                this.width = width;
                this.height = height;
                this.rotation = 0;
                this.scale = new Vector2(1, 1);
                this.active = true;
            }

            update(deltaTime) {
                if (!this.active) return;
                this.velocity = this.velocity.add(this.acceleration.multiply(deltaTime));
                this.position = this.position.add(this.velocity.multiply(deltaTime));
            }

            getBounds() {
                return {
                    x: this.position.x,
                    y: this.position.y,
                    width: this.width * this.scale.x,
                    height: this.height * this.scale.y
                };
            }

            collidesWith(other) {
                return collision(this.getBounds(), other.getBounds());
            }
        }

        class Camera2D {
            constructor(x = 0, y = 0) {
                this.position = new Vector2(x, y);
                this.target = null;
                this.bounds = null;
                this.zoom = 1;
                this.smoothing = 0.1;
            }

            follow(target) {
                this.target = target;
            }

            setBounds(x, y, width, height) {
                this.bounds = { x, y, width, height };
            }

            update() {
                if (this.target) {
                    const targetPos = this.target.position || this.target;
                    const desiredPos = new Vector2(targetPos.x, targetPos.y);
                    
                    this.position = this.position.add(
                        desiredPos.subtract(this.position).multiply(this.smoothing)
                    );
                }

                if (this.bounds) {
                    this.position.x = clamp(this.position.x, this.bounds.x, this.bounds.x + this.bounds.width);
                    this.position.y = clamp(this.position.y, this.bounds.y, this.bounds.y + this.bounds.height);
                }
            }

            worldToScreen(worldPos) {
                return new Vector2(
                    (worldPos.x - this.position.x) * this.zoom,
                    (worldPos.y - this.position.y) * this.zoom
                );
            }

            screenToWorld(screenPos) {
                return new Vector2(
                    screenPos.x / this.zoom + this.position.x,
                    screenPos.y / this.zoom + this.position.y
                );
            }
        }

        class Tween {
            constructor(from, to, duration, easing = easeInOut) {
                this.from = from;
                this.to = to;
                this.duration = duration;
                this.easing = easing;
                this.elapsed = 0;
                this.running = false;
                this.onComplete = null;
                this.onUpdate = null;
            }

            start() {
                this.running = true;
                this.elapsed = 0;
            }

            stop() {
                this.running = false;
            }

            update(deltaTime) {
                if (!this.running) return this.from;
                
                this.elapsed += deltaTime;
                const t = Math.min(this.elapsed / this.duration, 1);
                const easedT = this.easing(t);
                const value = lerp(this.from, this.to, easedT);
                
                if (this.onUpdate) this.onUpdate(value);
                
                if (t >= 1) {
                    this.running = false;
                    if (this.onComplete) this.onComplete();
                }
                
                return value;
            }

            getValue() {
                const t = Math.min(this.elapsed / this.duration, 1);
                const easedT = this.easing(t);
                return lerp(this.from, this.to, easedT);
            }
        }

        class StateMachine {
            constructor() {
                this.states = {};
                this.currentState = null;
                this.previousState = null;
            }

            addState(name, state) {
                this.states[name] = state;
            }

            setState(name) {
                if (this.currentState && this.currentState.exit) {
                    this.currentState.exit();
                }
                
                this.previousState = this.currentState;
                this.currentState = this.states[name];
                
                if (this.currentState && this.currentState.enter) {
                    this.currentState.enter();
                }
            }

            update(deltaTime) {
                if (this.currentState && this.currentState.update) {
                    this.currentState.update(deltaTime);
                }
            }

            getCurrentState() {
                return this.currentState;
            }
        }

        class QuadTree {
            constructor(bounds, maxObjects = 10, maxLevels = 5, level = 0) {
                this.bounds = bounds;
                this.maxObjects = maxObjects;
                this.maxLevels = maxLevels;
                this.level = level;
                this.objects = [];
                this.nodes = [];
            }

            clear() {
                this.objects = [];
                this.nodes.forEach(node => node.clear());
                this.nodes = [];
            }

            split() {
                const subWidth = this.bounds.width / 2;
                const subHeight = this.bounds.height / 2;
                const x = this.bounds.x;
                const y = this.bounds.y;

                this.nodes[0] = new QuadTree({x: x + subWidth, y: y, width: subWidth, height: subHeight}, 
                                           this.maxObjects, this.maxLevels, this.level + 1);
                this.nodes[1] = new QuadTree({x: x, y: y, width: subWidth, height: subHeight}, 
                                           this.maxObjects, this.maxLevels, this.level + 1);
                this.nodes[2] = new QuadTree({x: x, y: y + subHeight, width: subWidth, height: subHeight}, 
                                           this.maxObjects, this.maxLevels, this.level + 1);
                this.nodes[3] = new QuadTree({x: x + subWidth, y: y + subHeight, width: subWidth, height: subHeight}, 
                                           this.maxObjects, this.maxLevels, this.level + 1);
            }

            getIndex(rect) {
                let index = -1;
                const verticalMidpoint = this.bounds.x + (this.bounds.width / 2);
                const horizontalMidpoint = this.bounds.y + (this.bounds.height / 2);

                const topQuadrant = (rect.y < horizontalMidpoint && rect.y + rect.height < horizontalMidpoint);
                const bottomQuadrant = (rect.y > horizontalMidpoint);

                if (rect.x < verticalMidpoint && rect.x + rect.width < verticalMidpoint) {
                    if (topQuadrant) index = 1;
                    else if (bottomQuadrant) index = 2;
                } else if (rect.x > verticalMidpoint) {
                    if (topQuadrant) index = 0;
                    else if (bottomQuadrant) index = 3;
                }

                return index;
            }

            insert(rect) {
                if (this.nodes.length > 0) {
                    const index = this.getIndex(rect);
                    if (index !== -1) {
                        this.nodes[index].insert(rect);
                        return;
                    }
                }

                this.objects.push(rect);

                if (this.objects.length > this.maxObjects && this.level < this.maxLevels) {
                    if (this.nodes.length === 0) {
                        this.split();
                    }

                    let i = 0;
                    while (i < this.objects.length) {
                        const index = this.getIndex(this.objects[i]);
                        if (index !== -1) {
                            this.nodes[index].insert(this.objects.splice(i, 1)[0]);
                        } else {
                            i++;
                        }
                    }
                }
            }

            retrieve(rect) {
                const returnObjects = this.objects.slice();
                if (this.nodes.length > 0) {
                    const index = this.getIndex(rect);
                    if (index !== -1) {
                        returnObjects.push(...this.nodes[index].retrieve(rect));
                    } else {
                        this.nodes.forEach(node => {
                            returnObjects.push(...node.retrieve(rect));
                        });
                    }
                }
                return returnObjects;
            }
        }

        // 💾 STORAGE & DATA UTILITIES
        function store(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (e) {
                console.error('Storage failed:', e);
                return false;
            }
        }

        function retrieve(key, defaultValue = null) {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (e) {
                console.error('Retrieval failed:', e);
                return defaultValue;
            }
        }

        function generateId(length = 8) {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            let result = '';
            for (let i = 0; i < length; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return result;
        }

        function generateUUID() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                const r = Math.random() * 16 | 0;
                const v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }

        function downloadFile(data, filename, type = 'text/plain') {
            const blob = new Blob([data], { type });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        function compress(data) {
            // Simple LZ77-like compression
            const dict = {};
            let result = '';
            let phrase = '';
            
            for (let i = 0; i < data.length; i++) {
                const char = data[i];
                const newPhrase = phrase + char;
                
                if (dict[newPhrase]) {
                    phrase = newPhrase;
                } else {
                    if (phrase) {
                        result += dict[phrase] ? `{${dict[phrase]}}` : phrase;
                        dict[newPhrase] = Object.keys(dict).length;
                    }
                    phrase = char;
                }
            }
            
            if (phrase) {
                result += dict[phrase] ? `{${dict[phrase]}}` : phrase;
            }
            
            return result;
        }

        function decompress(data) {
            // Simple decompression for the above
            const dict = [];
            return data.replace(/\{(\d+)\}/g, (match, index) => dict[index] || match);
        }

        class Cache {
            constructor(maxSize = 100) {
                this.maxSize = maxSize;
                this.cache = new Map();
            }

            get(key) {
                if (this.cache.has(key)) {
                    const value = this.cache.get(key);
                    this.cache.delete(key);
                    this.cache.set(key, value);
                    return value;
                }
                return null;
            }

            set(key, value) {
                if (this.cache.has(key)) {
                    this.cache.delete(key);
                } else if (this.cache.size >= this.maxSize) {
                    const firstKey = this.cache.keys().next().value;
                    this.cache.delete(firstKey);
                }
                this.cache.set(key, value);
            }

            clear() {
                this.cache.clear();
            }

            size() {
                return this.cache.size;
            }
        }

        function exportJSON(data, filename = 'data.json') {
            downloadFile(JSON.stringify(data, null, 2), filename, 'application/json');
        }

        function importJSON(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = JSON.parse(e.target.result);
                        resolve(data);
                    } catch (error) {
                        reject(error);
                    }
                };
                reader.onerror = reject;
                reader.readAsText(file);
            });
        }

        function base64Encode(str) {
            return btoa(unescape(encodeURIComponent(str)));
        }

        function base64Decode(str) {
            return decodeURIComponent(escape(atob(str)));
        }

        // 🌐 DOM & EVENT UTILITIES
        function $(selector) {
            const elements = document.querySelectorAll(selector);
            return elements.length === 1 ? elements[0] : Array.from(elements);
        }
        function getScrollPosition() {
            return {
                x: window.pageXOffset || document.documentElement.scrollLeft,
                y: window.pageYOffset || document.documentElement.scrollTop
            };
        }
        function createElement(tag, props = {}, children = []) {
            const element = document.createElement(tag);
            
            Object.keys(props).forEach(key => {
                if (key === 'style' && typeof props[key] === 'object') {
                    Object.assign(element.style, props[key]);
                } else if (key.startsWith('on') && typeof props[key] === 'function') {
                    element.addEventListener(key.slice(2).toLowerCase(), props[key]);
                } else {
                    element.setAttribute(key, props[key]);
                }
            });
            
            children.forEach(child => {
                if (typeof child === 'string') {
                    element.appendChild(document.createTextNode(child));
                } else {
                    element.appendChild(child);
                }
            });
            
            return element;
        }
        async function copyToClipboard(text) {
            try {
                await navigator.clipboard.writeText(text);
                return true;
            } catch (err) {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = text;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                return true;
            }
        }
        function on(element, event, handler, options = {}) {
            element.addEventListener(event, handler, options);
            return () => element.removeEventListener(event, handler, options);
        }

        function off(element, event, handler) {
            element.removeEventListener(event, handler);
        }

        function animate(element, keyframes, options = {}) {
            return element.animate(keyframes, {
                duration: 300,
                easing: 'ease',
                fill: 'forwards',
                ...options
            });
        }

        function getViewportSize() {
            return {
                width: window.innerWidth,
                height: window.innerHeight
            };
        }

        function isInViewport(element) {
            const rect = element.getBoundingClientRect();
            return (
                rect.top >= 0 &&
                rect.left >= 0 &&
                rect.bottom <= window.innerHeight &&
                rect.right <= window.innerWidth
            );
        }

        function scrollTo(element, options = {}) {
            element.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
                inline: 'nearest',
                ...options
            });
        }

        // 🔤 STRING & VALIDATION UTILITIES
        function slugify(text) {
            return text
                .toLowerCase()
                .replace(/[^\w\s-]/g, '')
                .replace(/[\s_-]+/g, '-')
                .replace(/^-+|-+$/g, '');
        }

        function truncate(text, length, suffix = '...') {
            if (text.length <= length) return text;
            return text.substring(0, length - suffix.length) + suffix;
        }

        function camelCase(str) {
            return str.replace(/[-_\s]+(.)?/g, (_, char) => char ? char.toUpperCase() : '');
        }

        function kebabCase(str) {
            return str
                .replace(/([a-z])([A-Z])/g, '$1-$2')
                .replace(/[\s_]+/g, '-')
                .toLowerCase();
        }

        function isEmail(email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
        }

        function isURL(url) {
            try {
                new URL(url);
                return true;
            } catch {
                return false;
            }
        }

        function escapeHTML(str) {
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        }

        function unescapeHTML(str) {
            const div = document.createElement('div');
            div.innerHTML = str;
            return div.textContent || div.innerText || '';
        }

        function wordCount(text) {
            return text.trim().split(/\s+/).filter(word => word.length > 0).length;
        }

        function highlight(text, query) {
            if (!query) return text;
            const regex = new RegExp(`(${query})`, 'gi');
            return text.replace(regex, '<mark>$1</mark>');
        }

        // 🌐 NETWORK & API UTILITIES
        async function fetchJSON(url, options = {}) {
            try {
                const response = await fetch(url, {
                    headers: { 'Content-Type': 'application/json' },
                    ...options
                });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return await response.json();
            } catch (error) {
                console.error('Fetch failed:', error);
                throw error;
            }
        }

        async function retry(fn, attempts = 3, delay = 1000) {
            for (let i = 0; i < attempts; i++) {
                try {
                    return await fn();
                } catch (error) {
                    if (i === attempts - 1) throw error;
                    await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
                }
            }
        }
        async function parallel(promises) {
            const results = [];
            let completed = 0;
            
            return new Promise((resolve, reject) => {
                promises.forEach(async (promise, index) => {
                    try {
                        const result = await promise;
                        results[index] = { success: true, result };
                        completed++;
                        if (completed === promises.length) {
                            resolve(results);
                        }
                    } catch (error) {
                        results[index] = { success: false, error };
                        completed++;
                        if (completed === promises.length) {
                            resolve(results);
                        }
                    }
                });
            });
        }
        function timeout(promise, ms) {
            return Promise.race([
                promise,
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Timeout')), ms)
                )
            ]);
        }

        async function parallel(promises, limit = 5) {
            const results = [];
            for (let i = 0; i < promises.length; i += limit) {
                const batch = promises.slice(i, i + limit);
                const batchResults = await Promise.all(batch);
                results.push(...batchResults);
            }
            return results;
        }

        function parseURL(url) {
            try {
                const parsed = new URL(url);
                return {
                    protocol: parsed.protocol,
                    host: parsed.host,
                    pathname: parsed.pathname,
                    search: parsed.search,
                    hash: parsed.hash,
                    params: Object.fromEntries(parsed.searchParams)
                };
            } catch {
                return null;
            }
        }

        function buildURL(base, params = {}) {
            const url = new URL(base);
            Object.entries(params).forEach(([key, value]) => {
                url.searchParams.set(key, value);
            });
            return url.toString();
        }

        function isOnline() {
            return navigator.onLine;
        }

        async function downloadJSON(url) {
            const cached = retrieve(`cache_${url}`);
            if (cached && Date.now() - cached.timestamp < 300000) { // 5 min cache
                return cached.data;
            }
            
            const data = await fetchJSON(url);
            store(`cache_${url}`, { data, timestamp: Date.now() });
            return data;
        }

        // 🎯 PERFORMANCE & OPTIMIZATION UTILITIES
        function memoize(fn, keyFn = (...args) => JSON.stringify(args)) {
            const cache = new Map();
            return function(...args) {
                const key = keyFn(...args);
                if (cache.has(key)) return cache.get(key);
                const result = fn.apply(this, args);
                cache.set(key, result);
                return result;
            };
        }

        function benchmark(fn, iterations = 1000) {
            const start = performance.now();
            for (let i = 0; i < iterations; i++) {
                fn();
            }
            const end = performance.now();
            return {
                totalTime: end - start,
                averageTime: (end - start) / iterations,
                iterations
            };
        }

        function lazy(fn) {
            let cached = false;
            let result;
            return function(...args) {
                if (!cached) {
                    result = fn.apply(this, args);
                    cached = true;
                }
                return result;
            };
        }

        async function batchProcess(items, batchSize, processor) {
            const results = [];
            for (let i = 0; i < items.length; i += batchSize) {
                const batch = items.slice(i, i + batchSize);
                const batchResults = await Promise.all(batch.map(processor));
                results.push(...batchResults);
                // Allow other tasks to run
                await new Promise(resolve => setTimeout(resolve, 0));
            }
            return results;
        }

        function memoryUsage() {
            if (performance.memory) {
                return {
                    used: Math.round(performance.memory.usedJSHeapSize / 1048576),
                    total: Math.round(performance.memory.totalJSHeapSize / 1048576),
                    limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576)
                };
            }
            return { error: 'Memory API not available' };
        }

        function performanceNow() {
            return performance.now();
        }

        function idle(callback) {
            if (window.requestIdleCallback) {
                requestIdleCallback(callback);
            } else {
                setTimeout(callback, 0);
            }
        }

        function preload(urls) {
            return Promise.all(urls.map(url => {
                return new Promise((resolve, reject) => {
                    const link = document.createElement('link');
                    link.rel = 'preload';
                    link.href = url;
                    link.as = url.endsWith('.js') ? 'script' : 
                             url.endsWith('.css') ? 'style' : 'fetch';
                    link.onload = resolve;
                    link.onerror = reject;
                    document.head.appendChild(link);
                });
            }));
        }

        // 🔐 SECURITY & CRYPTO UTILITIES
        async function hash(data, algorithm = 'SHA-256') {
            const encoder = new TextEncoder();
            const dataBuffer = encoder.encode(data);
            const hashBuffer = await crypto.subtle.digest(algorithm, dataBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        }

        function randomBytes(length) {
            const array = new Uint8Array(length);
            crypto.getRandomValues(array);
            return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
        }

        function sanitize(input) {
            return input
                .replace(/[<>]/g, '')
                .replace(/javascript:/gi, '')
                .replace(/on\w+=/gi, '')
                .trim();
        }

        function validatePassword(password) {
            const checks = {
                length: password.length >= 8,
                uppercase: /[A-Z]/.test(password),
                lowercase: /[a-z]/.test(password),
                numbers: /\d/.test(password),
                special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
            };
            const score = Object.values(checks).filter(Boolean).length;
            return {
                ...checks,
                score,
                strength: score < 3 ? 'weak' : score < 5 ? 'medium' : 'strong'
            };
        }

        function generateToken(length = 32) {
            return randomBytes(length);
        }

        function obfuscate(text) {
            return btoa(text).split('').reverse().join('');
        }

        function checksum(data) {
            let hash = 0;
            for (let i = 0; i < data.length; i++) {
                const char = data.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32-bit integer
            }
            return Math.abs(hash).toString(16);
        }

        function rateLimit(fn, limit, window = 60000) {
            const calls = [];
            return function(...args) {
                const now = Date.now();
                const windowStart = now - window;
                
                // Remove old calls
                while (calls.length && calls[0] < windowStart) {
                    calls.shift();
                }
                
                if (calls.length >= limit) {
                    throw new Error('Rate limit exceeded');
                }
                
                calls.push(now);
                return fn.apply(this, args);
            };
        }

        // 📊 DATA ANALYSIS & STATISTICS UTILITIES
        function mean(numbers) {
            return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
        }

        function median(numbers) {
            const sorted = [...numbers].sort((a, b) => a - b);
            const mid = Math.floor(sorted.length / 2);
            return sorted.length % 2 === 0 
                ? (sorted[mid - 1] + sorted[mid]) / 2 
                : sorted[mid];
        }

        function mode(numbers) {
            const frequency = {};
            let maxFreq = 0;
            let modes = [];
            
            numbers.forEach(num => {
                frequency[num] = (frequency[num] || 0) + 1;
                if (frequency[num] > maxFreq) {
                    maxFreq = frequency[num];
                    modes = [num];
                } else if (frequency[num] === maxFreq && !modes.includes(num)) {
                    modes.push(num);
                }
            });
            
            return modes.length === numbers.length ? [] : modes;
        }

        function standardDeviation(numbers) {
            const avg = mean(numbers);
            const squareDiffs = numbers.map(num => Math.pow(num - avg, 2));
            return Math.sqrt(mean(squareDiffs));
        }

        function correlation(x, y) {
            if (x.length !== y.length) throw new Error('Arrays must have same length');
            
            const n = x.length;
            const meanX = mean(x);
            const meanY = mean(y);
            
            let numerator = 0;
            let sumXSquared = 0;
            let sumYSquared = 0;
            
            for (let i = 0; i < n; i++) {
                const deltaX = x[i] - meanX;
                const deltaY = y[i] - meanY;
                numerator += deltaX * deltaY;
                sumXSquared += deltaX * deltaX;
                sumYSquared += deltaY * deltaY;
            }
            
            return numerator / Math.sqrt(sumXSquared * sumYSquared);
        }

        function percentile(numbers, p) {
            const sorted = [...numbers].sort((a, b) => a - b);
            const index = (p / 100) * (sorted.length - 1);
            const lower = Math.floor(index);
            const upper = Math.ceil(index);
            
            if (lower === upper) return sorted[lower];
            
            const weight = index - lower;
            return sorted[lower] * (1 - weight) + sorted[upper] * weight;
        }

        function histogram(data, bins = 10) {
            const min = Math.min(...data);
            const max = Math.max(...data);
            const binWidth = (max - min) / bins;
            const histogram = Array(bins).fill(0);
            
            data.forEach(value => {
                const binIndex = Math.min(Math.floor((value - min) / binWidth), bins - 1);
                histogram[binIndex]++;
            });
            
            return histogram.map((count, i) => ({
                min: min + i * binWidth,
                max: min + (i + 1) * binWidth,
                count
            }));
        }

        function normalize(numbers) {
            const min = Math.min(...numbers);
            const max = Math.max(...numbers);
            const range = max - min;
            return numbers.map(num => (num - min) / range);
        }

        // 🎨 CANVAS & GRAPHICS UTILITIES
        function createCanvas(width, height) {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            return { canvas, ctx };
        }

        function drawCircle(ctx, x, y, radius, color = '#000') {
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, 2 * Math.PI);
            ctx.fillStyle = color;
            ctx.fill();
        }

        function drawLine(ctx, x1, y1, x2, y2, color = '#000', width = 1) {
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            ctx.stroke();
        }

        function drawText(ctx, text, x, y, options = {}) {
            const { font = '16px Arial', color = '#000', align = 'left' } = options;
            ctx.font = font;
            ctx.fillStyle = color;
            ctx.textAlign = align;
            ctx.fillText(text, x, y);
        }

        function canvasToBlob(canvas) {
            return new Promise(resolve => {
                canvas.toBlob(resolve);
            });
        }

        function resizeCanvas(canvas, width, height, maintainAspect = true) {
            if (maintainAspect) {
                const aspectRatio = canvas.width / canvas.height;
                if (width / height > aspectRatio) {
                    width = height * aspectRatio;
                } else {
                    height = width / aspectRatio;
                }
            }
            canvas.width = width;
            canvas.height = height;
        }

        function clearCanvas(ctx) {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        }

        function getPixelColor(ctx, x, y) {
            const imageData = ctx.getImageData(x, y, 1, 1);
            const [r, g, b, a] = imageData.data;
            return { r, g, b, a };
        }
        // Physics & Simulation
        class Physics2D {
            constructor(canvas) {
                this.canvas = canvas;
                this.ctx = canvas.getContext('2d');
                this.objects = [];
                this.gravity = 0.5;
                this.friction = 0.99;
                this.running = false;
            }
            
            addBall(x, y, radius, color) {
                this.objects.push({
                    x, y, radius, color,
                    vx: (Math.random() - 0.5) * 10,
                    vy: (Math.random() - 0.5) * 10,
                    mass: radius / 10
                });
            }
            
            update() {
                this.objects.forEach(obj => {
                    // Apply gravity
                    obj.vy += this.gravity;
                    
                    // Update position
                    obj.x += obj.vx;
                    obj.y += obj.vy;
                    
                    // Bounce off walls
                    if (obj.x + obj.radius > this.canvas.width || obj.x - obj.radius < 0) {
                        obj.vx *= -this.friction;
                        obj.x = Math.max(obj.radius, Math.min(this.canvas.width - obj.radius, obj.x));
                    }
                    
                    if (obj.y + obj.radius > this.canvas.height || obj.y - obj.radius < 0) {
                        obj.vy *= -this.friction;
                        obj.y = Math.max(obj.radius, Math.min(this.canvas.height - obj.radius, obj.y));
                    }
                });
                
                // Check collisions between objects
                for (let i = 0; i < this.objects.length; i++) {
                    for (let j = i + 1; j < this.objects.length; j++) {
                        const obj1 = this.objects[i];
                        const obj2 = this.objects[j];
                        const dx = obj2.x - obj1.x;
                        const dy = obj2.y - obj1.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        
                        if (distance < obj1.radius + obj2.radius) {
                            // Simple elastic collision
                            const angle = Math.atan2(dy, dx);
                            const sin = Math.sin(angle);
                            const cos = Math.cos(angle);
                            
                            // Rotate velocities
                            const vx1 = obj1.vx * cos + obj1.vy * sin;
                            const vy1 = obj1.vy * cos - obj1.vx * sin;
                            const vx2 = obj2.vx * cos + obj2.vy * sin;
                            const vy2 = obj2.vy * cos - obj2.vx * sin;
                            
                            // Collision response
                            const finalVx1 = ((obj1.mass - obj2.mass) * vx1 + 2 * obj2.mass * vx2) / (obj1.mass + obj2.mass);
                            const finalVx2 = ((obj2.mass - obj1.mass) * vx2 + 2 * obj1.mass * vx1) / (obj1.mass + obj2.mass);
                            
                            // Rotate back
                            obj1.vx = finalVx1 * cos - vy1 * sin;
                            obj1.vy = vy1 * cos + finalVx1 * sin;
                            obj2.vx = finalVx2 * cos - vy2 * sin;
                            obj2.vy = vy2 * cos + finalVx2 * sin;
                            
                            // Separate objects
                            const overlap = obj1.radius + obj2.radius - distance;
                            obj1.x -= overlap * 0.5 * cos;
                            obj1.y -= overlap * 0.5 * sin;
                            obj2.x += overlap * 0.5 * cos;
                            obj2.y += overlap * 0.5 * sin;
                        }
                    }
                }
            }
            
            render() {
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                
                this.objects.forEach(obj => {
                    this.ctx.beginPath();
                    this.ctx.arc(obj.x, obj.y, obj.radius, 0, Math.PI * 2);
                    this.ctx.fillStyle = obj.color;
                    this.ctx.fill();
                    this.ctx.strokeStyle = '#333';
                    this.ctx.stroke();
                });
            }
            
            start() {
                this.running = true;
                const animate = () => {
                    if (!this.running) return;
                    this.update();
                    this.render();
                    requestAnimationFrame(animate);
                };
                animate();
            }
            
            stop() {
                this.running = false;
            }
            
            reset() {
                this.objects = [];
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            }
        }
        
        class ParticleSystem {
            constructor(canvas) {
                this.canvas = canvas;
                this.ctx = canvas.getContext('2d');
                this.particles = [];
            }
            
            createExplosion(x, y, count = 50) {
                for (let i = 0; i < count; i++) {
                    this.particles.push({
                        x, y,
                        vx: (Math.random() - 0.5) * 20,
                        vy: (Math.random() - 0.5) * 20,
                        life: 1,
                        decay: Math.random() * 0.02 + 0.01,
                        color: `hsl(${Math.random() * 60 + 15}, 100%, 50%)`,
                        size: Math.random() * 5 + 2
                    });
                }
                this.animate();
            }
            
            createFireworks(x, y) {
                const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
                for (let i = 0; i < 30; i++) {
                    const angle = (i / 30) * Math.PI * 2;
                    const speed = Math.random() * 8 + 4;
                    this.particles.push({
                        x, y,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        life: 1,
                        decay: 0.015,
                        color: colors[Math.floor(Math.random() * colors.length)],
                        size: Math.random() * 3 + 1,
                        gravity: 0.1
                    });
                }
                this.animate();
            }
            
            createSnow(count = 100) {
                this.particles = [];
                for (let i = 0; i < count; i++) {
                    this.particles.push({
                        x: Math.random() * this.canvas.width,
                        y: Math.random() * this.canvas.height,
                        vx: (Math.random() - 0.5) * 2,
                        vy: Math.random() * 2 + 1,
                        life: 1,
                        decay: 0,
                        color: 'white',
                        size: Math.random() * 3 + 1
                    });
                }
                this.animateSnow();
            }
            
            animate() {
                const update = () => {
                    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
                    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                    
                    this.particles = this.particles.filter(particle => {
                        particle.x += particle.vx;
                        particle.y += particle.vy;
                        if (particle.gravity) particle.vy += particle.gravity;
                        particle.life -= particle.decay;
                        
                        this.ctx.globalAlpha = particle.life;
                        this.ctx.fillStyle = particle.color;
                        this.ctx.beginPath();
                        this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                        this.ctx.fill();
                        
                        return particle.life > 0;
                    });
                    
                    this.ctx.globalAlpha = 1;
                    
                    if (this.particles.length > 0) {
                        requestAnimationFrame(update);
                    }
                };
                update();
            }
            
            animateSnow() {
                const update = () => {
                    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
                    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                    
                    this.particles.forEach(particle => {
                        particle.x += particle.vx;
                        particle.y += particle.vy;
                        
                        if (particle.y > this.canvas.height) {
                            particle.y = -10;
                            particle.x = Math.random() * this.canvas.width;
                        }
                        if (particle.x > this.canvas.width) particle.x = 0;
                        if (particle.x < 0) particle.x = this.canvas.width;
                        
                        this.ctx.fillStyle = particle.color;
                        this.ctx.beginPath();
                        this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                        this.ctx.fill();
                    });
                    
                    requestAnimationFrame(update);
                };
                update();
            }
        }
        // 🤖 AI & MACHINE LEARNING UTILITIES
        class NeuralNetwork {
            constructor(layers) {
                this.layers = layers;
                this.weights = [];
                this.biases = [];
                this.initializeWeights();
            }

            initializeWeights() {
                for (let i = 0; i < this.layers.length - 1; i++) {
                    const weight = [];
                    const bias = [];
                    for (let j = 0; j < this.layers[i + 1]; j++) {
                        const neuronWeights = [];
                        for (let k = 0; k < this.layers[i]; k++) {
                            neuronWeights.push(Math.random() * 2 - 1);
                        }
                        weight.push(neuronWeights);
                        bias.push(Math.random() * 2 - 1);
                    }
                    this.weights.push(weight);
                    this.biases.push(bias);
                }
            }

            sigmoid(x) {
                return 1 / (1 + Math.exp(-x));
            }

            predict(inputs) {
                let activations = inputs;
                for (let i = 0; i < this.weights.length; i++) {
                    const newActivations = [];
                    for (let j = 0; j < this.weights[i].length; j++) {
                        let sum = this.biases[i][j];
                        for (let k = 0; k < activations.length; k++) {
                            sum += activations[k] * this.weights[i][j][k];
                        }
                        newActivations.push(this.sigmoid(sum));
                    }
                    activations = newActivations;
                }
                return activations;
            }
        }

        class LinearRegression {
            constructor() {
                this.slope = 0;
                this.intercept = 0;
                this.trained = false;
            }

            fit(x, y) {
                const n = x.length;
                const sumX = x.reduce((a, b) => a + b, 0);
                const sumY = y.reduce((a, b) => a + b, 0);
                const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
                const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

                this.slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
                this.intercept = (sumY - this.slope * sumX) / n;
                this.trained = true;
            }

            predict(x) {
                if (!this.trained) throw new Error('Model not trained');
                return Array.isArray(x) ? x.map(xi => this.slope * xi + this.intercept) : this.slope * x + this.intercept;
            }
        }

        class KMeans {
            constructor(k) {
                this.k = k;
                this.centroids = [];
                this.clusters = [];
            }

            fit(data) {
                // Initialize centroids randomly
                this.centroids = [];
                for (let i = 0; i < this.k; i++) {
                    const randomPoint = data[Math.floor(Math.random() * data.length)];
                    this.centroids.push([...randomPoint]);
                }

                let changed = true;
                let iterations = 0;
                const maxIterations = 100;

                while (changed && iterations < maxIterations) {
                    changed = false;
                    this.clusters = Array(this.k).fill().map(() => []);

                    // Assign points to nearest centroid
                    data.forEach(point => {
                        let minDistance = Infinity;
                        let clusterIndex = 0;
                        
                        this.centroids.forEach((centroid, i) => {
                            const dist = this.euclideanDistance(point, centroid);
                            if (dist < minDistance) {
                                minDistance = dist;
                                clusterIndex = i;
                            }
                        });
                        
                        this.clusters[clusterIndex].push(point);
                    });

                    // Update centroids
                    this.centroids.forEach((centroid, i) => {
                        if (this.clusters[i].length > 0) {
                            const newCentroid = this.calculateCentroid(this.clusters[i]);
                            if (this.euclideanDistance(centroid, newCentroid) > 0.001) {
                                changed = true;
                                this.centroids[i] = newCentroid;
                            }
                        }
                    });

                    iterations++;
                }
            }

            euclideanDistance(a, b) {
                return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0));
            }

            calculateCentroid(points) {
                const dimensions = points[0].length;
                const centroid = new Array(dimensions).fill(0);
                
                points.forEach(point => {
                    point.forEach((val, i) => {
                        centroid[i] += val;
                    });
                });
                
                return centroid.map(val => val / points.length);
            }

            predict(point) {
                let minDistance = Infinity;
                let clusterIndex = 0;
                
                this.centroids.forEach((centroid, i) => {
                    const dist = this.euclideanDistance(point, centroid);
                    if (dist < minDistance) {
                        minDistance = dist;
                        clusterIndex = i;
                    }
                });
                
                return clusterIndex;
            }
        }

        class MarkovChain {
            constructor() {
                this.chain = {};
            }

            train(text) {
                const words = text.toLowerCase().split(/\s+/);
                
                for (let i = 0; i < words.length - 1; i++) {
                    const currentWord = words[i];
                    const nextWord = words[i + 1];
                    
                    if (!this.chain[currentWord]) {
                        this.chain[currentWord] = [];
                    }
                    this.chain[currentWord].push(nextWord);
                }
            }

            generate(startWord, length = 20) {
                if (!this.chain[startWord]) {
                    startWord = randomChoice(Object.keys(this.chain));
                }
                
                const result = [startWord];
                let currentWord = startWord;
                
                for (let i = 0; i < length - 1; i++) {
                    if (!this.chain[currentWord] || this.chain[currentWord].length === 0) {
                        break;
                    }
                    
                    const nextWord = randomChoice(this.chain[currentWord]);
                    result.push(nextWord);
                    currentWord = nextWord;
                }
                
                return result.join(' ');
            }
        }

        function sentiment(text) {
            const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'awesome', 'love', 'like', 'happy', 'joy', 'perfect', 'best'];
            const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'hate', 'dislike', 'sad', 'angry', 'worst', 'disgusting', 'annoying', 'frustrating'];
            
            const words = text.toLowerCase().split(/\s+/);
            let score = 0;
            
            words.forEach(word => {
                if (positiveWords.includes(word)) score++;
                if (negativeWords.includes(word)) score--;
            });
            
            const normalized = score / words.length;
            
            return {
                score: normalized,
                sentiment: normalized > 0.1 ? 'positive' : normalized < -0.1 ? 'negative' : 'neutral',
                confidence: Math.abs(normalized)
            };
        }

        function cosineSimilarity(vec1, vec2) {
            if (vec1.length !== vec2.length) throw new Error('Vectors must have same length');
            
            let dotProduct = 0;
            let norm1 = 0;
            let norm2 = 0;
            
            for (let i = 0; i < vec1.length; i++) {
                dotProduct += vec1[i] * vec2[i];
                norm1 += vec1[i] * vec1[i];
                norm2 += vec2[i] * vec2[i];
            }
            
            return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
        }

        // 🌍 GEOLOCATION & MAPS UTILITIES
        function getCurrentLocation() {
            return new Promise((resolve, reject) => {
                if (!navigator.geolocation) {
                    reject(new Error('Geolocation not supported'));
                    return;
                }
                
                navigator.geolocation.getCurrentPosition(
                    position => resolve({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    }),
                    error => reject(error),
                    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
                );
            });
        }

        function calculateDistance(lat1, lon1, lat2, lon2) {
            const R = 6371; // Earth's radius in kilometers
            const dLat = degToRad(lat2 - lat1);
            const dLon = degToRad(lon2 - lon1);
            
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                      Math.cos(degToRad(lat1)) * Math.cos(degToRad(lat2)) *
                      Math.sin(dLon/2) * Math.sin(dLon/2);
            
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            return R * c; // Distance in kilometers
        }

        function isWithinRadius(center, point, radius) {
            const distance = calculateDistance(center.lat, center.lon, point.lat, point.lon);
            return distance <= radius;
        }

        function getBearing(lat1, lon1, lat2, lon2) {
            const dLon = degToRad(lon2 - lon1);
            const lat1Rad = degToRad(lat1);
            const lat2Rad = degToRad(lat2);
            
            const y = Math.sin(dLon) * Math.cos(lat2Rad);
            const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
            
            const bearing = radToDeg(Math.atan2(y, x));
            return (bearing + 360) % 360; // Normalize to 0-360
        }

        function createGeoFence(center, radius) {
            return {
                center,
                radius,
                contains: (point) => isWithinRadius(center, point, radius),
                getDistance: (point) => calculateDistance(center.lat, center.lon, point.lat, point.lon)
            };
        }

        // 📱 DEVICE & HARDWARE UTILITIES
        function getDeviceInfo() {
            const ua = navigator.userAgent;
            return {
                isMobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua),
                isTablet: /iPad|Android(?!.*Mobile)/i.test(ua),
                isDesktop: !/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua),
                platform: navigator.platform,
                userAgent: ua,
                language: navigator.language,
                cookieEnabled: navigator.cookieEnabled,
                onLine: navigator.onLine
            };
        }

        async function getBatteryStatus() {
            if ('getBattery' in navigator) {
                try {
                    const battery = await navigator.getBattery();
                    return {
                        level: Math.round(battery.level * 100),
                        charging: battery.charging,
                        chargingTime: battery.chargingTime,
                        dischargingTime: battery.dischargingTime
                    };
                } catch (e) {
                    return { error: 'Battery API not available' };
                }
            }
            return { error: 'Battery API not supported' };
        }

        function getNetworkInfo() {
            const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
            if (connection) {
                return {
                    effectiveType: connection.effectiveType,
                    downlink: connection.downlink,
                    rtt: connection.rtt,
                    saveData: connection.saveData
                };
            }
            return { error: 'Network Information API not supported' };
        }

        function vibrate(pattern) {
            if ('vibrate' in navigator) {
                return navigator.vibrate(pattern);
            }
            return false;
        }

        function getOrientation() {
            return {
                angle: screen.orientation ? screen.orientation.angle : window.orientation,
                type: screen.orientation ? screen.orientation.type : 'unknown'
            };
        }

        async function requestWakeLock() {
            if ('wakeLock' in navigator) {
                try {
                    const wakeLock = await navigator.wakeLock.request('screen');
                    return wakeLock;
                } catch (e) {
                    return { error: 'Wake lock request failed' };
                }
            }
            return { error: 'Wake Lock API not supported' };
        }

        function isTouchDevice() {
            return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        }

        // 🔍 SEARCH & FILTER UTILITIES
        function fuzzySearch(query, items, options = {}) {
            const { keys = [], threshold = 0.6 } = options;
            
            const results = items.map(item => {
                const text = keys.length > 0 ? keys.map(key => item[key]).join(' ') : item.toString();
                const score = fuzzyMatch(query.toLowerCase(), text.toLowerCase());
                return { item, score };
            }).filter(result => result.score >= threshold);
            
            return results.sort((a, b) => b.score - a.score).map(result => result.item);
        }

        function fuzzyMatch(query, text) {
            if (query.length === 0) return 1;
            if (text.length === 0) return 0;
            
            let queryIndex = 0;
            let textIndex = 0;
            let matches = 0;
            
            while (queryIndex < query.length && textIndex < text.length) {
                if (query[queryIndex] === text[textIndex]) {
                    matches++;
                    queryIndex++;
                }
                textIndex++;
            }
            
            return matches / query.length;
        }

        function levenshteinDistance(str1, str2) {
            const matrix = Array(str2.length + 1).fill().map(() => Array(str1.length + 1).fill(0));
            
            for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
            for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
            
            for (let j = 1; j <= str2.length; j++) {
                for (let i = 1; i <= str1.length; i++) {
                    const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
                    matrix[j][i] = Math.min(
                        matrix[j - 1][i] + 1,     // deletion
                        matrix[j][i - 1] + 1,     // insertion
                        matrix[j - 1][i - 1] + cost // substitution
                    );
                }
            }
            
            return matrix[str2.length][str1.length];
        }

        function soundex(str) {
            const code = str.toUpperCase().charAt(0);
            const consonants = str.toUpperCase().slice(1).replace(/[AEIOUYHW]/g, '');
            
            const mapping = {
                'BFPV': '1', 'CGJKQSXZ': '2', 'DT': '3',
                'L': '4', 'MN': '5', 'R': '6'
            };
            
            let soundexCode = code;
            for (const char of consonants) {
                for (const [chars, digit] of Object.entries(mapping)) {
                    if (chars.includes(char)) {
                        soundexCode += digit;
                        break;
                    }
                }
            }
            
            return soundexCode.padEnd(4, '0').slice(0, 4);
        }

        class SearchIndex {
            constructor() {
                this.index = {};
                this.documents = [];
            }

            addDocument(doc, id) {
                this.documents[id] = doc;
                const words = this.tokenize(doc);
                
                words.forEach(word => {
                    if (!this.index[word]) this.index[word] = [];
                    if (!this.index[word].includes(id)) {
                        this.index[word].push(id);
                    }
                });
            }

            tokenize(text) {
                return text.toLowerCase().split(/\W+/).filter(word => word.length > 2);
            }

            search(query) {
                const words = this.tokenize(query);
                const results = new Set();
                
                words.forEach(word => {
                    if (this.index[word]) {
                        this.index[word].forEach(id => results.add(id));
                    }
                });
                
                return Array.from(results).map(id => this.documents[id]);
            }
        }

        // 📊 CHART & VISUALIZATION UTILITIES
        class LineChart {
            constructor(data, options = {}) {
                this.data = data;
                this.options = { width: 400, height: 300, ...options };
            }

            render(container) {
                const { canvas, ctx } = createCanvas(this.options.width, this.options.height);
                const padding = 40;
                const chartWidth = this.options.width - 2 * padding;
                const chartHeight = this.options.height - 2 * padding;
                
                // Clear canvas
                clearCanvas(ctx);
                
                // Find data bounds
                const xValues = this.data.map(d => d.x);
                const yValues = this.data.map(d => d.y);
                const xMin = Math.min(...xValues);
                const xMax = Math.max(...xValues);
                const yMin = Math.min(...yValues);
                const yMax = Math.max(...yValues);
                
                // Draw axes
                drawLine(ctx, padding, padding, padding, this.options.height - padding, '#ccc');
                drawLine(ctx, padding, this.options.height - padding, this.options.width - padding, this.options.height - padding, '#ccc');
                
                // Draw data line
                ctx.beginPath();
                this.data.forEach((point, i) => {
                    const x = padding + ((point.x - xMin) / (xMax - xMin)) * chartWidth;
                    const y = this.options.height - padding - ((point.y - yMin) / (yMax - yMin)) * chartHeight;
                    
                    if (i === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                });
                ctx.strokeStyle = '#4ecdc4';
                ctx.lineWidth = 2;
                ctx.stroke();
                
                // Draw data points
                this.data.forEach(point => {
                    const x = padding + ((point.x - xMin) / (xMax - xMin)) * chartWidth;
                    const y = this.options.height - padding - ((point.y - yMin) / (yMax - yMin)) * chartHeight;
                    drawCircle(ctx, x, y, 3, '#ff6b6b');
                });
                
                if (container) {
                    container.appendChild(canvas);
                }
                return canvas;
            }
        }

        class BarChart {
            constructor(data, options = {}) {
                this.data = data;
                this.options = { width: 400, height: 300, ...options };
            }

            render(container) {
                const { canvas, ctx } = createCanvas(this.options.width, this.options.height);
                const padding = 40;
                const chartWidth = this.options.width - 2 * padding;
                const chartHeight = this.options.height - 2 * padding;
                
                clearCanvas(ctx);
                
                const maxValue = Math.max(...this.data.map(d => d.value));
                const barWidth = chartWidth / this.data.length * 0.8;
                const barSpacing = chartWidth / this.data.length * 0.2;
                
                // Draw axes
                drawLine(ctx, padding, padding, padding, this.options.height - padding, '#ccc');
                drawLine(ctx, padding, this.options.height - padding, this.options.width - padding, this.options.height - padding, '#ccc');
                
                // Draw bars
                this.data.forEach((item, i) => {
                    const barHeight = (item.value / maxValue) * chartHeight;
                    const x = padding + i * (barWidth + barSpacing) + barSpacing / 2;
                    const y = this.options.height - padding - barHeight;
                    
                    ctx.fillStyle = item.color || '#4ecdc4';
                    ctx.fillRect(x, y, barWidth, barHeight);
                    
                    // Draw label
                    drawText(ctx, item.label, x + barWidth / 2, this.options.height - padding + 20, {
                        align: 'center',
                        font: '12px Arial'
                    });
                });
                
                if (container) {
                    container.appendChild(canvas);
                }
                return canvas;
            }
        }

        // 🔄 STATE MANAGEMENT UTILITIES
        function createStore(initialState = {}) {
            let state = { ...initialState };
            const listeners = [];

            return {
                getState: () => ({ ...state }),
                setState: (newState) => {
                    state = { ...state, ...newState };
                    listeners.forEach(listener => listener(state));
                },
                subscribe: (listener) => {
                    listeners.push(listener);
                    return () => {
                        const index = listeners.indexOf(listener);
                        if (index > -1) listeners.splice(index, 1);
                    };
                }
            };
        }

        function observable(obj) {
            const listeners = [];
            
            return new Proxy(obj, {
                set(target, property, value) {
                    const oldValue = target[property];
                    target[property] = value;
                    listeners.forEach(listener => listener(property, value, oldValue));
                    return true;
                },
                get(target, property) {
                    if (property === 'subscribe') {
                        return (listener) => {
                            listeners.push(listener);
                            return () => {
                                const index = listeners.indexOf(listener);
                                if (index > -1) listeners.splice(index, 1);
                            };
                        };
                    }
                    return target[property];
                }
            });
        }

        class EventEmitter {
            constructor() {
                this.events = {};
            }

            on(event, listener) {
                if (!this.events[event]) this.events[event] = [];
                this.events[event].push(listener);
                return () => this.off(event, listener);
            }

            off(event, listener) {
                if (!this.events[event]) return;
                const index = this.events[event].indexOf(listener);
                if (index > -1) this.events[event].splice(index, 1);
            }

            emit(event, ...args) {
                if (!this.events[event]) return;
                this.events[event].forEach(listener => listener(...args));
            }

            once(event, listener) {
                const unsubscribe = this.on(event, (...args) => {
                    unsubscribe();
                    listener(...args);
                });
                return unsubscribe;
            }
        }

        function createUndoRedo() {
            const history = [];
            let currentIndex = -1;

            return {
                execute: (command) => {
                    // Remove any future history
                    history.splice(currentIndex + 1);
                    history.push(command);
                    currentIndex++;
                    command.execute();
                },
                undo: () => {
                    if (currentIndex >= 0) {
                        history[currentIndex].undo();
                        currentIndex--;
                    }
                },
                redo: () => {
                    if (currentIndex < history.length - 1) {
                        currentIndex++;
                        history[currentIndex].execute();
                    }
                },
                canUndo: () => currentIndex >= 0,
                canRedo: () => currentIndex < history.length - 1
            };
        }

        function persist(key, state) {
            store(key, state);
        }

        function hydrate(key, defaultState = {}) {
            return retrieve(key, defaultState);
        }

        function middleware(store, middlewareFn) {
            const originalSetState = store.setState;
            store.setState = (newState) => {
                const processedState = middlewareFn(newState, store.getState());
                originalSetState(processedState);
            };
        }

        function computed(fn, dependencies = []) {
            let cachedValue;
            let isDirty = true;
            
            const compute = () => {
                if (isDirty) {
                    cachedValue = fn();
                    isDirty = false;
                }
                return cachedValue;
            };

            // Mark as dirty when dependencies change
            dependencies.forEach(dep => {
                if (dep && typeof dep.subscribe === 'function') {
                    dep.subscribe(() => { isDirty = true; });
                }
            });

            return { get: compute, invalidate: () => { isDirty = true; } };
        }
