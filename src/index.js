import { network, Encryption } from 'socket:network'
import process from 'socket:process'
import Buffer from 'socket:buffer'
import fs from 'socket:fs'

import * as THREE from './three.module.js'
import { OrbitControls } from './orbit.js'

const pantonePalette = [
  0xE74C3C,
  0x3498DB,
  0x2ECC71,
  0xF39C12,
  0x9B59B6,
  0x1ABC9C,
  0xD35400,
  0x2980B9,
  0xC0392B,
  0x16A085,
  0xF1C40F,
  0x8E44AD,
  0x2C3E50,
  0xE67E22,
  0x27AE60,
  0xD35400,
  0x3498DB,
  0x9B59B6,
  0xF39C12,
  0x16A085,
  0xC0392B,
  0x1ABC9C,
  0xE74C3C,
  0x2980B9,
  0x2ECC71,
  0xF1C40F,
  0x8E44AD,
  0x3498DB,
  0xC0392B,
  0x16A085,
  0xE67E22
]

function getRandomPantoneColor () {
  const randomIndex = Math.floor(Math.random() * pantonePalette.length)
  return pantonePalette[randomIndex]
}

function buildGame (subcluster) {
  const scene = new THREE.Scene()
  const w = window.innerWidth
  const h = window.innerHeight
  const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 100)
  camera.position.set(0, 5, 10)
  camera.lookAt(scene.position)

  const renderer = new THREE.WebGLRenderer({ antialias: true }) // Enable antialiasing for smoother lines
  renderer.setSize(w, h)
  document.body.innerHTML = ''
  document.body.appendChild(renderer.domElement)

  const controls = new OrbitControls(camera, renderer.domElement)

  const grid = new THREE.GridHelper(10, 10, 0x000000, 0x000000)
  scene.add(grid)

  const planeGeometry = new THREE.PlaneGeometry(10, 10, 10, 10)

  const planeMaterial = new THREE.MeshBasicMaterial({ color: 0xaaaaaa, wireframe: true, transparent: true, opacity: 0 })
  const plane = new THREE.Mesh(planeGeometry, planeMaterial)
  plane.rotation.x = -Math.PI / 2
  scene.add(plane)

  const voxelSize = 1
  const voxelColor = getRandomPantoneColor()

  const voxels = []
  let isMouseDown = false
  let clickTimeout

  const placeholderVoxelGeometry = new THREE.BoxGeometry(voxelSize, voxelSize, voxelSize)
  const placeholderVoxelMaterial = new THREE.MeshBasicMaterial({ color: voxelColor, transparent: true, opacity: 0.5 })
  const placeholderVoxel = new THREE.Mesh(placeholderVoxelGeometry, placeholderVoxelMaterial)
  scene.add(placeholderVoxel)

  window.addEventListener('mousedown', (event) => {
    isMouseDown = true
    if (event.shiftKey) {
      removeVoxel(event)
    } else {
      clickTimeout = setTimeout(() => {
        isMouseDown = false
      }, 200)
    }
  })

  window.addEventListener('mouseup', (event) => {
    if (!event.shiftKey && isMouseDown) {
      clearTimeout(clickTimeout)
      addVoxel(event, voxelColor)
    }
    // Reset placeholder voxel opacity on mouse up
    placeholderVoxel.material.opacity = 0.5

    // Position the placeholder voxel based on the intersection with the grid or closest voxel
    positionPlaceholderVoxel(event)
  })

  window.addEventListener('mousemove', (event) => {
    movePlaceholderVoxel(event)
  })

  // Replace 'mousedown' event with 'pointerdown' event
  window.addEventListener('pointerdown', (event) => {
    isMouseDown = true;
    if (event.shiftKey) {
      removeVoxel(event);
    } else {
      clickTimeout = setTimeout(() => {
        isMouseDown = false;
      }, 200);
    }
  });

  // Replace 'mouseup' event with 'pointerup' event
  window.addEventListener('pointerup', (event) => {
    if (!event.shiftKey && isMouseDown) {
      clearTimeout(clickTimeout);
      addVoxel(event, voxelColor);
    }
    // Reset placeholder voxel opacity on mouse/touch up
    placeholderVoxel.material.opacity = 0.5;

    // Position the placeholder voxel based on the intersection with the grid or closest voxel
    positionPlaceholderVoxel(event);
  });

  // Replace 'mousemove' event with 'pointermove' event
  window.addEventListener('pointermove', (event) => {
    movePlaceholderVoxel(event);
  });

  // Handle both touch and mouse events for compatibility
  window.addEventListener('touchstart', (event) => {
    event.preventDefault();
    isMouseDown = true;
    if (event.shiftKey) {
      removeVoxel(event.changedTouches[0]);
    } else {
      clickTimeout = setTimeout(() => {
        isMouseDown = false;
      }, 200);
    }
  });

  window.addEventListener('touchend', (event) => {
    event.preventDefault();
    if (!event.shiftKey && isMouseDown) {
      clearTimeout(clickTimeout);
      addVoxel(event.changedTouches[0], voxelColor);
    }
    // Reset placeholder voxel opacity on mouse/touch up
    placeholderVoxel.material.opacity = 0.5;

    // Position the placeholder voxel based on the intersection with the grid or closest voxel
    positionPlaceholderVoxel(event.changedTouches[0]);
  });

  window.addEventListener('touchmove', (event) => {
    event.preventDefault();
    movePlaceholderVoxel(event.changedTouches[0]);
  });

  // Function to check if dark mode is enabled
  function isDarkModeEnabled () {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  }

  // Function to handle mode changes
  function handleModeChange (e) {
    if (isDarkModeEnabled()) {
      grid.material.color.set(0xffffff)
      renderer.setClearColor(0x000000, 1)
      grid.material.needsUpdate = true
    } else {
      grid.material.color.set(0x000000)
      renderer.setClearColor(0xffffff, 1)
    }
  }

  // Check the initial mode
  handleModeChange()

  // Watch for changes in the prefers-color-scheme media query
  if (window.matchMedia) {
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    if (darkModeMediaQuery.addEventListener) {
      darkModeMediaQuery.addEventListener('change', handleModeChange)
    } else if (darkModeMediaQuery.addListener) {
      darkModeMediaQuery.addListener(handleModeChange)
    }
  }

  function addVoxel (event, color = getRandomPantoneColor()) {
    const mouse = new THREE.Vector2()
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(mouse, camera)

    const intersects = raycaster.intersectObjects(voxels.concat([plane]))

    if (intersects.length > 0) {
      const intersection = intersects[0]
      const voxelGeometry = new THREE.BoxGeometry(voxelSize, voxelSize, voxelSize)
      const voxelMaterial = new THREE.MeshBasicMaterial({ color })
      const voxel = new THREE.Mesh(voxelGeometry, voxelMaterial)

      // Create outline
      const outlineMaterial = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 })
      const voxelOutline = new THREE.LineSegments(new THREE.EdgesGeometry(voxelGeometry), outlineMaterial)
      voxelOutline.position.copy(voxel.position)
      voxelOutline.renderOrder = 1

      // Set the position of the voxel
      voxel.position.copy(intersection.point)
      voxel.position.y += voxelSize / 2
      voxel.position.divideScalar(voxelSize).floor().multiplyScalar(voxelSize).addScalar(voxelSize / 2)

      // Set the position of the outline
      voxelOutline.position.copy(voxel.position)

      // Add voxel and outline to the scene
      scene.add(voxel)
      scene.add(voxelOutline)

      // Associate the outline with the voxel
      voxel.outline = voxelOutline

      // Add voxel to the voxels array
      voxels.push(voxel)

      // Return the coordinates of the added voxel
      const co = {
        x: voxel.position.x,
        y: voxel.position.y - 0.5,
        z: voxel.position.z,
        color: voxelColor
      }

      for (const peer of subcluster.peers.values()) {
        peer.emit('add', co)
      }

      return co
    }

    // If no voxel was added, return null or any default value
    return null
  }

  function positionPlaceholderVoxel (event) {
    const mouse = new THREE.Vector2()
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(mouse, camera)
    const intersects = raycaster.intersectObjects(voxels.concat([plane]))

    if (intersects.length > 0) {
      const closestIntersection = intersects.reduce((prev, current) => prev.distance < current.distance ? prev : current)

      const gridPoint = new THREE.Vector3()
      gridPoint.copy(closestIntersection.point)
      gridPoint.y += voxelSize / 2
      gridPoint.divideScalar(voxelSize).floor().multiplyScalar(voxelSize).addScalar(voxelSize / 2)
      placeholderVoxel.position.copy(gridPoint)
    }
  }

  function movePlaceholderVoxel (event) {
    const mouse = new THREE.Vector2()
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(mouse, camera)
    const intersects = raycaster.intersectObjects(voxels.concat([plane]))

    if (intersects.length > 0) {
      const closestIntersection = intersects.reduce((prev, current) => prev.distance < current.distance ? prev : current)

      const gridPoint = new THREE.Vector3()
      gridPoint.copy(closestIntersection.point)
      gridPoint.y += voxelSize / 2
      gridPoint.divideScalar(voxelSize).floor().multiplyScalar(voxelSize).addScalar(voxelSize / 2)
      placeholderVoxel.position.copy(gridPoint)
    }
  }

  function removeVoxel (event) {
    const mouse = new THREE.Vector2()
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(mouse, camera)
    const intersects = raycaster.intersectObjects(voxels)

    if (intersects.length > 0) {
      const intersectedVoxel = intersects[0].object

      // Get the coordinates before removing the voxel
      const co = {
        x: intersectedVoxel.position.x,
        y: intersectedVoxel.position.y,
        z: intersectedVoxel.position.z,
        color: voxelColor
      }

      // Remove the voxel and its outline from the scene and the voxels array
      scene.remove(intersectedVoxel)

      const outline = intersectedVoxel.outline
      if (outline) scene.remove(outline)

      voxels.splice(voxels.indexOf(intersectedVoxel), 1)

      for (const peer of subcluster.peers.values()) {
        peer.emit('remove', co)
      }

      // Return the coordinates of the removed voxel
      return co
    }

    // If no voxel was removed, return null or any default value
    return null
  }

  function addVoxelAtCoordinates ({ x, y, z, color }) {
    const voxelGeometry = new THREE.BoxGeometry(voxelSize, voxelSize, voxelSize)
    const voxelMaterial = new THREE.MeshBasicMaterial({ color })
    const voxel = new THREE.Mesh(voxelGeometry, voxelMaterial)

    // Create outline
    const outlineMaterial = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 })
    const voxelOutline = new THREE.LineSegments(new THREE.EdgesGeometry(voxelGeometry), outlineMaterial)
    voxelOutline.position.set(x, y, z)
    voxelOutline.renderOrder = 1

    // Set the position of the voxel
    voxel.position.set(x, y + voxelSize / 2, z)
    voxel.position.divideScalar(voxelSize).floor().multiplyScalar(voxelSize).addScalar(voxelSize / 2)

    // Set the position of the outline
    voxelOutline.position.copy(voxel.position)

    // Add voxel and outline to the scene
    scene.add(voxel)
    scene.add(voxelOutline)

    // Associate the outline with the voxel
    voxel.outline = voxelOutline

    // Add voxel to the voxels array
    voxels.push(voxel)
  }

  function removeVoxelAtCoordinates ({ x, y, z }) {
    // Find the voxel at the specified coordinates
    const voxelToRemove = voxels.find(voxel => voxel.position.x === x && voxel.position.y === y && voxel.position.z === z)

    if (voxelToRemove) {
      // Remove the voxel and its outline from the scene and the voxels array
      scene.remove(voxelToRemove)
      const outline = voxelToRemove.outline
      if (outline) {
        scene.remove(outline)
      }
      voxels.splice(voxels.indexOf(voxelToRemove), 1)
      return true // Voxel successfully removed
    }

    return false // No voxel found at the specified coordinates
  }

  const animate = () => {
    window.requestAnimationFrame(animate)
    controls.update()
    renderer.render(scene, camera)
  }

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
  })

  subcluster.on('add', value => {
    try {
      value = JSON.parse(value)
    } catch {
      return
    }
    addVoxelAtCoordinates(value)
  })

  subcluster.on('remove', value => {
    try {
      value = JSON.parse(value)
    } catch {
      return
    }
    removeVoxelAtCoordinates(value)
  })

  animate()
}

window.onload = async () => {
  const peerId = await Encryption.createId()
  const signingKeys = await Encryption.createKeyPair()

  const clusterId = await Encryption.createClusterId('VOXELS')
  const sharedKey = await Encryption.createSharedKey('VOXELS')

  socket = window.socket = await network({ peerId, clusterId, signingKeys })

  socket.on('#ready', async () => {
    const sub = await socket.subcluster({ sharedKey })
    buildGame(sub)
  })
}
