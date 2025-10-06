/**
 * 🚀 ULTIMATE UTILITIES LIBRARY v2.0
 * A comprehensive collection of JavaScript utilities for all development needs
 * Features: Math, Arrays, Strings, Game Dev, ML/AI, Performance, and more!
 * 
 * @author Your Name
 * @version 2.0.0
 * @license MIT
 */

// =============================================
// 🎯 CONFIGURATION & SETUP
// =============================================

const Utilities = (function() {
    'use strict';
    
    const VERSION = '2.0.0';
    const DEBUG_MODE = false;
    
    // Feature detection
    const FEATURES = {
        localStorage: typeof Storage !== 'undefined',
        clipboard: navigator.clipboard !== undefined,
        vibration: 'vibrate' in navigator,
        audioContext: 'AudioContext' in window || 'webkitAudioContext' in window,
        battery: 'getBattery' in navigator,
        network: 'connection' in navigator
    };

    // =============================================
    // 📊 MATH & NUMBERS
    // =============================================

    /**
     * Clamps a value between minimum and maximum bounds
     * @param {number} value - Input value
     * @param {number} min - Minimum bound
     * @param {number} max - Maximum bound
     * @returns {number} Clamped value
     * @example
     * clamp(15, 0, 10); // Returns 10
     */
    function clamp(value, min, max) {
        if (typeof value !== 'number' || typeof min !== 'number' || typeof max !== 'number') {
            console.warn('clamp: All parameters must be numbers');
            return value;
        }
        return Math.min(Math.max(value, min), max);
    }
    
    /**
     * Linear interpolation between two values
     * @param {number} start - Starting value
     * @param {number} end - Ending value  
     * @param {number} t - Interpolation factor (0-1)
     * @returns {number} Interpolated value
     * @example
     * lerp(0, 100, 0.5); // Returns 50
     */
    function lerp(start, end, t) {
        return start + (end - start) * clamp(t, 0, 1);
    }
    
    /**
     * Generates random number in specified range
     * @param {number} min - Minimum value (inclusive)
     * @param {number} max - Maximum value (inclusive)
     * @returns {number} Random number
     */
    function randomRange(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    
    /**
     * Maps a value from one range to another
     * @param {number} value - Input value
     * @param {number} inMin - Input range minimum
     * @param {number} inMax - Input range maximum
     * @param {number} outMin - Output range minimum
     * @param {number} outMax - Output range maximum
     * @returns {number} Mapped value
     */
    function mapRange(value, inMin, inMax, outMin, outMax) {
        return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
    }
    
    /**
     * Checks if number is within tolerance of target
     * @param {number} value - Value to check
     * @param {number} target - Target value
     * @param {number} tolerance - Allowed difference
     * @returns {boolean} True if within tolerance
     */
    function approximately(value, target, tolerance = 0.001) {
        return Math.abs(value - target) <= tolerance;
    }
    
    /**
     * Rounds number to specified decimal places
     * @param {number} value - Number to round
     * @param {number} decimals - Decimal places
     * @returns {number} Rounded number
     */
    function roundTo(value, decimals = 0) {
        const factor = Math.pow(10, decimals);
        return Math.round(value * factor) / factor;
    }

    // =============================================
    // 📋 ARRAYS & COLLECTIONS
    // =============================================

    /**
     * Shuffles array using Fisher-Yates algorithm
     * @param {Array} array - Input array
     * @returns {Array} New shuffled array
     */
    function shuffle(array) {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }
    
    /**
     * Splits array into chunks of specified size
     * @param {Array} array - Input array
     * @param {number} size - Chunk size
     * @returns {Array} Array of chunks
     */
    function chunk(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }
    
    /**
     * Returns unique values from array
     * @param {Array} array - Input array
     * @returns {Array} Array with duplicates removed
     */
    function unique(array) {
        return [...new Set(array)];
    }
    
    /**
     * Finds intersection between multiple arrays
     * @param {...Array} arrays - Arrays to intersect
     * @returns {Array} Common elements
     */
    function intersection(...arrays) {
        return arrays.reduce((a, b) => a.filter(c => b.includes(c)));
    }
    
    /**
     * Returns difference between two arrays
     * @param {Array} arr1 - First array
     * @param {Array} arr2 - Second array
     * @returns {Array} Elements in arr1 but not in arr2
     */
    function difference(arr1, arr2) {
        return arr1.filter(x => !arr2.includes(x));
    }

    // =============================================
    // 🔤 STRING UTILITIES
    // =============================================

    /**
     * Capitalizes the first character of a string
     * @param {string} str - Input string
     * @returns {string} String with first character capitalized
     * @example
     * capitalizeFirst('hello world'); // Returns 'Hello world'
     */
    function capitalizeFirst(str) {
        if (typeof str !== 'string' || str.length === 0) return str;
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
    
    /**
     * Capitalizes first character of every word
     * @param {string} str - Input string
     * @returns {string} Capitalized string
     */
    function capitalize(str) {
        return str.replace(/\w\S*/g, (txt) => 
            txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        );
    }
    
    /**
     * Converts string to URL-friendly slug
     * @param {string} str - Input string
     * @returns {string} Slugified string
     */
    function slugify(str) {
        return str
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }
    
    /**
     * Truncates string to specified length with ellipsis
     * @param {string} str - Input string
     * @param {number} length - Maximum length
     * @param {string} ending - Truncation indicator
     * @returns {string} Truncated string
     */
    function truncate(str, length = 100, ending = '...') {
        if (str.length <= length) return str;
        return str.substring(0, length - ending.length) + ending;
    }
    
    /**
     * Converts string to camelCase
     * @param {string} str - Input string
     * @returns {string} camelCased string
     */
    function camelCase(str) {
        return str.replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '');
    }

    // =============================================
    // ⏰ TIME & DATES
    // =============================================

    /**
     * Formats seconds into HH:MM:SS or MM:SS
     * @param {number} seconds - Total seconds
     * @returns {string} Formatted time string
     */
    function formatTime(seconds) {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    /**
     * Returns human-readable time difference from now
     * @param {Date} date - Target date
     * @returns {string} Time ago string
     */
    function timeAgo(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        const diffWeeks = Math.floor(diffDays / 7);
        const diffMonths = Math.floor(diffDays / 30);
        const diffYears = Math.floor(diffDays / 365);
        
        if (diffSecs < 60) return 'just now';
        if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
        if (diffWeeks < 4) return `${diffWeeks} week${diffWeeks !== 1 ? 's' : ''} ago`;
        if (diffMonths < 12) return `${diffMonths} month${diffMonths !== 1 ? 's' : ''} ago`;
        return `${diffYears} year${diffYears !== 1 ? 's' : ''} ago`;
    }
    
    /**
     * Formats date in specified format
     * @param {Date} date - Input date
     * @param {string} format - Format string
     * @returns {string} Formatted date
     */
    function formatDate(date, format = 'YYYY-MM-DD') {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        
        return format
            .replace('YYYY', year)
            .replace('MM', month)
            .replace('DD', day)
            .replace('HH', hours)
            .replace('mm', minutes)
            .replace('ss', seconds);
    }

    // =============================================
    // 🎮 GAME DEVELOPMENT
    // =============================================

    /**
     * Calculates 2D distance between two points
     * @param {number} x1 - First point X
     * @param {number} y1 - First point Y
     * @param {number} x2 - Second point X
     * @param {number} y2 - Second point Y
     * @returns {number} Distance
     */
    function distance2D(x1, y1, x2, y2) {
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    }
    
    /**
     * Checks collision between two rectangles
     * @param {Object} rect1 - First rectangle {x, y, width, height}
     * @param {Object} rect2 - Second rectangle {x, y, width, height}
     * @returns {boolean} True if colliding
     */
    function collision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }
    
    /**
     * Easing function for smooth animations
     * @param {number} t - Time (0-1)
     * @param {string} type - Ease type
     * @returns {number} Eased value
     */
    function ease(t, type = 'inOutQuad') {
        const easings = {
            linear: t => t,
            inQuad: t => t * t,
            outQuad: t => t * (2 - t),
            inOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
            inCubic: t => t * t * t,
            outCubic: t => (--t) * t * t + 1,
            inOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1
        };
        
        return easings[type] ? easings[type](t) : t;
    }

    // =============================================
    // ⚡ PERFORMANCE & UTILITIES
    // =============================================

    /**
     * Debounces function execution
     * @param {Function} func - Function to debounce
     * @param {number} delay - Delay in milliseconds
     * @returns {Function} Debounced function
     */
    function debounce(func, delay) {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }
    
    /**
     * Throttles function execution
     * @param {Function} func - Function to throttle
     * @param {number} delay - Delay in milliseconds
     * @returns {Function} Throttled function
     */
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
    
    /**
     * Creates deep clone of object
     * @param {*} obj - Object to clone
     * @returns {*} Deep cloned object
     */
    function deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => deepClone(item));
        if (obj instanceof RegExp) return new RegExp(obj);
        if (obj instanceof Map) return new Map(Array.from(obj, ([key, val]) => [key, deepClone(val)]));
        if (obj instanceof Set) return new Set(Array.from(obj, val => deepClone(val)));
        
        if (typeof obj === 'object') {
            const cloned = {};
            Object.keys(obj).forEach(key => {
                cloned[key] = deepClone(obj[key]);
            });
            return cloned;
        }
    }
    
    /**
     * Memoizes function results
     * @param {Function} func - Function to memoize
     * @returns {Function} Memoized function
     */
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

    // =============================================
    // ✅ VALIDATION & TYPE CHECKING
    // =============================================

    /**
     * Validates email format
     * @param {string} email - Email to validate
     * @returns {boolean} True if valid email
     */
    function isEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    /**
     * Validates URL format
     * @param {string} url - URL to validate
     * @returns {boolean} True if valid URL
     */
    function isURL(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }
    
    /**
     * Checks if value is empty
     * @param {*} value - Value to check
     * @returns {boolean} True if empty
     */
    function isEmpty(value) {
        if (value === null || value === undefined) return true;
        if (typeof value === 'string' || Array.isArray(value)) return value.length === 0;
        if (typeof value === 'object') return Object.keys(value).length === 0;
        return false;
    }
    
    /**
     * Returns detailed type of value
     * @param {*} value - Value to check
     * @returns {string} Type string
     */
    function getType(value) {
        if (value === null) return 'null';
        if (value === undefined) return 'undefined';
        if (Array.isArray(value)) return 'array';
        if (value instanceof Date) return 'date';
        if (value instanceof RegExp) return 'regexp';
        if (value instanceof Map) return 'map';
        if (value instanceof Set) return 'set';
        return typeof value;
    }
    
    /**
     * Parses value to boolean with flexible rules
     * @param {*} value - Value to parse
     * @param {Object} options - Parsing options
     * @returns {boolean} Parsed boolean
     * @example
     * parseToBool('true'); // Returns true
     * parseToBool('false'); // Returns false
     * parseToBool(1); // Returns true
     * parseToBool(0); // Returns false
     */
    function parseToBool(value, options = {}) {
        const defaults = {
            strict: false,
            caseSensitive: false,
            customTruthy: [],
            customFalsy: []
        };
        
        const config = { ...defaults, ...options };
        
        if (typeof value === 'boolean') return value;
        if (typeof value === 'number') return value !== 0;
        if (typeof value === 'string') {
            const str = config.caseSensitive ? value : value.toLowerCase();
            const truthy = ['true', 'yes', '1', 'on', 'y'].concat(config.customTruthy);
            const falsy = ['false', 'no', '0', 'off', 'n', ''].concat(config.customFalsy);
            
            if (truthy.includes(str)) return true;
            if (falsy.includes(str)) return false;
        }
        
        return config.strict ? false : Boolean(value);
    }

    // =============================================
    // 💾 STORAGE & PERSISTENCE
    // =============================================

    const storage = {
        /**
         * Sets value in localStorage with expiration
         * @param {string} key - Storage key
         * @param {*} value - Value to store
         * @param {number} expireInDays - Expiration in days
         */
        set(key, value, expireInDays = null) {
            if (!FEATURES.localStorage) {
                console.warn('localStorage is not available');
                return false;
            }
            
            try {
                const item = {
                    value: value,
                    timestamp: Date.now(),
                    expire: expireInDays ? Date.now() + (expireInDays * 24 * 60 * 60 * 1000) : null
                };
                localStorage.setItem(key, JSON.stringify(item));
                return true;
            } catch (error) {
                console.error('storage.set failed:', error);
                return false;
            }
        },
        
        /**
         * Gets value from localStorage
         * @param {string} key - Storage key
         * @returns {*} Stored value or null
         */
        get(key) {
            if (!FEATURES.localStorage) return null;
            
            try {
                const item = localStorage.getItem(key);
                if (!item) return null;
                
                const parsed = JSON.parse(item);
                if (parsed.expire && Date.now() > parsed.expire) {
                    localStorage.removeItem(key);
                    return null;
                }
                return parsed.value;
            } catch (error) {
                console.error('storage.get failed:', error);
                return null;
            }
        },
        
        /**
         * Removes value from localStorage
         * @param {string} key - Storage key
         */
        remove(key) {
            if (!FEATURES.localStorage) return;
            localStorage.removeItem(key);
        },
        
        /**
         * Clears all items from localStorage
         */
        clear() {
            if (!FEATURES.localStorage) return;
            localStorage.clear();
        },
        
        /**
         * Gets all keys from localStorage
         * @returns {Array} Array of keys
         */
        keys() {
            if (!FEATURES.localStorage) return [];
            return Object.keys(localStorage);
        }
    };
    
    /**
     * Enhanced cookie utilities with parsing options
     */
    const cookie = {
        set(name, value, days = 7, options = {}) {
            const expires = new Date();
            expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
            
            let cookieString = `${name}=${value};expires=${expires.toUTCString()};path=/`;
            
            if (options.domain) cookieString += `;domain=${options.domain}`;
            if (options.secure) cookieString += ';secure';
            if (options.sameSite) cookieString += `;samesite=${options.sameSite}`;
            
            document.cookie = cookieString;
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
        },
        
        getAll() {
            const cookies = {};
            document.cookie.split(';').forEach(cookie => {
                const [name, value] = cookie.trim().split('=');
                if (name) cookies[name] = value;
            });
            return cookies;
        }
    };

    // =============================================
    // 🔄 ASYNC & PROMISES
    // =============================================

    /**
     * Pauses execution for specified time
     * @param {number} ms - Milliseconds to sleep
     * @returns {Promise} Promise that resolves after delay
     */
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Retries async function with exponential backoff
     * @param {Function} fn - Async function to retry
     * @param {number} attempts - Maximum attempts
     * @param {number} delay - Initial delay
     * @returns {Promise} Function result
     */
    async function retry(fn, attempts = 3, delay = 1000) {
        for (let i = 0; i < attempts; i++) {
            try {
                return await fn();
            } catch (error) {
                if (i === attempts - 1) throw error;
                await sleep(delay * Math.pow(2, i));
            }
        }
    }
    
    /**
     * Adds timeout to promise
     * @param {Promise} promise - Promise to timeout
     * @param {number} ms - Timeout milliseconds
     * @returns {Promise} Promise with timeout
     */
    function timeout(promise, ms) {
        return Promise.race([
            promise,
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
            )
        ]);
    }

    // =============================================
    // 🆕 NEW FEATURES
    // =============================================

    /**
     * 🔄 OBJECT & DATA MANIPULATION
     */
    
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
    
    /**
     * 🎨 COLOR & GRAPHICS
     */
    
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
    
    /**
     * 🔢 ADVANCED MATH
     */
    
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
    
    /**
     * 📝 TEXT PROCESSING
     */
    
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
    
    /**
     * 🧠 MACHINE LEARNING & AI
     */
    
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

    // =============================================
    // 🏗️ DATA STRUCTURES
    // =============================================

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
        
        clear() {
            this.items = [];
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
        
        clear() {
            this.items = [];
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
        
        clear() {
            this.cache.clear();
        }
    }

    // =============================================
    // 🎯 EXAMPLES & DEMOS
    // =============================================

    const examples = {
        /**
         * Example usage of capitalizeFirst
         */
        capitalizeFirstExample() {
            console.log('=== capitalizeFirst Examples ===');
            console.log(capitalizeFirst('hello')); // 'Hello'
            console.log(capitalizeFirst('hello world')); // 'Hello world'
            console.log(capitalizeFirst('')); // ''
            console.log(capitalizeFirst('a')); // 'A'
        },
        
        /**
         * Example usage of parseToBool
         */
        parseToBoolExample() {
            console.log('=== parseToBool Examples ===');
            console.log(parseToBool('true')); // true
            console.log(parseToBool('false')); // false
            console.log(parseToBool('yes')); // true
            console.log(parseToBool('no')); // false
            console.log(parseToBool(1)); // true
            console.log(parseToBool(0)); // false
            console.log(parseToBool('random')); // false (strict mode)
        },
        
        /**
         * Example usage of storage with parseToBool
         */
        storageExample() {
            console.log('=== Storage Examples ===');
            
            // Store boolean values
            storage.set('featureEnabled', true);
            storage.set('userConsent', 'true');
            storage.set('darkMode', 1);
            
            // Retrieve and parse
            const feature = parseToBool(storage.get('featureEnabled'));
            const consent = parseToBool(storage.get('userConsent'));
            const darkMode = parseToBool(storage.get('darkMode'));
            
            console.log('Feature:', feature); // true
            console.log('Consent:', consent); // true  
            console.log('Dark Mode:', darkMode); // true
        },
        
        /**
         * Example usage of math utilities
         */
        mathExamples() {
            console.log('=== Math Examples ===');
            console.log('clamp(15, 0, 10):', clamp(15, 0, 10)); // 10
            console.log('lerp(0, 100, 0.5):', lerp(0, 100, 0.5)); // 50
            console.log('randomRange(1, 10):', randomRange(1, 10)); // Random between 1-10
            console.log('mapRange(5, 0, 10, 0, 100):', mapRange(5, 0, 10, 0, 100)); // 50
        },
        
        /**
         * Example usage of array utilities
         */
        arrayExamples() {
            console.log('=== Array Examples ===');
            const arr = [1, 2, 2, 3, 4, 4, 5];
            console.log('unique:', unique(arr)); // [1, 2, 3, 4, 5]
            console.log('chunk:', chunk(arr, 3)); // [[1,2,3], [4,4,5]]
            console.log('shuffle:', shuffle(arr)); // Random order
        }
    };

    // =============================================
    // 🌐 PUBLIC API
    // =============================================

    return {
        // Version info
        VERSION,
        FEATURES,
        
        // Math & Numbers
        clamp,
        lerp,
        randomRange,
        mapRange,
        approximately,
        roundTo,
        gcd,
        lcm,
        isPrime,
        factorial,
        
        // Arrays & Collections
        shuffle,
        chunk,
        unique,
        intersection,
        difference,
        flatten,
        groupBy,
        
        // Strings
        capitalizeFirst,
        capitalize,
        slugify,
        truncate,
        camelCase,
        levenshtein,
        wordCount,
        
        // Time & Dates
        formatTime,
        timeAgo,
        formatDate,
        
        // Game Development
        distance2D,
        collision,
        ease,
        
        // Performance
        debounce,
        throttle,
        deepClone,
        memoize,
        
        // Validation
        isEmail,
        isURL,
        isEmpty,
        getType,
        parseToBool,
        
        // Storage
        storage,
        cookie,
        
        // Async
        sleep,
        retry,
        timeout,
        
        // Objects
        pick,
        omit,
        
        // Colors
        hexToRgb,
        rgbToHex,
        randomColor,
        
        // Machine Learning
        linearRegression,
        
        // Data Structures
        Queue,
        Stack,
        LRUCache,
        
        // Examples
        examples,
        
        // Utility methods
        debug: {
            log: (...args) => DEBUG_MODE && console.log('[Utilities]', ...args),
            warn: (...args) => DEBUG_MODE && console.warn('[Utilities]', ...args),
            error: (...args) => DEBUG_MODE && console.error('[Utilities]', ...args)
        },
        
        /**
         * Returns library information
         */
        info() {
            return {
                version: VERSION,
                features: FEATURES,
                functions: Object.keys(this).filter(key => typeof this[key] === 'function').length,
                classes: Object.keys(this).filter(key => typeof this[key] === 'function' && /^[A-Z]/.test(key)).length
            };
        }
    };
})();

// =============================================
// 🎯 GLOBAL EXPORTS
// =============================================

// For browser global usage
if (typeof window !== 'undefined') {
    window.Utilities = Utilities;
}

// For CommonJS/Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utilities;
}

// For ES6 modules
if (typeof exports !== 'undefined') {
    exports.default = Utilities;
}

// =============================================
// 📚 USAGE EXAMPLES
// =============================================

/**
 * 🎯 QUICK START EXAMPLES
 * 
 * // String utilities
 * Utilities.capitalizeFirst('hello world'); // 'Hello world'
 * 
 * // Boolean parsing  
 * Utilities.parseToBool('true'); // true
 * Utilities.parseToBool(1); // true
 * Utilities.parseToBool('yes'); // true
 * 
 * // Storage with boolean parsing
 * Utilities.storage.set('darkMode', 'true');
 * const darkMode = Utilities.parseToBool(Utilities.storage.get('darkMode'));
 * 
 * // Math utilities
 * Utilities.clamp(15, 0, 10); // 10
 * Utilities.lerp(0, 100, 0.5); // 50
 * 
 * // Run examples
 * Utilities.examples.capitalizeFirstExample();
 * Utilities.examples.parseToBoolExample();
 */

// Demo the new features
if (typeof window !== 'undefined' && window.console) {
    console.log('🚀 Utilities Library v2.0 Loaded!');
    console.log('Try: Utilities.examples.capitalizeFirstExample()');
    console.log('Try: Utilities.examples.parseToBoolExample()');
    console.log('Library Info:', Utilities.info());
}
