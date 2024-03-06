
    import * as THREE from 'https://threejsfundamentals.org/threejs/resources/threejs/r127/build/three.module.js';
    import { PointerLockControls } from 'https://threejsfundamentals.org/threejs/resources/threejs/r127/examples/jsm/controls/PointerLockControls.js';
    
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.darkness = 0.2;
    document.body.appendChild(renderer.domElement);

    const gridSize = 1;
    const gridHeight = 0.5;
    const playerHeight = 2;
    const jumpVelocity = 1;
    let canJump = true;
    const gravity = 9.8 / 60;
    const jumpGravity = gravity * 2;
    const fallGravity = gravity / 2;
    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
    const player = new THREE.Mesh(geometry, material);
    player.castShadow = true;
    player.scale.y = playerHeight / gridHeight;
    scene.add(player);

    const groundGeometry = new THREE.PlaneGeometry(200, 200, 10, 10);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x4CAF50 });
    const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    const platformSize = 10;
    const platform = new THREE.Mesh(new THREE.BoxGeometry(platformSize, 2, platformSize), new THREE.MeshStandardMaterial({ color: 0xaaaaaa }));
    platform.receiveShadow = true;
    scene.add(platform);

    player.position.set(0, playerHeight / 2, 0);

    const controls = new PointerLockControls(camera, document.body);
    scene.add(controls.getObject());
    camera.position.y = playerHeight;

    const moveState = { forward: false, backward: false, left: false, right: false };
    const moveDirection = new THREE.Vector3();

    function handleKeyDown(event) {
        switch (event.key) {
            case 'w': moveState.forward = true; break;
            case 's': moveState.backward = true; break;
            case 'a': moveState.left = true; break;
            case 'd': moveState.right = true; break;
            case ' ':
                if (canJump) {
                    player.position.y += jumpVelocity;
                    canJump = false;
                    setTimeout(() => {
                        canJump = true;
                    }, 600);
                }
                break;
        }
    }

    function handleKeyUp(event) {
        switch (event.key) {
            case 'w': moveState.forward = false; break;
            case 's': moveState.backward = false; break;
            case 'a': moveState.left = false; break;
            case 'd': moveState.right = false; break;
        }
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const blocks = [];

    const particleSystem = new THREE.Points();
    scene.add(particleSystem);

    const positionUI = document.getElementById('position');
    const inventoryUI = document.getElementById('inventory');
    const feedbackUI = document.getElementById('feedback');

    let selectedBlockColor = 0;

    function updateUI() {
        positionUI.textContent = `Position: (${Math.round(player.position.x)}, ${Math.round(player.position.y)}, ${Math.round(player.position.z)})`;
        inventoryUI.textContent = `Inventory: ${blocks.length} blocks`;
        feedbackUI.textContent = `Selected Block Color: ${selectedBlockColor + 1}`;
    }

    function createParticle(position, color) {
        const particleGeometry = new THREE.BufferGeometry();
        const particleMaterial = new THREE.PointsMaterial({ color: color, size: 0.1 });
        const positions = [];
        for (let i = 0; i < 100; i++) {
            const x = (Math.random() - 0.5) * 2;
            const y = (Math.random() - 0.5) * 2;
            const z = (Math.random() - 0.5) * 2;
            positions.push(x, y, z);
        }
        particleGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        const particles = new THREE.Points(particleGeometry, particleMaterial);
        particles.position.copy(position);
        scene.add(particles);
        return particles;
    }

    function breakBlock() {
        const blockCollisionThreshold = 3;
        for (const block of blocks) {
            const distance = player.position.distanceTo(block.position);
            if (distance < blockCollisionThreshold) {
                const particleColor = block.material.color.clone();
                const particles = createParticle(block.position, particleColor);
                scene.remove(block);
                blocks.splice(blocks.indexOf(block), 1);
                const particleAnimation = () => {
                    particles.position.y -= 0.02;
                    particles.material.opacity -= 0.01;
                    if (particles.material.opacity <= 0) {
                        scene.remove(particles);
                        renderer.dispose();
                    } else {
                        requestAnimationFrame(particleAnimation);
                    }
                };
                particleAnimation();
                console.log('Block broken!');
                break;
            }
        }
    }

    function checkCollision() {
        const playerHeadPosition = controls.getObject().position.clone();
        playerHeadPosition.y += playerHeight;
        for (const block of blocks) {
            const blockBox = new THREE.Box3().setFromObject(block);
            const playerBox = new THREE.Box3().setFromObject(player);
            if (blockBox.intersectsBox(playerBox)) {
                player.position.y = block.position.y + block.geometry.parameters.height + playerHeight / 2;
            }
        }
    }

    function placeBlock() {
        const blockGeometry = new THREE.BoxGeometry();
        const blockMaterial = new THREE.MeshStandardMaterial({ color: getSelectedBlockColor() });
        const newBlock = new THREE.Mesh(blockGeometry, blockMaterial);
        newBlock.castShadow = true;
        newBlock.receiveShadow = true;
        const gridSize = 1;
        const playerDirection = new THREE.Vector3();
        controls.getObject().getWorldDirection(playerDirection);
        const distance = 2;
        const gridPosition = new THREE.Vector3().copy(player.position).addScaledVector(playerDirection, distance);
        gridPosition.x = Math.round(gridPosition.x / gridSize) * gridSize;
        gridPosition.y = Math.round(gridPosition.y / gridHeight) * gridHeight + gridHeight / 2;
        gridPosition.z = Math.round(gridPosition.z / gridSize) * gridSize;
        newBlock.position.copy(gridPosition);
        newBlock.userData = { collision: true };
        scene.add(newBlock);
        blocks.push(newBlock);
        console.log('Block placed!');
    }

    function placeTorch() {
        const torchGeometry = new THREE.CylinderGeometry(0.2, 0.1, 1, 16);
        const torchMaterial = new THREE.MeshStandardMaterial({ emissive: 0xFFD700, emissiveIntensity: 1, color: 0x000000 });
        const torch = new THREE.Mesh(torchGeometry, torchMaterial);
        const playerDirection = new THREE.Vector3();
        controls.getObject().getWorldDirection(playerDirection);
        const distance = 2;
        const torchPosition = new THREE.Vector3().copy(player.position).addScaledVector(playerDirection, distance);
        torch.position.copy(torchPosition);
        torch.castShadow = true;
        torch.receiveShadow = true;
        const torchLight = new THREE.PointLight(0xFFD700, 1, 5);
        torch.add(torchLight);
        torch.userData = { collision: true };
        scene.add(torch);
    }

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(-100, 30, -100);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    const sunGeometry = new THREE.SphereGeometry(5, 16, 16);
    const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00, visible: true });
    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    sun.position.set(-100, 40, -100);
    scene.add(sun);

    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    let isDaytime = true;
    const dayNightInterval = setInterval(() => {
        isDaytime = !isDaytime;
        if (isDaytime) {
            directionalLight.intensity = 1;
            ambientLight.intensity = 0.5;
            scene.background = new THREE.Color(0x87CEEB);
            sun.visible = true;
        } else {
            directionalLight.intensity = 0.2;
            ambientLight.intensity = 0.1;
            scene.background = new THREE.Color(0x000000);
            sun.visible = false;
        }
    }, 150000);

    function animate() {
        requestAnimationFrame(animate);
        camera.position.copy(player.position);

        const onGround = player.position.y <= playerHeight / 2 + gridHeight / 2;
        if (!onGround) {
            player.position.y -= fallGravity;
        }

        moveDirection.z = Number(moveState.forward) - Number(moveState.backward);
        moveDirection.x = Number(moveState.left) - Number(moveState.right);
        moveDirection.normalize();
        const moveSpeed = 0.1;
        const forward = new THREE.Vector3();
        controls.getObject().getWorldDirection(forward);
        forward.y = 0;
        const right = new THREE.Vector3();
        right.crossVectors(forward, new THREE.Vector3(0, 1, 0));
        const movement = new THREE.Vector3();
        movement.addScaledVector(forward, moveDirection.z);
        movement.addScaledVector(right, moveDirection.x);
        player.position.addScaledVector(movement, moveSpeed);
        checkCollision();
        const minY = groundMesh.position.y + gridHeight / 2 + playerHeight / 2;
        player.position.y = Math.max(minY, player.position.y);
        platform.position.y = minY + 1;
        updateUI();
        renderer.render(scene, camera);
    }

    function breakBlockOnLeftClick(event) {
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(blocks);
        if (intersects.length > 0) {
            breakBlock();
        }
    }

    document.addEventListener('mousemove', (event) => {
        if (controls.isLocked) {
            const movementX = event.movementX || 0;
            const movementY = event.movementY || 0;
            controls.move(movementX, movementY);
        }
    });

    document.addEventListener('click', (event) => {
        if (controls.isLocked) {
            if (event.button === 0) {
                breakBlockOnLeftClick(event);
            } else if (event.button === 2) {
                placeBlock();
            }
        } else {
            controls.lock();
        }
    });

    animate();

    function setSelectedBlockColor(index) {
        selectedBlockColor = index;
        updateUI();
        updateHotbarUI();
    }

    function getSelectedBlockColor() {
        const colors = [
            0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff, 0xffa500, 0x808080, 0x800000, 0x008000
        ];
        return colors[selectedBlockColor];
    }

    function updateHotbarUI() {
        const hotbarItems = document.querySelectorAll('.hotbar-item');
        hotbarItems.forEach((item, index) => {
            item.classList.toggle('selected', index === selectedBlockColor);
        });
    }

    for (let i = 0; i < 10; i++) {
        const trunk = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), new THREE.MeshStandardMaterial({ color: 0x8B4513 }));
        trunk.position.set(Math.random() * 200 - 100, gridHeight / 2, Math.random() * 200 - 100);
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        trunk.userData = { collision: true };
        scene.add(trunk);
        blocks.push(trunk);
        for (let j = 0; j < 3; j++) {
            const block = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x8B4513 }));
            block.position.y = 2 + j;
            block.position.x = trunk.position.x;
            block.position.z = trunk.position.z;
            block.castShadow = true;
            block.receiveShadow = true;
            block.userData = { collision: true, frustumCulled: false };
            scene.add(block);
            blocks.push(block);
        }
        for (let k = 0; k < 27; k++) {
            const leaves = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x00ff00, transparent: true, opacity: 0.7 }));
            leaves.position.x = trunk.position.x + ((k % 9) % 3 - 1);
            leaves.position.y = trunk.position.y + Math.floor((k % 9) / 3) + 4;
            leaves.position.z = trunk.position.z + Math.floor(k / 9) - 1;
            leaves.castShadow = true;
            leaves.receiveShadow = true;
            scene.add(leaves);
            blocks.push(leaves);
        }
        for (let l = 0; l < 20; l++) {
    const hill = new THREE.Mesh(new THREE.BoxGeometry(Math.floor(Math.random() * 5) + 5, 1, Math.floor(Math.random() * 5) + 5), new THREE.MeshStandardMaterial({ color: 0x00ff00 }));
    hill.position.set(Math.random() * 200 - 100, gridHeight / 2, Math.random() * 200 - 100);
    hill.castShadow = true;
    hill.receiveShadow = true;
    hill.userData = { collision: true };
    scene.add(hill);
    blocks.push(hill);
}
}



