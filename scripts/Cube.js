    import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
    import { getDatabase, ref, set, onValue, remove, onDisconnect } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";
    
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

    const app = initializeApp(firebaseConfig);
    const db = getDatabase(app);

    // === GAME SETUP ===
    const canvas = document.getElementById('canvas');
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 1, 100);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(-10, 11, -10);
    scene.add(light);

    const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
    world.gravity.set(0, -9.82, 0);
let groundBodies;
    
// === BASE SETUP ===
const groundSize = 5;
const groundHeight = 1;

// Function to create a ground segment
function createGround(x, z, color = 0xcccccc) {
  const geometry = new THREE.BoxGeometry(groundSize, groundHeight, groundSize);
  const material = new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, -groundHeight / 2, z);
  scene.add(mesh);

  const body = new CANNON.Body({
    mass: 0,
    shape: new CANNON.Box(new CANNON.Vec3(groundSize / 2, groundHeight / 2, groundSize / 2)),
    position: new CANNON.Vec3(x, -groundHeight / 2, z)
  });
  world.addBody(body);

  return { mesh, body };
}

// Function to create an obstacle
function createObstacle(x, y, z, width, height, depth, color = 0xff0000) {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  const material = new THREE.MeshStandardMaterial({ color });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  scene.add(mesh);

  const body = new CANNON.Body({
    mass: 0,
    shape: new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, depth / 2)),
    position: new CANNON.Vec3(x, y, z)
  });
  world.addBody(body);

  return { mesh, body };
}

// === OBSTACLE COURSE SYSTEM ===
// Automatically generated obstacle course
function generateCourse(course, count = 200) {
  // Simple noise substitute for smooth variation
  function smoothNoise(i, scale = 0.8, amplitude = 8) {
    return Math.sin(i * scale) * amplitude + (Math.random() - 0.5) * 2;
  }

  let currentY = 0;

  for (let i = 0; i < count; i++) {
    // Vertical progression
    currentY += 3 + Math.random() * 2;

    // Organic side-to-side variation
    const x = smoothNoise(i, 0.2, 8);
    const z = smoothNoise(i + 100, 0.2, 4);

    // Randomized platform dimensions
    const width = 1 + Math.random() * 3;
    const height = 1 + Math.random() * 4;
    const depth = 1 + Math.random() * 3;

    // Occasionally add overhangs or tricky placements
    if (Math.random() < 0.15) {
      const overhangX = x + (Math.random() > 0.5 ? 4 : -4);
      const overhangY = currentY + 2 + Math.random() * 2;
      course.push(createObstacle(overhangX, overhangY, z, width, height, depth));
    }

    // Add the main climbing platform
    course.push(createObstacle(x, currentY, z, width, height, depth));

    // Every few platforms, add a "rest zone"
    if (i % 25 === 0 && i !== 0) {
      const restWidth = 8 + Math.random() * 4;
      const restDepth = 8 + Math.random() * 4;
      course.push(createObstacle(0, currentY, 0, restWidth, 1, restDepth));
    }


    // Gradually increase difficulty
    if (i > count * 0.5) {
      currentY += Math.random() * 1.5; // slightly larger gaps
    }
  }
}
 
function createObstacleCourse() {
  const course = [];

  // Ground segments
  course.push(createGround(0, 0));
  
  // Obstacle course setup
  generateCourse(course, 300, 3);
  groundBodies = course.map(item => item.body);

  return course;
}

// === BUILD THE COURSE ===
const obstacleCourse = createObstacleCourse();
 
    // === PLAYER SYSTEM ===
    const players = {};
    const myId = Math.random().toString(36).substring(2, 10);
    const roomId = "default-room"; // can be dynamic later

    function createPlayer(id, color = 0x00ff00) {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshStandardMaterial({ color });
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);

      const body = new CANNON.Body({
        mass: 1,
        position: new CANNON.Vec3(Math.random() * 4 - 2, 1, Math.random() * 4 - 2),
        shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5))
      });
      world.addBody(body);

      // Add collision event listener
      body.addEventListener("collide", (e) => handleCollision(id, e));

      players[id] = {
        mesh,
        body,
        state: "idle", // idle, walking, jumping
        grounded: true
      };
    }

function handleCollision(id, e) {
  const player = players[id];
  if (!player) return;

  // Check if the collision is with any ground body
  if (groundBodies.includes(e.body)) {
    player.grounded = true;
  }

  // Example: collision with collectible or obstacle
  if (e.body.userData && e.body.userData.type === "collectible") {
    console.log(`Player ${id} collected an item!`);
  }
}

    createPlayer(myId, 0x00ff00);

    const playerRef = ref(db, `rooms/${roomId}/players/${myId}`);
    set(playerRef, { x: 0, y: 1, z: 0, state: "idle" });
    onDisconnect(playerRef).remove();

    const playersRef = ref(db, `rooms/${roomId}/players`);
    onValue(playersRef, (snapshot) => {
      const data = snapshot.val() || {};
      for (const id in data) {
        if (!players[id] && id !== myId) createPlayer(id, 0xff0000);
        if (players[id] && id !== myId) {
          players[id].body.position.set(data[id].x, data[id].y, data[id].z);
          players[id].mesh.position.copy(players[id].body.position);
        }
      }
      for (const id in players) {
        if (!data[id]) {
          scene.remove(players[id].mesh);
          world.removeBody(players[id].body);
          delete players[id];
        }
      }
    });

    // === INPUT SYSTEM ===
    const joystick = document.getElementById('joystick');
    const joystickHandle = document.getElementById('joystick-handle');
    let joystickX = 0, joystickY = 0;

    joystick.addEventListener('touchmove', (event) => {
      const touch = event.touches[0];
      const rect = joystick.getBoundingClientRect();
      const dx = touch.clientX - (rect.left + rect.width / 2);
      const dy = touch.clientY - (rect.top + rect.height / 2);
      const distance = Math.min(Math.sqrt(dx * dx + dy * dy), rect.width / 2);
      const angle = Math.atan2(dy, dx);
      joystickX = (distance / (rect.width / 2)) * Math.cos(angle);
      joystickY = (distance / (rect.height / 2)) * Math.sin(angle);
      joystickHandle.style.transform = `translate(${joystickX * 30}px, ${joystickY * 30}px)`;
    });

    joystick.addEventListener('touchend', () => {
      joystickX = 0;
      joystickY = 0;
      joystickHandle.style.transform = `translate(0, 0)`;
    });

    const jumpButton = document.getElementById('jump-button');
    jumpButton.addEventListener('touchstart', () => {
      const me = players[myId];
      if (me && me.grounded) {
        me.body.velocity.y = 8;
        me.grounded = false;
        me.state = "jumping";
      }
    });

    // === GAME LOOP ===
    let lastUpdate = 0;
    function animate(time) {
      requestAnimationFrame(animate);
      world.step(1 / 60);

      const me = players[myId];
      if (me) {
        me.body.velocity.x = joystickX * -5;
        me.body.velocity.z = joystickY * -5;

        me.mesh.position.copy(me.body.position);
        me.mesh.quaternion.copy(me.body.quaternion);

        me.state = (joystickX !== 0 || joystickY !== 0) ? "walking" : "idle";

        const targetPosition = new THREE.Vector3(
          me.mesh.position.x,
          me.mesh.position.y + 5,
          me.mesh.position.z - 8
        );
        camera.position.lerp(targetPosition, 0.1);
        camera.lookAt(me.mesh.position);

        // Update Firebase every 150ms
        if (time - lastUpdate > 150) {
          set(playerRef, {
            x: me.body.position.x,
            y: me.body.position.y,
            z: me.body.position.z,
            state: me.state
          });
          lastUpdate = time;
        }
      }
    me.mesh.position.copy(me.body.position);
    me.mesh.quaternion.copy(me.body.quaternion);

    // Check if player fell off
    if (me.body.position.y < -10) {
      me.body.position.set(0, 1, 0);
      me.body.velocity.set(0, 0, 0);
    }
      renderer.render(scene, camera);
    }

    animate();