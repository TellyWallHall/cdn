// chess-arena.js v1.0.0
// The All-Inclusive Chess Platform in a Single File
// Usage: <script src="chess-arena.js"></script>
;(function(root, factory) {
    if (typeof define === 'function' && define.amd) define([], factory);
    else if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.ChessArena = factory();
}(typeof self !== 'undefined' ? self : this, function() {
'use strict';

// =============================================================
// §1. DEFAULT CONFIG
// =============================================================
const VERSION = '1.0.0';

const DEFAULTS = {
    mode: 'ai',              // 'ai', 'local', 'online', 'analysis', 'ai-vs-ai'
    playerColor: 'w',        // 'w', 'b', 'random'
    autoSetup: true,         // Build full UI around the board
    responsive: true,
    squareSize: 64,

    ai: {
        engine: 'stockfish',
        stockfishUrl: 'https://cdn.jsdelivr.net/gh/nicfv/Stockfish/stockfish.js',
        depth: 8,
        skillLevel: 20,
        moveDelay: 300,       // ms before AI starts thinking
        analyzeDepth: 18,
    },

    theme: 'classic',         // theme name or theme object
    pieceSet: 'unicode',      // 'unicode', 'cburnett', 'merida', 'alpha', or custom URL pattern

    clock: {
        enabled: false,
        initial: 600,          // seconds
        increment: 0,
        type: 'fischer',       // 'fischer', 'bronstein', 'simple'
    },

    sounds: {
        enabled: true,
        volume: 0.4,
    },

    ui: {
        showCoordinates: true,
        showEvalBar: true,
        showMoveHistory: true,
        showCaptured: true,
        showControls: true,
        showStatus: true,
        showClock: true,
        showSettings: true,
        allowDragDrop: true,
        allowClickMove: true,
        allowUndo: true,
        allowFlip: true,
        highlightLegalMoves: true,
        highlightLastMove: true,
        highlightCheck: true,
        animation: true,
        animationSpeed: 150,    // ms
    },

    multiplayer: {
        provider: null,        // 'firebase', 'websocket', 'custom'
        firebase: null,        // firebase config object
        websocketUrl: null,
        roomId: null,
        playerName: 'Player',
    },

    fen: null,                 // starting FEN
    pgn: null,                 // load from PGN

    // Events
    onMove: null,
    onCapture: null,
    onCheck: null,
    onGameOver: null,
    onIllegalMove: null,
    onBoardChange: null,
    onClockTick: null,
    onEngineEval: null,
    onConnect: null,
    onDisconnect: null,
    onChat: null,
};


// =============================================================
// §2. THEMES
// =============================================================
const THEMES = {
    classic: {
        name: 'Classic',
        lightSquare: '#f0d9b5',
        darkSquare: '#b58863',
        highlight: 'rgba(255,255,0,0.5)',
        lastMoveFrom: 'rgba(155,199,0,0.41)',
        lastMoveTo: 'rgba(155,199,0,0.41)',
        legalMove: 'rgba(0,0,0,0.1)',
        legalCapture: 'rgba(0,0,0,0.1)',
        check: 'radial-gradient(ellipse at center, rgba(255,0,0,0.6) 0%, rgba(255,0,0,0) 70%)',
        selected: 'rgba(20,85,30,0.5)',
        panelBg: '#312e2b',
        panelText: '#bababa',
        panelBorder: '#3d3a37',
        accent: '#769656',
        accentText: '#fff',
        buttonBg: '#769656',
        buttonText: '#fff',
        coordLight: '#b58863',
        coordDark: '#f0d9b5',
        boardBorder: '#302e2c',
        evalWhite: '#ffffff',
        evalBlack: '#333333',
        moveHistBg: '#2b2926',
    },
    midnight: {
        name: 'Midnight',
        lightSquare: '#dee3e6',
        darkSquare: '#8ca2ad',
        highlight: 'rgba(255,255,0,0.5)',
        lastMoveFrom: 'rgba(0,150,255,0.3)',
        lastMoveTo: 'rgba(0,150,255,0.3)',
        legalMove: 'rgba(0,0,0,0.12)',
        legalCapture: 'rgba(0,0,0,0.12)',
        check: 'radial-gradient(ellipse at center, rgba(255,0,0,0.6) 0%, rgba(255,0,0,0) 70%)',
        selected: 'rgba(0,100,200,0.4)',
        panelBg: '#1a1a2e',
        panelText: '#c0c0d0',
        panelBorder: '#2a2a4e',
        accent: '#4a90d9',
        accentText: '#fff',
        buttonBg: '#4a90d9',
        buttonText: '#fff',
        coordLight: '#8ca2ad',
        coordDark: '#dee3e6',
        boardBorder: '#2c3e50',
        evalWhite: '#dee3e6',
        evalBlack: '#1a1a2e',
        moveHistBg: '#151528',
    },
    neon: {
        name: 'Neon',
        lightSquare: '#2d2d3f',
        darkSquare: '#1a1a2e',
        highlight: 'rgba(0,255,255,0.3)',
        lastMoveFrom: 'rgba(0,255,128,0.2)',
        lastMoveTo: 'rgba(0,255,128,0.2)',
        legalMove: 'rgba(0,255,255,0.15)',
        legalCapture: 'rgba(255,0,128,0.25)',
        check: 'radial-gradient(ellipse at center, rgba(255,0,100,0.7) 0%, rgba(255,0,100,0) 70%)',
        selected: 'rgba(0,255,200,0.3)',
        panelBg: '#0d0d1a',
        panelText: '#00ffcc',
        panelBorder: '#00ffcc33',
        accent: '#ff0080',
        accentText: '#fff',
        buttonBg: '#ff0080',
        buttonText: '#fff',
        coordLight: '#0d0d1a88',
        coordDark: '#00ffcc55',
        boardBorder: '#00ffcc',
        evalWhite: '#00ffcc',
        evalBlack: '#ff0080',
        moveHistBg: '#0a0a15',
    },
    wood: {
        name: 'Wood',
        lightSquare: '#e8c98e',
        darkSquare: '#a67c52',
        highlight: 'rgba(255,255,0,0.4)',
        lastMoveFrom: 'rgba(205,210,106,0.5)',
        lastMoveTo: 'rgba(205,210,106,0.5)',
        legalMove: 'rgba(0,0,0,0.12)',
        legalCapture: 'rgba(0,0,0,0.12)',
        check: 'radial-gradient(ellipse at center, rgba(200,0,0,0.5) 0%, rgba(200,0,0,0) 70%)',
        selected: 'rgba(100,150,50,0.5)',
        panelBg: '#3e2c1c',
        panelText: '#d4b896',
        panelBorder: '#5a4030',
        accent: '#8b6914',
        accentText: '#fff',
        buttonBg: '#8b6914',
        buttonText: '#fff',
        coordLight: '#a67c52',
        coordDark: '#e8c98e',
        boardBorder: '#5a3a1a',
        evalWhite: '#e8c98e',
        evalBlack: '#3e2c1c',
        moveHistBg: '#352518',
    },
    tournament: {
        name: 'Tournament',
        lightSquare: '#eeeed2',
        darkSquare: '#769656',
        highlight: 'rgba(255,255,0,0.5)',
        lastMoveFrom: 'rgba(155,199,0,0.41)',
        lastMoveTo: 'rgba(155,199,0,0.41)',
        legalMove: 'rgba(0,0,0,0.1)',
        legalCapture: 'rgba(0,0,0,0.1)',
        check: 'radial-gradient(ellipse at center, rgba(255,0,0,0.6) 0%, rgba(255,0,0,0) 70%)',
        selected: 'rgba(20,85,30,0.5)',
        panelBg: '#302e2b',
        panelText: '#bababa',
        panelBorder: '#3d3a37',
        accent: '#81b64c',
        accentText: '#fff',
        buttonBg: '#81b64c',
        buttonText: '#fff',
        coordLight: '#769656',
        coordDark: '#eeeed2',
        boardBorder: '#302e2c',
        evalWhite: '#ffffff',
        evalBlack: '#333333',
        moveHistBg: '#2b2926',
    },
    icy: {
        name: 'Icy',
        lightSquare: '#cfe2f3',
        darkSquare: '#6d9eeb',
        highlight: 'rgba(255,255,100,0.4)',
        lastMoveFrom: 'rgba(100,200,255,0.3)',
        lastMoveTo: 'rgba(100,200,255,0.3)',
        legalMove: 'rgba(0,0,80,0.12)',
        legalCapture: 'rgba(0,0,80,0.12)',
        check: 'radial-gradient(ellipse at center, rgba(255,50,50,0.6) 0%, rgba(255,0,0,0) 70%)',
        selected: 'rgba(0,80,200,0.35)',
        panelBg: '#1a2a4a',
        panelText: '#b0d0f0',
        panelBorder: '#2a4a6a',
        accent: '#4a90d9',
        accentText: '#fff',
        buttonBg: '#3a7bd5',
        buttonText: '#fff',
        coordLight: '#6d9eeb',
        coordDark: '#cfe2f3',
        boardBorder: '#3a5a8a',
        evalWhite: '#cfe2f3',
        evalBlack: '#1a2a4a',
        moveHistBg: '#152040',
    },
};


// =============================================================
// §3. PIECE SETS
// =============================================================
const UNICODE_PIECES = {
    wK:'♔',wQ:'♕',wR:'♖',wB:'♗',wN:'♘',wP:'♙',
    bK:'♚',bQ:'♛',bR:'♜',bB:'♝',bN:'♞',bP:'♟',
};

const PIECE_SET_URLS = {
    cburnett: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/{piece}.png',
    neo: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/{piece}.png',
    alpha: 'https://images.chesscomfiles.com/chess-themes/pieces/alpha/{piece}.png',
    // Lichess sets
    lichess: 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cburnett/{piece}.svg',
};

const PIECE_NAMES = {
    wK:'wK',wQ:'wQ',wR:'wR',wB:'wB',wN:'wN',wP:'wP',
    bK:'bK',bQ:'bQ',bR:'bR',bB:'bB',bN:'bN',bP:'bP',
};

const PIECE_VALUES = { p:1, n:3, b:3, r:5, q:9, k:0 };


// =============================================================
// §4. CHESS ENGINE (Complete Rules)
// =============================================================
class ChessEngine {
    constructor(fen) {
        if (fen) this.loadFEN(fen);
        else this.reset();
    }

    reset() {
        this.board = {};
        const back = ['r','n','b','q','k','b','n','r'];
        for (let i = 0; i < 8; i++) {
            const f = 'abcdefgh'[i];
            this.board[f+'1'] = { type: back[i], color: 'w' };
            this.board[f+'2'] = { type: 'p', color: 'w' };
            this.board[f+'7'] = { type: 'p', color: 'b' };
            this.board[f+'8'] = { type: back[i], color: 'b' };
        }
        this._turn = 'w';
        this._castling = { wK:true, wQ:true, bK:true, bQ:true };
        this._ep = null;
        this._halfMoves = 0;
        this._fullMoves = 1;
        this._history = [];
        this._posHistory = [this._key()];
    }

    loadFEN(fen) {
        this.board = {};
        this._history = [];
        const parts = fen.split(' ');
        const rows = parts[0].split('/');
        for (let ri = 0; ri < 8; ri++) {
            let col = 0;
            for (const ch of rows[ri]) {
                if (ch >= '1' && ch <= '8') { col += parseInt(ch); }
                else {
                    const color = ch === ch.toUpperCase() ? 'w' : 'b';
                    const type = ch.toLowerCase();
                    this.board['abcdefgh'[col] + (8 - ri)] = { type, color };
                    col++;
                }
            }
        }
        this._turn = (parts[1] || 'w');
        const cas = parts[2] || '-';
        this._castling = {
            wK: cas.includes('K'), wQ: cas.includes('Q'),
            bK: cas.includes('k'), bQ: cas.includes('q'),
        };
        this._ep = (parts[3] && parts[3] !== '-') ? parts[3] : null;
        this._halfMoves = parseInt(parts[4]) || 0;
        this._fullMoves = parseInt(parts[5]) || 1;
        this._posHistory = [this._key()];
    }

    // --- Helpers ---
    _fi(f) { return 'abcdefgh'.indexOf(f); }
    _if(i) { return 'abcdefgh'[i]; }
    _allSq() {
        const s = [];
        for (let r = 1; r <= 8; r++)
            for (let c = 0; c < 8; c++)
                s.push(this._if(c) + r);
        return s;
    }

    _key() {
        let k = '';
        for (let r = 8; r >= 1; r--)
            for (let c = 0; c < 8; c++) {
                const p = this.board[this._if(c) + r];
                k += p ? (p.color === 'w' ? p.type.toUpperCase() : p.type) : '.';
            }
        k += this._turn;
        k += (this._castling.wK?'K':'') + (this._castling.wQ?'Q':'') +
             (this._castling.bK?'k':'') + (this._castling.bQ?'q':'');
        k += this._ep || '-';
        return k;
    }

    // --- Public API ---
    get(sq) { return this.board[sq] || null; }
    turn() { return this._turn; }
    moveNumber() { return this._fullMoves; }

    fen() {
        let f = '';
        for (let r = 8; r >= 1; r--) {
            let e = 0;
            for (let c = 0; c < 8; c++) {
                const p = this.board[this._if(c) + r];
                if (p) {
                    if (e) { f += e; e = 0; }
                    f += p.color === 'w' ? p.type.toUpperCase() : p.type;
                } else e++;
            }
            if (e) f += e;
            if (r > 1) f += '/';
        }
        let cas = '';
        if (this._castling.wK) cas += 'K';
        if (this._castling.wQ) cas += 'Q';
        if (this._castling.bK) cas += 'k';
        if (this._castling.bQ) cas += 'q';
        return `${f} ${this._turn} ${cas || '-'} ${this._ep || '-'} ${this._halfMoves} ${this._fullMoves}`;
    }

    // --- Attack Detection ---
    _findKing(col) {
        for (const sq of this._allSq()) {
            const p = this.board[sq];
            if (p && p.type === 'k' && p.color === col) return sq;
        }
        return null;
    }

    _attacked(sq, by) {
        const f = this._fi(sq[0]), r = parseInt(sq[1]);
        // Pawns
        const pd = by === 'w' ? -1 : 1;
        for (const df of [-1, 1]) {
            const af = f + df, ar = r + pd;
            if (af >= 0 && af < 8 && ar >= 1 && ar <= 8) {
                const p = this.board[this._if(af) + ar];
                if (p && p.type === 'p' && p.color === by) return true;
            }
        }
        // Knights
        for (const [df, dr] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
            const nf = f+df, nr = r+dr;
            if (nf >= 0 && nf < 8 && nr >= 1 && nr <= 8) {
                const p = this.board[this._if(nf) + nr];
                if (p && p.type === 'n' && p.color === by) return true;
            }
        }
        // King
        for (let df = -1; df <= 1; df++) for (let dr = -1; dr <= 1; dr++) {
            if (!df && !dr) continue;
            const kf = f+df, kr = r+dr;
            if (kf >= 0 && kf < 8 && kr >= 1 && kr <= 8) {
                const p = this.board[this._if(kf) + kr];
                if (p && p.type === 'k' && p.color === by) return true;
            }
        }
        // Sliding
        const dirs = [
            {df:0,dr:1,t:['r','q']},{df:0,dr:-1,t:['r','q']},
            {df:1,dr:0,t:['r','q']},{df:-1,dr:0,t:['r','q']},
            {df:1,dr:1,t:['b','q']},{df:1,dr:-1,t:['b','q']},
            {df:-1,dr:1,t:['b','q']},{df:-1,dr:-1,t:['b','q']},
        ];
        for (const {df, dr, t} of dirs) {
            let cf = f+df, cr = r+dr;
            while (cf >= 0 && cf < 8 && cr >= 1 && cr <= 8) {
                const p = this.board[this._if(cf) + cr];
                if (p) {
                    if (p.color === by && t.includes(p.type)) return true;
                    break;
                }
                cf += df; cr += dr;
            }
        }
        return false;
    }

    inCheck() {
        const k = this._findKing(this._turn);
        return k && this._attacked(k, this._turn === 'w' ? 'b' : 'w');
    }

    // --- Move Generation ---
    _pseudoMoves(col) {
        const moves = [], c = col || this._turn;
        for (const sq of this._allSq()) {
            const p = this.board[sq];
            if (!p || p.color !== c) continue;
            const f = this._fi(sq[0]), r = parseInt(sq[1]);

            if (p.type === 'p') {
                const dir = c === 'w' ? 1 : -1;
                const sr = c === 'w' ? 2 : 7;
                const pr = c === 'w' ? 8 : 1;
                // Forward
                const fwd = sq[0] + (r + dir);
                if (r+dir >= 1 && r+dir <= 8 && !this.board[fwd]) {
                    if (r+dir === pr) {
                        for (const x of ['q','r','b','n'])
                            moves.push({from:sq, to:fwd, promotion:x, piece:'p'});
                    } else {
                        moves.push({from:sq, to:fwd, piece:'p'});
                        if (r === sr) {
                            const d2 = sq[0] + (r + 2*dir);
                            if (!this.board[d2])
                                moves.push({from:sq, to:d2, piece:'p'});
                        }
                    }
                }
                // Captures
                for (const df of [-1, 1]) {
                    const cf = f + df;
                    if (cf < 0 || cf > 7) continue;
                    const cs = this._if(cf) + (r+dir);
                    if (r+dir < 1 || r+dir > 8) continue;
                    const t = this.board[cs];
                    if ((t && t.color !== c) || cs === this._ep) {
                        if (r+dir === pr) {
                            for (const x of ['q','r','b','n'])
                                moves.push({from:sq, to:cs, promotion:x, piece:'p'});
                        } else {
                            moves.push({from:sq, to:cs, piece:'p'});
                        }
                    }
                }
            } else if (p.type === 'n') {
                for (const [df, dr] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
                    const nf = f+df, nr = r+dr;
                    if (nf < 0 || nf > 7 || nr < 1 || nr > 8) continue;
                    const ts = this._if(nf) + nr;
                    const t = this.board[ts];
                    if (!t || t.color !== c) moves.push({from:sq, to:ts, piece:'n'});
                }
            } else if (p.type === 'k') {
                for (let df = -1; df <= 1; df++) for (let dr = -1; dr <= 1; dr++) {
                    if (!df && !dr) continue;
                    const kf = f+df, kr = r+dr;
                    if (kf < 0 || kf > 7 || kr < 1 || kr > 8) continue;
                    const ts = this._if(kf) + kr;
                    const t = this.board[ts];
                    if (!t || t.color !== c) moves.push({from:sq, to:ts, piece:'k'});
                }
                // Castling
                const rk = c === 'w' ? '1' : '8', en = c === 'w' ? 'b' : 'w';
                if (sq === 'e' + rk) {
                    if ((c==='w' ? this._castling.wK : this._castling.bK) &&
                        !this.board['f'+rk] && !this.board['g'+rk] &&
                        this.board['h'+rk]?.type === 'r' && this.board['h'+rk]?.color === c &&
                        !this._attacked('e'+rk,en) && !this._attacked('f'+rk,en) && !this._attacked('g'+rk,en))
                        moves.push({from:sq, to:'g'+rk, castling:'k', piece:'k'});
                    if ((c==='w' ? this._castling.wQ : this._castling.bQ) &&
                        !this.board['d'+rk] && !this.board['c'+rk] && !this.board['b'+rk] &&
                        this.board['a'+rk]?.type === 'r' && this.board['a'+rk]?.color === c &&
                        !this._attacked('e'+rk,en) && !this._attacked('d'+rk,en) && !this._attacked('c'+rk,en))
                        moves.push({from:sq, to:'c'+rk, castling:'q', piece:'k'});
                }
            } else {
                // Sliding pieces
                let ds = [];
                if (p.type === 'r' || p.type === 'q') ds.push([0,1],[0,-1],[1,0],[-1,0]);
                if (p.type === 'b' || p.type === 'q') ds.push([1,1],[1,-1],[-1,1],[-1,-1]);
                for (const [df, dr] of ds) {
                    let cf = f+df, cr = r+dr;
                    while (cf >= 0 && cf < 8 && cr >= 1 && cr <= 8) {
                        const ts = this._if(cf) + cr;
                        const t = this.board[ts];
                        if (t) {
                            if (t.color !== c) moves.push({from:sq, to:ts, piece:p.type});
                            break;
                        }
                        moves.push({from:sq, to:ts, piece:p.type});
                        cf += df; cr += dr;
                    }
                }
            }
        }
        return moves;
    }

    // --- State save/restore ---
    _save() {
        return {
            board: {...this.board}, turn: this._turn,
            castling: {...this._castling}, ep: this._ep,
            hm: this._halfMoves, fm: this._fullMoves,
        };
    }
    _load(s) {
        this.board = s.board; this._turn = s.turn;
        this._castling = s.castling; this._ep = s.ep;
        this._halfMoves = s.hm; this._fullMoves = s.fm;
    }

    // --- Apply move ---
    _apply(m) {
        const p = this.board[m.from], cap = this.board[m.to] || null;
        const c = p.color, rk = c === 'w' ? '1' : '8';
        let epCap = null;
        // EP capture
        if (p.type === 'p' && m.to === this._ep) {
            const er = c === 'w' ? (parseInt(m.to[1])-1) : (parseInt(m.to[1])+1);
            epCap = m.to[0] + er;
            delete this.board[epCap];
        }
        delete this.board[m.from];
        this.board[m.to] = m.promotion ? {type: m.promotion, color: c} : p;
        // Castling rook
        if (m.castling === 'k') { this.board['f'+rk] = this.board['h'+rk]; delete this.board['h'+rk]; }
        if (m.castling === 'q') { this.board['d'+rk] = this.board['a'+rk]; delete this.board['a'+rk]; }
        // EP square
        if (p.type === 'p' && Math.abs(parseInt(m.to[1]) - parseInt(m.from[1])) === 2)
            this._ep = m.from[0] + (c === 'w' ? '3' : '6');
        else this._ep = null;
        // Castling rights
        if (p.type === 'k') {
            if (c==='w') { this._castling.wK = false; this._castling.wQ = false; }
            else { this._castling.bK = false; this._castling.bQ = false; }
        }
        if (p.type==='r') {
            if (m.from==='h1') this._castling.wK = false;
            if (m.from==='a1') this._castling.wQ = false;
            if (m.from==='h8') this._castling.bK = false;
            if (m.from==='a8') this._castling.bQ = false;
        }
        if (m.to==='h1') this._castling.wK = false;
        if (m.to==='a1') this._castling.wQ = false;
        if (m.to==='h8') this._castling.bK = false;
        if (m.to==='a8') this._castling.bQ = false;
        // Clocks
        if (p.type === 'p' || cap || epCap) this._halfMoves = 0;
        else this._halfMoves++;
        if (this._turn === 'b') this._fullMoves++;
        this._turn = this._turn === 'w' ? 'b' : 'w';
        return { captured: cap, epCap };
    }

    // --- Legality ---
    _legal(m) {
        const s = this._save(); this._apply(m);
        const c = this._turn === 'w' ? 'b' : 'w';
        const k = this._findKing(c);
        const en = c === 'w' ? 'b' : 'w';
        const ok = k && !this._attacked(k, en);
        this._load(s); return ok;
    }

    // --- SAN notation ---
    _san(m) {
        const p = this.board[m.from];
        if (!p) return m.from + m.to;
        if (m.castling === 'k') return 'O-O';
        if (m.castling === 'q') return 'O-O-O';
        let s = '';
        const cap = this.board[m.to] || (p.type === 'p' && m.to === this._ep);
        if (p.type !== 'p') {
            s += p.type.toUpperCase();
            const amb = this._pseudoMoves().filter(x =>
                this.board[x.from]?.type === p.type &&
                this.board[x.from]?.color === p.color &&
                x.to === m.to && x.from !== m.from && this._legal(x));
            if (amb.length > 0) {
                const sf = amb.some(x => x.from[0] === m.from[0]);
                const sr = amb.some(x => x.from[1] === m.from[1]);
                if (!sf) s += m.from[0];
                else if (!sr) s += m.from[1];
                else s += m.from;
            }
        }
        if (cap) { if (p.type === 'p') s += m.from[0]; s += 'x'; }
        s += m.to;
        if (m.promotion) s += '=' + m.promotion.toUpperCase();
        const sv = this._save(); this._apply(m);
        if (this.inCheck()) s += this.moves().length === 0 ? '#' : '+';
        this._load(sv);
        return s;
    }

    // --- Public: legal moves ---
    moves(opts) {
        const pseudo = this._pseudoMoves(opts?.square ? this.board[opts.square]?.color : undefined);
        let legal;
        if (opts?.square) legal = pseudo.filter(m => m.from === opts.square && this._legal(m));
        else legal = pseudo.filter(m => this._legal(m));
        if (opts?.verbose) return legal.map(m => ({
            ...m, san: this._san(m),
            captured: this.board[m.to]?.type || (m.piece === 'p' && m.to === this._ep ? 'p' : null),
            color: this._turn,
            flags: (this.board[m.to] ? 'c' : '') + (m.promotion ? 'p' : '') + (m.castling ? 'k' : '') + (m.to === this._ep ? 'e' : ''),
        }));
        return legal.map(m => this._san(m));
    }

    // --- Public: make move ---
    move(input) {
        const legal = this.moves({ verbose: true });
        let found = null;
        if (typeof input === 'string') {
            // Try SAN
            for (const m of legal) if (m.san === input) { found = m; break; }
            // Try UCI
            if (!found) {
                const fr = input.substring(0,2), to = input.substring(2,4);
                const pr = input.length > 4 ? input[4] : undefined;
                for (const m of legal) if (m.from === fr && m.to === to && (!pr || m.promotion === pr)) { found = m; break; }
            }
        } else {
            for (const m of legal) if (m.from === input.from && m.to === input.to && (!input.promotion || m.promotion === input.promotion)) { found = m; break; }
        }
        if (!found) return null;

        const san = found.san;
        const piece = this.board[found.from];
        const cap = this.board[found.to];
        const epCap = piece.type === 'p' && found.to === this._ep;
        const isCapture = !!(cap || epCap);
        const isCastling = !!found.castling;

        const entry = {
            move: found, san, state: this._save(),
            captured: cap ? cap.type : (epCap ? 'p' : null),
            color: piece.color, from: found.from, to: found.to,
            promotion: found.promotion, piece: piece.type,
            isCapture, isCastling, isCheck: false, isCheckmate: false,
        };

        this._apply(found);
        entry.isCheck = this.inCheck();
        entry.isCheckmate = this.isCheckmate();
        this._history.push(entry);
        this._posHistory.push(this._key());
        return entry;
    }

    undo() {
        if (!this._history.length) return null;
        const l = this._history.pop();
        this._load(l.state);
        this._posHistory.pop();
        return l;
    }

    history(o) {
        if (o?.verbose) return this._history.map(h => ({
            from: h.from, to: h.to, san: h.san, captured: h.captured,
            color: h.color, promotion: h.promotion, piece: h.piece,
            isCapture: h.isCapture, isCastling: h.isCastling,
            isCheck: h.isCheck, isCheckmate: h.isCheckmate,
        }));
        return this._history.map(h => h.san);
    }

    // --- Game end detection ---
    isCheckmate() { return this.inCheck() && this.moves().length === 0; }
    isStalemate() { return !this.inCheck() && this.moves().length === 0; }
    isInsufficientMaterial() {
        const pcs = {w:[], b:[]};
        for (const sq of this._allSq()) {
            const p = this.board[sq];
            if (p && p.type !== 'k') pcs[p.color].push(p);
        }
        if (!pcs.w.length && !pcs.b.length) return true;
        if (!pcs.w.length && pcs.b.length === 1 && 'bn'.includes(pcs.b[0].type)) return true;
        if (!pcs.b.length && pcs.w.length === 1 && 'bn'.includes(pcs.w[0].type)) return true;
        // K+B vs K+B same color
        if (pcs.w.length === 1 && pcs.b.length === 1 &&
            pcs.w[0].type === 'b' && pcs.b[0].type === 'b') {
            // Check if same color bishop
            const wbSq = this._allSq().find(sq => this.board[sq] === pcs.w[0]);
            const bbSq = this._allSq().find(sq => this.board[sq] === pcs.b[0]);
            if (wbSq && bbSq) {
                const wbColor = (this._fi(wbSq[0]) + parseInt(wbSq[1])) % 2;
                const bbColor = (this._fi(bbSq[0]) + parseInt(bbSq[1])) % 2;
                if (wbColor === bbColor) return true;
            }
        }
        return false;
    }
    isThreefoldRepetition() {
        const cur = this._key(); let c = 0;
        for (const p of this._posHistory) if (p === cur) c++;
        return c >= 3;
    }
    isFiftyMoveRule() { return this._halfMoves >= 100; }
    isDraw() { return this.isStalemate() || this.isInsufficientMaterial() || this.isThreefoldRepetition() || this.isFiftyMoveRule(); }
    isGameOver() { return this.isCheckmate() || this.isDraw(); }

    gameResult() {
        if (this.isCheckmate()) return { result: this._turn === 'w' ? '0-1' : '1-0', reason: 'checkmate' };
        if (this.isStalemate()) return { result: '1/2-1/2', reason: 'stalemate' };
        if (this.isInsufficientMaterial()) return { result: '1/2-1/2', reason: 'insufficient material' };
        if (this.isThreefoldRepetition()) return { result: '1/2-1/2', reason: 'threefold repetition' };
        if (this.isFiftyMoveRule()) return { result: '1/2-1/2', reason: 'fifty-move rule' };
        return null;
    }

    // --- PGN ---
    toPGN(headers = {}) {
        const h = {
            Event: headers.Event || 'Chess Arena Game',
            Site: headers.Site || 'chess-arena.js',
            Date: headers.Date || new Date().toISOString().split('T')[0].replace(/-/g, '.'),
            White: headers.White || 'White',
            Black: headers.Black || 'Black',
            Result: this.gameResult()?.result || '*',
            ...headers,
        };
        let pgn = '';
        for (const [k, v] of Object.entries(h)) pgn += `[${k} "${v}"]\n`;
        pgn += '\n';
        const moves = this.history();
        for (let i = 0; i < moves.length; i += 2) {
            pgn += `${Math.floor(i/2) + 1}. ${moves[i]}`;
            if (moves[i+1]) pgn += ` ${moves[i+1]} `;
            else pgn += ' ';
        }
        pgn += h.Result;
        return pgn;
    }

    // --- Material count ---
    material() {
        const m = { w: 0, b: 0 };
        for (const sq of this._allSq()) {
            const p = this.board[sq];
            if (p) m[p.color] += PIECE_VALUES[p.type] || 0;
        }
        return m;
    }
}


// =============================================================
// §5. STOCKFISH MANAGER
// =============================================================
class StockfishManager {
    constructor(opts = {}) {
        this.worker = null;
        this.ready = false;
        this.thinking = false;
        this.analysisMode = false;
        this.listeners = { eval: [], bestmove: [], ready: [] };
        this.url = opts.stockfishUrl || DEFAULTS.ai.stockfishUrl;
        this.depth = opts.depth || DEFAULTS.ai.depth;
    }

    async init() {
        try {
            const resp = await fetch(this.url);
            if (!resp.ok) throw new Error('HTTP ' + resp.status);
            const code = await resp.text();
            const blob = new Blob([code], { type: 'application/javascript' });
            const url = URL.createObjectURL(blob);
            this.worker = new Worker(url);
            this.worker.addEventListener('message', e => this._onMessage(e.data));
            this.worker.addEventListener('error', e => console.error('[Stockfish] Worker error:', e));
            this.send('uci');
            return new Promise(resolve => {
                this._readyResolve = resolve;
            });
        } catch (e) {
            console.warn('[Stockfish] Failed to load:', e.message);
            return false;
        }
    }

    send(cmd) {
        if (this.worker) {
            try { this.worker.postMessage(cmd); } catch(e) { /* ignore */ }
        }
    }

    _onMessage(line) {
        if (typeof line !== 'string') return;
        if (line === 'uciok') { this.send('isready'); }
        if (line === 'readyok') {
            this.ready = true;
            this.listeners.ready.forEach(fn => fn());
            if (this._readyResolve) { this._readyResolve(true); this._readyResolve = null; }
        }
        if (line.startsWith('info') && line.includes('score')) {
            const info = this._parseInfo(line);
            if (info) this.listeners.eval.forEach(fn => fn(info));
        }
        if (line.startsWith('bestmove')) {
            const best = line.split(' ')[1];
            const ponder = line.split('ponder ')[1] || null;
            this.thinking = false;
            this.listeners.bestmove.forEach(fn => fn(best, this.analysisMode, ponder));
        }
    }

    _parseInfo(line) {
        const depth = line.match(/depth (\d+)/);
        const score = line.match(/score (cp|mate) (-?\d+)/);
        const pv = line.match(/ pv (.+)/);
        const nps = line.match(/nps (\d+)/);
        if (!score) return null;
        return {
            depth: depth ? parseInt(depth[1]) : 0,
            scoreType: score[1],
            scoreValue: parseInt(score[2]),
            pv: pv ? pv[1].split(' ') : [],
            nps: nps ? parseInt(nps[1]) : 0,
        };
    }

    go(fen, depth, isAnalysis = false) {
        if (!this.ready || this.thinking) return;
        this.thinking = true;
        this.analysisMode = isAnalysis;
        this.send('position fen ' + fen);
        this.send('go depth ' + (depth || this.depth));
    }

    stop() {
        this.send('stop');
        this.thinking = false;
    }

    newGame() {
        this.send('ucinewgame');
        this.send('isready');
    }

    on(event, fn) {
        if (this.listeners[event]) this.listeners[event].push(fn);
    }

    off(event, fn) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(f => f !== fn);
        }
    }

    destroy() {
        if (this.worker) { this.worker.terminate(); this.worker = null; }
        this.ready = false;
    }
}


// =============================================================
// §6. SOUND MANAGER (Procedural — no files needed)
// =============================================================
class SoundManager {
    constructor(opts = {}) {
        this.enabled = opts.enabled !== false;
        this.volume = opts.volume || 0.4;
        this.ctx = null;
    }

    _ensureCtx() {
        if (!this.ctx) {
            try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); }
            catch(e) { this.enabled = false; }
        }
        return this.ctx;
    }

    _tone(freq, dur, type = 'sine', vol) {
        const ctx = this._ensureCtx();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        const v = (vol || this.volume) * 0.3;
        gain.gain.setValueAtTime(v, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + dur);
    }

    _noise(dur, vol) {
        const ctx = this._ensureCtx();
        if (!ctx) return;
        const bufferSize = ctx.sampleRate * dur;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.3;
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime((vol || this.volume) * 0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
        src.connect(gain);
        gain.connect(ctx.destination);
        src.start();
    }

    play(type) {
        if (!this.enabled) return;
        switch (type) {
            case 'move':
                this._tone(800, 0.08, 'sine');
                this._noise(0.04);
                break;
            case 'capture':
                this._tone(300, 0.12, 'triangle');
                this._noise(0.08);
                break;
            case 'check':
                this._tone(900, 0.1, 'square');
                setTimeout(() => this._tone(1200, 0.15, 'square'), 80);
                break;
            case 'castle':
                this._tone(600, 0.06, 'sine');
                setTimeout(() => this._tone(800, 0.06, 'sine'), 60);
                break;
            case 'illegal':
                this._tone(200, 0.15, 'sawtooth');
                break;
            case 'gameEnd':
                this._tone(523, 0.15, 'sine');
                setTimeout(() => this._tone(659, 0.15, 'sine'), 150);
                setTimeout(() => this._tone(784, 0.3, 'sine'), 300);
                break;
            case 'lowTime':
                this._tone(1000, 0.05, 'square');
                break;
        }
    }
}


// =============================================================
// §7. CHESS CLOCK
// =============================================================
class ChessClock {
    constructor(opts = {}) {
        this.initial = (opts.initial || 600) * 1000;
        this.increment = (opts.increment || 0) * 1000;
        this.time = { w: this.initial, b: this.initial };
        this.running = null; // 'w' or 'b' or null
        this.interval = null;
        this.listeners = { tick: [], timeout: [] };
        this.lastTick = null;
    }

    start(color) {
        this.running = color;
        this.lastTick = Date.now();
        this._startInterval();
    }

    switchTo(color) {
        if (this.running) {
            // Add increment to the side that just moved
            const other = this.running;
            this.time[other] += this.increment;
        }
        this.running = color;
        this.lastTick = Date.now();
        this._startInterval();
    }

    stop() {
        this.running = null;
        if (this.interval) { clearInterval(this.interval); this.interval = null; }
    }

    reset(initial, increment) {
        this.stop();
        if (initial !== undefined) this.initial = initial * 1000;
        if (increment !== undefined) this.increment = increment * 1000;
        this.time = { w: this.initial, b: this.initial };
    }

    getTime(color) { return Math.max(0, this.time[color]); }

    formatTime(color) {
        const ms = this.getTime(color);
        const totalSeconds = Math.ceil(ms / 1000);
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        if (mins >= 60) {
            const hrs = Math.floor(mins / 60);
            const m = mins % 60;
            return `${hrs}:${String(m).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
        }
        return `${mins}:${String(secs).padStart(2,'0')}`;
    }

    _startInterval() {
        if (this.interval) clearInterval(this.interval);
        this.interval = setInterval(() => {
            if (!this.running) return;
            const now = Date.now();
            const delta = now - this.lastTick;
            this.lastTick = now;
            this.time[this.running] -= delta;
            this.listeners.tick.forEach(fn => fn(this.running, this.time[this.running]));
            if (this.time[this.running] <= 0) {
                this.time[this.running] = 0;
                const loser = this.running;
                this.stop();
                this.listeners.timeout.forEach(fn => fn(loser));
            }
        }, 100);
    }

    on(event, fn) { if (this.listeners[event]) this.listeners[event].push(fn); }
    destroy() { this.stop(); }
}


// =============================================================
// §8. MULTIPLAYER MANAGER
// =============================================================
class MultiplayerManager {
    constructor(opts = {}) {
        this.provider = opts.provider;
        this.config = opts;
        this.roomId = opts.roomId || null;
        this.playerName = opts.playerName || 'Player';
        this.playerColor = null;
        this.connected = false;
        this.db = null;
        this.ws = null;
        this.listeners = { move: [], state: [], chat: [], connect: [], disconnect: [], join: [], error: [] };
    }

    async init() {
        if (this.provider === 'firebase') return this._initFirebase();
        if (this.provider === 'websocket') return this._initWebSocket();
        if (this.provider === 'custom') return true;
        return false;
    }

    // --- Firebase ---
    async _initFirebase() {
        const cfg = this.config.firebase;
        if (!cfg) { this._emit('error', 'No Firebase config provided'); return false; }

        // Dynamically load Firebase SDK
        if (typeof firebase === 'undefined') {
            await this._loadScript('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
            await this._loadScript('https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js');
        }

        try {
            if (!firebase.apps.length) firebase.initializeApp(cfg);
            this.db = firebase.database();
            this.connected = true;
            this._emit('connect');
            return true;
        } catch (e) {
            this._emit('error', 'Firebase init failed: ' + e.message);
            return false;
        }
    }

    async createRoom(fen) {
        if (!this.db) return null;
        const roomRef = this.db.ref('chess-rooms').push();
        this.roomId = roomRef.key;
        this.playerColor = 'w';
        await roomRef.set({
            created: Date.now(),
            fen: fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
            moves: [],
            white: this.playerName,
            black: null,
            status: 'waiting',
            chat: [],
        });
        this._listenRoom(roomRef);
        return this.roomId;
    }

    async joinRoom(roomId) {
        if (!this.db) return false;
        this.roomId = roomId;
        const roomRef = this.db.ref('chess-rooms/' + roomId);
        const snap = await roomRef.once('value');
        if (!snap.exists()) { this._emit('error', 'Room not found'); return false; }
        const data = snap.val();
        if (data.black) { this._emit('error', 'Room is full'); return false; }
        this.playerColor = 'b';
        await roomRef.update({ black: this.playerName, status: 'playing' });
        this._listenRoom(roomRef);
        return true;
    }

    _listenRoom(ref) {
        ref.child('moves').on('child_added', snap => {
            const move = snap.val();
            this._emit('move', move);
        });
        ref.child('status').on('value', snap => {
            this._emit('state', { status: snap.val() });
        });
        ref.child('chat').on('child_added', snap => {
            this._emit('chat', snap.val());
        });
        ref.child('black').on('value', snap => {
            if (snap.val()) this._emit('join', { color: 'b', name: snap.val() });
        });
    }

    async sendMove(moveData) {
        if (!this.db || !this.roomId) return;
        const ref = this.db.ref('chess-rooms/' + this.roomId + '/moves');
        await ref.push(moveData);
    }

    async sendChat(message) {
        if (!this.db || !this.roomId) return;
        const ref = this.db.ref('chess-rooms/' + this.roomId + '/chat');
        await ref.push({ sender: this.playerName, message, time: Date.now() });
    }

    async updateState(state) {
        if (!this.db || !this.roomId) return;
        await this.db.ref('chess-rooms/' + this.roomId).update(state);
    }

    // --- WebSocket ---
    async _initWebSocket() {
        const url = this.config.websocketUrl;
        if (!url) { this._emit('error', 'No WebSocket URL'); return false; }
        return new Promise(resolve => {
            this.ws = new WebSocket(url);
            this.ws.onopen = () => { this.connected = true; this._emit('connect'); resolve(true); };
            this.ws.onmessage = e => {
                try {
                    const data = JSON.parse(e.data);
                    if (data.type === 'move') this._emit('move', data);
                    if (data.type === 'state') this._emit('state', data);
                    if (data.type === 'chat') this._emit('chat', data);
                    if (data.type === 'join') this._emit('join', data);
                } catch(err) { /* ignore */ }
            };
            this.ws.onclose = () => { this.connected = false; this._emit('disconnect'); };
            this.ws.onerror = () => { this._emit('error', 'WebSocket error'); resolve(false); };
        });
    }

    _loadScript(src) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
            const s = document.createElement('script');
            s.src = src;
            s.onload = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
        });
    }

    on(event, fn) { if (this.listeners[event]) this.listeners[event].push(fn); }
    _emit(event, data) { if (this.listeners[event]) this.listeners[event].forEach(fn => fn(data)); }

    destroy() {
        if (this.ws) this.ws.close();
    }
}


// =============================================================
// §9. CSS INJECTION
// =============================================================
function injectCSS() {
    if (document.getElementById('chess-arena-css')) return;
    const style = document.createElement('style');
    style.id = 'chess-arena-css';
    style.textContent = `
/* === ChessArena Base CSS === */
.ca-root {
    --ca-sq-size: 64px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
    justify-content: center;
    color: var(--ca-panel-text);
}
.ca-root *, .ca-root *::before, .ca-root *::after { box-sizing: border-box; margin: 0; padding: 0; }

/* Board */
.ca-board-wrap {
    background: var(--ca-board-border);
    border-radius: 4px;
    padding: 3px;
    position: relative;
    box-shadow: 0 4px 20px rgba(0,0,0,0.4);
}
.ca-board {
    display: grid;
    grid-template-columns: repeat(8, var(--ca-sq-size));
    grid-template-rows: repeat(8, var(--ca-sq-size));
    position: relative;
    user-select: none;
    -webkit-user-select: none;
}
.ca-sq {
    width: var(--ca-sq-size);
    height: var(--ca-sq-size);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    cursor: pointer;
    transition: background-color 0.08s;
}
.ca-sq-light { background: var(--ca-light); }
.ca-sq-dark { background: var(--ca-dark); }
.ca-sq.ca-selected { background: var(--ca-selected) !important; }
.ca-sq.ca-last-from { background: var(--ca-last-from) !important; }
.ca-sq.ca-last-to { background: var(--ca-last-to) !important; }
.ca-sq.ca-check { background: var(--ca-check) !important; }
.ca-sq.ca-legal::after {
    content: '';
    position: absolute;
    width: 25%;
    height: 25%;
    background: var(--ca-legal-move);
    border-radius: 50%;
    z-index: 2;
    pointer-events: none;
}
.ca-sq.ca-legal.ca-has-target::after {
    width: 100%; height: 100%;
    background: none;
    border: calc(var(--ca-sq-size) * 0.08) solid var(--ca-legal-capture);
    border-radius: 50%;
}

/* Pieces */
.ca-piece {
    font-size: calc(var(--ca-sq-size) * 0.75);
    line-height: 1;
    z-index: 5;
    pointer-events: none;
    transition: none;
}
.ca-piece-img {
    width: calc(var(--ca-sq-size) * 0.85);
    height: calc(var(--ca-sq-size) * 0.85);
    z-index: 5;
    pointer-events: none;
    object-fit: contain;
}
.ca-piece.ca-animating, .ca-piece-img.ca-animating {
    transition: transform var(--ca-anim-speed, 150ms) ease;
    z-index: 20;
}
.ca-dragging {
    position: fixed !important;
    z-index: 100 !important;
    pointer-events: none !important;
    transform: scale(1.15);
    filter: drop-shadow(0 4px 8px rgba(0,0,0,0.4));
}

/* Coordinates */
.ca-coord {
    position: absolute;
    font-size: calc(var(--ca-sq-size) * 0.17);
    font-weight: 700;
    pointer-events: none;
    z-index: 3;
    line-height: 1;
}
.ca-coord-rank { top: 2px; left: 3px; }
.ca-coord-file { bottom: 1px; right: 3px; }
.ca-sq-light .ca-coord { color: var(--ca-coord-light); }
.ca-sq-dark .ca-coord { color: var(--ca-coord-dark); }

/* Panels */
.ca-panel { display: flex; flex-direction: column; gap: 10px; width: 280px; }
.ca-box {
    background: var(--ca-panel-bg);
    border: 1px solid var(--ca-panel-border);
    border-radius: 8px;
    padding: 12px;
}
.ca-box-title {
    font-size: 0.8rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 8px;
    opacity: 0.7;
}

/* Status */
.ca-status { font-size: 1rem; font-weight: 600; }

/* Eval bar */
.ca-eval-wrap { display: flex; align-items: center; gap: 8px; }
.ca-eval-bar-outer { flex: 1; height: 18px; background: var(--ca-eval-black); border-radius: 9px; overflow: hidden; }
.ca-eval-bar-inner { height: 100%; width: 50%; background: var(--ca-eval-white); border-radius: 9px; transition: width 0.4s ease; }
.ca-eval-score { font-weight: 700; font-size: 0.95rem; min-width: 50px; text-align: center; font-family: monospace; }
.ca-eval-line { font-size: 0.75rem; opacity: 0.5; margin-top: 4px; font-family: monospace; }
.ca-eval-depth { font-size: 0.7rem; opacity: 0.4; }

/* Move history */
.ca-moves {
    max-height: 180px;
    overflow-y: auto;
    font-family: monospace;
    font-size: 0.85rem;
    line-height: 1.7;
}
.ca-moves::-webkit-scrollbar { width: 5px; }
.ca-moves::-webkit-scrollbar-thumb { background: var(--ca-accent); border-radius: 3px; }
.ca-move-num { opacity: 0.4; margin-right: 3px; }
.ca-move-w { margin-right: 10px; cursor: pointer; border-radius: 3px; padding: 0 3px; }
.ca-move-b { cursor: pointer; border-radius: 3px; padding: 0 3px; }
.ca-move-w:hover, .ca-move-b:hover { background: var(--ca-accent); color: var(--ca-accent-text); }
.ca-move-active { background: var(--ca-accent) !important; color: var(--ca-accent-text) !important; }

/* Captured */
.ca-captured { display: flex; flex-wrap: wrap; gap: 1px; min-height: 24px; align-items: center; }
.ca-cap-piece { font-size: calc(var(--ca-sq-size) * 0.33); opacity: 0.75; }
.ca-cap-adv { font-size: 0.75rem; margin-left: 4px; font-weight: 700; }

/* Clock */
.ca-clock-wrap { display: flex; justify-content: space-between; gap: 8px; }
.ca-clock {
    flex: 1;
    text-align: center;
    padding: 8px;
    border-radius: 6px;
    font-family: monospace;
    font-size: 1.3rem;
    font-weight: 700;
    background: var(--ca-panel-bg);
    border: 1px solid var(--ca-panel-border);
}
.ca-clock.ca-active { background: var(--ca-accent); color: var(--ca-accent-text); }
.ca-clock.ca-low { background: #c0392b; color: #fff; animation: ca-pulse 0.5s ease infinite alternate; }
.ca-clock-label { font-size: 0.65rem; opacity: 0.6; font-weight: 400; display: block; margin-bottom: 2px; }

/* Buttons */
.ca-controls { display: flex; gap: 6px; flex-wrap: wrap; }
.ca-btn {
    padding: 7px 14px;
    border: none;
    border-radius: 6px;
    font-size: 0.8rem;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.15s;
    background: var(--ca-button-bg);
    color: var(--ca-button-text);
}
.ca-btn:hover { filter: brightness(1.15); transform: translateY(-1px); }
.ca-btn-secondary { background: var(--ca-panel-border); color: var(--ca-panel-text); }

/* Settings */
.ca-select {
    background: var(--ca-panel-border);
    color: var(--ca-panel-text);
    border: 1px solid var(--ca-panel-border);
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 0.8rem;
}
.ca-setting { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.ca-setting label { font-size: 0.8rem; opacity: 0.7; }

/* Promotion modal */
.ca-promo-overlay {
    display: none;
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.6);
    z-index: 1000;
    justify-content: center; align-items: center;
}
.ca-promo-overlay.ca-show { display: flex; }
.ca-promo-box {
    background: var(--ca-panel-bg);
    border-radius: 12px;
    padding: 16px 20px;
    text-align: center;
    box-shadow: 0 8px 30px rgba(0,0,0,0.5);
    border: 1px solid var(--ca-panel-border);
}
.ca-promo-title { font-size: 0.9rem; margin-bottom: 12px; font-weight: 600; }
.ca-promo-pieces { display: flex; gap: 8px; justify-content: center; }
.ca-promo-piece {
    width: calc(var(--ca-sq-size) * 1.1);
    height: calc(var(--ca-sq-size) * 1.1);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: calc(var(--ca-sq-size) * 0.8);
    background: var(--ca-light);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.15s;
}
.ca-promo-piece:hover { transform: scale(1.1); box-shadow: 0 0 15px var(--ca-accent); }

/* Online */
.ca-online-box { text-align: center; }
.ca-room-code { font-family: monospace; font-size: 1.2rem; font-weight: 700; color: var(--ca-accent); letter-spacing: 2px; }
.ca-chat { max-height: 100px; overflow-y: auto; font-size: 0.8rem; margin-top: 6px; }
.ca-chat-input { width: 100%; background: var(--ca-panel-border); border: none; color: var(--ca-panel-text); padding: 6px 8px; border-radius: 4px; margin-top: 4px; font-size: 0.8rem; }

/* FEN display */
.ca-fen { font-size: 0.65rem; opacity: 0.4; word-break: break-all; font-family: monospace; margin-top: 6px; }

/* Spinner */
.ca-spinner { width: 14px; height: 14px; border: 2px solid var(--ca-accent); border-top-color: transparent; border-radius: 50%; animation: ca-spin 0.7s linear infinite; display: inline-block; vertical-align: middle; margin-right: 6px; }
@keyframes ca-spin { to { transform: rotate(360deg); } }
@keyframes ca-pulse { to { opacity: 0.7; } }

/* Responsive */
@media (max-width: 700px) {
    .ca-root { flex-direction: column; align-items: center; }
    .ca-panel { width: 100%; max-width: calc(var(--ca-sq-size) * 8 + 6px); }
}
`;
    document.head.appendChild(style);
}


// =============================================================
// §10. MAIN CHESSARENA CLASS
// =============================================================
class ChessArena {
    constructor(target, opts = {}) {
        // Merge defaults
        this.opts = this._merge(DEFAULTS, opts);

        // Random color
        if (this.opts.playerColor === 'random') {
            this.opts.playerColor = Math.random() < 0.5 ? 'w' : 'b';
        }

        // Init CSS
        injectCSS();

        // Resolve target element
        if (typeof target === 'string') {
            this.container = document.querySelector(target);
        } else if (target instanceof HTMLElement) {
            this.container = target;
        } else {
            this.container = document.body;
        }

        // Core state
        this.engine = new ChessEngine(this.opts.fen);
        if (this.opts.pgn) this._loadPGN(this.opts.pgn);
        this.flipped = this.opts.playerColor === 'b';
        this.selected = null;
        this.legalMoves = [];
        this.lastFrom = null;
        this.lastTo = null;
        this.isThinking = false;
        this.gameStarted = false;
        this._eventHandlers = {};

        // Theme
        this.theme = typeof this.opts.theme === 'string'
            ? (THEMES[this.opts.theme] || THEMES.classic)
            : { ...THEMES.classic, ...this.opts.theme };

        // Subsystems
        this.sounds = new SoundManager(this.opts.sounds);
        this.stockfish = null;
        this.clock = null;
        this.multiplayer = null;

        // Drag state
        this._drag = null;

        // Build UI
        this._buildUI();
        this._applyTheme();
        this._renderBoard();
        this._updateAll();

        // Init AI
        if (this.opts.mode === 'ai' || this.opts.mode === 'ai-vs-ai' || this.opts.mode === 'analysis') {
            this._initAI();
        }

        // Init clock
        if (this.opts.clock.enabled) {
            this._initClock();
        }

        // Init multiplayer
        if (this.opts.multiplayer.provider) {
            this._initMultiplayer();
        }
    }

    // --- Deep merge ---
    _merge(defaults, overrides) {
        const result = {};
        for (const key in defaults) {
            if (typeof defaults[key] === 'object' && defaults[key] !== null && !Array.isArray(defaults[key])) {
                result[key] = this._merge(defaults[key], overrides[key] || {});
            } else {
                result[key] = overrides[key] !== undefined ? overrides[key] : defaults[key];
            }
        }
        // Include keys from overrides not in defaults
        for (const key in overrides) {
            if (!(key in defaults)) result[key] = overrides[key];
        }
        return result;
    }

    // ============================
    // UI BUILDING
    // ============================
    _buildUI() {
        this.root = document.createElement('div');
        this.root.className = 'ca-root';

        // Left: board area
        const boardCol = document.createElement('div');

        // Top clock / captured
        if (this.opts.ui.showClock || this.opts.ui.showCaptured) {
            this.topInfo = document.createElement('div');
            this.topInfo.style.marginBottom = '6px';
            boardCol.appendChild(this.topInfo);
        }

        // Board wrapper
        this.boardWrap = document.createElement('div');
        this.boardWrap.className = 'ca-board-wrap';
        this.boardEl = document.createElement('div');
        this.boardEl.className = 'ca-board';
        this.boardWrap.appendChild(this.boardEl);
        boardCol.appendChild(this.boardWrap);

        // Bottom clock / captured
        if (this.opts.ui.showClock || this.opts.ui.showCaptured) {
            this.botInfo = document.createElement('div');
            this.botInfo.style.marginTop = '6px';
            boardCol.appendChild(this.botInfo);
        }

        this.root.appendChild(boardCol);

        // Right: panel
        if (this.opts.autoSetup) {
            this.panel = document.createElement('div');
            this.panel.className = 'ca-panel';
            this._buildPanel();
            this.root.appendChild(this.panel);
        }

        // Promotion modal
        this.promoOverlay = document.createElement('div');
        this.promoOverlay.className = 'ca-promo-overlay';
        this.promoOverlay.innerHTML = `
            <div class="ca-promo-box">
                <div class="ca-promo-title">Promote to:</div>
                <div class="ca-promo-pieces" id="ca-promo-pieces"></div>
            </div>
        `;
        this.root.appendChild(this.promoOverlay);

        this.container.appendChild(this.root);

        // Events
        this.boardEl.addEventListener('pointerdown', e => this._onPointerDown(e));
        document.addEventListener('pointermove', e => this._onPointerMove(e));
        document.addEventListener('pointerup', e => this._onPointerUp(e));
    }

    _buildPanel() {
        // Status
        if (this.opts.ui.showStatus) {
            const box = this._createBox('Status');
            this.statusEl = document.createElement('div');
            this.statusEl.className = 'ca-status';
            box.appendChild(this.statusEl);
            this.fenEl = document.createElement('div');
            this.fenEl.className = 'ca-fen';
            box.appendChild(this.fenEl);
            this.panel.appendChild(box);
        }

        // Eval
        if (this.opts.ui.showEvalBar) {
            const box = this._createBox('Engine');
            box.innerHTML = `
                <div class="ca-eval-wrap">
                    <div class="ca-eval-bar-outer"><div class="ca-eval-bar-inner" id="ca-eval-bar"></div></div>
                    <span class="ca-eval-score" id="ca-eval-score">0.0</span>
                </div>
                <div class="ca-eval-line" id="ca-eval-line"></div>
                <div class="ca-eval-depth" id="ca-eval-depth"></div>
                <div id="ca-engine-status" style="margin-top:4px;font-size:0.75rem;opacity:0.6;"><span class="ca-spinner"></span>Loading engine...</div>
            `;
            this.panel.appendChild(box);
        }

        // Move history
        if (this.opts.ui.showMoveHistory) {
            const box = this._createBox('Moves');
            this.movesEl = document.createElement('div');
            this.movesEl.className = 'ca-moves';
            this.movesEl.innerHTML = '<span style="opacity:0.4;">No moves yet</span>';
            box.appendChild(this.movesEl);
            this.panel.appendChild(box);
        }

        // Controls
        if (this.opts.ui.showControls) {
            const box = this._createBox('Controls');
            const controls = document.createElement('div');
            controls.className = 'ca-controls';
            controls.innerHTML = `
                <button class="ca-btn" data-action="new">New Game</button>
                <button class="ca-btn ca-btn-secondary" data-action="undo">↩ Undo</button>
                <button class="ca-btn ca-btn-secondary" data-action="flip">🔄 Flip</button>
                <button class="ca-btn ca-btn-secondary" data-action="pgn">📋 PGN</button>
            `;
            controls.addEventListener('click', e => {
                const action = e.target.dataset.action;
                if (action === 'new') this.newGame();
                if (action === 'undo') this.undo();
                if (action === 'flip') this.flip();
                if (action === 'pgn') this._copyPGN();
            });
            box.appendChild(controls);
            this.panel.appendChild(box);
        }

        // Settings
        if (this.opts.ui.showSettings) {
            const box = this._createBox('Settings');
            box.innerHTML = `
                <div class="ca-setting">
                    <label>Mode</label>
                    <select class="ca-select" data-setting="mode">
                        <option value="ai">vs AI</option>
                        <option value="local">2 Players</option>
                        <option value="ai-vs-ai">AI vs AI</option>
                        <option value="analysis">Analysis</option>
                    </select>
                </div>
                <div class="ca-setting">
                    <label>Play as</label>
                    <select class="ca-select" data-setting="color">
                        <option value="w">White</option>
                        <option value="b">Black</option>
                    </select>
                </div>
                <div class="ca-setting">
                    <label>AI Depth</label>
                    <select class="ca-select" data-setting="depth">
                        <option value="1">1 - Beginner</option>
                        <option value="3">3 - Easy</option>
                        <option value="5">5 - Medium</option>
                        <option value="8">8 - Hard</option>
                        <option value="12">12 - Expert</option>
                        <option value="16">16 - Master</option>
                        <option value="20">20 - Maximum</option>
                    </select>
                </div>
                <div class="ca-setting">
                    <label>Theme</label>
                    <select class="ca-select" data-setting="theme">
                        ${Object.keys(THEMES).map(k => `<option value="${k}">${THEMES[k].name}</option>`).join('')}
                    </select>
                </div>
            `;
            // Set current values
            setTimeout(() => {
                const modeSelect = box.querySelector('[data-setting="mode"]');
                const colorSelect = box.querySelector('[data-setting="color"]');
                const depthSelect = box.querySelector('[data-setting="depth"]');
                const themeSelect = box.querySelector('[data-setting="theme"]');
                if (modeSelect) modeSelect.value = this.opts.mode;
                if (colorSelect) colorSelect.value = this.opts.playerColor;
                if (depthSelect) depthSelect.value = this.opts.ai.depth;
                if (themeSelect) themeSelect.value = typeof this.opts.theme === 'string' ? this.opts.theme : 'classic';
            }, 0);

            box.addEventListener('change', e => {
                const setting = e.target.dataset.setting;
                const val = e.target.value;
                if (setting === 'mode') { this.opts.mode = val; this.newGame(); }
                if (setting === 'color') { this.opts.playerColor = val; this.newGame(); }
                if (setting === 'depth') { this.opts.ai.depth = parseInt(val); }
                if (setting === 'theme') { this.setTheme(val); }
            });
            this.panel.appendChild(box);
        }
    }

    _createBox(title) {
        const box = document.createElement('div');
        box.className = 'ca-box';
        if (title) {
            const t = document.createElement('div');
            t.className = 'ca-box-title';
            t.textContent = title;
            box.appendChild(t);
        }
        return box;
    }

    // ============================
    // THEME
    // ============================
    _applyTheme() {
        const t = this.theme;
        const s = this.root.style;
        const sz = this.opts.squareSize;
        s.setProperty('--ca-sq-size', sz + 'px');
        s.setProperty('--ca-light', t.lightSquare);
        s.setProperty('--ca-dark', t.darkSquare);
        s.setProperty('--ca-selected', t.selected);
        s.setProperty('--ca-last-from', t.lastMoveFrom);
        s.setProperty('--ca-last-to', t.lastMoveTo);
        s.setProperty('--ca-check', t.check);
        s.setProperty('--ca-legal-move', t.legalMove);
        s.setProperty('--ca-legal-capture', t.legalCapture);
        s.setProperty('--ca-panel-bg', t.panelBg);
        s.setProperty('--ca-panel-text', t.panelText);
        s.setProperty('--ca-panel-border', t.panelBorder);
        s.setProperty('--ca-accent', t.accent);
        s.setProperty('--ca-accent-text', t.accentText);
        s.setProperty('--ca-button-bg', t.buttonBg);
        s.setProperty('--ca-button-text', t.buttonText);
        s.setProperty('--ca-coord-light', t.coordLight);
        s.setProperty('--ca-coord-dark', t.coordDark);
        s.setProperty('--ca-board-border', t.boardBorder);
        s.setProperty('--ca-eval-white', t.evalWhite);
        s.setProperty('--ca-eval-black', t.evalBlack);
        s.setProperty('--ca-anim-speed', this.opts.ui.animationSpeed + 'ms');

        if (this.opts.responsive) {
            s.setProperty('--ca-sq-size', `min(${sz}px, calc((100vw - 350px) / 8))`);
        }
    }

    setTheme(nameOrObj) {
        if (typeof nameOrObj === 'string') {
            this.theme = THEMES[nameOrObj] || THEMES.classic;
        } else {
            this.theme = { ...THEMES.classic, ...nameOrObj };
        }
        this._applyTheme();
        this._renderBoard();
    }

    // ============================
    // BOARD RENDERING
    // ============================
    _renderBoard() {
        this.boardEl.innerHTML = '';

        for (let dr = 0; dr < 8; dr++) {
            for (let dc = 0; dc < 8; dc++) {
                const row = this.flipped ? (7 - dr) : dr;
                const col = this.flipped ? (7 - dc) : dc;
                const file = 'abcdefgh'[col];
                const rank = 8 - row;
                const sqName = file + rank;
                const isLight = (row + col) % 2 === 0;

                const sq = document.createElement('div');
                sq.className = `ca-sq ${isLight ? 'ca-sq-light' : 'ca-sq-dark'}`;
                sq.dataset.sq = sqName;

                // Highlights
                if (sqName === this.selected) sq.classList.add('ca-selected');
                if (sqName === this.lastFrom) sq.classList.add('ca-last-from');
                if (sqName === this.lastTo) sq.classList.add('ca-last-to');

                const piece = this.engine.get(sqName);

                // Legal move indicators
                if (this.legalMoves.includes(sqName)) {
                    sq.classList.add('ca-legal');
                    if (piece) sq.classList.add('ca-has-target');
                }

                // Check highlight
                if (this.engine.inCheck() && piece && piece.type === 'k' && piece.color === this.engine.turn()) {
                    sq.classList.add('ca-check');
                }

                // Coordinates
                if (this.opts.ui.showCoordinates) {
                    if (dc === 0) {
                        const lbl = document.createElement('span');
                        lbl.className = 'ca-coord ca-coord-rank';
                        lbl.textContent = rank;
                        sq.appendChild(lbl);
                    }
                    if (dr === 7) {
                        const lbl = document.createElement('span');
                        lbl.className = 'ca-coord ca-coord-file';
                        lbl.textContent = file;
                        sq.appendChild(lbl);
                    }
                }

                // Piece
                if (piece) {
                    const pEl = this._createPieceEl(piece);
                    sq.appendChild(pEl);
                }

                this.boardEl.appendChild(sq);
            }
        }

        this._renderCaptured();
    }

    _createPieceEl(piece) {
        const key = (piece.color === 'w' ? 'w' : 'b') + piece.type.toUpperCase();
        if (this.opts.pieceSet === 'unicode') {
            const span = document.createElement('span');
            span.className = 'ca-piece';
            span.textContent = UNICODE_PIECES[key];
            return span;
        }
        // Image-based piece set
        const img = document.createElement('img');
        img.className = 'ca-piece-img';
        img.draggable = false;
        let url = '';
        if (typeof this.opts.pieceSet === 'string' && PIECE_SET_URLS[this.opts.pieceSet]) {
            url = PIECE_SET_URLS[this.opts.pieceSet].replace('{piece}', key);
        } else if (typeof this.opts.pieceSet === 'string') {
            url = this.opts.pieceSet.replace('{piece}', key);
        }
        img.src = url;
        img.alt = key;
        return img;
    }

    // ============================
    // INPUT HANDLING
    // ============================
    _onPointerDown(e) {
        if (this.isThinking && this.opts.mode !== 'analysis') return;
        if (this.engine.isGameOver() && this.opts.mode !== 'analysis') return;

        const sq = e.target.closest('.ca-sq');
        if (!sq) return;
        const sqName = sq.dataset.sq;
        const piece = this.engine.get(sqName);

        // If clicking a legal move destination
        if (this.selected && this.legalMoves.includes(sqName)) {
            this._tryMove(this.selected, sqName);
            return;
        }

        // Mode check
        if (!this._canPlayerMove()) {
            this.selected = null;
            this.legalMoves = [];
            this._renderBoard();
            return;
        }

        // Select piece
        if (piece && piece.color === this.engine.turn()) {
            this.selected = sqName;
            this.legalMoves = this.engine.moves({ square: sqName, verbose: true }).map(m => m.to);
            this._renderBoard();

            // Start drag
            if (this.opts.ui.allowDragDrop) {
                const pEl = sq.querySelector('.ca-piece, .ca-piece-img');
                if (pEl) {
                    this._drag = {
                        el: pEl.cloneNode(true),
                        from: sqName,
                        piece: piece,
                    };
                    this._drag.el.classList.add('ca-dragging');
                    document.body.appendChild(this._drag.el);
                    this._drag.el.style.left = (e.clientX - this.opts.squareSize/2) + 'px';
                    this._drag.el.style.top = (e.clientY - this.opts.squareSize/2) + 'px';
                    pEl.style.opacity = '0.3';
                    e.preventDefault();
                }
            }
        } else if (this.selected) {
            // Deselect
            this.selected = null;
            this.legalMoves = [];
            this._renderBoard();
        }
    }

    _onPointerMove(e) {
        if (!this._drag) return;
        this._drag.el.style.left = (e.clientX - this.opts.squareSize/2) + 'px';
        this._drag.el.style.top = (e.clientY - this.opts.squareSize/2) + 'px';
    }

    _onPointerUp(e) {
        if (!this._drag) return;
        this._drag.el.remove();

        // Find drop target
        const dropEl = document.elementFromPoint(e.clientX, e.clientY);
        const sq = dropEl?.closest('.ca-sq');
        const dropSq = sq?.dataset.sq;

        if (dropSq && dropSq !== this._drag.from && this.legalMoves.includes(dropSq)) {
            this._tryMove(this._drag.from, dropSq);
        } else {
            // Cancel drag
            this.selected = null;
            this.legalMoves = [];
            this._renderBoard();
        }

        this._drag = null;
    }

    _canPlayerMove() {
        const mode = this.opts.mode;
        if (mode === 'analysis') return true;
        if (mode === 'local') return true;
        if (mode === 'ai' && this.engine.turn() === this.opts.playerColor) return true;
        if (mode === 'online' && this.multiplayer && this.engine.turn() === this.multiplayer.playerColor) return true;
        return false;
    }

    // ============================
    // MOVE LOGIC
    // ============================
    _tryMove(from, to) {
        const piece = this.engine.get(from);
        if (piece && piece.type === 'p') {
            const tr = to[1];
            if ((piece.color === 'w' && tr === '8') || (piece.color === 'b' && tr === '1')) {
                this._showPromotion(from, to, piece.color);
                return;
            }
        }
        this._makeMove(from, to);
    }

    _makeMove(from, to, promotion) {
        const obj = { from, to };
        if (promotion) obj.promotion = promotion;

        const result = this.engine.move(obj);
        if (!result) {
            this.sounds.play('illegal');
            this._emit('illegalMove', { from, to });
            this.selected = null;
            this.legalMoves = [];
            this._renderBoard();
            return;
        }

        // Update state
        this.lastFrom = from;
        this.lastTo = to;
        this.selected = null;
        this.legalMoves = [];
        this.gameStarted = true;

        // Sound
        if (result.isCheckmate) this.sounds.play('gameEnd');
        else if (result.isCheck) this.sounds.play('check');
        else if (result.isCastling) this.sounds.play('castle');
        else if (result.isCapture) this.sounds.play('capture');
        else this.sounds.play('move');

        // Clock
        if (this.clock && this.clock.running) {
            this.clock.switchTo(this.engine.turn());
        } else if (this.clock && this.gameStarted) {
            this.clock.start(this.engine.turn());
        }

        // Render
        this._renderBoard();
        this._updateAll();

        // Events
        this._emit('move', result);
        if (result.isCapture) this._emit('capture', result);
        if (result.isCheck) this._emit('check', result);

        // Multiplayer sync
        if (this.multiplayer && this.multiplayer.connected) {
            this.multiplayer.sendMove({ from, to, promotion, san: result.san, fen: this.engine.fen() });
        }

        // Game over
        if (this.engine.isGameOver()) {
            const gr = this.engine.gameResult();
            this._emit('gameOver', gr);
            this.sounds.play('gameEnd');
            if (this.clock) this.clock.stop();
            return;
        }

        // AI response
        this._scheduleAI();
    }

    _showPromotion(from, to, color) {
        const cc = color === 'w' ? 'w' : 'b';
        const piecesDiv = this.promoOverlay.querySelector('.ca-promo-pieces');
        piecesDiv.innerHTML = '';
        for (const p of ['q', 'r', 'b', 'n']) {
            const el = document.createElement('div');
            el.className = 'ca-promo-piece';
            const key = cc + p.toUpperCase();
            if (this.opts.pieceSet === 'unicode') {
                el.textContent = UNICODE_PIECES[key];
            } else {
                el.innerHTML = `<img src="${this._pieceUrl(key)}" style="width:80%;height:80%;object-fit:contain;">`;
            }
            el.addEventListener('click', () => {
                this.promoOverlay.classList.remove('ca-show');
                this._makeMove(from, to, p);
            });
            piecesDiv.appendChild(el);
        }
        this.promoOverlay.classList.add('ca-show');
    }

    _pieceUrl(key) {
        if (typeof this.opts.pieceSet === 'string' && PIECE_SET_URLS[this.opts.pieceSet]) {
            return PIECE_SET_URLS[this.opts.pieceSet].replace('{piece}', key);
        }
        return '';
    }

    // ============================
    // AI
    // ============================
    async _initAI() {
        this.stockfish = new StockfishManager(this.opts.ai);

        this.stockfish.on('eval', info => {
            this._updateEval(info);
            this._emit('engineEval', info);
        });

        this.stockfish.on('bestmove', (best, wasAnalysis, ponder) => {
            if (!wasAnalysis && best && best !== '(none)') {
                this._handleAIMove(best);
            }
            this.isThinking = false;
        });

        const ok = await this.stockfish.init();

        const statusEl = this.root.querySelector('#ca-engine-status');
        if (statusEl) {
            statusEl.textContent = ok ? '✓ Stockfish ready' : '⚠ Using fallback AI';
        }

        // Check if AI should move first
        setTimeout(() => this._scheduleAI(), 300);
    }

    _scheduleAI() {
        if (this.engine.isGameOver()) return;
        if (this.isThinking) return;

        const mode = this.opts.mode;
        let shouldMove = false;

        if (mode === 'ai' && this.engine.turn() !== this.opts.playerColor) shouldMove = true;
        if (mode === 'ai-vs-ai') shouldMove = true;

        if (shouldMove) {
            setTimeout(() => this._makeAIMove(), this.opts.ai.moveDelay);
        } else if (this.stockfish?.ready) {
            // Background analysis
            setTimeout(() => {
                if (!this.isThinking) {
                    this.stockfish.go(this.engine.fen(), this.opts.ai.analyzeDepth, true);
                    this.isThinking = true;
                }
            }, 100);
        }
    }

    _makeAIMove() {
        if (this.isThinking || this.engine.isGameOver()) return;
        this.isThinking = true;

        if (this.stockfish?.ready) {
            this.stockfish.go(this.engine.fen(), this.opts.ai.depth, false);
        } else {
            // Fallback
            setTimeout(() => {
                const m = this._fallbackAI();
                if (m) this._handleAIMove(m.from + m.to + (m.promotion || ''));
                this.isThinking = false;
            }, 300);
        }
    }

    _handleAIMove(uci) {
        if (this.engine.isGameOver()) { this.isThinking = false; return; }
        const from = uci.substring(0,2), to = uci.substring(2,4);
        const promo = uci.length > 4 ? uci[4] : undefined;
        this._makeMove(from, to, promo);
        this.isThinking = false;

        if (this.opts.mode === 'ai-vs-ai' && !this.engine.isGameOver()) {
            setTimeout(() => this._scheduleAI(), 400);
        }
    }

    _fallbackAI() {
        const moves = this.engine.moves({ verbose: true });
        if (!moves.length) return null;
        const scored = moves.map(m => {
            let score = Math.random() * 2;
            const target = this.engine.get(m.to);
            if (target) score += 10 + PIECE_VALUES[target.type] * 10 - PIECE_VALUES[m.piece] * 1;
            if (m.promotion) score += m.promotion === 'q' ? 90 : 30;
            if ('d4d5e4e5'.includes(m.to)) score += 3;
            return { m, score };
        });
        scored.sort((a,b) => b.score - a.score);
        return scored[Math.floor(Math.random() * Math.min(3, scored.length))].m;
    }

    _updateEval(info) {
        const barEl = this.root.querySelector('#ca-eval-bar');
        const scoreEl = this.root.querySelector('#ca-eval-score');
        const lineEl = this.root.querySelector('#ca-eval-line');
        const depthEl = this.root.querySelector('#ca-eval-depth');
        if (!barEl) return;

        let evalNum, evalText;
        if (info.scoreType === 'cp') {
            evalNum = info.scoreValue / 100;
            if (this.engine.turn() === 'b') evalNum = -evalNum;
            evalText = (evalNum >= 0 ? '+' : '') + evalNum.toFixed(1);
        } else {
            evalNum = info.scoreValue > 0 ? 100 : -100;
            if (this.engine.turn() === 'b') evalNum = -evalNum;
            evalText = (info.scoreValue > 0 ? '+' : '') + 'M' + Math.abs(info.scoreValue);
        }

        scoreEl.textContent = evalText;
        barEl.style.width = Math.min(95, Math.max(5, 50 + evalNum * 5)) + '%';
        if (lineEl && info.pv.length) lineEl.textContent = info.pv.slice(0, 6).join(' ');
        if (depthEl) depthEl.textContent = 'depth ' + info.depth;
    }

    // ============================
    // CLOCK
    // ============================
    _initClock() {
        this.clock = new ChessClock(this.opts.clock);
        this.clock.on('tick', (color, ms) => {
            this._renderClocks();
            this._emit('clockTick', { color, ms });
            if (ms < 10000) this.sounds.play('lowTime');
        });
        this.clock.on('timeout', loser => {
            const winner = loser === 'w' ? 'Black' : 'White';
            this._emit('gameOver', { result: loser === 'w' ? '0-1' : '1-0', reason: 'timeout' });
            this._updateStatus();
            this.sounds.play('gameEnd');
        });
        this._renderClocks();
    }

    _renderClocks() {
        if (!this.clock) return;
        const topColor = this.flipped ? 'w' : 'b';
        const botColor = this.flipped ? 'b' : 'w';

        if (this.topInfo) {
            let html = '';
            if (this.opts.ui.showCaptured) html += `<div class="ca-captured" id="ca-cap-${topColor}"></div>`;
            if (this.opts.ui.showClock && this.opts.clock.enabled) {
                const active = this.clock.running === topColor ? 'ca-active' : '';
                const low = this.clock.getTime(topColor) < 30000 && this.clock.running === topColor ? 'ca-low' : '';
                html += `<div class="ca-clock ${active} ${low}"><span class="ca-clock-label">${topColor === 'w' ? 'White' : 'Black'}</span>${this.clock.formatTime(topColor)}</div>`;
            }
            this.topInfo.innerHTML = html;
        }
        if (this.botInfo) {
            let html = '';
            if (this.opts.ui.showClock && this.opts.clock.enabled) {
                const active = this.clock.running === botColor ? 'ca-active' : '';
                const low = this.clock.getTime(botColor) < 30000 && this.clock.running === botColor ? 'ca-low' : '';
                html += `<div class="ca-clock ${active} ${low}"><span class="ca-clock-label">${botColor === 'w' ? 'White' : 'Black'}</span>${this.clock.formatTime(botColor)}</div>`;
            }
            if (this.opts.ui.showCaptured) html += `<div class="ca-captured" id="ca-cap-${botColor}"></div>`;
            this.botInfo.innerHTML = html;
        }

        this._renderCaptured();
    }

    // ============================
    // MULTIPLAYER
    // ============================
    async _initMultiplayer() {
        this.multiplayer = new MultiplayerManager(this.opts.multiplayer);

        this.multiplayer.on('move', data => {
            // Only apply opponent moves
            if (data.from && data.to) {
                this._makeMove(data.from, data.to, data.promotion);
            }
        });

        this.multiplayer.on('connect', () => this._emit('connect'));
        this.multiplayer.on('disconnect', () => this._emit('disconnect'));
        this.multiplayer.on('error', err => console.error('[Multiplayer]', err));

        const ok = await this.multiplayer.init();
        if (ok) {
            if (this.opts.multiplayer.roomId) {
                await this.multiplayer.joinRoom(this.opts.multiplayer.roomId);
            }
        }
    }

    // ============================
    // UI UPDATES
    // ============================
    _updateAll() {
        this._updateStatus();
        this._updateMoveHistory();
        this._renderCaptured();
        if (this.clock) this._renderClocks();
    }

    _updateStatus() {
        if (!this.statusEl) return;
        const e = this.engine;
        if (e.isCheckmate()) {
            const w = e.turn() === 'w' ? 'Black' : 'White';
            this.statusEl.textContent = `🏆 Checkmate — ${w} wins!`;
            this.statusEl.style.color = this.theme.accent;
        } else if (e.isDraw()) {
            const gr = e.gameResult();
            this.statusEl.textContent = `🤝 Draw — ${gr.reason}`;
            this.statusEl.style.color = '#f39c12';
        } else if (e.inCheck()) {
            this.statusEl.textContent = `⚠ ${e.turn() === 'w' ? 'White' : 'Black'} is in check!`;
            this.statusEl.style.color = '#e74c3c';
        } else {
            this.statusEl.textContent = `${e.turn() === 'w' ? 'White' : 'Black'} to move`;
            this.statusEl.style.color = this.theme.panelText;
        }
        if (this.fenEl) this.fenEl.textContent = e.fen();
    }

    _updateMoveHistory() {
        if (!this.movesEl) return;
        const hist = this.engine.history();
        if (!hist.length) { this.movesEl.innerHTML = '<span style="opacity:0.4;">No moves yet</span>'; return; }
        let html = '';
        for (let i = 0; i < hist.length; i += 2) {
            const num = Math.floor(i/2) + 1;
            html += `<span class="ca-move-num">${num}.</span>`;
            html += `<span class="ca-move-w">${hist[i]}</span>`;
            if (hist[i+1]) html += `<span class="ca-move-b">${hist[i+1]}</span>`;
            html += ' ';
        }
        this.movesEl.innerHTML = html;
        this.movesEl.scrollTop = this.movesEl.scrollHeight;
    }

    _renderCaptured() {
        if (!this.opts.ui.showCaptured) return;
        const hist = this.engine.history({ verbose: true });
        const caps = { w: [], b: [] };
        hist.forEach(m => {
            if (m.captured) {
                caps[m.color].push({ type: m.captured, color: m.color === 'w' ? 'b' : 'w' });
            }
        });

        for (const color of ['w', 'b']) {
            const el = this.root.querySelector(`#ca-cap-${color}`);
            if (!el) continue;
            const myCaptures = caps[color === 'w' ? 'b' : 'w']; // pieces captured BY this color's opponent... no
            // Actually: caps[w] = pieces White captured (black pieces)
            // We display captured pieces near the capturing player
            const pieces = caps[color === 'w' ? 'b' : 'w']; // pieces captured FROM this color
            // Let's show what's been captured from each side
            // Near black's clock: show pieces black has lost (captured by white) = caps.w
            // Near white's clock: show pieces white has lost (captured by black) = caps.b
            const lost = color === 'w' ? caps.b : caps.w; // pieces this color has lost
            const sorted = lost.sort((a,b) => PIECE_VALUES[b.type] - PIECE_VALUES[a.type]);
            let html = sorted.map(p => {
                const key = (p.color === 'w' ? 'w' : 'b') + p.type.toUpperCase();
                return `<span class="ca-cap-piece">${UNICODE_PIECES[key]}</span>`;
            }).join('');
            // Material advantage
            const myMat = caps[color === 'w' ? 'w' : 'b'].reduce((s,p) => s + PIECE_VALUES[p.type], 0);
            const theirMat = lost.reduce((s,p) => s + PIECE_VALUES[p.type], 0);
            const adv = myMat - theirMat;
            // Actually let's reverse. Near a player, show pieces they captured.
            // caps.w = pieces White captured. Show near White.
            const captured = caps[color]; // pieces this color captured
            const sortedC = captured.sort((a,b) => PIECE_VALUES[b.type] - PIECE_VALUES[a.type]);
            html = sortedC.map(p => {
                const key = (p.color === 'w' ? 'w' : 'b') + p.type.toUpperCase();
                return `<span class="ca-cap-piece">${UNICODE_PIECES[key]}</span>`;
            }).join('');
            const otherCaps = caps[color === 'w' ? 'b' : 'w'];
            const matAdv = captured.reduce((s,p) => s + PIECE_VALUES[p.type], 0) - otherCaps.reduce((s,p) => s + PIECE_VALUES[p.type], 0);
            if (matAdv > 0) html += `<span class="ca-cap-adv">+${matAdv}</span>`;
            el.innerHTML = html;
        }
    }

    // ============================
    // PUBLIC API
    // ============================
    newGame(fen) {
        this.engine = new ChessEngine(fen || this.opts.fen);
        this.selected = null;
        this.legalMoves = [];
        this.lastFrom = null;
        this.lastTo = null;
        this.isThinking = false;
        this.gameStarted = false;
        this.flipped = this.opts.playerColor === 'b';

        if (this.clock) this.clock.reset();
        if (this.stockfish) this.stockfish.newGame();

        // Reset eval display
        const bar = this.root.querySelector('#ca-eval-bar');
        const score = this.root.querySelector('#ca-eval-score');
        if (bar) bar.style.width = '50%';
        if (score) score.textContent = '0.0';

        this._renderBoard();
        this._updateAll();

        setTimeout(() => this._scheduleAI(), 300);
    }

    move(input) {
        const result = this.engine.move(input);
        if (result) {
            this.lastFrom = result.from;
            this.lastTo = result.to;
            this._renderBoard();
            this._updateAll();
            this._emit('move', result);
        }
        return result;
    }

    undo() {
        if (this.opts.mode === 'ai') {
            this.engine.undo();
            this.engine.undo();
        } else {
            this.engine.undo();
        }
        this.selected = null;
        this.legalMoves = [];
        this.isThinking = false;
        const h = this.engine.history({ verbose: true });
        if (h.length) { this.lastFrom = h[h.length-1].from; this.lastTo = h[h.length-1].to; }
        else { this.lastFrom = null; this.lastTo = null; }
        this._renderBoard();
        this._updateAll();
    }

    flip() {
        this.flipped = !this.flipped;
        this._renderBoard();
        if (this.clock) this._renderClocks();
    }

    setMode(mode) { this.opts.mode = mode; this.newGame(); }
    setPlayerColor(color) { this.opts.playerColor = color; this.newGame(); }
    setAIDepth(depth) { this.opts.ai.depth = depth; }

    getFEN() { return this.engine.fen(); }
    loadFEN(fen) { this.newGame(fen); }
    getPGN(headers) { return this.engine.toPGN(headers); }
    getHistory(verbose) { return this.engine.history(verbose ? { verbose: true } : undefined); }
    isGameOver() { return this.engine.isGameOver(); }
    getResult() { return this.engine.gameResult(); }

    // Online
    async createRoom() {
        if (!this.multiplayer) return null;
        return this.multiplayer.createRoom(this.engine.fen());
    }
    async joinRoom(id) {
        if (!this.multiplayer) return false;
        return this.multiplayer.joinRoom(id);
    }

    _copyPGN() {
        const pgn = this.engine.toPGN();
        if (navigator.clipboard) {
            navigator.clipboard.writeText(pgn).then(() => {
                const btn = this.root.querySelector('[data-action="pgn"]');
                if (btn) { const orig = btn.textContent; btn.textContent = '✓ Copied!'; setTimeout(() => btn.textContent = orig, 1500); }
            });
        }
    }

    // ============================
    // EVENTS
    // ============================
    on(event, fn) {
        if (!this._eventHandlers[event]) this._eventHandlers[event] = [];
        this._eventHandlers[event].push(fn);
    }
    off(event, fn) {
        if (this._eventHandlers[event]) {
            this._eventHandlers[event] = this._eventHandlers[event].filter(f => f !== fn);
        }
    }
    _emit(event, data) {
        // Instance event handlers
        if (this._eventHandlers[event]) this._eventHandlers[event].forEach(fn => fn(data));
        // Config callbacks
        const cbName = 'on' + event.charAt(0).toUpperCase() + event.slice(1);
        if (typeof this.opts[cbName] === 'function') this.opts[cbName](data);
    }

    // ============================
    // CLEANUP
    // ============================
    destroy() {
        if (this.stockfish) this.stockfish.destroy();
        if (this.clock) this.clock.destroy();
        if (this.multiplayer) this.multiplayer.destroy();
        if (this.root && this.root.parentNode) this.root.parentNode.removeChild(this.root);
    }
}


// =============================================================
// §11. STATIC METHODS & AUTO-INIT
// =============================================================

// Static create
ChessArena.create = function(target, opts) {
    return new ChessArena(target, opts);
};

// Auto-setup: finds [data-chess] elements or auto-creates on blank pages
ChessArena.auto = function(opts) {
    return new ChessArena(document.body, opts || {});
};

// Expose subsystems for advanced usage
ChessArena.Engine = ChessEngine;
ChessArena.Stockfish = StockfishManager;
ChessArena.Sound = SoundManager;
ChessArena.Clock = ChessClock;
ChessArena.Multiplayer = MultiplayerManager;
ChessArena.THEMES = THEMES;
ChessArena.VERSION = VERSION;

// Auto-init on DOMContentLoaded
function autoInit() {
    // Find elements with data-chess attribute
    const els = document.querySelectorAll('[data-chess]');
    if (els.length) {
        els.forEach(el => {
            const opts = {};
            if (el.dataset.mode) opts.mode = el.dataset.mode;
            if (el.dataset.theme) opts.theme = el.dataset.theme;
            if (el.dataset.color) opts.playerColor = el.dataset.color;
            if (el.dataset.depth) opts.ai = { depth: parseInt(el.dataset.depth) };
            if (el.dataset.fen) opts.fen = el.dataset.fen;
            if (el.dataset.pieces) opts.pieceSet = el.dataset.pieces;
            if (el.dataset.clock) {
                const parts = el.dataset.clock.split('+');
                opts.clock = { enabled: true, initial: parseInt(parts[0]) || 600, increment: parseInt(parts[1]) || 0 };
            }
            new ChessArena(el, opts);
        });
    }
    // If page is basically empty, auto-create
    else if (document.body.children.length <= 1 && document.body.textContent.trim().length < 50) {
        // Check if a script tag loaded us
        const scripts = document.querySelectorAll('script[src]');
        const isUs = Array.from(scripts).some(s => s.src.includes('chess-arena'));
        if (isUs || scripts.length <= 2) {
            document.body.style.cssText = 'margin:0;padding:20px;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(135deg,#1a1a2e,#16213e,#0f3460);';
            const title = document.createElement('h1');
            title.textContent = '♚ Chess Arena ♛';
            title.style.cssText = 'color:#e94560;font-family:system-ui;margin-bottom:15px;font-size:1.8rem;';
            document.body.prepend(title);
            new ChessArena(document.body, { theme: 'midnight' });
        }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
} else {
    setTimeout(autoInit, 0);
}

return ChessArena;
}));
