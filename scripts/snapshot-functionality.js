/**
 * PROJECT MONTAUK SNAPSHOT UNIVERSAL FUNCTIONALITY MODULE
 * Provides password protection, encryption, terminal, database, and interactive features
 * for all snapshot files
 * 
 * Include in HTML with: <script src="snapshot-functionality.js"></script>
 * Or include inline in snapshots for offline functionality
 */

(function(window) {
  'use strict';

  const MONTAUK_FUNCTIONALITY = {
    
    /**
     * PASSWORD/ENCRYPTION SYSTEM
     */
    crypto: {
      rot13: function(str) {
        return str.replace(/[a-zA-Z]/g, function(c) {
          return String.fromCharCode((c <= 'Z' ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
        });
      },

      base64: {
        encode: function(str) {
          return btoa(unescape(encodeURIComponent(str)));
        },
        decode: function(str) {
          try {
            return decodeURIComponent(escape(atob(str)));
          } catch(e) {
            return '[Decoding Failed]';
          }
        }
      },

      simple_cipher: function(text, password, decode = false) {
        if (!decode) {
          // Encode: shift each char by password length
          const shift = password.length;
          return text.split('').map(c => 
            String.fromCharCode(c.charCodeAt(0) + shift)
          ).join('');
        } else {
          // Decode
          const shift = password.length;
          return text.split('').map(c => 
            String.fromCharCode(c.charCodeAt(0) - shift)
          ).join('');
        }
      }
    },

    /**
     * FILE/DATA PROTECTION
     */
    files: {
      protected: {},
      
      registerProtected: function(filename, content, password = null, type = 'encrypted') {
        this.protected[filename] = {
          content: content,
          password: password,
          type: type,
          unlocked: password === null
        };
      },

      unlock: function(filename, password) {
        if (!this.protected[filename]) return false;
        const file = this.protected[filename];
        
        if (file.password === null) {
          file.unlocked = true;
          return true;
        }
        
        if (file.password === password) {
          file.unlocked = true;
          return true;
        }
        
        return false;
      },

      getContent: function(filename) {
        if (!this.protected[filename]) return null;
        const file = this.protected[filename];
        
        if (!file.unlocked) {
          return '[FILE REQUIRES PASSWORD]\n\nEnter password to view.';
        }
        
        if (file.type === 'encrypted') {
          // Return decoded if needed
          return file.content;
        }
        
        return file.content;
      },

      isLocked: function(filename) {
        if (!this.protected[filename]) return false;
        return !this.protected[filename].unlocked;
      }
    },

    /**
     * TERMINAL FUNCTIONALITY
     */
    terminal: {
      history: [],
      currentIndex: 0,
      output: '',
      commands: {
        'help': function() {
          return 'Available commands:\n' +
                 '  ls              - List files\n' +
                 '  cat <file>      - View file contents\n' +
                 '  decrypt <file>  - Decrypt password-protected file\n' +
                 '  rot13 <text>    - ROT13 cipher\n' +
                 '  base64 <text>   - Base64 encode\n' +
                 '  clear           - Clear terminal\n' +
                 '  history         - Show command history\n' +
                 '  whoami          - Display current user\n' +
                 '  date            - Display date/time';
        },

        'ls': function() {
          let files = Object.keys(MONTAUK_FUNCTIONALITY.files.protected);
          if (files.length === 0) return 'No files in current directory';
          return files.map(f => {
            const locked = MONTAUK_FUNCTIONALITY.files.isLocked(f) ? ' [LOCKED]' : '';
            return f + locked;
          }).join('\n');
        },

        'whoami': function() {
          return 'USER: MONTAUK_TERMINAL\nACCESS_LEVEL: CLASSIFIED\nLOCATION: CLASSIFIED';
        },

        'date': function() {
          return new Date().toLocaleString() + '\nSYSTEM_DATE: 1983-09-20';
        },

        'history': function() {
          return MONTAUK_FUNCTIONALITY.terminal.history.join('\n');
        }
      },

      parseCommand: function(input) {
        const parts = input.trim().split(/\s+/);
        const cmd = parts[0];
        const args = parts.slice(1).join(' ');

        if (cmd === 'clear') {
          return { action: 'clear' };
        } else if (cmd === 'cat' && args) {
          const content = MONTAUK_FUNCTIONALITY.files.getContent(args);
          return { output: content || 'File not found: ' + args };
        } else if (cmd === 'rot13' && args) {
          return { output: MONTAUK_FUNCTIONALITY.crypto.rot13(args) };
        } else if (cmd === 'base64' && args) {
          return { output: MONTAUK_FUNCTIONALITY.crypto.base64.encode(args) };
        } else if (cmd === 'decrypt' && args) {
          return { action: 'prompt_password', filename: args };
        } else if (MONTAUK_FUNCTIONALITY.terminal.commands[cmd]) {
          return { output: MONTAUK_FUNCTIONALITY.terminal.commands[cmd]() };
        } else {
          return { output: 'Command not found: ' + cmd };
        }
      },

      execute: function(input) {
        this.history.push(input);
        return this.parseCommand(input);
      }
    },

    /**
     * COMMON UI PATTERNS
     */
    ui: {
      openModal: function(title, content) {
        const modal = document.getElementById('fileModal') || document.getElementById('modal');
        if (!modal) return;
        
        const titleEl = document.getElementById('modalTitle');
        const bodyEl = document.getElementById('modalBody');
        
        if (titleEl) titleEl.textContent = title;
        if (bodyEl) bodyEl.textContent = content;
        
        modal.classList.add('active');
      },

      closeModal: function() {
        const modal = document.getElementById('fileModal') || document.getElementById('modal');
        if (modal) modal.classList.remove('active');
      },

      initializeFileInteraction: function() {
        const fileItems = document.querySelectorAll('.file-item');
        const modal = document.getElementById('fileModal');
        const modalClose = document.getElementById('modalClose');

        if (!fileItems.length) return;

        fileItems.forEach(item => {
          item.addEventListener('click', function() {
            const fileName = this.querySelector('.file-name')?.textContent;
            if (!fileName) return;

            // Check if file is in filesData
            if (window.filesData && window.filesData[fileName]) {
              MONTAUK_FUNCTIONALITY.ui.openModal(fileName, window.filesData[fileName]);
              return;
            }

            // Check if protected
            if (MONTAUK_FUNCTIONALITY.files.isLocked(fileName)) {
              const modal = document.getElementById('fileModal');
              if (modal) {
                document.getElementById('modalTitle').textContent = fileName;
                document.getElementById('modalBody').innerHTML = 
                  '<input type="password" id="pwInput" placeholder="Enter password" autofocus>' +
                  '<button id="pwSubmit" style="margin-top: 10px;">Unlock</button>';
                modal.classList.add('active');
                
                document.getElementById('pwSubmit').onclick = function() {
                  const password = document.getElementById('pwInput').value;
                  if (MONTAUK_FUNCTIONALITY.files.unlock(fileName, password)) {
                    const content = MONTAUK_FUNCTIONALITY.files.getContent(fileName);
                    document.getElementById('modalBody').textContent = content;
                  } else {
                    alert('Wrong password');
                  }
                };
              }
            }
          });
        });

        if (modalClose) {
          modalClose.addEventListener('click', () => {
            MONTAUK_FUNCTIONALITY.ui.closeModal();
          });
        }

        if (modal) {
          modal.addEventListener('click', (e) => {
            if (e.target === modal) {
              MONTAUK_FUNCTIONALITY.ui.closeModal();
            }
          });
        }
      },

      initializeTerminal: function() {
        const terminal = document.getElementById('terminal');
        if (!terminal) return;

        const input = document.createElement('input');
        input.id = 'terminalInput';
        input.type = 'text';
        input.placeholder = '$ ';
        input.style.cssText = 'width: 100%; padding: 8px; margin-top: 10px; background: #0a0a0a; color: #00ff00; border: 1px solid #2a5a8a; font-family: Courier New;';

        const output = document.createElement('div');
        output.id = 'terminalOutput';
        output.style.cssText = 'margin-top: 10px; max-height: 200px; overflow-y: auto; color: #00ff00;';
        output.textContent = 'MONTAUK SECURE TERMINAL\nType "help" for commands\n\n$ ';

        terminal.appendChild(output);
        terminal.appendChild(input);

        input.addEventListener('keypress', function(e) {
          if (e.key === 'Enter') {
            const cmd = input.value;
            output.textContent += cmd + '\n';

            const result = MONTAUK_FUNCTIONALITY.terminal.execute(cmd);
            if (result.action === 'clear') {
              output.textContent = '$ ';
            } else if (result.output) {
              output.textContent += result.output + '\n\n$ ';
            }

            input.value = '';
            output.scrollTop = output.scrollHeight;
          }
        });
      }
    },

    /**
     * INITIALIZATION
     */
    init: function() {
      // Initialize file protection for any protected files defined in window.filesData
      if (window.filesData) {
        Object.keys(window.filesData).forEach(filename => {
          // Will be handled by regular filesData system
        });
      }

      // Initialize file interactions
      this.ui.initializeFileInteraction();

      // Initialize terminal if present
      this.ui.initializeTerminal();

      // Password modal handling
      const passwordModals = document.querySelectorAll('[data-password-protected]');
      passwordModals.forEach(modal => {
        const password = modal.dataset.password;
        const content = modal.dataset.content;
        // Implementation specific to password handling
      });
    }
  };

  // Export to window
  window.MONTAUK = MONTAUK_FUNCTIONALITY;

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      MONTAUK_FUNCTIONALITY.init();
    });
  } else {
    MONTAUK_FUNCTIONALITY.init();
  }

})(window);
