    class HapticFeedback {
            constructor() {
                this.isSupported = 'vibrate' in navigator;
                this.updateSupportStatus();
            }
            updateSupportStatus() {
                const statusEl = document.getElementById('supportStatus');
                if (!this.isSupported) {
                    statusEl.className = 'support-status unsupported';
                    statusEl.innerHTML = '<strong>⚠️ Haptic feedback is not supported on this device</strong><br><small>Try on a mobile device for the full experience</small>';
                }
            }

            // Core vibration method with fallback
            vibrate(pattern) {
                if (haptics === false) return;
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

            // 🎚️ Basic intensity presets
            light() {
                return this.vibrate(50);
            }

            medium() {
                return this.vibrate(100);
            }

            heavy() {
                return this.vibrate(200);
            }

            // 🎭 Contextual feedback patterns
            success() {
                return this.vibrate([100, 50, 100]);
            }

            error() {
                return this.vibrate([200, 100, 200, 100, 200]);
            }

            warning() {
                return this.vibrate([150, 75, 150]);
            }

            selection() {
                return this.vibrate(75);
            }

            // 🎵 Complex pattern sequences
            notification() {
                return this.vibrate([100, 100, 100]);
            }

            heartbeat() {
                return this.vibrate([100, 50, 150, 200, 100, 50, 150]);
            }

            pulse() {
                return this.vibrate([50, 25, 75, 25, 100, 25, 75, 25, 50]);
            }

            // 🛠️ Super customizable method
            custom(options = {}) {
                const defaults = {
                    intensity: 0.5,      // 0.1 to 1.0 (maps to duration)
                    duration: 100,       // base duration in ms
                    pattern: null,       // custom pattern array
                    repeat: 1,           // number of times to repeat
                    delay: 100          // delay between repeats in ms
                };

                const config = { ...defaults, ...options };
                
                // Convert intensity to duration if no custom pattern
                let vibrationPattern;
                
                if (config.pattern) {
                    vibrationPattern = config.pattern;
                } else {
                    // Map intensity (0.1-1.0) to duration (10-200ms)
                    const mappedDuration = Math.round(config.intensity * config.duration);
                    vibrationPattern = [mappedDuration];
                }

                // Handle repeats
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

            // 🎪 Utility methods
            stop() {
                return this.vibrate(0);
            }

            // Check if haptic feedback is available
            isAvailable() {
                return this.isSupported;
            }
    } 
 
    function parseBool(value) {
    return value.toLowerCase() === 'true';
    }


function capitalize(str) { return str.replace(/^./, match => match.toUpperCase()); }

    function weightedRandom(arr, weights) {
      const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
      const random = Math.random() * totalWeight;
      let sum = 0;
      for (let i = 0; i < arr.length; i++) {
        sum += weights[i];
        if (random <= sum) {
          return arr[i];
        }
      }
    }

function time(action, key = 'default') {
  const storageKey = `time-${key}`;
  const storage = window.localStorage;
  let startedAt;
  switch (action) {
    case 'start':
      // Store current timestamp in local storage
      storage.setItem(storageKey, Date.now().toString());
      break;
    case 'stop':
      // Retrieve stored timestamp and remove it from storage
      startedAt = storage.getItem(storageKey);
      if (startedAt) {
        storage.removeItem(storageKey);
        return startedAt;
      }
      break;
    case 'elapsed':
      // Calculate elapsed time since stored timestamp
      startedAt = storage.getItem(storageKey);
      if (startedAt) {
        return Date.now() - parseInt(startedAt);
      }
      break;
    case 'reset':
      // Remove stored timestamp from storage
      storage.removeItem(storageKey);
      break;
    default:
      throw new Error(`Invalid action: ${action}`);
  }
}
