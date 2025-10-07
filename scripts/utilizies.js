        // Math & Numbers
        function clamp(value, min, max) {
            return Math.min(Math.max(value, min), max);
        }
        
        function lerp(start, end, t) {
            return start + (end - start) * t;
        }
        
        function randomRange(min, max) {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }
        
        // Arrays & Collections
        function shuffle(array) {
            const arr = [...array];
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
            return arr;
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
        
        // String Utilities
        function capitalize(str) {
            return str.replace(/\w\S*/g, (txt) => 
                txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
            );
        }
        
        function slugify(str) {
            return str
                .toLowerCase()
                .trim()
                .replace(/[^\w\s-]/g, '')
                .replace(/[\s_-]+/g, '-')
                .replace(/^-+|-+$/g, '');
        }
        
        // Time & Dates
        function formatTime(seconds) {
            const hrs = Math.floor(seconds / 3600);
            const mins = Math.floor((seconds % 3600) / 60);
            const secs = seconds % 60;
            
            if (hrs > 0) {
                return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            }
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        }
        
        function timeAgo(date) {
            const now = new Date();
            const diffMs = now - date;
            const diffSecs = Math.floor(diffMs / 1000);
            const diffMins = Math.floor(diffSecs / 60);
            const diffHours = Math.floor(diffMins / 60);
            const diffDays = Math.floor(diffHours / 24);
            
            if (diffSecs < 60) return 'just now';
            if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
            if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
            return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
        }
        
        // Game Development
        function distance2D(x1, y1, x2, y2) {
            return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        }
        
        function collision(rect1, rect2) {
            return rect1.x < rect2.x + rect2.width &&
                   rect1.x + rect1.width > rect2.x &&
                   rect1.y < rect2.y + rect2.height &&
                   rect1.y + rect1.height > rect2.y;
        }
        
        // Performance & Utilities
        function debounce(func, delay) {
            let timeoutId;
            return function (...args) {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => func.apply(this, args), delay);
            };
        }
        
        function throttle(func, delay) {
            let lastCall = 0;
            return function (...args) {
                const now = Date.now();
                if (now - lastCall >= delay) {
                    lastCall = now;
                    return func.apply(this, args);
                }
            };
        }
        
        function deepClone(obj) {
            if (obj === null || typeof obj !== 'object') return obj;
            if (obj instanceof Date) return new Date(obj.getTime());
            if (obj instanceof Array) return obj.map(item => deepClone(item));
            if (typeof obj === 'object') {
                const cloned = {};
                Object.keys(obj).forEach(key => {
                    cloned[key] = deepClone(obj[key]);
                });
                return cloned;
            }
        }
        
        function memoize(func) {
            const cache = new Map();
            return function (...args) {
                const key = JSON.stringify(args);
                if (cache.has(key)) {
                    return cache.get(key);
                }
                const result = func.apply(this, args);
                cache.set(key, result);
                return result;
            };
        }
        
        // Validation & Type Checking
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
        
        function isEmpty(value) {
            if (value === null || value === undefined) return true;
            if (typeof value === 'string' || Array.isArray(value)) return value.length === 0;
            if (typeof value === 'object') return Object.keys(value).length === 0;
            return false;
        }
        
        function getType(value) {
            if (value === null) return 'null';
            if (value === undefined) return 'undefined';
            if (Array.isArray(value)) return 'array';
            if (value instanceof Date) return 'date';
            if (value instanceof RegExp) return 'regexp';
            return typeof value;
        }
        
        // Object & Data Manipulation
        function pick(obj, keys) {
            const result = {};
            keys.forEach(key => {
                if (key in obj) {
                    result[key] = obj[key];
                }
            });
            return result;
        }
        
        function omit(obj, keys) {
            const result = { ...obj };
            keys.forEach(key => {
                delete result[key];
            });
            return result;
        }
        
        function flatten(arr) {
            return arr.reduce((flat, item) => {
                return flat.concat(Array.isArray(item) ? flatten(item) : item);
            }, []);
        }
        
        function groupBy(array, key) {
            return array.reduce((groups, item) => {
                const group = item[key];
                groups[group] = groups[group] || [];
                groups[group].push(item);
                return groups;
            }, {});
        }
        
        // Color & Graphics
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
        
        // Advanced Algorithms
        function binarySearch(arr, target) {
            let left = 0;
            let right = arr.length - 1;
            
            while (left <= right) {
                const mid = Math.floor((left + right) / 2);
                if (arr[mid] === target) return mid;
                if (arr[mid] < target) left = mid + 1;
                else right = mid - 1;
            }
            return -1;
        }
        
        function quickSort(arr) {
            if (arr.length <= 1) return arr;
            
            const pivot = arr[Math.floor(arr.length / 2)];
            const left = arr.filter(x => x < pivot);
            const middle = arr.filter(x => x === pivot);
            const right = arr.filter(x => x > pivot);
            
            return [...quickSort(left), ...middle, ...quickSort(right)];
        }
        
        function fibonacci(n) {
            if (n <= 1) return n;
            let a = 0, b = 1;
            for (let i = 2; i <= n; i++) {
                [a, b] = [b, a + b];
            }
            return b;
        }
        
        // DOM & Browser Utilities
        function getScrollPosition() {
            return {
                x: window.pageXOffset || document.documentElement.scrollLeft,
                y: window.pageYOffset || document.documentElement.scrollTop
            };
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
        
        function getDeviceInfo() {
            return {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language,
                cookieEnabled: navigator.cookieEnabled,
                onLine: navigator.onLine,
                screenWidth: screen.width,
                screenHeight: screen.height,
                windowWidth: window.innerWidth,
                windowHeight: window.innerHeight
            };
        }
        
        // Storage & Persistence
        const storage = {
            set(key, value, expireInDays = null) {
                const item = {
                    value: value,
                    timestamp: Date.now(),
                    expire: expireInDays ? Date.now() + (expireInDays * 24 * 60 * 60 * 1000) : null
                };
                localStorage.setItem(key, JSON.stringify(item));
            },
            
            get(key) {
                const item = localStorage.getItem(key);
                if (!item) return null;
                
                const parsed = JSON.parse(item);
                if (parsed.expire && Date.now() > parsed.expire) {
                    localStorage.removeItem(key);
                    return null;
                }
                return parsed.value;
            },
            
            remove(key) {
                localStorage.removeItem(key);
            }
        };
        
        const cookie = {
            set(name, value, days = 7) {
                const expires = new Date();
                expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
                document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
            },
            
            get(name) {
                const nameEQ = name + "=";
                const ca = document.cookie.split(';');
                for (let i = 0; i < ca.length; i++) {
                    let c = ca[i];
                    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
                    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
                }
                return null;
            },
            
            remove(name) {
                document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
            }
        };
        
        // Async & Promises
        function sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
        
        async function retry(fn, attempts = 3, delay = 1000) {
            for (let i = 0; i < attempts; i++) {
                try {
                    return await fn();
                } catch (error) {
                    if (i === attempts - 1) throw error;
                    await sleep(delay * Math.pow(2, i)); // Exponential backoff
                }
            }
        }
        
        function timeout(promise, ms) {
            return Promise.race([
                promise,
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Timeout')), ms)
                )
            ]);
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
        
        // Data Structures
        class Queue {
            constructor() {
                this.items = [];
            }
            
            enqueue(item) {
                this.items.push(item);
            }
            
            dequeue() {
                return this.items.shift();
            }
            
            peek() {
                return this.items[0];
            }
            
            isEmpty() {
                return this.items.length === 0;
            }
            
            size() {
                return this.items.length;
            }
            
            toArray() {
                return [...this.items];
            }
        }
        
        class Stack {
            constructor() {
                this.items = [];
            }
            
            push(item) {
                this.items.push(item);
            }
            
            pop() {
                return this.items.pop();
            }
            
            peek() {
                return this.items[this.items.length - 1];
            }
            
            isEmpty() {
                return this.items.length === 0;
            }
            
            size() {
                return this.items.length;
            }
            
            toArray() {
                return [...this.items];
            }
        }
        
        class LRUCache {
            constructor(capacity = 3) {
                this.capacity = capacity;
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
                } else if (this.cache.size >= this.capacity) {
                    const firstKey = this.cache.keys().next().value;
                    this.cache.delete(firstKey);
                }
                this.cache.set(key, value);
            }
            
            toObject() {
                return Object.fromEntries(this.cache);
            }
        }
        
        // Functional Programming
        function pipe(...functions) {
            return (value) => functions.reduce((acc, fn) => fn(acc), value);
        }
        
        function compose(...functions) {
            return (value) => functions.reduceRight((acc, fn) => fn(acc), value);
        }
        
        function curry(fn) {
            return function curried(...args) {
                if (args.length >= fn.length) {
                    return fn.apply(this, args);
                } else {
                    return function(...args2) {
                        return curried.apply(this, args.concat(args2));
                    };
                }
            };
        }
        
        function partial(fn, ...partialArgs) {
            return function(...remainingArgs) {
                return fn(...partialArgs, ...remainingArgs);
            };
        }
        
        // Advanced Math
        function gcd(a, b) {
            while (b !== 0) {
                [a, b] = [b, a % b];
            }
            return Math.abs(a);
        }
        
        function lcm(a, b) {
            return Math.abs(a * b) / gcd(a, b);
        }
        
        function isPrime(n) {
            if (n < 2) return false;
            if (n === 2) return true;
            if (n % 2 === 0) return false;
            
            for (let i = 3; i <= Math.sqrt(n); i += 2) {
                if (n % i === 0) return false;
            }
            return true;
        }
        
        function factorial(n) {
            if (n < 0) return null;
            if (n <= 1) return 1;
            
            let result = 1;
            for (let i = 2; i <= n; i++) {
                result *= i;
            }
            return result;
        }
        
        // Text Processing
        function levenshtein(str1, str2) {
            const matrix = [];
            
            for (let i = 0; i <= str2.length; i++) {
                matrix[i] = [i];
            }
            
            for (let j = 0; j <= str1.length; j++) {
                matrix[0][j] = j;
            }
            
            for (let i = 1; i <= str2.length; i++) {
                for (let j = 1; j <= str1.length; j++) {
                    if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                        matrix[i][j] = matrix[i - 1][j - 1];
                    } else {
                        matrix[i][j] = Math.min(
                            matrix[i - 1][j - 1] + 1,
                            matrix[i][j - 1] + 1,
                            matrix[i - 1][j] + 1
                        );
                    }
                }
            }
            
            return matrix[str2.length][str1.length];
        }
        
        function wordCount(text) {
            const words = text.toLowerCase().match(/\b\w+\b/g) || [];
            const wordFreq = {};
            
            words.forEach(word => {
                wordFreq[word] = (wordFreq[word] || 0) + 1;
            });
            
            return {
                totalWords: words.length,
                uniqueWords: Object.keys(wordFreq).length,
                characters: text.length,
                charactersNoSpaces: text.replace(/\s/g, '').length,
                sentences: (text.match(/[.!?]+/g) || []).length,
                mostFrequent: Object.entries(wordFreq)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 3)
            };
        }
        
        function fuzzySearch(query, items, threshold = 0.3) {
            const results = items.map(item => {
                const distance = levenshtein(query.toLowerCase(), item.toLowerCase());
                const maxLength = Math.max(query.length, item.length);
                const similarity = 1 - (distance / maxLength);
                
                return { item, similarity, distance };
            });
            
            return results
                .filter(result => result.similarity >= threshold)
                .sort((a, b) => b.similarity - a.similarity);
        }
        
        // Geometry & Graphics
        function pointInPolygon(point, polygon) {
            const [x, y] = point;
            let inside = false;
            
            for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
                const [xi, yi] = polygon[i];
                const [xj, yj] = polygon[j];
                
                if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
                    inside = !inside;
                }
            }
            
            return inside;
        }
        
        function bezierCurve(t, points) {
            if (points.length === 1) return points[0];
            
            const newPoints = [];
            for (let i = 0; i < points.length - 1; i++) {
                const [x1, y1] = points[i];
                const [x2, y2] = points[i + 1];
                newPoints.push([
                    x1 + t * (x2 - x1),
                    y1 + t * (y2 - y1)
                ]);
            }
            
            return bezierCurve(t, newPoints);
        }
        
        function rotatePoint(point, angle, origin = [0, 0]) {
            const [x, y] = point;
            const [ox, oy] = origin;
            const rad = (angle * Math.PI) / 180;
            
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            
            const nx = cos * (x - ox) - sin * (y - oy) + ox;
            const ny = sin * (x - ox) + cos * (y - oy) + oy;
            
            return [nx, ny];
        }
        
        // Global instances for demos
        const demoQueue = new Queue();
        const demoStack = new Stack();
        const demoCache = new LRUCache(3);
        
        // Device & Hardware
        class HapticFeedback {
            constructor() {
                this.isSupported = 'vibrate' in navigator;
            }
            
            vibrate(pattern) {
                if (!this.isSupported) {
                    console.log('Haptic feedback simulated:', pattern);
                    return false;
                }
                try {
                    navigator.vibrate(pattern);
                    return true;
                } catch (error) {
                    console.warn('Haptic feedback failed:', error);
                    return false;
                }
            }
            
            light() { return this.vibrate(50); }
            medium() { return this.vibrate(100); }
            heavy() { return this.vibrate(200); }
            success() { return this.vibrate([100, 50, 100]); }
            error() { return this.vibrate([200, 100, 200, 100, 200]); }
            warning() { return this.vibrate([150, 75, 150]); }
            selection() { return this.vibrate(75); }
            notification() { return this.vibrate([100, 100, 100]); }
            heartbeat() { return this.vibrate([100, 50, 150, 200, 100, 50, 150]); }
            pulse() { return this.vibrate([50, 25, 75, 25, 100, 25, 75, 25, 50]); }
            
            custom(options = {}) {
                const defaults = {
                    intensity: 0.5,
                    duration: 100,
                    pattern: null,
                    repeat: 1,
                    delay: 100
                };
                const config = { ...defaults, ...options };
                
                let vibrationPattern;
                if (config.pattern) {
                    vibrationPattern = config.pattern;
                } else {
                    const mappedDuration = Math.round(config.intensity * config.duration);
                    vibrationPattern = [mappedDuration];
                }
                
                if (config.repeat > 1) {
                    const originalPattern = [...vibrationPattern];
                    vibrationPattern = [];
                    for (let i = 0; i < config.repeat; i++) {
                        vibrationPattern.push(...originalPattern);
                        if (i < config.repeat - 1) {
                            vibrationPattern.push(config.delay);
                        }
                    }
                }
                
                return this.vibrate(vibrationPattern);
            }
            
            stop() { return this.vibrate(0); }
            isAvailable() { return this.isSupported; }
        }
        
        async function getBatteryInfo() {
            if ('getBattery' in navigator) {
                try {
                    const battery = await navigator.getBattery();
                    return {
                        level: Math.round(battery.level * 100),
                        charging: battery.charging,
                        chargingTime: battery.chargingTime,
                        dischargingTime: battery.dischargingTime
                    };
                } catch (error) {
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
        
        // Performance & Timing
        class Timer {
            constructor(key = 'default') {
                this.key = `timer-${key}`;
            }
            
            start() {
                localStorage.setItem(this.key, Date.now().toString());
            }
            
            stop() {
                const startTime = localStorage.getItem(this.key);
                if (startTime) {
                    localStorage.removeItem(this.key);
                    return Date.now() - parseInt(startTime);
                }
                return null;
            }
            
            elapsed() {
                const startTime = localStorage.getItem(this.key);
                if (startTime) {
                    return Date.now() - parseInt(startTime);
                }
                return null;
            }
            
            reset() {
                localStorage.removeItem(this.key);
            }
        }
        
        function benchmark(fn, iterations = 1000) {
            const times = [];
            
            for (let i = 0; i < iterations; i++) {
                const start = performance.now();
                fn();
                const end = performance.now();
                times.push(end - start);
            }
            
            times.sort((a, b) => a - b);
            const sum = times.reduce((a, b) => a + b, 0);
            
            return {
                iterations,
                total: sum.toFixed(3),
                average: (sum / iterations).toFixed(3),
                median: times[Math.floor(iterations / 2)].toFixed(3),
                min: times[0].toFixed(3),
                max: times[iterations - 1].toFixed(3)
            };
        }
        
        function fps(callback) {
            let lastTime = performance.now();
            let frameCount = 0;
            let running = true;
            
            function tick() {
                if (!running) return;
                
                const currentTime = performance.now();
                frameCount++;
                
                if (currentTime - lastTime >= 1000) {
                    const currentFPS = Math.round((frameCount * 1000) / (currentTime - lastTime));
                    callback(currentFPS);
                    frameCount = 0;
                    lastTime = currentTime;
                }
                
                requestAnimationFrame(tick);
            }
            
            requestAnimationFrame(tick);
            
            return {
                stop: () => { running = false; }
            };
        }
        
        // Random & Probability
        function weightedRandom(items, weights) {
            const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
            const random = Math.random() * totalWeight;
            let sum = 0;
            
            for (let i = 0; i < items.length; i++) {
                sum += weights[i];
                if (random <= sum) {
                    return items[i];
                }
            }
        }
        
        function uuid() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                const r = Math.random() * 16 | 0;
                const v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }
        
        function randomString(length, charset = 'alphanumeric') {
            const charsets = {
                alphanumeric: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
                alpha: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
                numeric: '0123456789',
                hex: '0123456789ABCDEF',
                password: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
            };
            
            const chars = charsets[charset] || charsets.alphanumeric;
            let result = '';
            
            for (let i = 0; i < length; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            
            return result;
        }
        
        // File & Data Processing
        function parseCSV(csvString) {
            const lines = csvString.trim().split('\n');
            const result = [];
            
            for (let line of lines) {
                const row = [];
                let current = '';
                let inQuotes = false;
                
                for (let i = 0; i < line.length; i++) {
                    const char = line[i];
                    
                    if (char === '"') {
                        inQuotes = !inQuotes;
                    } else if (char === ',' && !inQuotes) {
                        row.push(current.trim());
                        current = '';
                    } else {
                        current += char;
                    }
                }
                
                row.push(current.trim());
                result.push(row);
            }
            
            return result;
        }
        
        function formatBytes(bytes, decimals = 2) {
            if (bytes === 0) return '0 Bytes';
            
            const k = 1024;
            const dm = decimals < 0 ? 0 : decimals;
            const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
            
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            
            return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
        }
        
        function downloadFile(data, filename, type = 'text/plain') {
            const blob = new Blob([data], { type });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
        
        // URL & Navigation
        function parseURL(url) {
            try {
                const parsed = new URL(url);
                const params = {};
                
                parsed.searchParams.forEach((value, key) => {
                    params[key] = value;
                });
                
                return {
                    protocol: parsed.protocol,
                    hostname: parsed.hostname,
                    port: parsed.port,
                    pathname: parsed.pathname,
                    search: parsed.search,
                    hash: parsed.hash,
                    params
                };
            } catch (error) {
                return { error: 'Invalid URL' };
            }
        }
        
        function buildURL(base, params = {}) {
            const url = new URL(base);
            
            Object.entries(params).forEach(([key, value]) => {
                url.searchParams.set(key, value);
            });
            
            return url.toString();
        }
        
        function getQueryParams() {
            const params = {};
            const searchParams = new URLSearchParams(window.location.search);
            
            searchParams.forEach((value, key) => {
                params[key] = value;
            });
            
            return params;
        }
        
        // Security & Encoding
        function hash(string, algorithm = 'djb2') {
            switch (algorithm) {
                case 'djb2':
                    let hash = 5381;
                    for (let i = 0; i < string.length; i++) {
                        hash = ((hash << 5) + hash) + string.charCodeAt(i);
                    }
                    return (hash >>> 0).toString(16);
                    
                case 'fnv1a':
                    let fnvHash = 2166136261;
                    for (let i = 0; i < string.length; i++) {
                        fnvHash ^= string.charCodeAt(i);
                        fnvHash *= 16777619;
                    }
                    return (fnvHash >>> 0).toString(16);
                    
                case 'simple':
                    let simpleHash = 0;
                    for (let i = 0; i < string.length; i++) {
                        simpleHash += string.charCodeAt(i);
                    }
                    return simpleHash.toString(16);
                    
                default:
                    return hash(string, 'djb2');
            }
        }
        
        function base64Encode(string) {
            try {
                return btoa(unescape(encodeURIComponent(string)));
            } catch (error) {
                return { error: 'Encoding failed' };
            }
        }
        
        function base64Decode(string) {
            try {
                return decodeURIComponent(escape(atob(string)));
            } catch (error) {
                return { error: 'Decoding failed' };
            }
        }
        
        function sanitizeHTML(html) {
            const div = document.createElement('div');
            div.textContent = html;
            return div.innerHTML
                .replace(/&lt;script[^&]*&gt;.*?&lt;\/script&gt;/gi, '')
                .replace(/&lt;iframe[^&]*&gt;.*?&lt;\/iframe&gt;/gi, '')
                .replace(/javascript:/gi, '')
                .replace(/on\w+\s*=/gi, '');
        }
        
        // Image & Media
        function resizeImage(file, maxWidth, maxHeight) {
            return new Promise((resolve) => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const img = new Image();
                
                img.onload = () => {
                    const ratio = Math.min(maxWidth / img.width, maxHeight / img.height);
                    canvas.width = img.width * ratio;
                    canvas.height = img.height * ratio;
                    
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    canvas.toBlob(resolve, 'image/jpeg', 0.9);
                };
                
                img.src = URL.createObjectURL(file);
            });
        }
        
        function getImageDimensions(file) {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    resolve({ width: img.width, height: img.height });
                    URL.revokeObjectURL(img.src);
                };
                img.src = URL.createObjectURL(file);
            });
        }
        
        function generateThumbnail(file, size) {
            return new Promise((resolve) => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const img = new Image();
                
                img.onload = () => {
                    canvas.width = size;
                    canvas.height = size;
                    
                    const scale = Math.max(size / img.width, size / img.height);
                    const x = (size - img.width * scale) / 2;
                    const y = (size - img.height * scale) / 2;
                    
                    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
                    canvas.toBlob(resolve, 'image/jpeg', 0.9);
                };
                
                img.src = URL.createObjectURL(file);
            });
        }
        
        // Audio & Sound
        class AudioManager {
            constructor() {
                this.audioContext = null;
                this.initAudio();
            }
            
            async initAudio() {
                try {
                    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                } catch (e) {
                    console.warn('Web Audio API not supported');
                }
            }
            
            async createOscillator(frequency, type = 'sine', duration = 1000) {
                if (!this.audioContext) return;
                
                if (this.audioContext.state === 'suspended') {
                    await this.audioContext.resume();
                }
                
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
                oscillator.type = type;
                
                gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration / 1000);
                
                oscillator.start(this.audioContext.currentTime);
                oscillator.stop(this.audioContext.currentTime + duration / 1000);
                
                return oscillator;
            }
            
            async playChord(frequencies, duration = 2000) {
                const oscillators = frequencies.map(freq => 
                    this.createOscillator(freq, 'sine', duration)
                );
                return Promise.all(oscillators);
            }
            
            async whiteNoise(duration = 1000) {
                if (!this.audioContext) return;
                
                const bufferSize = this.audioContext.sampleRate * duration / 1000;
                const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
                const data = buffer.getChannelData(0);
                
                for (let i = 0; i < bufferSize; i++) {
                    data[i] = Math.random() * 2 - 1;
                }
                
                const source = this.audioContext.createBufferSource();
                const gainNode = this.audioContext.createGain();
                
                source.buffer = buffer;
                source.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
                source.start();
            }
            
            async frequencySweep(startFreq, endFreq, duration = 2000) {
                if (!this.audioContext) return;
                
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                oscillator.frequency.setValueAtTime(startFreq, this.audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(endFreq, this.audioContext.currentTime + duration / 1000);
                
                gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration / 1000);
                
                oscillator.start();
                oscillator.stop(this.audioContext.currentTime + duration / 1000);
            }
        }
        
        // Machine Learning & AI
        function linearRegression(points) {
            const n = points.length;
            const sumX = points.reduce((sum, p) => sum + p[0], 0);
            const sumY = points.reduce((sum, p) => sum + p[1], 0);
            const sumXY = points.reduce((sum, p) => sum + p[0] * p[1], 0);
            const sumXX = points.reduce((sum, p) => sum + p[0] * p[0], 0);
            
            const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
            const intercept = (sumY - slope * sumX) / n;
            
            return {
                slope,
                intercept,
                predict: (x) => slope * x + intercept,
                r2: () => {
                    const yMean = sumY / n;
                    const ssRes = points.reduce((sum, p) => {
                        const predicted = slope * p[0] + intercept;
                        return sum + Math.pow(p[1] - predicted, 2);
                    }, 0);
                    const ssTot = points.reduce((sum, p) => sum + Math.pow(p[1] - yMean, 2), 0);
                    return 1 - (ssRes / ssTot);
                }
            };
        }
        
        function kMeansClustering(points, k) {
            // Initialize centroids randomly
            let centroids = Array.from({length: k}, () => [
                Math.random() * 100,
                Math.random() * 100
            ]);
            
            let clusters = [];
            let iterations = 0;
            const maxIterations = 100;
            
            while (iterations < maxIterations) {
                // Assign points to nearest centroid
                clusters = Array.from({length: k}, () => []);
                
                points.forEach(point => {
                    let minDistance = Infinity;
                    let clusterIndex = 0;
                    
                    centroids.forEach((centroid, i) => {
                        const distance = Math.sqrt(
                            Math.pow(point[0] - centroid[0], 2) + 
                            Math.pow(point[1] - centroid[1], 2)
                        );
                        if (distance < minDistance) {
                            minDistance = distance;
                            clusterIndex = i;
                        }
                    });
                    
                    clusters[clusterIndex].push(point);
                });
                
                // Update centroids
                const newCentroids = clusters.map(cluster => {
                    if (cluster.length === 0) return centroids[clusters.indexOf(cluster)];
                    
                    const sumX = cluster.reduce((sum, p) => sum + p[0], 0);
                    const sumY = cluster.reduce((sum, p) => sum + p[1], 0);
                    return [sumX / cluster.length, sumY / cluster.length];
                });
                
                // Check convergence
                const converged = centroids.every((centroid, i) => 
                    Math.abs(centroid[0] - newCentroids[i][0]) < 0.01 &&
                    Math.abs(centroid[1] - newCentroids[i][1]) < 0.01
                );
                
                centroids = newCentroids;
                iterations++;
                
                if (converged) break;
            }
            
            return { centroids, clusters, iterations };
        }
        
        class SimpleNeuralNetwork {
            constructor(inputSize, hiddenSize, outputSize) {
                this.inputSize = inputSize;
                this.hiddenSize = hiddenSize;
                this.outputSize = outputSize;
                
                // Initialize weights with small random values
                this.weights1 = this.randomMatrix(inputSize, hiddenSize);
                this.weights2 = this.randomMatrix(hiddenSize, outputSize);
                this.learningRate = 0.5;
            }
            
            randomMatrix(rows, cols) {
                return Array.from({length: rows}, () => 
                    Array.from({length: cols}, () => (Math.random() - 0.5) * 0.5)
                );
            }
            
            sigmoid(x) {
                // Clamp x to prevent overflow
                const clampedX = Math.max(-500, Math.min(500, x));
                return 1 / (1 + Math.exp(-clampedX));
            }
            
            sigmoidDerivative(x) {
                return x * (1 - x);
            }
            
            forward(inputs) {
                // Input to hidden layer
                this.hiddenInputs = [];
                for (let j = 0; j < this.hiddenSize; j++) {
                    let sum = 0;
                    for (let i = 0; i < this.inputSize; i++) {
                        sum += inputs[i] * this.weights1[i][j];
                    }
                    this.hiddenInputs[j] = sum;
                }
                
                this.hiddenOutputs = this.hiddenInputs.map(x => this.sigmoid(x));
                
                // Hidden to output layer
                this.outputInputs = [];
                for (let k = 0; k < this.outputSize; k++) {
                    let sum = 0;
                    for (let j = 0; j < this.hiddenSize; j++) {
                        sum += this.hiddenOutputs[j] * this.weights2[j][k];
                    }
                    this.outputInputs[k] = sum;
                }
                
                this.outputs = this.outputInputs.map(x => this.sigmoid(x));
                return this.outputs;
            }
            
            train(inputs, targets) {
                this.forward(inputs);
                
                // Calculate output layer errors
                const outputErrors = [];
                for (let k = 0; k < this.outputSize; k++) {
                    outputErrors[k] = targets[k] - this.outputs[k];
                }
                
                // Calculate output layer deltas
                const outputDeltas = [];
                for (let k = 0; k < this.outputSize; k++) {
                    outputDeltas[k] = outputErrors[k] * this.sigmoidDerivative(this.outputs[k]);
                }
                
                // Calculate hidden layer errors
                const hiddenErrors = [];
                for (let j = 0; j < this.hiddenSize; j++) {
                    let error = 0;
                    for (let k = 0; k < this.outputSize; k++) {
                        error += outputDeltas[k] * this.weights2[j][k];
                    }
                    hiddenErrors[j] = error;
                }
                
                // Calculate hidden layer deltas
                const hiddenDeltas = [];
                for (let j = 0; j < this.hiddenSize; j++) {
                    hiddenDeltas[j] = hiddenErrors[j] * this.sigmoidDerivative(this.hiddenOutputs[j]);
                }
                
                // Update weights between hidden and output layers
                for (let j = 0; j < this.hiddenSize; j++) {
                    for (let k = 0; k < this.outputSize; k++) {
                        this.weights2[j][k] += this.learningRate * outputDeltas[k] * this.hiddenOutputs[j];
                    }
                }
                
                // Update weights between input and hidden layers
                for (let i = 0; i < this.inputSize; i++) {
                    for (let j = 0; j < this.hiddenSize; j++) {
                        this.weights1[i][j] += this.learningRate * hiddenDeltas[j] * inputs[i];
                    }
                }
            }
        }
        
        // Cryptography & Hashing
        function caesarCipher(text, shift, decrypt = false) {
            const actualShift = decrypt ? -shift : shift;
            return text.replace(/[a-zA-Z]/g, char => {
                const start = char <= 'Z' ? 65 : 97;
                return String.fromCharCode(((char.charCodeAt(0) - start + actualShift + 26) % 26) + start);
            });
        }
        
        function vigenèreCipher(text, key, decrypt = false) {
            const keyUpper = key.toUpperCase();
            let keyIndex = 0;
            
            return text.replace(/[a-zA-Z]/g, char => {
                const isUpper = char <= 'Z';
                const charCode = char.toUpperCase().charCodeAt(0) - 65;
                const keyCode = keyUpper.charCodeAt(keyIndex % keyUpper.length) - 65;
                
                const shift = decrypt ? -keyCode : keyCode;
                const newCharCode = (charCode + shift + 26) % 26;
                
                keyIndex++;
                
                const newChar = String.fromCharCode(newCharCode + 65);
                return isUpper ? newChar : newChar.toLowerCase();
            });
        }
        
        function generateKeyPair() {
            // Simplified RSA-like key generation (not cryptographically secure)
            const p = 61; // Small prime
            const q = 53; // Small prime
            const n = p * q;
            const phi = (p - 1) * (q - 1);
            
            // Find e (public exponent)
            let e = 3;
            while (gcd(e, phi) !== 1) {
                e += 2;
            }
            
            // Find d (private exponent) using extended Euclidean algorithm
            function modInverse(a, m) {
                let m0 = m;
                let x0 = 0;
                let x1 = 1;
                
                if (m === 1) return 0;
                
                while (a > 1) {
                    const q = Math.floor(a / m);
                    let t = m;
                    
                    m = a % m;
                    a = t;
                    t = x0;
                    
                    x0 = x1 - q * x0;
                    x1 = t;
                }
                
                if (x1 < 0) x1 += m0;
                return x1;
            }
            
            const d = modInverse(e, phi);
            
            // Fast modular exponentiation
            function modPow(base, exp, mod) {
                let result = 1;
                base = base % mod;
                while (exp > 0) {
                    if (exp % 2 === 1) {
                        result = (result * base) % mod;
                    }
                    exp = Math.floor(exp / 2);
                    base = (base * base) % mod;
                }
                return result;
            }
            
            return {
                publicKey: { n, e },
                privateKey: { n, d },
                encrypt: (message) => {
                    return message.split('').map(char => {
                        const m = char.charCodeAt(0);
                        return modPow(m, e, n);
                    });
                },
                decrypt: (encrypted) => {
                    return encrypted.map(c => {
                        const decrypted = modPow(c, d, n);
                        return String.fromCharCode(decrypted);
                    }).join('');
                }
            };
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
        
        // Web Scraping & APIs
        async function fetchWithRetry(url, options = {}) {
            const { maxRetries = 3, delay = 1000, timeout = 5000 } = options;
            
            for (let attempt = 0; attempt < maxRetries; attempt++) {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), timeout);
                    
                    const response = await fetch(url, {
                        ...options,
                        signal: controller.signal
                    });
                    
                    clearTimeout(timeoutId);
                    
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                    
                    return response;
                } catch (error) {
                    if (attempt === maxRetries - 1) throw error;
                    await sleep(delay * Math.pow(2, attempt));
                }
            }
        }
        
        function parseHTML(htmlString) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlString, 'text/html');
            
            const links = Array.from(doc.querySelectorAll('a')).map(link => ({
                href: link.href,
                text: link.textContent.trim()
            }));
            
            const title = doc.querySelector('h1, h2, h3')?.textContent || '';
            const text = doc.body?.textContent || '';
            
            return { links, title, text };
        }
        
        function rateLimiter(requestsPerSecond) {
            const queue = [];
            const interval = 1000 / requestsPerSecond;
            let lastExecution = 0;
            
            return function(fn) {
                const now = Date.now();
                const timeSinceLastExecution = now - lastExecution;
                
                if (timeSinceLastExecution >= interval) {
                    lastExecution = now;
                    fn();
                } else {
                    const delay = interval - timeSinceLastExecution;
                    setTimeout(() => {
                        lastExecution = Date.now();
                        fn();
                    }, delay);
                }
            };
        }
        
        // Data Visualization
        function drawChart(canvas, data, type) {
            const ctx = canvas.getContext('2d');
            const { labels, values } = data;
            const padding = 40;
            const chartWidth = canvas.width - 2 * padding;
            const chartHeight = canvas.height - 2 * padding;
            
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#333';
            ctx.font = '12px Arial';
            
            if (type === 'bar') {
                const barWidth = chartWidth / values.length;
                const maxValue = Math.max(...values);
                
                values.forEach((value, i) => {
                    const barHeight = (value / maxValue) * chartHeight;
                    const x = padding + i * barWidth;
                    const y = canvas.height - padding - barHeight;
                    
                    ctx.fillStyle = `hsl(${i * 60}, 70%, 60%)`;
                    ctx.fillRect(x + 5, y, barWidth - 10, barHeight);
                    
                    ctx.fillStyle = '#333';
                    ctx.fillText(labels[i], x + barWidth/2 - 10, canvas.height - 20);
                    ctx.fillText(value.toString(), x + barWidth/2 - 10, y - 5);
                });
            } else if (type === 'line') {
                const stepX = chartWidth / (values.length - 1);
                const maxValue = Math.max(...values);
                const minValue = Math.min(...values);
                const range = maxValue - minValue;
                
                ctx.strokeStyle = '#4299e1';
                ctx.lineWidth = 2;
                ctx.beginPath();
                
                values.forEach((value, i) => {
                    const x = padding + i * stepX;
                    const y = canvas.height - padding - ((value - minValue) / range) * chartHeight;
                    
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                    
                    // Draw points
                    ctx.fillStyle = '#4299e1';
                    ctx.beginPath();
                    ctx.arc(x, y, 4, 0, Math.PI * 2);
                    ctx.fill();
                });
                
                ctx.stroke();
            } else if (type === 'pie') {
                const centerX = canvas.width / 2;
                const centerY = canvas.height / 2;
                const radius = Math.min(chartWidth, chartHeight) / 2 - 20;
                const total = values.reduce((sum, val) => sum + val, 0);
                
                let currentAngle = 0;
                
                values.forEach((value, i) => {
                    const sliceAngle = (value / total) * 2 * Math.PI;
                    
                    ctx.fillStyle = `hsl(${i * 60}, 70%, 60%)`;
                    ctx.beginPath();
                    ctx.moveTo(centerX, centerY);
                    ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
                    ctx.closePath();
                    ctx.fill();
                    
                    // Label
                    const labelAngle = currentAngle + sliceAngle / 2;
                    const labelX = centerX + Math.cos(labelAngle) * (radius * 0.7);
                    const labelY = centerY + Math.sin(labelAngle) * (radius * 0.7);
                    
                    ctx.fillStyle = '#fff';
                    ctx.fillText(labels[i], labelX - 10, labelY);
                    
                    currentAngle += sliceAngle;
                });
            }
        }
        
        function heatmap(canvas, data) {
            const ctx = canvas.getContext('2d');
            const rows = data.length;
            const cols = data[0].length;
            const cellWidth = canvas.width / cols;
            const cellHeight = canvas.height / rows;
            
            const flatData = data.flat();
            const minValue = Math.min(...flatData);
            const maxValue = Math.max(...flatData);
            const range = maxValue - minValue;
            
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            for (let i = 0; i < rows; i++) {
                for (let j = 0; j < cols; j++) {
                    const value = data[i][j];
                    const intensity = (value - minValue) / range;
                    
                    // Color from blue (cold) to red (hot)
                    const hue = (1 - intensity) * 240; // 240 = blue, 0 = red
                    ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
                    
                    ctx.fillRect(j * cellWidth, i * cellHeight, cellWidth, cellHeight);
                }
            }
        }
        
        // Game Development Advanced
        function pathfinding(grid, start, end) {
            const rows = grid.length;
            const cols = grid[0].length;
            
            function heuristic(a, b) {
                return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
            }
            
            function nodeKey(node) {
                return `${node[0]},${node[1]}`;
            }
            
            const openSet = [start];
            const closedSet = new Set();
            const cameFrom = new Map();
            const gScore = new Map();
            const fScore = new Map();
            
            gScore.set(nodeKey(start), 0);
            fScore.set(nodeKey(start), heuristic(start, end));
            
            while (openSet.length > 0) {
                // Find node with lowest fScore
                let currentIndex = 0;
                for (let i = 1; i < openSet.length; i++) {
                    if ((fScore.get(nodeKey(openSet[i])) || Infinity) < (fScore.get(nodeKey(openSet[currentIndex])) || Infinity)) {
                        currentIndex = i;
                    }
                }
                
                const current = openSet[currentIndex];
                
                // Check if we reached the goal
                if (current[0] === end[0] && current[1] === end[1]) {
                    const path = [];
                    let node = current;
                    while (node) {
                        path.unshift(node);
                        node = cameFrom.get(nodeKey(node));
                    }
                    return path;
                }
                
                // Move current from open to closed set
                openSet.splice(currentIndex, 1);
                closedSet.add(nodeKey(current));
                
                // Check all neighbors
                const neighbors = [
                    [current[0] + 1, current[1]],
                    [current[0] - 1, current[1]],
                    [current[0], current[1] + 1],
                    [current[0], current[1] - 1]
                ];
                
                for (const neighbor of neighbors) {
                    const [x, y] = neighbor;
                    const neighborKey = nodeKey(neighbor);
                    
                    // Skip if out of bounds, wall, or already processed
                    if (x < 0 || x >= cols || y < 0 || y >= rows || 
                        grid[y][x] === 1 || closedSet.has(neighborKey)) {
                        continue;
                    }
                    
                    const tentativeGScore = (gScore.get(nodeKey(current)) || 0) + 1;
                    
                    // Check if this neighbor is already in openSet
                    const inOpenSet = openSet.some(node => node[0] === x && node[1] === y);
                    
                    if (!inOpenSet) {
                        openSet.push(neighbor);
                    } else if (tentativeGScore >= (gScore.get(neighborKey) || Infinity)) {
                        continue; // This path is not better
                    }
                    
                    // This path is the best so far
                    cameFrom.set(neighborKey, current);
                    gScore.set(neighborKey, tentativeGScore);
                    fScore.set(neighborKey, tentativeGScore + heuristic(neighbor, end));
                }
            }
            
            return null; // No path found
        }
        
        function visualizePathfinding(canvas, grid, path, start, end) {
            const ctx = canvas.getContext('2d');
            const cellWidth = canvas.width / grid[0].length;
            const cellHeight = canvas.height / grid.length;
            
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw grid
            for (let y = 0; y < grid.length; y++) {
                for (let x = 0; x < grid[y].length; x++) {
                    if (grid[y][x] === 1) {
                        ctx.fillStyle = '#333';
                        ctx.fillRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);
                    }
                }
            }
            
            // Draw path
            if (path) {
                ctx.fillStyle = '#4299e1';
                path.forEach(([x, y]) => {
                    ctx.fillRect(x * cellWidth + 2, y * cellHeight + 2, cellWidth - 4, cellHeight - 4);
                });
            }
            
            // Draw start and end
            ctx.fillStyle = '#48bb78';
            ctx.fillRect(start[0] * cellWidth + 2, start[1] * cellHeight + 2, cellWidth - 4, cellHeight - 4);
            
            ctx.fillStyle = '#f56565';
            ctx.fillRect(end[0] * cellWidth + 2, end[1] * cellHeight + 2, cellWidth - 4, cellHeight - 4);
        }
        
        function gameLoop(updateFn, renderFn) {
            let lastTime = 0;
            let running = true;
            
            function loop(currentTime) {
                if (!running) return;
                
                const deltaTime = currentTime - lastTime;
                lastTime = currentTime;
                
                updateFn(deltaTime);
                renderFn();
                
                requestAnimationFrame(loop);
            }
            
            requestAnimationFrame(loop);
            
            return {
                stop: () => { running = false; }
            };
        }
        
        function spriteAnimation(frames, duration, renderCallback) {
            let currentFrame = 0;
            let running = true;
            
            function animate() {
                if (!running) return;
                
                renderCallback(frames[currentFrame]);
                currentFrame = (currentFrame + 1) % frames.length;
                
                setTimeout(animate, duration);
            }
            
            animate();
            
            return {
                stop: () => { running = false; }
            };
        }
        
        // Advanced Algorithms
        function dijkstra(graph, start) {
            const distances = {};
            const visited = new Set();
            const nodes = Object.keys(graph);
            
            // Initialize distances
            nodes.forEach(node => {
                distances[node] = node === start ? 0 : Infinity;
            });
            
            while (visited.size < nodes.length) {
                // Find unvisited node with minimum distance
                const current = nodes
                    .filter(node => !visited.has(node))
                    .reduce((min, node) => distances[node] < distances[min] ? node : min);
                
                visited.add(current);
                
                // Update distances to neighbors
                if (graph[current]) {
                    Object.entries(graph[current]).forEach(([neighbor, weight]) => {
                        const newDistance = distances[current] + weight;
                        if (newDistance < distances[neighbor]) {
                            distances[neighbor] = newDistance;
                        }
                    });
                }
            }
            
            return distances;
        }
        
        function reconstructPath(graph, start, end, distances) {
            const path = [end];
            let current = end;
            
            while (current !== start) {
                const neighbors = Object.keys(graph).filter(node => 
                    graph[node] && graph[node][current] !== undefined
                );
                
                current = neighbors.reduce((best, node) => 
                    distances[node] + graph[node][current] === distances[current] ? node : best
                );
                
                path.unshift(current);
            }
            
            return path;
        }
        
        function huffmanCoding(text) {
            // Count character frequencies
            const freq = {};
            for (const char of text) {
                freq[char] = (freq[char] || 0) + 1;
            }
            
            // Build Huffman tree
            const heap = Object.entries(freq).map(([char, count]) => ({ char, count, left: null, right: null }));
            
            while (heap.length > 1) {
                heap.sort((a, b) => a.count - b.count);
                const left = heap.shift();
                const right = heap.shift();
                
                heap.push({
                    char: null,
                    count: left.count + right.count,
                    left,
                    right
                });
            }
            
            const root = heap[0];
            
            // Generate codes
            const codes = {};
            function generateCodes(node, code = '') {
                if (node.char !== null) {
                    codes[node.char] = code || '0';
                } else {
                    generateCodes(node.left, code + '0');
                    generateCodes(node.right, code + '1');
                }
            }
            
            generateCodes(root);
            
            // Encode text
            const encoded = text.split('').map(char => codes[char]).join('');
            
            return { encoded, codes, tree: root };
        }
        
        function geneticAlgorithm(target, populationSize = 50, maxGenerations = 100) {
            const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ ';
            
            function createIndividual() {
                return Array.from({length: target.length}, () => 
                    charset[Math.floor(Math.random() * charset.length)]
                ).join('');
            }
            
            function fitness(individual) {
                return individual.split('').reduce((score, char, i) => 
                    score + (char === target[i] ? 1 : 0), 0
                );
            }
            
            function crossover(parent1, parent2) {
                const crossoverPoint = Math.floor(Math.random() * target.length);
                return parent1.slice(0, crossoverPoint) + parent2.slice(crossoverPoint);
            }
            
            function mutate(individual, mutationRate = 0.01) {
                return individual.split('').map(char => 
                    Math.random() < mutationRate ? 
                        charset[Math.floor(Math.random() * charset.length)] : char
                ).join('');
            }
            
            let population = Array.from({length: populationSize}, createIndividual);
            
            for (let generation = 0; generation < maxGenerations; generation++) {
                // Evaluate fitness
                const scored = population.map(individual => ({
                    individual,
                    fitness: fitness(individual)
                }));
                
                scored.sort((a, b) => b.fitness - a.fitness);
                
                if (scored[0].fitness === target.length) {
                    return {
                        best: scored[0].individual,
                        fitness: scored[0].fitness,
                        generations: generation + 1
                    };
                }
                
                // Selection and reproduction
                const newPopulation = [];
                const elite = scored.slice(0, populationSize * 0.2);
                
                // Keep elite
                newPopulation.push(...elite.map(s => s.individual));
                
                // Generate offspring
                while (newPopulation.length < populationSize) {
                    const parent1 = scored[Math.floor(Math.random() * populationSize * 0.5)].individual;
                    const parent2 = scored[Math.floor(Math.random() * populationSize * 0.5)].individual;
                    const child = mutate(crossover(parent1, parent2));
                    newPopulation.push(child);
                }
                
                population = newPopulation;
            }
            
            const final = population.map(individual => ({
                individual,
                fitness: fitness(individual)
            })).sort((a, b) => b.fitness - a.fitness)[0];
            
            return {
                best: final.individual,
                fitness: final.fitness,
                generations: maxGenerations
            };
        }
        
        function geneticTSP(cities, populationSize = 30, maxGenerations = 50) {
            function createRoute() {
                const route = Array.from({length: cities.length}, (_, i) => i);
                for (let i = route.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [route[i], route[j]] = [route[j], route[i]];
                }
                return route;
            }
            
            function calculateDistance(route) {
                let total = 0;
                for (let i = 0; i < route.length; i++) {
                    const from = cities[route[i]];
                    const to = cities[route[(i + 1) % route.length]];
                    total += Math.sqrt(Math.pow(to.x - from.x, 2) + Math.pow(to.y - from.y, 2));
                }
                return total;
            }
            
            function crossover(parent1, parent2) {
                const start = Math.floor(Math.random() * parent1.length);
                const end = Math.floor(Math.random() * parent1.length);
                const [a, b] = start < end ? [start, end] : [end, start];
                
                const child = new Array(parent1.length).fill(-1);
                for (let i = a; i <= b; i++) {
                    child[i] = parent1[i];
                }
                
                let j = 0;
                for (let i = 0; i < child.length; i++) {
                    if (child[i] === -1) {
                        while (child.includes(parent2[j])) j++;
                        child[i] = parent2[j++];
                    }
                }
                
                return child;
            }
            
            function mutate(route) {
                const newRoute = [...route];
                const i = Math.floor(Math.random() * newRoute.length);
                const j = Math.floor(Math.random() * newRoute.length);
                [newRoute[i], newRoute[j]] = [newRoute[j], newRoute[i]];
                return newRoute;
            }
            
            let population = Array.from({length: populationSize}, createRoute);
            let bestDistance = Infinity;
            let bestRoute = null;
            
            for (let generation = 0; generation < maxGenerations; generation++) {
                const scored = population.map(route => ({
                    route,
                    distance: calculateDistance(route)
                })).sort((a, b) => a.distance - b.distance);
                
                if (scored[0].distance < bestDistance) {
                    bestDistance = scored[0].distance;
                    bestRoute = scored[0].route;
                }
                
                const newPopulation = [];
                const elite = scored.slice(0, populationSize * 0.2);
                newPopulation.push(...elite.map(s => s.route));
                
                while (newPopulation.length < populationSize) {
                    const parent1 = scored[Math.floor(Math.random() * populationSize * 0.5)].route;
                    const parent2 = scored[Math.floor(Math.random() * populationSize * 0.5)].route;
                    let child = crossover(parent1, parent2);
                    if (Math.random() < 0.1) child = mutate(child);
                    newPopulation.push(child);
                }
                
                population = newPopulation;
            }
            
            return {
                route: bestRoute,
                distance: bestDistance,
                generations: maxGenerations
            };
        }
        
        // Global instances
        const haptic = new HapticFeedback();
        const timer = new Timer();
        const audioManager = new AudioManager();
        let fpsMonitor = null;
        let physicsEngine = null;
        let particleSystem = null;
        
