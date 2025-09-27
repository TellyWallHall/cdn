<!DOCTYPE html>
<!-- by ImPot8o https://github.com/ImPot8o -->
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>  The Alter  </title>
    <script src="https://cdn.jsdelivr.net/gh/TellyWallHall/cdn@main/scripts/AI_script-v1.js"></script>
<style>
    :root {
        --warrior-color: #c76c6c;
        --rogue-color: #6cc76c;
        --mage-color: #6c6cc7;
        --ice-color: #aaddff;
    }
    
    body {
        background: #2c2c2c;
        margin: 0;
        min-height: 100vh;
        font-family: 'Courier New', monospace;
        touch-action: none;
        padding: 10px 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
    }

    #gameBoy {
        background: #3a3a3a;
        border-radius: 15px;
        padding: 7px 15px 15px;
        width: 95%;
        max-width: 320px;
        margin: 2px auto;
    }

    footer {
        width: 100%;
        color: white;
        text-align: center;
        padding: 15px 0;
        margin-top: 5px;
        position: static;
    }

    #screen {
        background: #5b7c5b;
        border: 4px solid #2a2a2a;
        border-radius: 6px;
        padding: 4px;
        position: relative;
    }

    #stats {
        margin-bottom: 5px;
        font-size: 14px;
        display: flex;
        justify-content: space-between;
        flex-wrap: wrap;
    }

    .stat-item {
        margin-right: 10px;
    }

    .gameText {
        white-space: pre;
        font-size: 16px;
        line-height: 20px;
    }

    #game {
        min-height: 302px;
        min-width: 280px;
        line-height: 0px;
    }
    .cutscene {
        height: 642px;
        width: 305px;
        display: flex;
        top: 0;
        justify-content: center;
        align-items: center;
        text-align: center;
        line-height: 13px;
        background: #5b7c5b;
        border: 4px solid #2a2a2a;
        border-radius: 6px;
        padding: 4px;
        position: absolute;
        z-index: 75;
    } 

    #game span {
        display: inline-block;
        width: 14px;
        height: 24px;
        text-align: center;
        font-size: 16px;
    }

    .player { color: #0f0; text-shadow: 0 0 3px #00ff00; }
    .player-rage { color: #f00 !important; text-shadow: 0 0 3px #ff0000 !important; }
    .enemy { color: #f88; }
    .item { color: #ff0; }
    .wall { color: #3a3a3a; }
    .floor { color: #9fb982; }
    .stairs { 
        color: #00ff00 !important; 
        animation: blink 1s infinite; 
    }
    .boss { color: #f3f; }
    .dragon { color: #ffb; }
    .mimic { color: #ff0; }
    .trap { color: #ff5; }
    .hazard { color: #ff2; }
    .shop { color: #66f; } 
    .thief { color: #777; } 
    .berserker { color: #f00; }
    .summoner { color: #33e; }
    .unknown { color: #000; } 

    #combatLog {
        height: 35px;
        overflow-y: auto;
        font-size: 10px;
        margin: 0;
        background: rgba(0, 0, 0, 0.3);
        padding: 0px;
        border-radius: 3px;
        color: #9fb982;
    }

    /* Story strip styling */
    #story-strip {
        height: 18px;
        font-size: 12px;
        color: #ffa;
        text-align: center;
        padding: 2px 0;
        background: rgba(0, 0, 0, 0.3);
        margin: 2px 0;
        border-radius: 3px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    #dpad {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: -5px;
        width: 120px;
    }

    .dpad-btn {
        background: #6b6b6b;
        border: 3px solid #2a2a2a;
        border-radius: 5px;
        aspect-ratio: 1;
        position: relative;
        padding: 0;
        cursor: pointer;
    }

    .dpad-btn::after {
        content: "";
        position: absolute;
        width: 0;
        height: 0;
        border: 6px solid transparent;
    }

    [data-direction="up"]::after {
        border-bottom-color: #2a2a2a;
        top: 25%;
        left: 50%;
        transform: translateX(-50%);
    }

    [data-direction="down"]::after {
        border-top-color: #2a2a2a;
        bottom: 25%;
        left: 50%;
        transform: translateX(-50%);
    }

    [data-direction="left"]::after {
        border-right-color: #2a2a2a;
        left: 25%;
        top: 50%;
        transform: translateY(-50%);
    }

    [data-direction="right"]::after {
        border-left-color: #2a2a2a;
        right: 25%;
        top: 50%;
        transform: translateY(-50%);
    }

    .action-btn {
        background: #8b8b8b;
        border: 3px solid #2a2a2a;
        border-radius: 50%;
        width: 50px;
        height: 50px;
        font-weight: bold;
        color: white;
        cursor: pointer;
    }

    #btn-a { background: #ff4444; }
    #btn-b { background: #44ff44; }

    #system-btns {
        display: flex;
        justify-content: center;
        gap: 20px;
        margin-top: 15px;
    }

    .system-btn {
        background: #6b6b6b;
        border: 3px solid #2a2a2a;
        border-radius: 3px;
        padding: 6px 20px;
        font-size: 0.8em;
        color: white;
        cursor: pointer;
    }

    .damage {
        position: absolute;
        color: red;
        font-size: 12px;
        pointer-events: none;
        animation: pop 0.5s;
    }
    
    .damage-fire { color: #ff7700; }
    .damage-poison { color: #00ff00; }
    .damage-lightning { color: #ffff00; }
    .damage-ice { color: #aaddff; }

    #search-bar {
        position: absolute;
        top: 10px;
        right: 10px;
   } 

    @keyframes pop {
        0% { transform: translateY(0); opacity: 1; }
        100% { transform: translateY(-20px); opacity: 0; }
    }

    @keyframes blink {
        0% { opacity: 1; }
        50% { opacity: 0.3; }
        100% { opacity: 1; }
    }

    #confirm-end {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #2c2c2c;
        padding: 20px;
        border: 3px solid #4a766e;
        z-index: 1000;
        text-align: center;
        color: white;
        display: none;
        border-radius: 10px;
    }

    #confirm-end button {
        margin: 5px;
        padding: 8px 15px;
        background: #4a766e;
        border: none;
        color: white;
        border-radius: 5px;
        cursor: pointer;
    }

    #upgradeScreen {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #2c2c2c;
        padding: 20px;
        z-index: 50;
        border: 3px solid #4a766e;
        border-radius: 10px;
        color: white;
        display: none;
        min-width: 75%;
    }

    .upgrade {
        background: #4a766e;
        padding: 10px;
        margin: 10px 0;
        border-radius: 5px;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .upgrade button {
        padding: 5px 10px;
        background: #2c2c2c;
        border: 1px solid #9fb982;
        color: white;
        border-radius: 3px;
        cursor: pointer;
    }

    .upgrade button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
    
    /* New hotbar styles */
    #hotbar {
        display: flex;
        justify-content: center;
        gap: 5px;
        margin-top: 5px;
    }
    
    .hotbar-slot {
        width: 30px;
        height: 30px;
        border: 2px solid #555;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #333;
        color: white;
        position: relative;
        font-size: 20px;
        cursor: pointer;
    }
    
    .hotbar-slot.selected {
        border-color: yellow;
        box-shadow: 0 0 10px yellow;
    }
    
    .hotbar-slot.empty {
        border: 2px dashed #555;
    }
    
    .hotbar-icon {
        font-size: 18px;
    }
    
    .item-count {
        position: absolute;
        bottom: 2px;
        right: 2px;
        font-size: 8px;
        background: rgba(0,0,0,0.7);
        padding: 0 2px;
        border-radius: 2px;
    }
    
    .item-tooltip {
        position: absolute;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        background: #333;
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        white-space: nowrap;
        z-index: 100;
        display: none;
    }
    
    .hotbar-slot:hover .item-tooltip {
        display: block;
    }
    
    /* New item types */
    .inventory-health { color: #ff5555; }
    .inventory-fire { color: #ffaa44; }
    .inventory-teleport { color: #55aaff; }
    .inventory-poison { color: #aa55ff; }
    .inventory-shield { color: #55ff55; }
    .inventory-scroll { color: #ffff55; }
    .inventory-strength { color: #dd4444; }
    .inventory-freeze { color: #aaddff; }
    
    /* Status effect indicators */
    #status-effects {
        display: flex;
        gap: 3px;
        margin-top: 0px;
        justify-content: center;
        flex-wrap: nowrap;
    }
    
    .status-effect {
        background: #333;
        color: white;
        padding: 2px 4px;
        border-radius: 3px;
        font-size: 11px;
        flex-shrink: 1;
    }
    
    .status-shield { background: #226622; }
    .status-rage { background: #662222; }
    .status-strength { background: #dd4444; } 
    .status-burning { background: #ff6600; }
    .status-poisoned { background: #00aa00; }
    .status-frozen { background: #226688; }
    
    /* Floor info display */
    #floor-info {
        position: absolute;
        top: 5px;
        left: 5px;
        background: rgba(0, 0, 0, 0.5);
        color: white;
        padding: 2px 5px;
        border-radius: 3px;
        font-size: 12px;
    }

    /* Dark floor modifier */
    .dark-floor {
        filter: brightness(0.6) contrast(.5);
    }

    /* Tutorial screen */
    #tutorial {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #2c2c2c;
        padding: 20px;
        border: 3px solid #4a766e;
        z-index: 50;
        color: white;
        border-radius: 10px;
        max-width: 300px;
        display: none;
        min-width: 70%;
    }

    #tutorial button {
        margin-top: 15px;
        padding: 8px 15px;
        background: #4a766e;
        border: none;
        color: white;
        border-radius: 5px;
        cursor: pointer;
    }

    /* Mimic animation */
    @keyframes mimicPulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); }
    }
    
    .mimic-item {
        animation: mimicPulse 2s infinite;
        color: #ffaa00 !important;
    }
    
    /* Trap animation */
    @keyframes trapPulse {
        0% { opacity: 0.5; }
        50% { opacity: 1; }
        100% { opacity: 0.5; }
    }
    
    .trap {
        animation: trapPulse 1.5s infinite;
    }
    
/* Achievement popup */
    .achievement-popup {
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(0, 0, 0, 0.8);
        color: gold;
        padding: 10px;
        border-radius: 5px;
        z-index: 1000;
        animation: slideIn 0.5s forwards, fadeOut 0.5s forwards 2.5s;
        display: none;
        max-width: 250px;
        min-width: 75%;
    }
    
    @keyframes slideIn {
        from { transform: translateX(100px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
    
    /* Character selection screen */
    #character-select {
        position: fixed;
        top: 350px;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #2c2c2c;
        padding: 20px;
        border: 3px solid #4a766e;
        z-index: 1000;
        color: white;
        border-radius: 10px;
        display: none;
        text-align: center;
        min-width: 70%;
        max-height: 605px !important;
        z-index: 70;
    }
    
    .character-option {
        margin: 10px;
        padding: 10px;
        border: 2px solid #555;
        border-radius: 5px;
        cursor: pointer;
        transition: all 0.2s;
    }
    
    .character-option:hover {
        transform: scale(1.05);
    }
    
    .warrior { border-color: var(--warrior-color); }
    .rogue { border-color: var(--rogue-color); }
    .mage { border-color: var(--mage-color); }
    
    /* Touch controls optimization */
    .touch-controls {
        display: flex;
        justify-content: space-between;
        margin-top: 15px;
        display: none;
    }
    
    .touch-dpad {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
        width: 140px;
    }
    
    .touch-btn {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        font-weight: bold;
        background: rgba(139, 139, 139, 0.7);
        border: 2px solid #2a2a2a;
        color: white;
    }
    
    /* Visual effects for new enemies */
    .ghost {
        color: #aaddff !important;
        animation: ghostFloat 2s infinite;
    }
    
    @keyframes ghostFloat {
        0% { transform: translateY(0); }
        50% { transform: translateY(-2px); }
        100% { transform: translateY(0); }
    }
    
    .golem {
        color: #888888 !important;
        animation: golemPulse 3s infinite;
    }
    
    @keyframes golemPulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
    }
    
    /* Frozen enemy effect */
    .frozen {
        color: #aaddff !important;
        animation: frozenPulse 1.5s infinite;
    }
    
    @keyframes frozenPulse {
        0% { opacity: 0.7; }
        50% { opacity: 1; }
        100% { opacity: 0.7; }
    }
    
    /* Shop styles */
    #shop-screen {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #2c2c2c;
        padding: 20px;
        border: 3px solid #4a766e;
        z-index: 1000;
        color: white;
        border-radius: 10px;
        display: none;
        text-align: center;
        min-width: 75%;
    }
    
    .shop-item {
        background: #4a766e;
        padding: 10px;
        margin: 10px 0;
        border-radius: 5px;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    /* Health Potion - Gentle healing wave from center */
    @keyframes health {
        0% { 
            opacity: 1; 
            filter: brightness(1) drop-shadow(0 0 0px #ff6b6b);
            background: radial-gradient(circle at center, rgba(255,107,107,0) 0%, rgba(255,107,107,0) 100%);
        }
        40% { 
            opacity: 0.8; 
            filter: brightness(1.8) drop-shadow(0 0 40px #ff6b6b);
            background: radial-gradient(circle at center, rgba(255,107,107,0.3) 20%, rgba(255,107,107,0.1) 60%, rgba(255,107,107,0) 100%);
        }
        80% { 
            opacity: 0.9; 
            filter: brightness(1.4) drop-shadow(0 0 20px #ff6b6b);
            background: radial-gradient(circle at center, rgba(255,107,107,0.1) 40%, rgba(255,107,107,0.05) 80%, rgba(255,107,107,0) 100%);
        }
        100% { 
            opacity: 1; 
            filter: brightness(1) drop-shadow(0 0 0px #ff6b6b);
            background: radial-gradient(circle at center, rgba(255,107,107,0) 0%, rgba(255,107,107,0) 100%);
        }
    }

    /* Fireball - Explosive burst with screen shake */
    @keyframes fire {
        0% { 
            opacity: 1; 
            filter: brightness(1) drop-shadow(0 0 0px #ff4500) hue-rotate(0deg);
            transform: translate(0, 0) rotate(0deg);
        }
        15% { 
            opacity: 0.4; 
            filter: brightness(4) drop-shadow(0 0 100px #ff4500) hue-rotate(30deg);
            transform: translate(-3px, 2px) rotate(1deg);
        }
        30% { 
            opacity: 0.7; 
            filter: brightness(3) drop-shadow(0 0 80px #ff6500) hue-rotate(20deg);
            transform: translate(2px, -1px) rotate(-0.5deg);
        }
        45% { 
            opacity: 0.5; 
            filter: brightness(3.5) drop-shadow(0 0 90px #ff8500) hue-rotate(25deg);
            transform: translate(-1px, 3px) rotate(0.5deg);
        }
        100% { 
            opacity: 1; 
            filter: brightness(1) drop-shadow(0 0 0px #ff4500) hue-rotate(0deg);
            transform: translate(0, 0) rotate(0deg);
        }
    }

    /* Teleport Scroll - Dimensional fold with distortion */
    @keyframes teleport {
        0% { 
            opacity: 1; 
            filter: blur(0px) brightness(1) drop-shadow(0 0 0px #9370db);
            transform: scale(1) perspective(1000px);
        }
        25% { 
            opacity: 0.5; 
            filter: blur(8px) brightness(0.2) drop-shadow(0 0 120px #9370db);
            transform: scale(0.8) perspective(1000px);
        }
        50% { 
            opacity: 0.2; 
            filter: blur(12px) brightness(0.1) drop-shadow(0 0 150px #9370db);
            transform: scale(0.6) perspective(1000px);
        }
        75% { 
            opacity: 0.4; 
            filter: blur(4px) brightness(1.8) drop-shadow(0 0 80px #9370db);
            transform: scale(0.9) perspective(1000px);
        }
        100% { 
            opacity: 1; 
            filter: blur(0px) brightness(1) drop-shadow(0 0 0px #9370db);
            transform: scale(1) perspective(1000px);
        }
    }

    /* Poison Bomb - Spreading toxic cloud */
    @keyframes poison {
        0% { 
            opacity: 1; 
            filter: brightness(1) drop-shadow(0 0 0px #32cd32) hue-rotate(0deg);
            background: radial-gradient(circle at 30% 70%, rgba(50,205,50,0) 0%, rgba(50,205,50,0) 100%);
            transform: rotate(0deg);
        }
        20% { 
            opacity: 0.6; 
            filter: brightness(2.5) drop-shadow(0 0 60px #32cd32) hue-rotate(60deg);
            background: radial-gradient(circle at 30% 70%, rgba(50,205,50,0.4) 10%, rgba(50,205,50,0.2) 30%, rgba(50,205,50,0) 60%);
            transform: rotate(2deg);
        }
        50% { 
            opacity: 0.4; 
            filter: brightness(3) drop-shadow(0 0 100px #32cd32) hue-rotate(120deg);
            background: radial-gradient(circle at 30% 70%, rgba(50,205,50,0.6) 20%, rgba(50,205,50,0.3) 50%, rgba(50,205,50,0.1) 80%, rgba(50,205,50,0) 100%);
            transform: rotate(-1deg);
        }
        80% { 
            opacity: 0.7; 
            filter: brightness(1.8) drop-shadow(0 0 40px #32cd32) hue-rotate(80deg);
            background: radial-gradient(circle at 30% 70%, rgba(50,205,50,0.3) 30%, rgba(50,205,50,0.1) 70%, rgba(50,205,50,0) 100%);
            transform: rotate(0deg);
        }
        100% { 
            opacity: 1; 
            filter: brightness(1) drop-shadow(0 0 0px #32cd32) hue-rotate(0deg);
            background: radial-gradient(circle at 30% 70%, rgba(50,205,50,0) 0%, rgba(50,205,50,0) 100%);
        }
    }

    /* Shield Scroll - Expanding protective dome */
    @keyframes shield {
        0% { 
            opacity: 1; 
            filter: brightness(1) drop-shadow(0 0 0px #4169e1);
            background: radial-gradient(circle at center, rgba(65,105,225,0) 0%, rgba(65,105,225,0) 100%);
            border: 0px solid rgba(65,105,225,0);
        }
        30% { 
            opacity: 0.8; 
            filter: brightness(2.2) drop-shadow(0 0 80px #4169e1);
            background: radial-gradient(circle at center, rgba(65,105,225,0.2) 0%, rgba(65,105,225,0.4) 40%, rgba(65,105,225,0.1) 70%, rgba(65,105,225,0) 100%);
            border: 3px solid rgba(65,105,225,0.6);
        }
        60% { 
            opacity: 0.9; 
            filter: brightness(1.8) drop-shadow(0 0 60px #4169e1);
            background: radial-gradient(circle at center, rgba(65,105,225,0.1) 0%, rgba(65,105,225,0.3) 50%, rgba(65,105,225,0.05) 80%, rgba(65,105,225,0) 100%);
            border: 2px solid rgba(65,105,225,0.4);
        }
        100% { 
            opacity: 1; 
            filter: brightness(1) drop-shadow(0 0 0px #4169e1);
            background: radial-gradient(circle at center, rgba(65,105,225,0) 0%, rgba(65,105,225,0) 100%);
            border: 0px solid rgba(65,105,225,0);
        }
    }

    /* Lightning Scroll - Chaotic electric storm */
    @keyframes lightning {
        0% { 
            opacity: 1; 
            filter: brightness(1) drop-shadow(0 0 0px #ffff00) contrast(1) invert(0);
            transform: translate(0, 0) skew(0deg) rotate(0deg);
        }
        8% { 
            opacity: 0.2; 
            filter: brightness(5) drop-shadow(0 0 200px #ffff00) contrast(3) invert(0.3);
            transform: translate(-5px, 3px) skew(3deg) rotate(1deg);
        }
        16% { 
            opacity: 0.9; 
            filter: brightness(1.2) drop-shadow(0 0 20px #ffff00) contrast(1.1) invert(0);
            transform: translate(2px, -2px) skew(-1deg) rotate(-0.5deg);
        }
        24% { 
            opacity: 0.1; 
            filter: brightness(6) drop-shadow(0 0 250px #ffff00) contrast(4) invert(0.5);
            transform: translate(4px, 4px) skew(-2deg) rotate(1.5deg);
        }
        32% { 
            opacity: 0.8; 
            filter: brightness(1.5) drop-shadow(0 0 30px #ffff00) contrast(1.2) invert(0);
            transform: translate(-3px, -1px) skew(1deg) rotate(-1deg);
        }
        100% { 
            opacity: 1; 
            filter: brightness(1) drop-shadow(0 0 0px #ffff00) contrast(1) invert(0);
            transform: translate(0, 0) skew(0deg) rotate(0deg);
        }
    }

    /* Strength Potion - Muscle-building power surge */
    @keyframes strength {
        0% { 
            opacity: 1; 
            filter: brightness(1) drop-shadow(0 0 0px #8b4513) saturate(1) contrast(1);
            transform: scale(1);
        }
        25% { 
            opacity: 0.6; 
            filter: brightness(1.5) drop-shadow(0 0 40px #8b4513) saturate(1.8) contrast(1.3);
            transform: scale(1.03);
        }
        50% { 
            opacity: 0.8; 
            filter: brightness(2.5) drop-shadow(0 0 120px #8b4513) saturate(2.5) contrast(1.8);
            transform: scale(1.08);
        }
        75% { 
            opacity: 0.6; 
            filter: brightness(2) drop-shadow(0 0 80px #8b4513) saturate(2) contrast(1.5);
            transform: scale(1.05);
        }
        90% { 
            opacity: 0.8; 
            filter: brightness(1.3) drop-shadow(0 0 30px #8b4513) saturate(1.5) contrast(1.2);
            transform: scale(1.02);
        }
        100% { 
            opacity: 1; 
            filter: brightness(1) drop-shadow(0 0 0px #8b4513) saturate(1) contrast(1);
            transform: scale(1);
        }
    }
/* Freeze Scroll */
    @keyframes health {
        0% { 
            opacity: 1; 
            filter: brightness(1) drop-shadow(0 0 0px #6b6bff);
            background: radial-gradient(circle at center, rgba(107,107,255,0) 0%, rgba(107,107,255,0) 100%);
        }
        40% { 
            opacity: 0.8; 
            filter: brightness(1.8) drop-shadow(0 0 40px #6b6bff);
            background: radial-gradient(circle at center, rgba(107,107,255,0.3) 20%, rgba(107,107,255,0.1) 60%, rgba(107,107,255,0) 100%);
        }
        80% { 
            opacity: 0.9; 
            filter: brightness(1.4) drop-shadow(0 0 20px #6b6bff);
            background: radial-gradient(circle at center, rgba(107,107,255,0.1) 40%, rgba(107,107,255,0.05) 80%, rgba(107,107,255,0) 100%);
        }
        100% { 
            opacity: 1; 
            filter: brightness(1) drop-shadow(0 0 0px #6b6bff);
            background: radial-gradient(circle at center, rgba(107,107,255,0) 0%, rgba(107,107,255,0) 100%);
        }
    }
    #joystick-container {
        display: none;
        position: relative;
        width: 80px;
        height: 80px;
        margin: 0 auto;
        cursor: pointer;
        user-select: none;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
    }

    #joystick-base {
        width: 80px;
        height: 80px;
        background: rgba(139, 139, 139, 0.5);
        border-radius: 50%;
        border: 2px solid #2a2a2a;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
    }

    #joystick-handle {
        position: absolute;
        top: 25px;
        left: 25px;
        width: 30px;
        height: 30px;
        background: rgba(255, 255, 255, 0.8);
        border-radius: 50%;
        transition: transform 0.1s;
        box-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
    }

    .joystick-active {
        background: rgba(255, 255, 255, 0.9) !important;
        box-shadow: 0 0 8px rgba(255, 255, 255, 0.8) !important;
    }

    /* Toggle button for joystick */
    #toggle-joystick {
        position: absolute;
        bottom: 50%;
        right: 10px;
        background: rgba(139, 139, 139, 0.7);
        border: 2px solid #2a2a2a;
        color: white;
        padding: 5px;
        border-radius: 5px;
        font-size: 12px;
        z-index: 10;
        cursor: pointer;
    }

    #toggle-joystick:hover {
        background: rgba(139, 139, 139, 0.9);
    }
</style>
</head>
<body>
<div id="console" style="position:fixed;bottom:0;left:0;width:100%;height:200px;background:#000;color:#0f0;font-family:monospace;font-size:12px;overflow-y:scroll;z-index:9999;padding:10px;border-top:2px solid #333;"><div style="position:absolute;top:5px;right:10px;"><button onclick="document.getElementById('console').style.display='none';if(!document.getElementById('showConsole')){let btn=document.createElement('button');btn.id='showConsole';btn.innerHTML='CONSOLE';btn.onclick=function(){document.getElementById('console').style.display='block';this.remove();};btn.style.cssText='position:fixed;bottom:10px;right:10px;background:#333;color:#0f0;border:1px solid #0f0;padding:5px 10px;font-size:10px;cursor:pointer;z-index:10000;border-radius:3px;';document.body.appendChild(btn);}" style="background:#333;color:#0f0;border:1px solid #0f0;padding:2px 8px;font-size:10px;cursor:pointer;">HIDE</button> <button onclick="document.getElementById('consoleOutput').innerHTML='';window.consoleHistory=[];window.historyIndex=-1;" style="background:#333;color:#0f0;border:1px solid #0f0;padding:2px 8px;font-size:10px;cursor:pointer;">CLEAR</button></div><div id="consoleOutput" style="margin-top:25px;height:120px;overflow-y:scroll;"></div><div style="position:absolute;bottom:5px;left:10px;right:10px;display:flex;gap:2px;"><button onclick="let h=window.consoleHistory||[];let i=window.historyIndex||0;if(i<h.length-1){window.historyIndex=++i;document.getElementById('jsInput').value=h[h.length-1-i]||'';}" style="background:#333;color:#0f0;border:1px solid #0f0;padding:5px;font-size:10px;width:25px;">↑</button><input id="jsInput" placeholder="Enter JavaScript..." style="flex:1;background:#111;color:#0f0;border:1px solid #333;padding:5px;font-family:monospace;font-size:12px;" onkeypress="if(event.key==='Enter'){let cmd=this.value;if(cmd.trim()){window.consoleHistory=window.consoleHistory||[];window.consoleHistory.push(cmd);window.historyIndex=-1;}try{console.log('> '+cmd);let result=eval(cmd);if(result!==undefined){if(typeof result==='object'){console.log(JSON.stringify(result,null,2));}else{console.log(result);}}this.value='';}catch(e){console.log('ERROR: '+e.message);this.value='';}}"><button onclick="let h=window.consoleHistory||[];let i=window.historyIndex||0;if(i>-1){window.historyIndex=--i;document.getElementById('jsInput').value=h[h.length-1-i]||'';}" style="background:#333;color:#0f0;border:1px solid #333;padding:5px;font-size:10px;width:25px;">↓</button><button onclick="let input=document.getElementById('jsInput');let cmd=input.value;if(cmd.trim()){window.consoleHistory=window.consoleHistory||[];window.consoleHistory.push(cmd);window.historyIndex=-1;}try{console.log('> '+cmd);let result=eval(cmd);if(result!==undefined){if(typeof result==='object'){console.log(JSON.stringify(result,null,2));}else{console.log(result);}}input.value='';}catch(e){console.log('ERROR: '+e.message);input.value='';}" style="background:#333;color:#0f0;border:1px solid #0f0;padding:5px;font-size:10px;width:30px;">RUN</button></div></div><script>window.onerror=function(msg,url,line,col,error){document.getElementById('consoleOutput').innerHTML+='<span style="color:#f44">ERROR: '+msg+' (Line '+line+')</span><br>';document.getElementById('consoleOutput').scrollTop=document.getElementById('consoleOutput').scrollHeight;};console.log=function(msg){let timestamp=new Date().toLocaleTimeString();document.getElementById('consoleOutput').innerHTML+='<span style="color:#666">['+timestamp+']</span> '+msg+'<br>';document.getElementById('consoleOutput').scrollTop=document.getElementById('consoleOutput').scrollHeight;};window.consoleHistory=[];window.historyIndex=-1;</script>
    <button class='system-btn' id='search-bar' onclick="document.documentElement.requestFullscreen();">Fullscreen</button>
    <div id="floor-info">Floor: 0</div>    
    <div id="gameBoy">
        <div id="screen">
            <div id="stats">
                <span class="stat-item">HP:20/20</span>
                <span class="stat-item">F:0</span>
                <span class="stat-item">COINS:0</span>
                <span class="stat-item">ATK:2</span>
                <span class="stat-item">ARMOR:0</span>
                <span class="stat-item">RAGE:0%</span>
            </div>
            <pre id="game" class="gameText"></pre>
            <!-- Story strip for minor narrative elements -->
            <div id="story-strip"></div>
            <div id="combatLog"></div>
            <div id="status-effects"></div>
            <div id="hotbar"></div>
        </div>
        
        <div id="controls">
            <div style="display: flex; justify-content: space-between; align-items: center">
                <div id="dpad">
                    <div></div>
                    <button class="dpad-btn" data-direction="up"></button>
                    <div></div>
                    <button class="dpad-btn" data-direction="left"></button>
                    <div></div>
                    <button class="dpad-btn" data-direction="right"></button>
                    <div></div>
                    <button class="dpad-btn" data-direction="down"></button>
                    <div></div>
                </div>
                <div id="joystick-container" style="display: none; position: relative; width: 80px; height: 80px; margin: 0 auto;">
                    <div id="joystick-base" style="width: 80px; height: 80px; background: rgba(139, 139, 139, 0.5); border-radius: 50%; border: 2px solid #2a2a2a;"></div>
                    <div id="joystick-handle" style="position: absolute; top: 50%; left: 50%; width: 3px; height: 3px; background: rgba(255, 255, 255, 0.8); border-radius: 50%;"></div>
                </div>

                <div style="display: flex; gap: 15px">
                    <button class="action-btn" id="btn-b">B</button>
                    <button class="action-btn" id="btn-a">A</button>
                </div>
            </div>

            <div id="system-btns">
                <button class="system-btn" id="btn-select">SELECT</button>
                <button class="system-btn" id="btn-start">START</button>
            </div>
        </div>
        
        <!-- Touch controls for mobile -->
        <div class="touch-controls" id="touch-controls">
            <div class="touch-dpad">
                <div></div>
                <button class="dpad-btn" data-direction="up"></button>
                <div></div>
                <button class="dpad-btn" data-direction="left"></button>
                <div></div>
                <button class="dpad-btn" data-direction="right"></button>
                <div></div>
                <button class="dpad-btn" data-direction="down"></button>
                <div></div>
            </div>
            
            <div style="display: flex; gap: 15px; align-items: center;">
                <button class="touch-btn" id="touch-b">B</button>
                <button class="touch-btn" id="touch-a">A</button>
            </div>
        </div>
    </div>

    <div id="god-room-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.85); z-index: 1000; justify-content: center; align-items: center;">
        <div style="background: #3a3a3a; width: 90%; max-width: 320px; border: 3px solid #4a766e; border-radius: 10px; padding: 15px; text-align: center;">
            <div style="color: #ffcc00; font-size: 18px; margin-bottom: 15px; border-bottom: 1px solid #4a766e; padding-bottom: 8px;">unknown</div>
            <div id="god-question" style="color: #9fb982; font-size: 14px; line-height: 1.4; margin-bottom: 20px;"></div>
            
            <div id="god-options" style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 15px;">
                <!-- Options will be added here dynamically -->
            </div>
            
            <div style="color: #9fb982; font-size: 12px; margin-top: 10px;">---</div>
        </div>
    </div>

<button class="system-btn" id="btn-achievements">ACHIEVEMENTS</button>

    <div id="confirm-end">
        <p>End current run?</p>
        <button onclick="Game.confirmEndRun(true)">Yes</button>
        <button onclick="Game.confirmEndRun(false)">No</button>
    </div>

    <div id="upgradeScreen">
        <h3>Upgrades</h3>
        <div class="upgrade">
            +5 Max HP
            <button onclick="Game.buyUpgrade(10, 'maxHp', 5)">10 coins</button>
        </div>
        <div class="upgrade">
            +1 Attack
            <button onclick="Game.buyUpgrade(15, 'attack', 1)">15 coins</button>
        </div>
        <div class="upgrade">
            +1 Defense
            <button onclick="Game.buyUpgrade(20, 'defense', 1)">20 coins</button>
        </div>
        <div class="upgrade">
            +5% Critical Chance
            <button onclick="Game.buyUpgrade(25, 'critical', 5)">25 coins</button>
        </div>
        <button onclick="Game.startNewRun()" style="margin-top:10px">Continue</button>
    </div>

    <div id="tutorial">
        <h3>How to Play</h3>
        <p>Move with D-Pad or Arrow Keys</p>
        <p>Or Swipe on the Screen</p>
        <p>Press A to use selected item</p>
        <p>Or Double Tap the Screen</p>
        <p>Press B to cycle items</p>
        <p>Or Tap Them in the Hotbar</p>
        <p>Numbers 1-5 to select items</p>
        <p>Find the stairs > to advance</p>
        <p>Defeat enemies for coins</p>
        <button onclick="Game.hideTutorial()">Got it!</button>
    </div>

    <!-- New UI elements -->
    <div id="achievement-popup" class="achievement-popup">
        <h4>Achievement Unlocked!</h4>
        <p id="achievement-desc"></p>
    </div>
    
    <div id="character-select">
        <h3>Choose Your Class</h3>
        <div class="character-option warrior" onclick="Game.selectClass('warrior')">
            <h4>Warrior</h4>
            <p>High HP and defense</p>
            <p>Special: Rage builds faster</p>
        </div>
        <div class="character-option rogue" onclick="Game.selectClass('rogue')">
            <h4>Rogue</h4>
            <p>Higher attack, finds more items</p>
            <p>Special: Chance to avoid traps</p>
        </div>
        <div class="character-option mage" onclick="Game.selectClass('mage')">
            <h4>Mage</h4>
            <p>Item effects are stronger</p>
            <p>Special: Regenerates HP slowly</p>
        </div>
    </div>

    <!-- Shop screen -->
    <div id="shop-screen">
        <h3>Shop</h3>
        <p>Coins: <span id="shop-coins">0</span></p>
        <div class="shop-item">
            Health Potion (Restore 10 HP)
            <button onclick="Game.buyItem('health', 10, 10)">10 coins</button>
        </div>
        <div class="shop-item">
            Freeze Scroll (Freeze enemies)
            <button onclick="Game.buyItem('freeze', 15, 1)">15 coins</button>
        </div>
        <div class="shop-item">
            Strength Potion (+2 ATK for 5 turns)
            <button onclick="Game.buyItem('strength', 20, 2)">20 coins</button>
        </div>
        <button onclick="Game.closeShop()" style="margin-top:10px">Leave Shop</button>
    </div>

<script>
const Game = (() => {
    const WIDTH = 21, HEIGHT = 20;
    const ENEMY_TYPES = ['melee', 'ranged', 'healer', 'berserker', 'summoner', 'ghost', 'golem', 'thief'];
    
    // Expanded item types
    const ITEM_TYPES = [
        'health', 'fireball', 'teleport', 'poison', 
        'shield', 'scroll', 'strength', 'freeze'
    ];

    // Achievement definitions
    const ACHIEVEMENTS = {
        first_kill: { name: "First Blood", desc: "Defeat your first enemy", earned: false },
        floor_10: { name: "Deep Diver", desc: "Reach floor 10", earned: false },
        floor_20: { name: "Dungeon Master", desc: "Reach floor 20", earned: false },
        boss_slayer: { name: "Boss Slayer", desc: "Defeat a boss", earned: false },
        dragon_slayer: { name: "Dragon Slayer", desc: "Defeat a dragon", earned: false },
        item_hoarder: { name: "Item Hoarder", desc: "Collect 20 items in one run", earned: false },
        rage_master: { name: "Rage Master", desc: "Activate rage mode 5 times", earned: false },
        no_hit: { name: "Untouchable", desc: "Complete a floor without taking damage", earned: false },
        mimic_hunter: { name: "Mimic Hunter", desc: "Defeat 5 mimics", earned: false },
        combo_master: { name: "Combo Master", desc: "Execute 3 different item combos", earned: false },
        shopaholic: { name: "Shopaholic", desc: "Spend 100 coins in the shop", earned: false },
        frozen_foe: { name: "Frozen Foe", desc: "Freeze 10 enemies", earned: false }
    };

    // Floor type system
    const FLOOR_TYPES = {
        basic: {
            weight: 0.43,
            name: "Basic Dungeon",
            description: "Standard dungeon layout with mixed enemies",
            color: "#9fb982"
        },
        dark: {
            weight: 0.03,
            name: "Dark Cavern",
            description: "Reduced visibility, more enemies",
            color: "#5b5b7c",
            mods: { visibility: "dark" }
        },
        treasure: {
            weight: 0.05,
            name: "Treasure Room",
            description: "More items, but watch for mimics!",
            color: "#ffff00"
        },
        ambush: {
            weight: 0.15,
            name: "Ambush Floor",
            description: "No items, more enemies",
            color: "#ff4444",
            mods: { ambush: true }
        },
        trap: {
            weight: 0.15,
            name: "Trap Room",
            description: "Environmental hazards everywhere",
            color: "#ff5555",
            mods: { traps: true }
        },
        boss: {
            weight: 0,
            name: "Boss Arena",
            description: "Face a powerful boss",
            color: "#ff00ff",
            mods: { boss: true }
        },
        hard: {
            weight: 0.01,
            name: "Boss Rush",
            description: "Only bosses!",
            color: "#cc0000",
            mods: { bossOnly: true }
        },
        range: {
            weight: 0.03,
            name: "Archery Range",
            description: "Only ranged enemies",
            color: "#55aaff",
            mods: { enemyPool: "ranged" }
        },
        dojo: {
            weight: 0.03,
            name: "Fighting Dojo",
            description: "Only melee enemies",
            color: "#ffaa44",
            mods: { enemyPool: "melee" }
        },
        academy: {
            weight: 0.03,
            name: "Magic Academy",
            description: "Only magic enemies",
            color: "#aa55ff",
            mods: { enemyPool: "healer" }
        },
        den: {
            weight: 0.01,
            name: "Dragon's Den",
            description: "Powerful dragon enemies",
            color: "#ff7777",
            mods: { dragons: true }
        },
        speed: {
            weight: 0.03,
            name: "Speed Floor",
            description: "Everything moves faster",
            color: "#aa00ff",
            mods: { speed: true }
        },
        shop: {
            weight: 0.05,
            name: "Merchant's Guild",
            description: "Buy items with your coins",
            color: "#ffcc00",
            mods: { shop: true }
        },
        unknown: {
            weight: 0,
            name: "error",
            description: "error",
            color: "#666",
            mods: { god: true}
        }
    };

    const GOD_ROOM_CHOICES = {
        1011: { question: "[A] or [B]", options: [
                {
                    text: "[A] Reset: “Return to the bottom. Begin again. Lose everything… but feel alive once more.”",
                    effect: () => {
                       storyHelper('god_room', 3);
                    }},
                {
                    text: "[B] Continue: “Keep your perfection. Begin again here, passed one hundred. Unstoppable. Empty.”",
                    effect: () => {
                        storyHelper('god_room', 2);
                    }}]}
    };

    // Story events tracking
    const storyEvents = {
        firstMimic: false,
        firstDeath: false,
        firstShop: false,
        firstBoss: false,
        firstDragon: false,
        firstTrap: false,
        floorMilestones: {}
    };

    let player = {
        x: 10, y: 10,
        start: 0,
        joystick: false,
        hp: 20,
        maxHp: 20,
        attack: 2,
        defense: 0,
        coins: 0,
        rage: 0,
        belt: [],
        inventory: [],
        hotbarIndex: 0,
        tempDefense: 0,
        tempDefenseTurns: 0,
        tempStrength: 0,
        tempStrengthTurns: 0,
        statusEffects: {},
        upgrades: JSON.parse(localStorage.getItem('playerUpgrades') || '{}'),
        combos: {
            poisonFire: false,
            shieldStrength: false,
            teleportChain: 0,
            freezeFire: false
        },
        // New properties for achievements and classes
        achievements: JSON.parse(localStorage.getItem('playerAchievements') || '{}'),
        class: localStorage.getItem('playerClass') || 'warrior',
        stats: {
            enemiesDefeated: 0,
            bossesDefeated: 0,
            dragonsDefeated: 0,
            mimicsDefeated: 0,
            itemsCollected: 0,
            rageActivations: 0,
            damageTaken: 0,
            combosPerformed: [],
            coinsSpent: 0,
            enemiesFrozen: 0
        },
        // For no-hit achievement tracking
        damageThisFloor: 0,
        // Critical hit chance
        criticalChance: 0, 
        // enemies frozen currently
        frozenCount: 0, 
        upgradePrices: {
            'maxHp': 10,
            'attack': 15,
            'defense': 20,
            'critical': 25
        },
        priceMultiplier: parseFloat(localStorage.getItem('priceMultiplier') || '1.01') 
    };
    
    let currentFloor = 0;
    let currentFloorType = FLOOR_TYPES.basic;
    let dungeon = [];
    let enemies = [];
    let items = [];
    let traps = [];
    let stairsPos = {};
    let coins = parseInt(localStorage.getItem('dungeonCoins') || '0');
    let poisonClouds = [];
    let fireTiles = [];
    let isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    const tiles = {
        wall: '■',
        floor: '.',
        player: '@',
        enemy: 'e',
        item: '?',
        stairs: '>',
        boss: 'B',
        dragon: 'D',
        mimic: '?',
        trap: '.',
        hazard: 'x',
        ghost: 'G',
        golem: 'M',
        shop: '$',
        thief: 'T', 
        berserker: 'E',
        summoner: 'S', 
        unknown: '#'
    };

    // Item icons for hotbar
    const ITEM_ICONS = {
        health: "HP",
        fireball: "FB",
        teleport: "TP",
        poison: "P",
        shield: "SH",
        scroll: "LS",
        strength: "ST",
        freeze: "FR"
    };
    
    // Item descriptions
    const ITEM_DESCRIPTIONS = {
        health: "Heal Potion: Restores health",
        fireball: "Fireball: Damage all enemies in area",
        teleport: "Teleport: Escape to random location",
        poison: "Poison Bomb: Damage adjacent enemies",
        shield: "Shield Scroll: Temporary defense boost",
        scroll: "Lightning Scroll: Single target damage",
        strength: "Strength Potion: Temporary attack boost",
        freeze: "Freeze Scroll: Freeze enemies for 3 turns"
    };
    function parseBool(value) {
        return value.toLowerCase() === 'true';
    }
    function showGodRoomChoices(index) {
        const choices = GOD_ROOM_CHOICES[index];
        if (!choices) return;
        
        // Pause the game
        window.isGamePaused = true;
        
        // Display the UI
        const godRoomUI = document.getElementById('god-room-modal');
        const questionElement = document.getElementById('god-question');
        const optionsContainer = document.getElementById('god-options');
        
        questionElement.textContent = choices.question;
        optionsContainer.innerHTML = '';
        
        // Create option buttons
        choices.options.forEach((option, index) => {
            const button = document.createElement('div');
            button.textContent = option.text;
            button.style.background = '#4a766e';
            button.style.border = '2px solid #2a2a2a';
            button.style.borderRadius = '5px';
            button.style.padding = '10px';
            button.style.color = 'white';
            button.style.fontSize = '14px';
            button.style.cursor = 'pointer';
            button.style.transition = 'background 0.2s';
            
            button.addEventListener('mouseenter', () => {
                button.style.background = '#5a968e';
            });
            
            button.addEventListener('mouseleave', () => {
                button.style.background = '#4a766e';
            });
            
            button.addEventListener('click', () => {
                // Apply the effect
                option.effect();
                
                // Hide the UI
                godRoomUI.style.display = 'none';
                
                // Resume the game
                window.isGamePaused = false;
                
                // Save the upgrade
                localStorage.setItem('playerUpgrades', JSON.stringify(player.upgrades));
                
                addCombatLog(`You chose: ${option.text}`);
            });
            
            optionsContainer.appendChild(button);
        });
        
        godRoomUI.style.display = 'flex';
    }


    
    // Story functions
    function storyLine(text, duration = 4000) {
        const strip = document.getElementById("story-strip");
        strip.textContent = text;
        setTimeout(() => { strip.textContent = ""; }, duration);
    }
    
    function cutscene(sceneList, timesList = null) {
        const screenElement = document.getElementById('screen');
        const screenRect = screenElement.getBoundingClientRect();
        const gameElement = document.getElementById('game');
        const gameRect = screenElement.getBoundingClientRect();
        const cutsceneContainer = document.createElement('div');
        cutsceneContainer.classList.add('cutscene');
        cutsceneContainer.style.left = `${gameRect.left}px`;
        cutsceneContainer.style.top = `${gameRect.top}px`;
        document.body.appendChild(cutsceneContainer);

        let currentIndex = 0;
        let timeoutId = null;

        function showNextCutscene() {
            if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }
            if (currentIndex < sceneList.length) {
                cutsceneContainer.innerText = sceneList[currentIndex];

                // If times are provided, auto-advance
                if (Array.isArray(timesList) && timesList[currentIndex] != null) {
                    timeoutId = setTimeout(showNextCutscene, timesList[currentIndex] * 1000);
                }
                currentIndex++;
            } else {
                cutsceneContainer.remove();
            }
        }

        // Only allow clicking to advance if no times array was given
        if (!timesList) {
            cutsceneContainer.addEventListener('click', showNextCutscene);
        }

        showNextCutscene();
    }

let firstTime;
async function storyHelper(event, mod = null) {
  switch (event) {
    case 'opening':
      if (mod) { // if first time opening game
        cutscene(['I will make it to the top', 'I will be the best'], [5, 5]);
      } else {
        const response = await askAi(
          `You begin climbing the tower from the bottom again. Countless times youve restarted.`,
          'Never use markdown or quotations. Respond with a short single phrase monolog, no longer than 6 words.',
          '10'
        );
        storyLine(response);
      }
      break;
            case 'mimic_encounter':
                if (mod === 1) { // if first time seeing mimic move
                    storyLine("Did that just move?");
                } else {
                    storyLine("Another mimic...");
                }
                break;
            case 'first_death':
                setTimeout(() => {
                storyLine("...But... I'm back?");
                }, 4000);
                storyLine("...I died.");
                break;
            case 'first_shop':
                storyLine("Someone lives here?");
                break;
            case 'first_boss':
                storyLine("This one feels different...");
                break;
            case 'first_dragon':
                storyLine("That's not possible...");
                break;
            case 'first_trap':
                storyLine("Ow! That wasn't there before...");
                break;
            case 'floor_10':
                storyLine("These stairs never end.");
                break;
            case 'floor_20':
                storyLine("All the same");
                break;
            case 'floor_30':
                storyLine("All the same");
                break;
            case 'floor_40':
                storyLine("...Great, more");
                break;
            case 'floor_50':
                storyLine("I thought this would be harder by now.");
                break;
            case 'floor_99':
                storyLine("One more");
                break;
            case 'god_room':
                switch (mod) {
                    case 1:
                        if (firstTime != false) {
                            setTimeout(() => {
                                firstTime = false;
                                showGodRoomChoices(1011);
                            }, 36000);
                            cutscene([
                                "So... you made it.", "One hundred floors of blood and stone.", "And yet, why do you not smile?", 
                                "This is what you wanted, wasn’t it?", "Strength. Glory. Everything.", "...Or was it only the climb that gave you meaning?"
                            ], [5, 7, 5, 7, 5, 7]);
                        } else if (firstTime === false) {
                            setTimeout(() => {
                                showGodRoomChoices(1011);
                            }, 3000);
                            cutscene(["Change your mind yet?"], [3]);
                        }
                        
                        break;
                    case 2: 
                        cutscene([
                            'Very well'
                        ], [4]);
                        localStorage.setItem('start', 101);
                        break;
                    case 3:
                        cutscene([
                            "See you soon"
                        ], [4]);
                        setTimeout(() => {
                            localStorage.clear();
                            localStorage.setItem('joystick', true);
                            location.reload();
                        }, 4000);
                        break;
                    case 8:
                        storyLine('Back so soon?');
                        break;
                }
                break;
        }
    } 
    
    let yDown = null; 
    document.addEventListener('touchstart', function(evt) {
        if (evt.target instanceof HTMLSpanElement){
            xDown = evt.touches[0].clientX;
            yDown = evt.touches[0].clientY;
        }}, false);
    document.addEventListener('touchmove', function(evt) {
    if (evt.target instanceof HTMLSpanElement){
            if (!xDown || !yDown) {
                return;
            }
            var xUp = evt.touches[0].clientX;
            var yUp = evt.touches[0].clientY;
            var xDiff = xDown - xUp;
            var yDiff = yDown - yUp;
            if (Math.abs(xDiff) > Math.abs(yDiff)){
                /*most significant*/
                if ( xDiff > 0 ) {
                    dpad.querySelector(".dpad-btn[data-direction='left']").click();
                } else {
                    dpad.querySelector(".dpad-btn[data-direction='right']").click();
                }
            } else {
                /*most significant*/
                if ( yDiff > 0 ) {
                    dpad.querySelector(".dpad-btn[data-direction='up']").click();
                } else {
                    dpad.querySelector(".dpad-btn[data-direction='down']").click();
                }
            }
            /* reset values */
            xDown = null;
            yDown = null;
    }}, false);
const element = document.getElementById('game');
const btnA = document.getElementById('btn-a');
let tapCount = 0;
let lastTapTime = 0;

element.addEventListener('touchstart', (e) => {
  const currentTime = new Date().getTime();
  if (currentTime - lastTapTime < 150) {
    tapCount++;
    if (tapCount === 2) {
      btnA.click();
      tapCount = 0;
    }
  } else {
    tapCount = 1;
  }
  lastTapTime = currentTime;
});
    const distanceToPlayer = (entity) => 
        Math.abs(entity.x - player.x) + Math.abs(entity.y - player.y);
        
    const distanceBetween = (a, b) => 
        Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

    class Enemy {
        constructor(type, isBoss = false, isDragon = false, isMimic = false) {
            this.type = type;
            this.isBoss = isBoss;
            this.isDragon = isDragon;
            this.isMimic = isMimic;
            
            // Base stats
            this.hp = 2 + currentFloor;
            this.maxHp = this.hp;
            this.attack = 1 + Math.floor(currentFloor/2);
            this.alive = true;
            this.turns = 0;
            this.frozen = 0; // Freeze status counter
            
            // Special enemy properties
            if (type === 'berserker') {
                this.berserk = false;
            } else if (type === 'summoner') {
                this.summonCooldown = 5;
            } else if (type === 'ghost') {
                this.phase = false; // For phasing through walls
                this.phaseCooldown = 0;
            } else if (type === 'golem') {
                this.armored = true; // Takes reduced damage
            } else if (type === 'thief') {
                this.stealAmount = 2 + Math.floor(currentFloor/3);
            }
            
            // Apply modifiers based on type
            switch(type) {
                case 'ranged':
                    this.range = 3;
                    this.hp = Math.floor(this.hp * 0.8);
                    break;
                case 'healer':
                    this.healPower = Math.floor(1+currentFloor/2);
                    this.attack = Math.floor(this.attack * 0.5);
                    break;
                case 'berserker':
                    this.hp = Math.floor(this.hp * 1.2);
                    break;
                case 'summoner':
                    this.hp = Math.floor(this.hp * 0.7);
                    break;
                case 'ghost':
                    this.hp = Math.floor(this.hp * 0.7);
                    this.attack = Math.floor(this.attack * 1.2);
                    break;
                case 'golem':
                    this.hp = Math.floor(this.hp * 2);
                    this.attack = Math.floor(this.attack * 1.2);
                    break;
                case 'thief':
                    this.hp = Math.floor(this.hp * 0.8);
                    this.attack = Math.floor(this.attack * 0.8);
                    break;
            }
            
            // Apply boss modifiers
            if (isBoss) {
                this.hp *= 5;
                this.attack *= 2;
            }
            
            // Apply dragon modifiers
            if (isDragon) {
                this.hp *= 5;
                this.attack *= 3;
                if (this.type === 'ranged') {
                    this.range = 5;
                }
            }
            if (currentFloor === 'dark') {
                this.attack *= 1.5;
            }
            
            // Apply mimic modifiers
            if (isMimic) {
                this.hp *= 2;
                this.attack = Math.floor(this.attack * 1.5);
                this.surpriseAttack = true;
            }
        }
    }

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

    function pickFloorType(floorNum) {
        // Special floors
        if (floorNum === 101) {
            return FLOOR_TYPES.unknown;
        }
        if (floorNum % 100 === 0 && floorNum != 0) {
            return FLOOR_TYPES.den;
        }
        if (floorNum === 50) {
            return FLOOR_TYPES.hard;
        } 
        if (floorNum === 49 || floorNum === 99 || floorNum === 0) {
            return FLOOR_TYPES.treasure;
        }
        if (floorNum % 5 === 0 && floorNum != 0) {
            return FLOOR_TYPES.boss;
        }
        // if (floorNum % 7 === 0) {
        //     return FLOOR_TYPES.ambush;
        // }
        //  if (floorNum % 6 === 0) {
        //     return FLOOR_TYPES.trap;
        // }
        if (floorNum % 14 === 0 && floorNum != 0) {
            return FLOOR_TYPES.shop;
        }
        
        // Weighted random for other floors
        const types = Object.keys(FLOOR_TYPES).filter(t => FLOOR_TYPES[t].weight > 0);
        const weights = types.map(t => FLOOR_TYPES[t].weight);
        return FLOOR_TYPES[weightedRandom(types, weights)];
    }

    function generateDungeon() {
        currentFloorType = pickFloorType(currentFloor);
        
        // Update floor info display
        document.getElementById('floor-info').textContent = `Floor: ${currentFloor} - ${currentFloorType.name}`;
        document.getElementById('floor-info').style.backgroundColor = currentFloorType.color;
        
        // Apply floor modifiers to visual
        const gameElement = document.getElementById('game');
        if (currentFloorType.mods && currentFloorType.mods.visibility === "dark") {
            gameElement.classList.add('dark-floor');
        } else {
            gameElement.classList.remove('dark-floor');
        }
        
        // Reset damage taken this floor for no-hit achievement
        player.damageThisFloor = 0;
        
        // Check for story events based on floor
        if (currentFloor === 5 && !storyEvents.floorMilestones[5]) {
            storyHelper('floor_5');
            storyEvents.floorMilestones[5] = true;
        } else if (currentFloor === 10 && !storyEvents.floorMilestones[10]) {
            storyHelper('floor_10');
            storyEvents.floorMilestones[10] = true;
        } else if (currentFloor === 20 && !storyEvents.floorMilestones[20]) {
            storyHelper('floor_20');
            storyEvents.floorMilestones[20] = true;
        } else if (currentFloor === 30 && !storyEvents.floorMilestones[30]) {
            storyHelper('floor_30');
            storyEvents.floorMilestones[30] = true;
        } else if (currentFloor === 40 && !storyEvents.floorMilestones[40]) {
            storyHelper('floor_40');
            storyEvents.floorMilestones[40] = true;
        } else if (currentFloor === 50 && !storyEvents.floorMilestones[50]) {
            storyHelper('floor_50');
            storyEvents.floorMilestones[50] = true;
        } else if (currentFloor === 101) {
            storyHelper('god_room', 1);
        }
        
        // Cellular automata parameters
        const FILL_PROB = 0.4;
        const SMOOTH_STEPS = 3;
        
        // Initialize random grid
        dungeon = Array(HEIGHT).fill().map(() => 
            Array(WIDTH).fill().map(() => 
                Math.random() < FILL_PROB ? tiles.wall : tiles.floor
            )
        );

        // Cellular automata smoothing
        for(let i = 0; i < SMOOTH_STEPS; i++) {
            let newDungeon = [];
            for(let y = 0; y < HEIGHT; y++) {
                newDungeon[y] = [];
                for(let x = 0; x < WIDTH; x++) {
                    let walls = countAdjacentWalls(x, y);
                    newDungeon[y][x] = walls >= 5 || (i === 0 && walls === 4) ? tiles.wall : tiles.floor;
                }
            }
            dungeon = newDungeon;
        }

        // Find and connect regions
        let regions = findRegions();
        while(regions.length > 1) {
            connectRegions(regions);
            regions = findRegions();
        }

        // Create main room around center
        createRoom(10-3, 10-3, 7, 7);
        
        // Place stairs in farthest reachable area
        let start = {x: 10, y: 10};
        stairsPos = findFarthestPoint(start);
        dungeon[stairsPos.y][stairsPos.x] = tiles.stairs;

        // Place enemies and items based on floor type
        placeGameEntities();
        
        // Check for floor-based achievements
        checkAchievement('floor_10', currentFloor >= 10);
        checkAchievement('floor_20', currentFloor >= 20);
    }

    // Helper functions for dungeon generation
    function countAdjacentWalls(x, y) {
        let walls = 0;
        for(let dy = -1; dy <= 1; dy++) {
            for(let dx = -1; dx <= 1; dx++) {
                if(x+dx >= 0 && x+dx < WIDTH && y+dy >= 0 && y+dy < HEIGHT) {
                    walls += dungeon[y+dy][x+dx] === tiles.wall ? 1 : 0;
                } else {
                    walls++; // Count edges as walls
                }
            }
        }
        return walls;
    }

    function findRegions() {
        let regions = [];
        let visited = Array(HEIGHT).fill().map(() => Array(WIDTH).fill(false));
        
        for(let y = 0; y < HEIGHT; y++) {
            for(let x = 0; x < WIDTH; x++) {
                if(!visited[y][x] && dungeon[y][x] === tiles.floor) {
                    let region = floodFill(x, y, visited);
                    regions.push(region);
                }
            }
        }
        return regions;
    }

    function floodFill(x, y, visited) {
        let queue = [[x, y]];
        let region = [];
        visited[y][x] = true;
        
        while(queue.length > 0) {
            let [cx, cy] = queue.shift();
            region.push([cx, cy]);
            
            for(let [dx, dy] of [[-1,0], [1,0], [0,-1], [0,1]]) {
                let nx = cx + dx;
                let ny = cy + dy;
                if(nx >= 0 && nx < WIDTH && ny >= 0 && ny < HEIGHT &&
                   !visited[ny][nx] && dungeon[ny][nx] === tiles.floor) {
                    visited[ny][nx] = true;
                    queue.push([nx, ny]);
                }
            }
        }
        return region;
    }

    function connectRegions(regions) {
        // Find closest points between two regions
        let bestDistance = Infinity;
        let bestPair = null;
        
        for(let i = 0; i < regions.length; i++) {
            for(let j = i+1; j < regions.length; j++) {
                for(let [x1, y1] of regions[i]) {
                    for(let [x2, y2] of regions[j]) {
                        let dist = Math.abs(x1-x2) + Math.abs(y1-y2);
                        if(dist < bestDistance) {
                            bestDistance = dist;
                            bestPair = [[x1,y1], [x2,y2]];
                        }
                    }
                }
            }
        }
        
        // Dig corridor between the points
        if(bestPair) {
            let [start, end] = bestPair;
            let [x, y] = start;
            while(x !== end[0] || y !== end[1]) {
                if(x < end[0]) x++;
                else if(x > end[0]) x--;
                if(y < end[1]) y++;
                else if(y > end[1]) y--;
                
                dungeon[y][x] = tiles.floor;
                // Widen corridor
                if(Math.random() < 0.3) {
                    for(let [dx, dy] of [[-1,0], [1,0], [0,-1], [0,1]]) {
                        if(dungeon[y+dy]?.[x+dx] === tiles.wall) {
                            dungeon[y+dy][x+dx] = tiles.floor;
                        }
                    }
                }
            }
        }
    }

    function createRoom(x, y, w, h) {
        for(let iy = y; iy < y+h; iy++) {
            for(let ix = x; ix < x+w; ix++) {
                if(ix >= 0 && ix < WIDTH && iy >= 0 && iy < HEIGHT) {
                    dungeon[iy][ix] = tiles.floor;
                }
            }
        }
    }

    function findFarthestPoint(start) {
        let queue = [[start.x, start.y]];
        let visited = Array(HEIGHT).fill().map(() => Array(WIDTH).fill(false));
        let farthest = start;
        
        visited[start.y][start.x] = true;
        
        while(queue.length > 0) {
            let [x, y] = queue.shift();
            farthest = {x, y};
            
            for(let [dx, dy] of [[-1,0], [1,0], [0,-1], [0,1]]) {
                let nx = x + dx;
                let ny = y + dy;
                if(nx >= 0 && nx < WIDTH && ny >= 0 && ny < HEIGHT &&
                   !visited[ny][nx] && dungeon[ny][nx] === tiles.floor) {
                    visited[ny][nx] = true;
                    queue.push([nx, ny]);
                }
            }
        }
        return farthest;
    }

    function placeGameEntities() {
        enemies = [];
        items = [];
        traps = [];
        poisonClouds = [];
        fireTiles = [];
        
        // Adjust counts based on floor type
        let enemyCount = 5 + currentFloor;
        let itemCount = 3;
        let trapCount = 0;
        let enemyPool = ENEMY_TYPES;
        let specialEnemies = [];
        
        if (currentFloorType === FLOOR_TYPES.treasure) {
            enemyCount = 3;
            itemCount = 8;
            // 3 of the items will be mimics
            for (let i = 0; i <= 3; i++) {
                specialEnemies.push({type: 'melee', isMimic: true});
            }
        } else if (currentFloorType === FLOOR_TYPES.ambush) {
            enemyCount = Math.floor(enemyCount * 1.5);
            itemCount = 0;
        } else if (currentFloorType === FLOOR_TYPES.dark) {
            enemyCount = Math.floor(enemyCount * 1.3);
        } else if (currentFloorType === FLOOR_TYPES.boss) {
            // Add boss plus normal enemies
            specialEnemies.push({type: 'melee', isBoss: true});
            for (let i=0; i<Math.floor(currentFloor/20); i++) {
                const randomEnemyType = ENEMY_TYPES[Math.floor(Math.random() * ENEMY_TYPES.length)];
                specialEnemies.push({ type: randomEnemyType, isBoss: true });
            }
        } else if (currentFloorType === FLOOR_TYPES.hard) {
            // Only bosses
            enemyCount = 10;
            for (let i = 0; i < enemyCount; i++) {
                let type = ENEMY_TYPES[Math.floor(Math.random() * ENEMY_TYPES.length)];
                specialEnemies.push({type, isBoss: true});
            }
        } else if (currentFloorType === FLOOR_TYPES.range) {
            enemyPool = ['ranged'];
        } else if (currentFloorType === FLOOR_TYPES.dojo) {
            enemyPool = ['melee'];
        } else if (currentFloorType === FLOOR_TYPES.academy) {
            enemyPool = ['healer'];
        } else if (currentFloorType === FLOOR_TYPES.den) {
            enemyCount = 3;
            specialEnemies = [
                {type: 'melee', isDragon: true},
                {type: 'ranged', isDragon: true},
                {type: 'healer', isDragon: true}
            ];
        } else if (currentFloorType === FLOOR_TYPES.trap) {
            trapCount = 10 + Math.floor(currentFloor / 2);
            itemCount = 2; // Fewer items on trap floors
        } else if (currentFloorType === FLOOR_TYPES.speed) {
            // Speed floor - enemies move faster
            enemyCount = Math.floor(enemyCount * 0.8); // Fewer but faster enemies
        } else if (currentFloorType === FLOOR_TYPES.shop) {
            // Shop floor - fewer enemies, more items
            enemyCount = Math.floor(enemyCount * 0.5);
            itemCount = 3;
            // Create shop in the center
            createRoom(8, 8, 5, 5);
            // Place shopkeeper (special enemy that doesn't attack)
            let shopkeeper = new Enemy('healer');
            shopkeeper.x = 10;
            shopkeeper.y = 10;
            shopkeeper.isShopkeeper = true;
            shopkeeper.hp = 999; // Invincible
            enemies.push(shopkeeper);
        } else if (currentFloorType === FLOOR_TYPES.unknown) {
            // Shop floor - fewer enemies, more items
            enemyCount = 0
            itemCount = 0;
            // Create shop in the center
            createRoom(8, 8, 5, 5);
            // Place shopkeeper (special enemy that doesn't attack)
            let unknownEntity = new Enemy('healer');
            unknownEntity.x = 10;
            unknownEntity.y = 10;
            unknownEntity.isUnknown = true;
            unknownEntity.hp = Infinity; // Invincible
            enemies.push(unknownEntity);
        }
        
        // Place stairs
        let floorTiles = [];
        for(let y = 0; y < HEIGHT; y++) {
            for(let x = 0; x < WIDTH; x++) {
                if(dungeon[y][x] === tiles.floor && 
                   distanceBetween({x,y}, {x:10,y:10})> 5 &&
                   distanceBetween({x,y}, stairsPos) > 5) {
                    floorTiles.push({x, y});
                }
            }
        }
        
        // Shuffle floor tiles
        floorTiles = floorTiles.sort(() => Math.random() - 0.5);
        
        // Place traps
        for(let i = 0; i < trapCount; i++) {
            if(floorTiles.length === 0) break;
            let pos = floorTiles.pop();
            traps.push({
                x: pos.x,
                y: pos.y,
                type: Math.random() > 0.5 ? 'spike' : 'poison',
                damage: 2 + Math.floor(currentFloor / 3),
                active: true
            });
        }
        
        // Place special enemies first
        for (let enemyDef of specialEnemies) {
            if(floorTiles.length === 0) break;
            let pos = floorTiles.pop();
            let enemy = new Enemy(enemyDef.type, enemyDef.isBoss, enemyDef.isDragon, enemyDef.isMimic);
            enemy.x = pos.x;
            enemy.y = pos.y;
            enemies.push(enemy);
            enemyCount--;
        }
        
        // Place regular enemies
        for(let i = 0; i < enemyCount; i++) {
            if(floorTiles.length === 0) break;
            let pos = floorTiles.pop();
            let type = enemyPool[Math.floor(Math.random() * enemyPool.length)];
            let enemy = new Enemy(type);
            enemy.x = pos.x;
            enemy.y = pos.y;
            enemies.push(enemy);
        }
        if (player.class === 'rogue') itemCount += Math.round(Math.random()*3);
        // Place items
        for(let i = 0; i < itemCount; i++) {
            if(floorTiles.length === 0) break;
            let pos = floorTiles.pop();
            let type = ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)];
            
            // Calculate item value based on floor
            let value = 0;
            switch(type) {
                case 'health':
                    value = 5 + Math.floor(Math.random() * currentFloor);
                    break;
                case 'fireball':
                    value = Math.floor((3 + currentFloor) + Math.random() * 1.1);
                    break;
                case 'teleport':
                    value = 1 + Math.floor(currentFloor / 30); // Single use
                    break;
                case 'poison':
                    value = Math.floor(2 + Math.random() * currentFloor);
                    break;
                case 'shield':
                    value = Math.floor(1 + Math.random() * currentFloor * 0.4);
                    break;
                case 'scroll':
                    value = Math.floor((3 * Math.random() * currentFloor) + (currentFloor + 4));
                    break;
                case 'strength':
                    value = Math.floor(2 + Math.random() * currentFloor * 0.6);
                    break;
                case 'freeze':
                    value = 1 + Math.floor(currentFloor / 30); // Single use
                    break;
            }
            
            items.push({
                type,
                x: pos.x,
                y: pos.y,
                value
            });
        }
    }

    function getRandomFloorTile() {
        let x, y;
        do {
            x = Math.floor(1 + Math.random() * (WIDTH-2));
            y = Math.floor(1 + Math.random() * (HEIGHT-2));
        } while(dungeon[y][x] !== tiles.floor);
        return {x, y};
    }

    function hasLineOfSight(start, end) {
        let x0 = start.x, y0 = start.y;
        let x1 = end.x, y1 = end.y;
        let dx = Math.abs(x1 - x0);
        let dy = Math.abs(y1 - y0);
        let sx = x0 < x1 ? 1 : -1;
        let sy = y0 < y1 ? 1 : -1;
        let err = dx - dy;

        while(true) {
            if(x0 === x1 && y0 === y1) break;
            if(dungeon[y0][x0] === tiles.wall) return false;
            
            let e2 = 2*err;
            if(e2 > -dy) {
                err -= dy;
                x0 += sx;
            }
            if(e2 < dx) {
                err += dx;
                y0 += sy;
            }
        }
        return true;
    }

    function movePlayer(dx, dy) {
        if (window.isGamePaused) return;
        let newX = player.x + dx;
        let newY = player.y + dy;

        if(newX < 0 || newX >= WIDTH || newY < 0 || newY >= HEIGHT) return;
        if(dungeon[newY][newX] === tiles.wall) return;

        // Check for shopkeeper interaction
        let shopkeeper = enemies.find(e => e.x === newX && e.y === newY && e.isShopkeeper);
        if(shopkeeper) {
            if (!storyEvents.firstShop) {
                storyHelper('first_shop');
                storyEvents.firstShop = true;
            }
            showShop();
            return;
        }
        let unknownEntity = enemies.find(e => e.x === newX && e.y === newY && e.isUnknown);
        if(unknownEntity) {
            storyHelper('god_room', 8);
            return;
        }

        // Check for traps
        let trapIndex = traps.findIndex(t => t.x === newX && t.y === newY && t.active);
        if(trapIndex > -1) {
            // First trap encounter
            if (!storyEvents.firstTrap) {
                storyHelper('first_trap');
                storyEvents.firstTrap = true;
            }
            
            // Rogue class has a chance to avoid traps
            let trapAvoided = player.class === 'rogue' && Math.random() < 0.5;
            
            if (!trapAvoided) {
                let trap = traps[trapIndex];
                let damage = Math.max(0, trap.damage - (player.defense + player.tempDefense));
                player.hp -= damage;
                player.damageThisFloor += damage;
                showDamage(player.x, player.y, damage, trap.type === 'poison' ? 'poison' : 'normal');
                addCombatLog(`You triggered a ${trap.type} trap for ${damage} damage!`);
                
                // Deactivate trap
                trap.active = false;
                checkGameOver();
            } else {
                addCombatLog("You deftly avoid the trap!");
                trap.active = false;
            }
        }

        // Check for mimics (items that are actually enemies)
        let mimicItemIndex = items.findIndex(i => i.x === newX && i.y === newY && i.isMimic);
        if(mimicItemIndex > -1) {
            let mimicItem = items.splice(mimicItemIndex, 1)[0];
            
            // First mimic encounter
            if (!storyEvents.firstMimic) {
                storyHelper('mimic_encounter', 1);
                storyEvents.firstMimic = true;
            }
            
            // Create mimic enemy
            let mimic = new Enemy('melee', false, false, true);
            mimic.x = newX;
            mimic.y = newY;
            enemies.push(mimic);
            
            // Mimic gets a surprise attack
            let damage = Math.max(0, mimic.attack - (player.defense + player.tempDefense));
            player.hp -= damage;
            player.damageThisFloor += damage;
            updateRage(damage);
            showDamage(player.x, player.y, damage);
            addCombatLog(`Mimic hits you for ${damage} damage!`);
            
            checkGameOver();
            render();
            return;
        }

        let enemy = enemies.find(e => e.x === newX && e.y === newY && e.alive && !e.isShopkeeper && !e.isUnknown);
        if(enemy) {
            // First boss encounter
            if (enemy.isBoss && !storyEvents.firstBoss) {
                storyHelper('first_boss');
                storyEvents.firstBoss = true;
            }
            
            // First dragon encounter
            if (enemy.isDragon && !storyEvents.firstDragon) {
                storyHelper('first_dragon');
                storyEvents.firstDragon = true;
            }
            
            // Check for critical hit
            let isCritical = Math.random() < (player.criticalChance / 100);
            let damage = Math.max(0, (player.attack + player.tempStrength) - (enemy.isBoss ? Math.floor(currentFloor/5) : 0));
            
            if (isCritical) {
                damage = Math.floor(damage * 1.5);
                addCombatLog("Critical hit!");
            }
            
            // Golems take reduced damage
            if (enemy.type === 'golem') {
                damage = Math.max(1, Math.floor(damage * 0.7));
            }
            
            enemy.hp -= damage;
            showDamage(enemy.x, enemy.y, damage, isCritical ? 'ice' : 'normal');
            
            let enemyName = "";
            if (enemy.isMimic) enemyName = "Mimic";
            else if (enemy.isDragon) enemyName = "Dragon";
            else if (enemy.isBoss) enemyName = "Boss";
            else enemyName = enemy.type;
            
            addCombatLog(`You hit ${enemyName} for ${damage} damage!`);
            
            if(enemy.hp <= 0) {
                handleEnemyDeath(enemy)
            } else {
                // Thief enemies steal coins on hit
                if (enemy.type === 'thief' && enemy.frozen === 0) {
                    let stolen = Math.min(player.coins, enemy.stealAmount);
                    if (stolen > 0) {
                        player.coins -= stolen;
                        addCombatLog(`Thief stole ${stolen} coins!`);
                    }
                }
                if (enemy.frozen === 0) {
                    let enemyDmg = Math.max(0, enemy.attack - (player.defense + player.tempDefense));
                    player.hp -= enemyDmg;
                    player.damageThisFloor += enemyDmg;
                    updateRage(enemyDmg);
                    showDamage(player.x, player.y, enemyDmg, 'normal');
                    addCombatLog(`${enemyName} hits you for ${enemyDmg} damage!`);
                }
            }
            checkGameOver();
            render();
            return;
        } else {
            // update belt
            if (player.inventory && player.inventory.length > 0 && player.belt.length < 5) {
                while (player.inventory.length > 0 && player.belt.length < 5) {
                    player.belt.push(player.inventory.shift());
                }
            }
        }
        let itemIndex = items.findIndex(i => i.x === newX && i.y === newY);
        if(itemIndex > -1) {
            let item = items.splice(itemIndex, 1)[0];
            handleItemPickup(item);
        }

        if(newX === stairsPos.x && newY === stairsPos.y) {
            // Check for no-hit achievement
            if (player.damageThisFloor === 0) {
                checkAchievement('no_hit', true);
            }
            
            currentFloor++;
            generateDungeon();
            player.x = 10;
            player.y = 10;
            addCombatLog(`Ascended to floor ${currentFloor}!`);
            render();
            return;
        }

        player.x = newX;
        player.y = newY;
        
        // Check for environmental hazards
        checkEnvironmentalHazards();

        // Update status effects
        updateStatusEffects();

        handleEnemyTurn();
        render();
    }

    function checkEnvironmentalHazards() {
        // Check for poison clouds
        let poisonIndex = poisonClouds.findIndex(p => p.x === player.x && p.y === player.y);
        /*if(poisonIndex > -1) {
            let damage = 1 + Math.floor(currentFloor / 5);
            player.hp -= damage;
            player.damageThisFloor += damage;
            showDamage(player.x, player.y, damage, 'poison');
            addCombatLog(`Poison cloud damages you for ${damage}!`);
            checkGameOver();
        }
        
        // Check for fire tiles
        let fireIndex = fireTiles.findIndex(f => f.x === player.x && f.y === player.y);
        if(fireIndex > -1) {
            let damage = 2 + Math.floor(currentFloor / 4);
            player.hp -= damage;
            player.damageThisFloor += damage;
            showDamage(player.x, player.y, damage, 'fire');
            addCombatLog(`Fire burns you for ${damage}!`);
            checkGameOver();
        } */
    }

    function updateStatusEffects() {
        // Decrement shield turns
        if (player.tempDefenseTurns > 0) {
            player.tempDefenseTurns--;
            if (player.tempDefenseTurns === 0) {
                player.tempDefense = 0;
                addCombatLog("Shield worn off!");
            }
        }
        
        // Decrement rage turns
        if (player.statusEffects.rage && player.statusEffects.rage > 0) {
            player.hp += 3 + Math.floor(currentFloor/5);
            player.statusEffects.rage--;
            if (player.statusEffects.rage === 0) {
                player.attack = Math.floor(player.attack / 2.5);
                addCombatLog("Rage effect worn off!");
            }
        }
        
        // Decrement strength turns
        if (player.tempStrengthTurns > 0) {
            player.tempStrengthTurns--;
            if (player.tempStrengthTurns === 0) {
                player.tempStrength = 0;
                addCombatLog("Strength potion worn off!");
            }
        }
        
        // Handle burning effect
        if (player.statusEffects.burning && player.statusEffects.burning > 0) {
            let damage = 1 + Math.floor(currentFloor / 6);
            player.hp -= damage;
            player.damageThisFloor += damage;
            showDamage(player.x, player.y, damage, 'fire');
            addCombatLog(`Burning for ${damage} damage!`);
            player.statusEffects.burning--;
            if (player.statusEffects.burning === 0) {
                addCombatLog("No longer burning!");
            }
            checkGameOver();
        }
        
        // Handle poison effect
        if (player.statusEffects.poisoned && player.statusEffects.poisoned > 0) {
            let damage = 1 + Math.floor(currentFloor / 8);
            player.hp -= damage;
            player.damageThisFloor += damage;
            showDamage(player.x, player.y, damage, 'poison');
            addCombatLog(`Poisoned for ${damage} damage!`);
            player.statusEffects.poisoned--;
            if (player.statusEffects.poisoned === 0) {
                addCombatLog("No longer poisoned!");
            }
            checkGameOver();
        }
        
        // Mage class slowly regenerates HP
        if (player.class === 'mage' && player.hp < player.maxHp) {
            player.hp += Math.min(player.maxHp/2, Math.floor(currentFloor/10));
        }
        
        // Reset teleport chain if not used this turn
        player.combos.teleportChain = 0;
    }

    function handleEnemyTurn() {
        enemies.forEach(enemy => {
            if(!enemy.alive || enemy.isShopkeeper || enemy.isUnknown) return;
            
            // Skip turn if frozen
            if (enemy.frozen > 0) {
                enemy.frozen--;
                if (enemy.frozen === 0) {
                    addCombatLog(`${enemy.type} is no longer frozen!`);
                }
                return;
            }
            
            enemy.turns++;
            
            // Special enemy behaviors
            if (enemy.type === 'berserker' && enemy.hp < enemy.maxHp * 0.5 && !enemy.berserk) {
                enemy.berserk = true;
                enemy.attack *= 2;
                addCombatLog("Berserker enrages!");
            }
            
            if (enemy.type === 'summoner' && enemy.turns % enemy.summonCooldown === 0) {
                // Try to summon a new enemy
                let summonType = ENEMY_TYPES[Math.floor(Math.random() * 3)]; // Only basic types
                let summon = new Enemy(summonType);
                
                // Find a free adjacent tile
                let directions = [
                    {x: enemy.x-1, y: enemy.y},
                    {x: enemy.x+1, y: enemy.y},
                    {x: enemy.x, y: enemy.y-1},
                    {x: enemy.x, y: enemy.y+1}
                ];
                
                let validSpot = directions.find(pos => 
                    pos.x >= 0 && pos.x < WIDTH &&
                    pos.y >= 0 && pos.y < HEIGHT &&
                    dungeon[pos.y][pos.x] === tiles.floor &&
                    !enemies.some(e => e.x === pos.x && e.y === pos.y) &&
                    !(player.x === pos.x && player.y === pos.y)
                );
                
                if (validSpot) {
                    summon.x = validSpot.x;
                    summon.y = validSpot.y;
                    enemies.push(summon);
                    addCombatLog("Summoner creates a new enemy!");
                }
            }
            
            // Ghosts can phase through walls occasionally
            if (enemy.type === 'ghost' && enemy.phaseCooldown <= 0 && Math.random() < 0.2) {
                enemy.phase = true;
                enemy.phaseCooldown = 3;
            }
            
            if (enemy.type === 'ghost') {
                enemy.phaseCooldown--;
            }
            
            // Movement and attacks
            switch(enemy.type) {
                case 'melee':
                case 'golem':
                case 'thief':
                    if((distanceToPlayer(enemy) > 1 && !enemy.isMimic) || (distanceToPlayer(enemy) < 3 && enemy.isMimic) ) {
                        moveTowardsPlayer(enemy);
                    }
                    break;
                case 'ranged':
                    if(distanceToPlayer(enemy) <= enemy.range && hasLineOfSight(enemy, player)) {
                        shootAtPlayer(enemy);
                    } else {
                        moveTowardsPlayer(enemy);
                    }
                    break;
                case 'healer':
                    healNearbyEnemies(enemy);
                    break;
                case 'ghost':
                    if(enemy.phase) {
                        // Ghosts in phase mode can move through walls
                        let dx = player.x - enemy.x;
                        let dy = player.y - enemy.y;
                        
                        if(dx !== 0) enemy.x += Math.sign(dx);
                        if(dy !== 0) enemy.y += Math.sign(dy);
                        
                        // Check if reached player
                        if(enemy.x === player.x && enemy.y === player.y) {
                            let damage = Math.max(0, enemy.attack - (player.defense + player.tempDefense));
                            player.hp -= damage;
                            player.damageThisFloor += damage;
                            updateRage(damage);
                            showDamage(player.x, player.y, damage, 'normal');
                            addCombatLog(`Ghost attacks for ${damage} damage!`);
                            checkGameOver();
                            
                            // Move back
                            enemy.x -= Math.sign(dx);
                            enemy.y -= Math.sign(dy);
                        }
                    } else {
                        if(distanceToPlayer(enemy) > 1) moveTowardsPlayer(enemy);
                    }
                    break;
                default:
                    // Default behavior for new enemy types
                    if(distanceToPlayer(enemy) > 1) moveTowardsPlayer(enemy);
                    break;
            }
        });
        
        // Update environmental effects
        updateEnvironmentalEffects();
    }

    function updateEnvironmentalEffects() {
        // Reduce duration of poison clouds
        poisonClouds = poisonClouds.filter(p => {
            p.duration--;
            return p.duration > 0;
        });
        
        // Reduce duration of fire tiles
        fireTiles = fireTiles.filter(f => {
            f.duration--;
            return f.duration > 0;
        });
    }

    function moveTowardsPlayer(enemy) {
        let dx = player.x - enemy.x;
        let dy = player.y - enemy.y;
        let directions = [];
        let speedMultiplier;
        if (currentFloorType === FLOOR_TYPES.speed && distanceBetween(enemy, player) > 3) {
            speedMultiplier = 2;
            if(dx !== 0) directions.push({x: enemy.x + Math.sign(dx), y: enemy.y});
            if(dy !== 0) directions.push({x: enemy.x, y: enemy.y + Math.sign(dy)});
        } else {
            speedMultiplier = 1;
            if(dx !== 0) directions.push({x: enemy.x + Math.sign(dx), y: enemy.y});
            if(dy !== 0) directions.push({x: enemy.x, y: enemy.y + Math.sign(dy)});
        }
        
        // Ghosts in phase mode ignore walls
        if (enemy.type === 'ghost' && enemy.phase) {
            directions = directions.filter(pos => 
                pos.x >= 0 && pos.x < WIDTH &&
                pos.y >= 0 && pos.y < HEIGHT
            );
        } else {
            directions = directions.filter(pos => 
                pos.x >= 0 && pos.x < WIDTH &&
                pos.y >= 0 && pos.y < HEIGHT &&
                dungeon[pos.y][pos.x] !== tiles.wall
            );
        }

        if(directions.length > 0) {
            const move = directions[Math.floor(Math.random() * directions.length)];
            enemy.x += speedMultiplier * (move.x - enemy.x);
            enemy.y += speedMultiplier * (move.y - enemy.y);
            
            // Check if enemy stepped on a trap
            let trapIndex = traps.findIndex(t => t.x === enemy.x && t.y === enemy.y && t.active);
            if(trapIndex > -1) {
                let trap = traps[trapIndex];
                let damage = trap.damage;
                enemy.hp -= damage;
                showDamage(enemy.x, enemy.y, damage, trap.type === 'poison' ? 'poison' : 'normal');
                addCombatLog(`Enemy triggered a ${trap.type} trap for ${damage} damage!`);
                
                // Deactivate trap
                trap.active = false;
                
                if(enemy.hp <= 0) {
                    handleEnemyDeath(enemy, false);
                }
            }
        }
    }

    function shootAtPlayer(enemy) {
        if(hasLineOfSight(enemy, player)) {
            let damage = Math.max(0, enemy.attack - (player.defense + player.tempDefense));
            player.hp -= damage;
            player.damageThisFloor += damage;
            showDamage(player.x, player.y, damage, 'normal');
            
            let enemyName = "";
            if (enemy.isMimic) enemyName = "Mimic";
            else if (enemy.isDragon) enemyName = "Dragon";
            else if (enemy.isBoss) enemyName = "Boss";
            else enemyName = enemy.type;
            
            addCombatLog(`${enemyName} shoots for ${damage} damage!`);
            checkGameOver();
        }
    }

    function healNearbyEnemies(enemy) {
        enemies.forEach(e => {
            if(e !== enemy && distanceBetween(e, enemy) <= 4) {
                e.hp = Math.min(e.hp + enemy.healPower, e.maxHp);
                showDamage(e.x, e.y, enemy.healPower, 'heal');
            }
        });
    }

    function handleItemPickup(item) {
        // mage class finds more valuable items
        if (player.class === 'mage') {
            item.value = Math.floor(item.value * 1.3);
        }
        
        // Add to inventory
        if (player.belt.length === 5) {
            player.inventory.push(item);
        } else {
            player.belt.push(item);
        }
        
        player.stats.itemsCollected++;
        addCombatLog(`Picked up: ${item.type} item!`);
        
        // Check for item hoarder achievement
        checkAchievement('item_hoarder', player.stats.itemsCollected >= 20);
    }

    function updateRage(damage) {
        // Warrior class builds rage faster
        let rageMultiplier = player.class === 'warrior' ? 1.5 : 1;
        player.rage = Math.min(player.rage + damage * rageMultiplier, 100);
        if(player.rage === 100) {
            addCombatLog("RAGE MODE ACTIVATED!");
            player.attack *= 2.5;
            player.statusEffects.rage = 5; // Lasts for 5 turns
            player.stats.rageActivations++;
            player.rage = 0;
            
            // Check for rage master achievement
            checkAchievement('rage_master', player.stats.rageActivations >= 5);
        }
    }

    function showDamage(x, y, amount, type = 'normal') {
        const damage = document.createElement('div');
        damage.className = `damage damage-${type}`;
        damage.textContent = amount;
        damage.style.left = `${x * 14 + 7}px`;
        damage.style.top = `${y * 24 + 12}px`;
        damage.style.zIndex = `100`;
        document.getElementById('game').appendChild(damage);
        setTimeout(() => damage.remove(), 500);
    }

    function addCombatLog(text) {
        const log = document.getElementById('combatLog');
        log.innerHTML += `${text}<br>`;
        log.scrollTop = log.scrollHeight;
        
        // Limit log length
        if (log.children.length > 10) {
            log.removeChild(log.children[0]);
        }
    }

    function checkGameOver() {
        if(player.hp <= 0) {
            // First death
            if (!storyEvents.firstDeath) {
                storyHelper('first_death');
                storyEvents.firstDeath = true;
            }
            
            coins += Math.ceil(player.coins * 0.5);
            localStorage.setItem('dungeonCoins', coins);
            setTimeout(() => {
                alert(`Game Over! Reached floor ${currentFloor}`);
                resetGame();
                showUpgradeScreen();
                render();
            }, 500);
        }
    }

    function resetGame() {
        player = {
            x: 10, y: 10,
            start: parseInt(localStorage.getItem('start') || '0'),
            joystick: parseBool(localStorage.getItem('joystick') || 'false'),
            hp: 20 + (player.upgrades.maxHp || 0),
            maxHp: 20 + (player.upgrades.maxHp || 0),
            attack: 2 + (player.upgrades.attack || 0),
            defense: (player.upgrades.defense || 0),
            coins: 0,
            rage: 0,
            belt: [],
            inventory: [],
            hotbarIndex: 0,
            tempDefense: 0,
            tempDefenseTurns: 0,
            tempStrength: 0,
            tempStrengthTurns: 0,
            statusEffects: {},
            upgrades: player.upgrades,
            combos: {
                poisonFire: false,
                shieldStrength: false,
                teleportChain: 0
            },
            // Preserve these across runs
            achievements: player.achievements,
            class: player.class,
            stats: {
                enemiesDefeated: player.stats.enemiesDefeated,
                bossesDefeated: player.stats.bossesDefeated,
                dragonsDefeated: player.stats.dragonsDefeated,
                mimicsDefeated: player.stats.mimicsDefeated,
                itemsCollected: 0, // Reset each run
                rageActivations: player.stats.rageActivations,
                damageTaken: player.stats.damageTaken,
                combosPerformed: player.stats.combosPerformed,
                coinsSpent: player.stats.coinsSpent,
                enemiesFrozen: player.stats.enemiesFrozen
            },
            damageThisFloor: 0,
            criticalChance: player.upgrades.critical || 0,
            frozenCount:0, 
            upgradePrices: {
                'maxHp': Math.floor(10*parseFloat(localStorage.getItem('priceMultiplier') || '1')),
                'attack': Math.floor(15*parseFloat(localStorage.getItem('priceMultiplier') || '1')),
                'defense': Math.floor(20*parseFloat(localStorage.getItem('priceMultiplier') || '1')),
                'critical': Math.floor(25*parseFloat(localStorage.getItem('priceMultiplier') || '1')) 
            }, 
            priceMultiplier: parseFloat(localStorage.getItem('priceMultiplier') || '1.01') 
        };
        currentFloor = player.start;
        generateDungeon();
    }

    function showUpgradeScreen() {
        document.getElementById('upgradeScreen').style.display = 'block';
        renderUpgradeScreen();
    }

    function hideUpgradeScreen() {
        document.getElementById('upgradeScreen').style.display = 'none';
        selectClass(player.class);
    }

    function showTutorial() {
        document.getElementById('tutorial').style.display = 'block';
    }

    function hideTutorial() {
        document.getElementById('tutorial').style.display = 'none';
    }

    function startNewRun() {
        resetGame();
        hideUpgradeScreen();
    }

    function buyUpgrade(cost, effect, value) {
        if (coins >= cost) {
            coins -= cost;
            player.upgrades[effect] = (player.upgrades[effect] || 0) + value;
            localStorage.setItem('dungeonCoins', coins);
            localStorage.setItem('playerUpgrades', JSON.stringify(player.upgrades));
            // Increase price using exponential function
            player.upgradePrices[effect] = Math.round(player.upgradePrices[effect]*player.priceMultiplier);
            renderUpgradeScreen();
            // Increase price multiplier over time
            player.priceMultiplier *= 1.01;
            localStorage.setItem('priceMultiplier', player.priceMultiplier);
            hideUpgradeScreen();
            showUpgradeScreen();
            render();
        }
    }
    function renderUpgradeScreen() {
        const upgradeScreen = document.getElementById('upgradeScreen');
        upgradeScreen.innerHTML = `
            <h3>Upgrades</h3>
            <div class="upgrade">
                +5 Max HP
                <button onclick="Game.buyUpgrade(${player.upgradePrices['maxHp']}, 'maxHp', 5)">${player.upgradePrices['maxHp']} coins</button>
            </div>
            <div class="upgrade">
                +1 Attack
                <button onclick="Game.buyUpgrade(${player.upgradePrices['attack']}, 'attack', 1)">${player.upgradePrices['attack']} coins</button>
            </div>
            <div class="upgrade">
                +1 Defense
                <button onclick="Game.buyUpgrade(${player.upgradePrices['defense']}, 'defense', 1)">${player.upgradePrices['defense']} coins</button>
            </div>
            <div class="upgrade">
                +5% Critical Chance
                <button onclick="Game.buyUpgrade(${player.upgradePrices['critical']}, 'critical', 5)">${player.upgradePrices['critical']} coins</button>
            </div>
            <button onclick="Game.startNewRun()" style="margin-top:10px">Continue</button>
        `;
    }
    function cycleHotbar() {
        player.hotbarIndex = (player.hotbarIndex + 1) % 5;
        renderHotbar();
    }

    function handleEnemyDeath(target, giveCoins=true) {
        if(target.hp <= 0) {
            target.alive = false;
            let coinValue = 1 + Math.floor(currentFloor/5);
            if (target.isBoss) coinValue *= 5;
            if (target.isDragon) coinValue *= 10;
            if (target.isMimic) coinValue *= 2;
            
            if (giveCoins) player.coins += coinValue;
            
            let enemyName = "";
            if (target.isMimic) enemyName = "Mimic";
            else if (target.isDragon) enemyName = "Dragon";
            else if (target.isBoss) enemyName = "Boss";
            else enemyName = target.type;
            
            let coinMessage = giveCoins ? ` +${coinValue} coins` : '';
            addCombatLog(`${enemyName} defeated!${coinMessage}`);
            
            // Update stats
            player.stats.enemiesDefeated++;
            if (target.isBoss) player.stats.bossesDefeated++;
            if (target.isDragon) player.stats.dragonsDefeated++;
            if (target.isMimic) player.stats.mimicsDefeated++;
            
            // Check achievements
            checkAchievement('first_kill', player.stats.enemiesDefeated >= 1);
            checkAchievement('boss_slayer', player.stats.bossesDefeated >= 1);
            checkAchievement('dragon_slayer', player.stats.dragonsDefeated >= 1);
            checkAchievement('mimic_hunter', player.stats.mimicsDefeated >= 5);
        }
    }

    function movePlayerInDirection(direction) {
        const moves = {
            'up': [0, -1],
            'down': [0, 1],
            'left': [-1, 0],
            'right': [1, 0]
        };
        
        if (moves[direction]) {
            movePlayer(...moves[direction]);
        }
    }

    function useSelectedItem() {
        if (player.belt.length > player.hotbarIndex) {
            const item = player.belt[player.hotbarIndex];
            
            // Check for combos
            checkItemCombos(item.type);
            
            let itemValue = item.value;
            
            switch(item.type) {
                case 'health':
                    player.hp = Math.min(player.maxHp, player.hp + itemValue);
                    addCombatLog(`Used Health Potion! +${itemValue} HP`);
                    // Animation effect
                    document.getElementById('game').style.animation = 'health 0.5s';
                    setTimeout(() => {
                        document.getElementById('game').style.animation = '';
                    }, 500);
                    break;
                case 'fireball':
                    addCombatLog(`Used Fireball! Damaged nearby enemies`); 
                    let fireDamage = itemValue;
                    
                    // Combo bonus: poison + fire
                    if (player.combos.poisonFire) {
                        fireDamage = Math.floor(fireDamage * 1.5);
                        addCombatLog("Poison+Fire combo! Extra damage!");
                    }
                    
                    // Combo bonus: freeze + fire
                    if (player.combos.freezeFire) {
                        fireDamage = Math.floor(fireDamage * 1.5);
                        addCombatLog("Freeze+Fire combo! Extra damage!");
                    }
                    
                    enemies.forEach(e => {
                        if (distanceBetween(e, player) <= 3) {
                            e.hp -= fireDamage;
                            
                            // Set enemies on fire
                            if (!e.statusEffects) e.statusEffects = {};
                            e.statusEffects.burning = 3;
                            
                            if (e.hp <= 0) handleEnemyDeath(e);
                        }
                    });
                    
                    // Create fire tiles
                    for (let dy = -3; dy <= 3; dy++) {
                        for (let dx = -3; dx <= 3; dx++) {
                            let x = player.x + dx;
                            let y = player.y + dy;
                            let distance = Math.sqrt(dx * dx + dy * dy);
                            if (distance <= 3.5 && x >= 0 && x < WIDTH && y >= 0 && y < HEIGHT && dungeon[y][x] === tiles.floor) {
                                fireTiles.push({
                                    x, y,
                                    duration: 3
                                });
                            }
                        }
                    }
                    // Animation effect
                    document.getElementById('game').style.animation = 'fire 0.5s';
                    setTimeout(() => {
                        document.getElementById('game').style.animation = '';
                    }, 500);
                    break;
                case 'teleport':
                    let safeTiles = [];
                    for (let y = 0; y < HEIGHT; y++) {
                        for (let x = 0; x < WIDTH; x++) {
                            if (dungeon[y][x] === tiles.floor && 
                                !enemies.some(e => e.x===x && e.y===y && e.alive)) {
                                safeTiles.push({x, y});
                            }
                        }
                    }
                    if (safeTiles.length > 0) {
                        let pos = safeTiles[Math.floor(Math.random() * safeTiles.length)];
                        player.x = pos.x;
                        player.y = pos.y;
                        addCombatLog(`Teleported to safety!`);
                        
                        // Combo: Multiple teleports = blink strike
                        if (player.combos.teleportChain > 0) {
                            let blinkDamage = 2 + player.combos.teleportChain;
                            addCombatLog(`Blink strike! ${blinkDamage} damage to nearby enemies!`);
                            
                            enemies.forEach(e => {
                                if (distanceBetween(e, player) <= 1) {
                                    e.hp -= blinkDamage;
                                    if (e.hp <= 0) handleEnemyDeath(e);
                                }
                            });
                        }
                    }
                    // Animation effect
                    document.getElementById('game').style.animation = 'teleport 0.5s';
                    setTimeout(() => {
                        document.getElementById('game').style.animation = '';
                    }, 500);
                    break;
                case 'poison':
                    addCombatLog(`Poison Bomb exploded!`);
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            let x = player.x + dx;
                           
                            let y = player.y + dy;
                            let enemy = enemies.find(e => e.x===x && e.y===y && e.alive);
                            if (enemy) {
                                enemy.hp -= itemValue;
                                
                                // Poison enemies
                                if (!enemy.statusEffects) enemy.statusEffects = {};
                                enemy.statusEffects.poisoned = 3;
                                
                                if (enemy.hp <= 0) handleEnemyDeath(enemy);
                            }
                        }
                    }
                    // Create poison tiles
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            let x = player.x + dx;
                            let y = player.y + dy;
                            if (x >= 0 && x < WIDTH && y >= 0 && y < HEIGHT && dungeon[y][x] === tiles.floor) {
                                poisonClouds.push({
                                    x, y,
                                    duration: 3
                                });
                            }
                        }
                    }
                    // Animation effect
                    document.getElementById('game').style.animation = 'poison 0.5s';
                    setTimeout(() => {
                        document.getElementById('game').style.animation = '';
                    }, 500);
                    break;
                case 'shield':
                    player.tempDefense += itemValue;
                    player.tempDefenseTurns = 5; // lasts for 5 player turns
                    
                    // Combo: Shield + Strength = Fortress Mode
                    if (player.combos.shieldStrength) {
                        fortressBoost = 2+Math.floor(currentFloor/2);
                        player.tempDefense += fortressBoost;
                        addCombatLog(`Shield activated! +${itemValue} DEF for 5 turns`);
                        addCombatLog(`Fortress Mode! +${fortressBoost} DEF for 5 turns`);
                    } else {
                        addCombatLog(`Shield activated! +${itemValue} DEF for 5 turns`);
                    }
                    // Animation effect
                    document.getElementById('game').style.animation = 'shield 0.5s';
                    setTimeout(() => {
                        document.getElementById('game').style.animation = '';
                    }, 500);
                    break;
                case 'scroll':
                    // Find closest enemy
                    let closestEnemy = null;
                    let minDist = Infinity;
                    
                    enemies.forEach(e => {
                        if (e.alive) {
                            const dist = distanceToPlayer(e);
                            if (dist < minDist) {
                                minDist = dist;
                                closestEnemy = e;
                            }
                        }
                    });
                    
                    if (closestEnemy) {
                        closestEnemy.hp -= itemValue;
                        showDamage(closestEnemy.x, closestEnemy.y, itemValue, 'lightning');
                        addCombatLog(`Used Scroll! Hit enemy for ${itemValue} damage`);
                        if (closestEnemy.hp <= 0) handleEnemyDeath(closestEnemy);
                    } else {
                        addCombatLog("No enemies in sight!");
                        return;
                    }
                    // Animation effect
                    document.getElementById('game').style.animation = 'lightning 0.5s';
                    setTimeout(() => {
                        document.getElementById('game').style.animation = '';
                    }, 500);
                    break;
                case 'strength':
                    player.tempStrength += itemValue;
                    player.tempStrengthTurns = 5; // Lasts for 5 turns
                    
                    // Combo: Shield + Strength = Fortress Mode
                    if (player.combos.shieldStrength) {
                        fortressBoost = 1+Math.floor(currentFloor/2);
                        player.tempStrength += fortressBoost;
                        addCombatLog(`Strength potions activated! +${itemValue} ATK for 5 turns`); 
                        addCombatLog(`Fortress Mode! +${fortressBoost} ATK for 5 turns`);
                    } else {
                        addCombatLog(`Strength potions activated! +${itemValue} ATK for 5 turns`);
                    }
                    // Animation effect
                    document.getElementById('game').style.animation = 'strength 0.5s';
                    setTimeout(() => {
                        document.getElementById('game').style.animation = '';
                    }, 500);
                    break;
                case 'freeze':
                    addCombatLog(`Freeze Scroll activated!`);
                    frozenCount = player.frozenCount;
                    frozenCount = 0;
                    
                    enemies.forEach(e => {
                        if (distanceBetween(e, player) <= 3) {
                            e.frozen = 3; // Freeze for 3 turns
                            frozenCount++;
                            player.frozenCount = frozenCount;
                        }
                    });
                    
                    addCombatLog(`Froze ${frozenCount} enemies!`);
                    player.stats.enemiesFrozen += frozenCount;
                    
                    // Check for frozen foe achievement
                    checkAchievement('frozen_foe', player.stats.enemiesFrozen >= 10);
                    // Animation effect
                    document.getElementById('game').style.animation = 'health 0.5s';
                    setTimeout(() => {
                        document.getElementById('game').style.animation = '';
                    }, 500);
                    break;
            }
            if (player.belt.length > player.hotbarIndex) {
                const item = player.belt[player.hotbarIndex];
                if (item.type != 'teleport' && item.type != 'freeze') {
                    // Remove the used item
                    player.belt.splice(player.hotbarIndex, 1);
                } else {
                    item.value--
                    if (item.value <= 0)
                        player.belt.splice(player.hotbarIndex, 1);
                    }
                }
            
            // Adjust hotbar index if needed
            if (player.hotbarIndex >= player.belt.length) {
                player.hotbarIndex = Math.max(0, player.belt.length - 1);
            }
            
            // Update UI
            render();
        } else {
            addCombatLog("No item in this slot!");
        }
    }

    function checkItemCombos(itemType) {
        // Reset combos
        player.combos.poisonFire = false;
        player.combos.shieldStrength = false;
        player.combos.freezeFire = false;
        
        // Check for poison+fire combo
        if (itemType === 'fireball') {
            // Check if there are poison clouds
            if (poisonClouds.length > 0) {
                player.combos.poisonFire = true;
                if (!player.stats.combosPerformed.includes('poison_fire')) {
                    player.stats.combosPerformed.push('poison_fire');
                    checkAchievement('combo_master', player.stats.combosPerformed.length >= 3);
                }
            }
        }
        // Check for freeze+fire combo
        if (itemType === 'fireball') {
            // Check if there are poison clouds
            if (player.frozenCount > 0) {
                player.combos.freezeFire = true;
                if (!player.stats.combosPerformed.includes('freeze_fire')) {
                    player.stats.combosPerformed.push('freeze_fire');
                    checkAchievement('combo_master', player.stats.combosPerformed.length >= 3);
                }
            }
        }
        
        // Check for shield+strength combo (Fortress Mode)
        if ((itemType === 'shield' && player.tempStrength > 0) || 
            (itemType === 'strength' && player.tempDefense > 0)) {
            player.combos.shieldStrength = true;
            if (!player.stats.combosPerformed.includes('shield_strength')) {
                player.stats.combosPerformed.push('shield_strength');
                checkAchievement('combo_master', player.stats.combosPerformed.length >= 3);
            }
        }
        
        // Track teleport chain
        if (itemType === 'teleport') {
            player.combos.teleportChain++;
            if (player.combos.teleportChain > 1 && !player.stats.combosPerformed.includes('teleport_chain')) {
                player.stats.combosPerformed.push('teleport_chain');
                checkAchievement('combo_master', player.stats.combosPerformed.length >= 3);
            }
        } else {
            player.combos.teleportChain = 0;
        }
    }

    function renderHotbar() {
        const hotbar = document.getElementById('hotbar');
        hotbar.innerHTML = '';
        
        for (let i = 0; i < 5; i++) {
            const slot = document.createElement('div');
            slot.className = `hotbar-slot ${i === player.hotbarIndex ? 'selected' : ''}`;
            
            if (i < player.belt.length) {
                const item = player.belt[i];
                const icon = document.createElement('div');
                icon.className = `hotbar-icon inventory-${item.type}`;
                icon.textContent = ITEM_ICONS[item.type];
                 
                const tooltip = document.createElement('div');
                tooltip.className = 'item-tooltip';
                tooltip.textContent = ITEM_DESCRIPTIONS[item.type];
                
                const count = document.createElement('div');
                count.className = 'item-count';
                count.textContent = item.value;
                
                slot.appendChild(icon);
                slot.appendChild(tooltip);
                slot.appendChild(count);
                
                // Add click handler to select this slot
                slot.addEventListener('click', () => {
                    player.hotbarIndex = i;
                    renderHotbar();
                });
            } else {
                slot.className += ' empty';
                slot.textContent = '-';
                
                // Add click handler to select this slot
                slot.addEventListener('click', () => {
                    player.hotbarIndex = i;
                    renderHotbar();
                });
            }
            
            hotbar.appendChild(slot);
        }
    }
    
    function renderStatusEffects() {
        const container = document.getElementById('status-effects');
        container.innerHTML = '';
        
        if (player.tempDefenseTurns > 0) {
            const effect = document.createElement('div');
            effect.className = 'status-effect status-shield';
            effect.textContent = `Shield: ${player.tempDefense} DEF (${player.tempDefenseTurns} turns)`;
            container.appendChild(effect);
        }
        
        if (player.statusEffects.rage && player.statusEffects.rage > 0) {
            const effect = document.createElement('div');
            effect.className = 'status-effect status-rage';
            effect.textContent = `Rage: +${player.attack - (2 + (player.upgrades.attack || 0))} ATK (${player.statusEffects.rage} turns)`;
            container.appendChild(effect);
        }
        if (player.tempStrengthTurns > 0) {
            const effect = document.createElement('div');
            effect.className = 'status-effect status-strength';
            effect.textContent = `Strength: ${player.tempStrength} STR (${player.tempStrengthTurns} turns)`;
            container.appendChild(effect);
        }
        if (player.statusEffects.burning && player.statusEffects.burning > 0) {
            const effect = document.createElement('div');
            effect.className = 'status-effect status-burning';
            effect.textContent = `Burning: (${player.statusEffects.burning} turns)`;
            container.appendChild(effect);
        }
        if (player.statusEffects.poisoned && player.statusEffects.poisoned > 0) {
            const effect = document.createElement('div');
            effect.className = 'status-effect status-poisoned';
            effect.textContent = `Poisoned: (${player.statusEffects.poisoned} turns)`;
            container.appendChild(effect);
        }
    }

    function checkAchievement(id, condition) {
        if (condition && !player.achievements[id]) {
            player.achievements[id] = true;
            localStorage.setItem('playerAchievements', JSON.stringify(player.achievements));
            
            // Show achievement popup
            const popup = document.getElementById('achievement-popup');
            const desc = document.getElementById('achievement-desc');
            
            desc.textContent = ACHIEVEMENTS[id].name + ": " + ACHIEVEMENTS[id].desc;
            popup.style.display = 'block';
            
            setTimeout(() => {
                popup.style.display = 'none';
            }, 3000);
        }
    }

    function showAchievements() {
        let message = "Achievements:\n\n";
        for (const id in ACHIEVEMENTS) {
            const earned = player.achievements[id] ? "✓ " : "○ ";
            message += earned + ACHIEVEMENTS[id].name + ": " + ACHIEVEMENTS[id].desc + "\n";
        }
        alert(message);
    }

    function selectClass(className) {
        player.class = className;
        localStorage.setItem('playerClass', className);
        
        // Apply class bonuses
        switch(className) {
            case 'warrior':
                let bonus = Math.max(Math.floor(player.upgrades.hp/5), 5) || 5;
                player.maxHp += bonus;
                player.hp += bonus;
                player.defense += Math.max(Math.floor(player.upgrades.defense/10), 3) || 3;
                break;
            case 'rogue':
                player.attack += Math.max(Math.floor(player.upgrades.attack/5), 3) || 3;
                break;
            case 'mage':
                // Mage bonus is applied in status update
                break;
        }
        
        document.getElementById('character-select').style.display = 'none';
        addCombatLog(`You are now a ${className}!`);
        render();
    }

    function showClassSelect() {
        document.getElementById('character-select').style.display = 'block';
    }
function generateShopItems() {
  let shopItemsContainer = document.getElementById('shop-items-container');
  if (!shopItemsContainer) {
    const shopContainer = document.getElementById('shop-screen');
    shopContainer.innerHTML = `
      <h3>Shop</h3      <p>Coins: <span id="shop-coins">0</span></p      <div id="shop-items-container"></div      <button onclick="Game.closeShop()" style="margin-top:10px">Leave Shop</button    `;
    shopItemsContainer = document.getElementById('shop-items-container');
  }

  const itemTypes = [...ITEM_TYPES];
  const randomItems = [];

  // Select 3 random items from the ITEM_TYPES list
  for (let i = 0; i < 3; i++) {
    const randomIndex = Math.floor(Math.random() * itemTypes.length);
    const randomItem = itemTypes.splice(randomIndex, 1)[0];
    randomItems.push(randomItem);
  }

  // Generate HTML for each random item
  const shopItemsHtml = randomItems.map((item, index) => {
    let itemName, itemDescription, itemPrice, itemValue;
    switch (item) {
      case 'health':
        itemValue = currentFloor * 2;
        itemName = 'Health Potion';
        itemDescription = `Restore 10 HP`;
        itemPrice = 10;
        break;
      case 'fireball':
        itemValue = currentFloor * 3;
        itemName = 'Fireball Scroll';
        itemDescription = `Deal ${itemValue} damage to nearby enemies`;
        itemPrice = 15;
        break;
      case 'teleport':
        itemValue = 3;
        itemName = 'Teleport Scroll';
        itemDescription = `Teleport to a random location ${itemValue} times`;
        itemPrice = 20;
        break;
      case 'poison':
        itemValue = currentFloor * 2;
        itemName = 'Poison Potion';
        itemDescription = `Deal ${itemValue} damage to nearby enemies`;
        itemPrice = 12;
        break;
      case 'shield':
        itemValue = currentFloor;
        itemName = 'Shield Scroll';
        itemDescription = `Reduce damage by ${itemValue}`;
        itemPrice = 18;
        break;
      case 'scroll':
        itemValue = currentFloor * 5;
        itemName = 'Lightning Scroll';
        itemDescription = `Target nearest enemy for ${itemValue} damage`;
        itemPrice = 10;
        break;
      case 'strength':
        itemValue = currentFloor;
        itemName = 'Strength Potion';
        itemDescription = `Increased attack by ${itemValue}`;
        itemPrice = 20;
        break;
      case 'freeze':
        itemValue = 3;
        itemName = 'Freeze Scroll';
        itemDescription = `Freeze enemies ${itemValue} times`;
        itemPrice = 15;
        break;
      default:
        itemName = 'Sorry';
        itemDescription = 'Out of Stock';
        itemPrice = 0;
    }

    return `
      <div class="shop-item">
      ${itemName} (${itemDescription})
      <button onclick="Game.buyItem('${item}', ${itemPrice}, ${itemValue})">${itemPrice} coins</button>
    </div>`;
  }).join('');
if (!shopItemsContainer) {
  const shopContainer = document.getElementById('shop-screen');
  shopContainer.innerHTML = `
    <h3>Shop</h3>
    <p>Coins: <span id="shop-coins">0</span></p>
    <div id="shop-items-container"></div>
    <button onclick="Game.closeShop()" style="margin-top:10px">Leave Shop</button>
  `;
  shopItemsContainer = document.getElementById('shop-items-container');
}

  // Add the generated HTML to the shop items container
  shopItemsContainer.innerHTML = shopItemsHtml;
}
    function showShop() {
        generateShopItems();
        document.getElementById('shop-coins').textContent = player.coins;
        document.getElementById('shop-screen').style.display = 'block';
    }

    function closeShop() {
        document.getElementById('shop-screen').style.display = 'none';
    }

    function buyItem(type, cost, value) {
  if (player.coins >= cost) {
    player.coins -= cost;
    player.stats.coinsSpent += cost;
    // Check for shopaholic achievement
    checkAchievement('shopaholic', player.stats.coinsSpent >= 100);
    // Add item to inventory if belt is full
    if (player.belt.length === 5) {
      player.inventory.push({ type, value });
    } else {
      player.belt.push({ type, value });
    }
    addCombatLog(`Bought ${type} item!`);
    document.getElementById('shop-coins').textContent = player.coins;
    render();
  } else {
    addCombatLog("Not enough coins!");
  }
}

    function render() {
        let display = '';
        for(let y = 0; y < HEIGHT; y++) {
            for(let x = 0; x < WIDTH; x++) {
                let cell = dungeon[y][x];
                let enemy = enemies.find(e => e.x === x && e.y === y && e.alive);
                let item = items.find(i => i.x === x && i.y === y);
                let trap = traps.find(t => t.x === x && t.y === y && t.active);
                let poisonCloud = poisonClouds.find(p => p.x === x && p.y === y);
                let fireTile = fireTiles.find(f => f.x === x && f.y === y);
                
                if(player.x === x && player.y === y) {
                    const cls = player.statusEffects.rage > 0 ? 'player-rage' : 'player';
                    display += `<span class="${cls}">${tiles.player}</span>`;
                } else if(enemy) {
                    let cls = 'enemy';
                    let symbol = tiles.enemy;
                    
                    if (enemy.isBoss) {
                        cls = 'boss';
                        symbol = tiles.boss;
                    } else if (enemy.isDragon) {
                        cls = 'dragon';
                        symbol = tiles.dragon;
                    } else if (enemy.isMimic) {
                        cls = 'mimic';
                        symbol = tiles.mimic;
                    } else if (enemy.type === 'ghost') {
                        cls = 'ghost';
                        symbol = tiles.ghost;
                    } else if (enemy.type === 'golem') {
                        cls = 'golem';
                        symbol = tiles.golem;
                    } else if (enemy.type === 'thief') {
                        cls = 'thief';
                        symbol = tiles.thief;
                    } else if (enemy.type === 'summoner') {
                        cls = 'summoner';
                        symbol = tiles.summoner;
                    } else if (enemy.isShopkeeper) {
                        cls = 'shop';
                        symbol = tiles.shop;
                    } else if (enemy.type === 'berserker') {
                        cls = 'berserker';
                        symbol = tiles.berserker;
                    }  else if (enemy.isUnknown) {
                        cls = 'unknown';
                        symbol = tiles.unknown;
                    }
                    
                    // Add frozen effect
                    if (enemy.frozen > 0) {
                        cls += ' frozen';
                    }
                    
                    display += `<span class="${cls}">${symbol}</span>`;
                } else if(item) {
                    // Check if item is a mimic
                    if (item.isMimic) {
                        display += `<span class="mimic-item">${tiles.item}</span>`;
                    } else {
                        display += `<span class="item">${tiles.item}</span>`;
                    }
                } else if(trap) {
                    display += `<span class="trap">${tiles.trap}</span>`;
                } else if(poisonCloud) {
                    display += `<span class="hazard" style="color:#00ff00">${tiles.hazard}</span>`;
                } else if(fireTile) {
                    display += `<span class="hazard" style="color:#ff5500">${tiles.hazard}</span>`;
                } else {
                    const cls = cell === tiles.wall ? 'wall' : cell === tiles.stairs ? 'stairs' : 'floor';
                    display += `<span class="${cls}">${cell}</span>`;
                }
            }
            display += '\n';
        }
        
        document.getElementById('game').innerHTML = display;
        document.getElementById('stats').innerHTML = `
            <span class="stat-item">HP:${player.hp}/${player.maxHp}</span>
            <span class="stat-item">F:${currentFloor}</span>
            <span class="stat-item">COINS:${player.coins}</span>
            <span class="stat-item">STASH:${coins}</span>
            <span class="stat-item">ATK:${player.attack + player.tempStrength}</span>
            <span class="stat-item">ARMOR:${player.defense + player.tempDefense}</span>
            <span class="stat-item">RAGE:${player.rage}%</span>
        `;
            
        renderHotbar();
        renderStatusEffects();
        
        // Show/hide touch controls based on device
        // document.getElementById('touch-controls').style.display = isMobile ? 'flex' : 'none';
    }

    return {
        init() {
            // Check if first time playing
            if (!localStorage.getItem('dungeonCoins')) {
                localStorage.setItem('dungeonCoins', '0');
                setTimeout(showTutorial, 10);
                setTimeout(() => {
                    storyHelper('opening', true);
                }, 100);
                resetGame();
            } else {
                storyHelper('opening', false); 
                resetGame();
            }
            
            // Load achievements
            if (localStorage.getItem('playerAchievements')) {
                player.achievements = JSON.parse(localStorage.getItem('playerAchievements'));
            }
            showClassSelect();
           if (player.joystick) {
            // Add joystick functionality
            const joystickContainer = document.getElementById('joystick-container');
            const joystickHandle = document.getElementById('joystick-handle');
            const joystickBase = document.getElementById('joystick-base');

            // Add toggle button for joystick
            const toggleButton = document.createElement('button');
            toggleButton.id = 'toggle-joystick';
            toggleButton.textContent = 'Joystick';
            toggleButton.addEventListener('click', function() {
                if (joystickContainer.style.display === 'none') {
                    joystickContainer.style.display = 'block';
                    document.getElementById('dpad').style.display = 'none';
                } else {
                    joystickContainer.style.display = 'none';
                    document.getElementById('dpad').style.display = 'grid';
                }
            });
            document.getElementById('controls').appendChild(toggleButton);

            // Joystick movement variables
            let joystickActive = false;
            let moveInterval = null;
            let currentDirection = null;
            const joystickMoveDelay = 150; // milliseconds between moves

            // Mouse event handlers
            joystickBase.addEventListener('mousedown', handleMouseDown);
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);

            // Touch event handlers
            joystickBase.addEventListener('touchstart', handleTouchStart);
            joystickBase.addEventListener('touchmove', handleTouchMove);
            joystickBase.addEventListener('touchend', handleTouchEnd);
            joystickBase.addEventListener('touchcancel', handleTouchEnd);

            function handleMouseDown(e) {
                e.preventDefault();
                joystickActive = true;
                joystickHandle.classList.add('joystick-active');
                updateJoystickPosition(e);
            }

            function handleMouseMove(e) {
                if (joystickActive) {
                    e.preventDefault();
                    updateJoystickPosition(e);
                }
            }

            function handleMouseUp(e) {
                if (joystickActive) {
                    e.preventDefault();
                    resetJoystick();
                }
            }

            function handleTouchStart(e) {
                e.preventDefault();
                joystickActive = true;
                joystickHandle.classList.add('joystick-active');
                updateJoystickPosition(e.touches[0]);
            }

            function handleTouchMove(e) {
                if (joystickActive) {
                    e.preventDefault();
                    updateJoystickPosition(e.touches[0]);
                }
            }

            function handleTouchEnd(e) {
                if (joystickActive) {
                    e.preventDefault();
                    resetJoystick();
                }
            }

            function updateJoystickPosition(input) {
                const rect = joystickBase.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                
                const deltaX = input.clientX - centerX;
                const deltaY = input.clientY - centerY;
                
                // Calculate distance from center
                const distance = Math.min(Math.sqrt(deltaX * deltaX + deltaY * deltaY), 25);
                
                // Calculate angle
                const angle = Math.atan2(deltaY, deltaX);
                
                // Position handle
                const handleX = Math.cos(angle) * distance;
                const handleY = Math.sin(angle) * distance;
                
                joystickHandle.style.transform = `translate(${handleX}px, ${handleY}px)`;
                
                // Determine direction based on angle
                let newDirection = null;
                
                if (distance > 10) { // Dead zone to prevent accidental movement
                    // Up
                    if (angle > -2.356 && angle < -0.785) {
                        newDirection = 'up';
                    }
                    // Right
                    else if (angle > -0.785 && angle < 0.785) {
                        newDirection = 'right';
                    }
                    // Down
                    else if (angle > 0.785 && angle < 2.356) {
                        newDirection = 'down';
                    }
                    // Left
                    else {
                        newDirection = 'left';
                    }
                }
                
                // If direction changed, update movement
                if (newDirection !== currentDirection) {
                    currentDirection = newDirection;
                    
                    // Clear any existing interval
                    if (moveInterval) {
                        clearInterval(moveInterval);
                        moveInterval = null;
                    }
                    
                    // Start new movement interval if there's a direction
                    if (currentDirection) {
                        // Move immediately on direction change
                        movePlayerInDirection(currentDirection);
                        
                        // Then set up interval for continuous movement
                        moveInterval = setInterval(() => {
                            movePlayerInDirection(currentDirection);
                        }, joystickMoveDelay);
                    }
                }
            }

            function movePlayerInDirection(direction) {
                const moves = {
                    'up': [0, -1],
                    'down': [0, 1],
                    'left': [-1, 0],
                    'right': [1, 0]
                };
                
                if (moves[direction]) {
                    movePlayer(...moves[direction]);
                }
            }

            function resetJoystick() {
                joystickActive = false;
                joystickHandle.classList.remove('joystick-active');
                joystickHandle.style.transform = 'translate(0, 0)';
                currentDirection = null;
                
                if (moveInterval) {
                    clearInterval(moveInterval);
                    moveInterval = null;
                }
            }
           }
            generateDungeon();
            
            // Add select button handler
            document.getElementById('btn-select').addEventListener('click', () => {
                if(confirm("WARNING: This will delete ALL progress!\nAre you sure?")) {
                    localStorage.clear();
                    location.reload();
                }
            });

            window.isGamePaused = false;
            
            // Add achievements button handler
            document.getElementById('btn-achievements').addEventListener('click', showAchievements);

            // Force proper initialization
            setTimeout(() => {
                render();
                const gameEl = document.getElementById('game');
                gameEl.style.display = 'none';
                gameEl.offsetHeight; // Trigger reflow
                gameEl.style.display = 'block';
            }, 50);

            // Event listeners
            const moves = { up: [0,-1], down: [0,1], left: [-1,0], right: [1,0] };
            
            document.querySelectorAll('[data-direction]').forEach(btn => {
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    const dir = this.dataset.direction;
                    movePlayer(...moves[dir]);
                });
            });

            document.getElementById('btn-b').addEventListener('click', cycleHotbar);
            document.getElementById('btn-a').addEventListener('click', useSelectedItem);
            document.getElementById('btn-start').addEventListener('click', () => {
                document.getElementById('confirm-end').style.display = 'block';
            });
            
            // Touch controls
            document.getElementById('touch-b').addEventListener('click', cycleHotbar);
            document.getElementById('touch-a').addEventListener('click', useSelectedItem);

            document.addEventListener('keydown', e => {
                const moves = {
                    ArrowUp: [0,-1],
                    ArrowDown: [0,1],
                    ArrowLeft: [-1,0],
                    ArrowRight: [1,0]
                };
                if(moves[e.key]) movePlayer(...moves[e.key]);
                
                // Hotbar cycling with number keys
                if (e.key >= '1' && e.key <= '5') {
                    player.hotbarIndex = parseInt(e.key) - 1;
                    renderHotbar();
                }
                
                // Use item with spacebar
                if (e.key === ' ') {
                    useSelectedItem();
                }
            });

            render();
        },
        confirmEndRun(confirm) {
            document.getElementById('confirm-end').style.display = 'none';
            if(confirm) {
                player.hp = 0;
                checkGameOver();
            }
        },
        buyUpgrade: (cost, effect, value) => buyUpgrade(cost, effect, value),
        startNewRun: () => startNewRun(),
        hideTutorial: () => hideTutorial(),
        selectClass: (className) => selectClass(className),
        buyItem: (type, cost, value) => buyItem(type, cost, value),
        closeShop: () => closeShop()
    };
})();

// Make Game globally available for HTML onclick handlers
window.Game = Game;

// Initialize after DOM loads
document.addEventListener('DOMContentLoaded', () => {
    Game.init();
});
</script>
<footer>
    <p><span>By ImPot8o - pot8o.dev - github.com/ImPot8o</span></p>
</footer>
</body>
</html>