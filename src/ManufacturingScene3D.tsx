import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

export type ManufacturingSceneKind = "ore" | "beneficiation" | "ironmaking" | "steelmaking" | "casting" | "inspection";
export type DownstreamModelKind = "bar" | "coil" | "beam" | "rod" | "component" | "fabrication";

type SceneProps = {
  stage: ManufacturingSceneKind | "downstream";
  model?: DownstreamModelKind;
  animated?: boolean;
  onUnavailable?: () => void;
  cinematic?: boolean;
};

function createScene(stage: SceneProps["stage"], model: DownstreamModelKind | undefined, mobile: boolean, cinematic: boolean) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 90);
  camera.position.set(cinematic ? 14 : 6.8, cinematic ? 8.6 : 4.7, cinematic ? 17 : 9.5);
  camera.lookAt(0, 0.7, 0);

  scene.add(new THREE.HemisphereLight(0xdce5ee, 0x14100c, 1.65));
  const keyLight = new THREE.DirectionalLight(0xe4e9ec, 3.2);
  keyLight.position.set(-4, 7, 5);
  scene.add(keyLight);
  const rimLight = new THREE.PointLight(0xf47721, stage === "steelmaking" || stage === "casting" ? 22 : 7, 15, 2);
  rimLight.position.set(2.8, 2.4, -2.7);
  scene.add(rimLight);
  const coolLight = new THREE.PointLight(0x7898a4, 12, 16, 2);
  coolLight.position.set(-3.8, 1.4, 1.5);
  scene.add(coolLight);

  const materials = {
    steel: new THREE.MeshStandardMaterial({ color: 0x727d84, metalness: 0.86, roughness: 0.3 }),
    brightSteel: new THREE.MeshStandardMaterial({ color: 0xb9c0c3, metalness: 0.88, roughness: 0.23 }),
    darkSteel: new THREE.MeshStandardMaterial({ color: 0x293137, metalness: 0.83, roughness: 0.43 }),
    concrete: new THREE.MeshStandardMaterial({ color: 0x333738, metalness: 0.15, roughness: 0.88 }),
    ore: new THREE.MeshStandardMaterial({ color: 0x594434, metalness: 0.2, roughness: 0.94, flatShading: true }),
    oreHighlight: new THREE.MeshStandardMaterial({ color: 0x87684b, metalness: 0.37, roughness: 0.79, flatShading: true }),
    accent: new THREE.MeshStandardMaterial({ color: 0x74512f, metalness: 0.67, roughness: 0.39 }),
    warm: new THREE.MeshStandardMaterial({ color: 0x9e4b16, metalness: 0.63, roughness: 0.3, emissive: 0x541e02, emissiveIntensity: 1.15 }),
    glow: new THREE.MeshStandardMaterial({ color: 0xf8892f, metalness: 0.45, roughness: 0.25, emissive: 0xc84406, emissiveIntensity: 2.4 }),
  };

  const assembly = new THREE.Group();
  scene.add(assembly);
  const animated: THREE.Object3D[] = [];

  const box = (parent: THREE.Object3D, size: [number, number, number], position: [number, number, number], material: THREE.Material, rotation: [number, number, number] = [0, 0, 0]) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.position.set(...position);
    mesh.rotation.set(...rotation);
    parent.add(mesh);
    return mesh;
  };
  const cylinder = (parent: THREE.Object3D, radiusTop: number, radiusBottom: number, height: number, position: [number, number, number], material: THREE.Material, segments = 20) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), material);
    mesh.position.set(...position);
    parent.add(mesh);
    return mesh;
  };
  const beam = (parent: THREE.Object3D, start: THREE.Vector3, end: THREE.Vector3, radius: number, material: THREE.Material) => {
    const direction = new THREE.Vector3().subVectors(end, start);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, direction.length(), 8), material);
    mesh.position.copy(start).add(end).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    parent.add(mesh);
    return mesh;
  };
  const addConveyor = (parent: THREE.Object3D, from: THREE.Vector3, to: THREE.Vector3, width = 1.2) => {
    const direction = new THREE.Vector3().subVectors(to, from);
    const center = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
    const incline = Math.atan2(direction.y, direction.x);
    const deck = box(parent, [direction.length(), 0.16, width], [center.x, center.y, center.z], materials.darkSteel, [0, 0, incline]);
    beam(parent, new THREE.Vector3(from.x, from.y - 0.22, from.z - width * 0.38), new THREE.Vector3(to.x, to.y - 0.22, to.z - width * 0.38), 0.045, materials.steel);
    beam(parent, new THREE.Vector3(from.x, from.y - 0.22, from.z + width * 0.38), new THREE.Vector3(to.x, to.y - 0.22, to.z + width * 0.38), 0.045, materials.steel);
    const rollerCount = mobile ? 5 : 9;
    for (let index = 0; index <= rollerCount; index += 1) {
      const progress = index / rollerCount;
      const point = from.clone().lerp(to, progress);
      cylinder(parent, 0.06, 0.06, width * 0.85, [point.x, point.y - 0.11, point.z], materials.brightSteel, 10).rotation.x = Math.PI / 2;
    }
    return deck;
  };
  const addTower = (parent: THREE.Object3D, position: [number, number, number], width = 0.9, height = 3.3) => {
    const [x, , z] = position;
    const frame = new THREE.Group();
    frame.position.set(x, 0, z);
    parent.add(frame);
    box(frame, [width, height, width], [0, height / 2, 0], materials.darkSteel);
    for (const side of [-1, 1]) {
      box(frame, [0.08, height, 0.08], [side * width * 0.44, height / 2, width * 0.44], materials.brightSteel);
      for (let row = 0; row < 3; row += 1) {
        const level = height * (row + 1) / 4;
        beam(frame, new THREE.Vector3(-width * 0.4, level, side * width * 0.39), new THREE.Vector3(width * 0.4, level + 0.16, side * width * 0.39), 0.035, materials.steel);
      }
    }
    box(frame, [width * 1.18, 0.12, width * 1.18], [0, height, 0], materials.brightSteel);
    return frame;
  };

  box(assembly, [17, 0.22, 14], [0, -0.3, 0], materials.concrete);
  const floorGrid = new THREE.GridHelper(16, 32, 0x596168, 0x32383b);
  floorGrid.position.y = -0.177;
  (floorGrid.material as THREE.Material).transparent = true;
  (floorGrid.material as THREE.Material).opacity = 0.24;
  assembly.add(floorGrid);

  if (stage === "ore") {
    const terrain = box(assembly, [7.6, 0.72, 4.6], [-2.7, 0.03, -1.65], materials.concrete, [0, 0.12, -0.08]);
    terrain.material = materials.ore;
    const rockGeometry = new THREE.IcosahedronGeometry(0.75, 1);
    for (let index = 0; index < (mobile ? 11 : 18); index += 1) {
      const rock = new THREE.Mesh(rockGeometry, index % 4 === 0 ? materials.oreHighlight : materials.ore);
      rock.position.set(-5.3 + (index % 5) * 1.12, 0.72 + Math.sin(index * 3.1) * 0.3, -3.2 + Math.floor(index / 5) * 0.96);
      rock.rotation.set(index * 0.31, index * 0.51, index * 0.73);
      rock.scale.set(0.82 + (index % 3) * 0.25, 0.62 + (index % 4) * 0.19, 0.65 + (index % 5) * 0.12);
      assembly.add(rock);
    }
    addConveyor(assembly, new THREE.Vector3(-2, 1.55, 0.9), new THREE.Vector3(4.6, 3.05, 0.9), 1.25);
    const crusher = new THREE.Group();
    crusher.position.set(2.7, 0.22, -1);
    assembly.add(crusher);
    box(crusher, [2.4, 2.45, 2], [0, 1.25, 0], materials.darkSteel);
    box(crusher, [2.6, 0.18, 2.2], [0, 2.52, 0], materials.brightSteel);
    cylinder(crusher, 0.48, 0.4, 1.6, [0, 1.38, 1.02], materials.accent, 12).rotation.z = Math.PI / 2;
    animated.push(crusher);
  } else if (stage === "beneficiation") {
    addTower(assembly, [-3.6, 0, -1.3], 1.3, 3.7);
    addTower(assembly, [2.2, 0, -1.2], 1.1, 3.1);
    addConveyor(assembly, new THREE.Vector3(-5.5, 1.2, 1.15), new THREE.Vector3(-0.2, 2.15, 1.15), 1.1);
    addConveyor(assembly, new THREE.Vector3(0.2, 1.65, 1.15), new THREE.Vector3(5, 1.65, 1.15), 1.1);
    for (const x of [-1.25, 0.15]) {
      cylinder(assembly, 0.83, 0.83, 1.1, [x, 1.75, -1.1], materials.steel, 24).rotation.z = Math.PI / 2;
      cylinder(assembly, 0.18, 0.18, 1.2, [x, 1.75, -1.1], materials.darkSteel, 16).rotation.z = Math.PI / 2;
    }
    for (let index = 0; index < (mobile ? 18 : 32); index += 1) {
      const particle = new THREE.Mesh(new THREE.IcosahedronGeometry(0.09, 0), index % 3 === 0 ? materials.accent : materials.oreHighlight);
      particle.position.set(-4 + (index % 8) * 0.5, 1.66 + Math.sin(index * 9.1) * 0.22, 1.15 + Math.cos(index * 5.3) * 0.26);
      assembly.add(particle);
      animated.push(particle);
    }
  } else if (stage === "ironmaking") {
    addTower(assembly, [-2.8, 0, -1.4], 1.8, 4.3);
    const vessel = cylinder(assembly, 1.15, 0.8, 3.3, [0, 1.55, -0.7], materials.steel, 28);
    cylinder(assembly, 1.17, 0.83, 0.22, [0, 3.18, -0.7], materials.brightSteel, 28);
    cylinder(assembly, 0.83, 0.65, 0.22, [0, -0.05, -0.7], materials.darkSteel, 28);
    animated.push(vessel);
    addTower(assembly, [3, 0, -1.4], 1.5, 3.6);
    addConveyor(assembly, new THREE.Vector3(-4.8, 3.05, 0.7), new THREE.Vector3(-1.1, 2.75, 0.7), 0.8);
    addConveyor(assembly, new THREE.Vector3(1.05, 2.35, 0.8), new THREE.Vector3(5, 1.2, 0.8), 0.9);
    for (const x of [-1.35, 1.35]) {
      const pipe = cylinder(assembly, 0.13, 0.13, 2.8, [x, 2.15, 1.8], materials.accent, 12);
      pipe.rotation.z = Math.PI / 2;
    }
  } else if (stage === "steelmaking") {
    const furnace = new THREE.Group();
    assembly.add(furnace);
    cylinder(furnace, 1.45, 1.25, 2.25, [-1.55, 1.1, -0.7], materials.steel, 32);
    cylinder(furnace, 1.47, 1.31, 0.3, [-1.55, 2.35, -0.7], materials.brightSteel, 32);
    cylinder(furnace, 1.24, 1.08, 0.2, [-1.55, -0.13, -0.7], materials.darkSteel, 32);
    cylinder(furnace, 0.84, 0.84, 0.27, [-1.55, 1.58, 0.31], materials.glow, 28);
    const roof = box(furnace, [2.2, 0.36, 1.9], [-1.55, 2.7, -0.7], materials.darkSteel);
    for (const x of [-2.1, -1.05]) {
      const electrode = cylinder(furnace, 0.1, 0.13, 1.45, [x, 2.92, -0.5], materials.brightSteel, 12);
      electrode.position.y = 2.05;
    }
    animated.push(roof);
    addTower(assembly, [3.7, 0, -1.3], 1.15, 3.2);
    const ladle = cylinder(assembly, 0.69, 0.51, 1.38, [2.35, 0.65, 1.1], materials.steel, 24);
    cylinder(assembly, 0.65, 0.65, 0.16, [2.35, 1.36, 1.1], materials.glow, 24);
    animated.push(ladle);
    beam(assembly, new THREE.Vector3(1.5, 2.7, 0.8), new THREE.Vector3(4.4, 2.7, 0.8), 0.09, materials.brightSteel);
  } else if (stage === "casting") {
    for (const x of [-3.2, -1.7]) addTower(assembly, [x, 0, -1.2], 0.72, 3.45);
    const mould = new THREE.Group();
    mould.position.set(-0.35, 2.65, -0.75);
    assembly.add(mould);
    box(mould, [1.5, 0.65, 1.15], [0, 0, 0], materials.brightSteel);
    const molten = box(mould, [0.96, 0.2, 0.78], [0, -0.37, 0], materials.glow);
    animated.push(molten);
    for (let index = 0; index < 3; index += 1) {
      addConveyor(assembly, new THREE.Vector3(0.4, 2 - index * 0.55, -0.3 + index * 0.55), new THREE.Vector3(5.2, 0.86, -0.3 + index * 0.55), 0.7);
    }
    const billet = box(assembly, [4.1, 0.38, 0.42], [2.6, 0.95, 0.4], materials.glow);
    animated.push(billet);
    for (const x of [-2.7, -0.5, 1.8, 4]) {
      const roller = cylinder(assembly, 0.18, 0.18, 1.15, [x, 0.62, 0.4], materials.brightSteel, 16);
      roller.rotation.x = Math.PI / 2;
      animated.push(roller);
    }
  } else if (stage === "inspection") {
    addConveyor(assembly, new THREE.Vector3(-5.3, 0.92, 0.4), new THREE.Vector3(5.25, 0.92, 0.4), 2.1);
    for (let index = 0; index < 5; index += 1) {
      const x = -3.8 + index * 1.85;
      box(assembly, [0.13, 2.8, 0.15], [x, 1.1, -1.15], materials.brightSteel);
      box(assembly, [0.13, 2.8, 0.15], [x, 1.1, 1.95], materials.steel);
      const crossBeam = box(assembly, [3.25, 0.12, 0.14], [x, 2.42, 0.4], materials.brightSteel);
      animated.push(crossBeam);
    }
    for (let row = 0; row < 2; row += 1) {
      for (let index = 0; index < 5; index += 1) {
        const billet = box(assembly, [1.45, 0.22, 0.25], [-3.4 + index * 1.55, 1.2 + row * 0.3, -2.5 + row * 0.57], materials.brightSteel);
        billet.rotation.y = -0.12;
      }
    }
    cylinder(assembly, 0.17, 0.17, 0.55, [0, 2.03, 0.4], materials.accent, 16);
  } else {
    if (model === "beam") {
      const shape = new THREE.Shape();
      shape.moveTo(-0.25, -1.4); shape.lineTo(0.25, -1.4); shape.lineTo(0.25, -0.25); shape.lineTo(1.1, -0.25);
      shape.lineTo(1.1, 0.25); shape.lineTo(0.25, 0.25); shape.lineTo(0.25, 1.4); shape.lineTo(-0.25, 1.4);
      shape.lineTo(-0.25, 0.25); shape.lineTo(-1.1, 0.25); shape.lineTo(-1.1, -0.25); shape.lineTo(-0.25, -0.25); shape.closePath();
      const section = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 4.2, bevelEnabled: true, bevelSize: 0.045, bevelThickness: 0.05, bevelSegments: 2 }), materials.brightSteel);
      section.position.z = -2.1;
      section.rotation.x = -0.08;
      assembly.add(section);
    } else if (model === "coil") {
      for (let index = 0; index < 9; index += 1) {
        const torus = new THREE.Mesh(new THREE.TorusGeometry(1.1 + (index % 2) * 0.13, 0.13, 8, 48), index % 2 ? materials.steel : materials.brightSteel);
        torus.position.set(0, 1 + index * 0.11, 0);
        torus.rotation.x = Math.PI / 2;
        assembly.add(torus);
      }
      cylinder(assembly, 0.42, 0.42, 1.35, [0, 1.4, 0], materials.darkSteel, 24);
    } else if (model === "component" || model === "fabrication") {
      const frame = new THREE.Group();
      assembly.add(frame);
      for (const x of [-1.7, 1.7]) {
        for (const z of [-1.1, 1.1]) box(frame, [0.16, 2.9, 0.16], [x, 1.15, z], materials.brightSteel);
      }
      for (const y of [0.1, 2.2]) box(frame, [3.8, 0.16, 2.4], [0, y, 0], materials.steel);
      for (const x of [-1.7, 1.7]) box(frame, [0.12, 0.12, 2.4], [x, 1.14, 0], materials.accent);
    } else {
      const profile = new THREE.Shape();
      profile.moveTo(-0.5, -0.5); profile.lineTo(0.5, -0.5); profile.lineTo(0.5, 0.34);
      profile.lineTo(0.3, 0.5); profile.lineTo(-0.3, 0.5); profile.lineTo(-0.5, 0.34); profile.closePath();
      const bar = new THREE.Mesh(new THREE.ExtrudeGeometry(profile, { depth: 5.6, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 2 }), materials.brightSteel);
      bar.position.z = -2.8;
      bar.rotation.set(0.12, 0.2, -0.15);
      assembly.add(bar);
      cylinder(assembly, 0.19, 0.19, 2.4, [0, 0.82, 0.2], materials.accent, 16).rotation.z = Math.PI / 2;
    }
  }

  const particleCount = mobile ? 20 : 42;
  const particlePositions = new Float32Array(particleCount * 3);
  for (let index = 0; index < particleCount; index += 1) {
    particlePositions[index * 3] = Math.sin(index * 14.19) * 6;
    particlePositions[index * 3 + 1] = Math.abs(Math.sin(index * 6.37)) * 3.5;
    particlePositions[index * 3 + 2] = Math.cos(index * 9.31) * 4.2;
  }
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
  const particlePoints = new THREE.Points(particleGeometry, new THREE.PointsMaterial({ color: 0xc4c9c9, size: mobile ? 0.025 : 0.035, transparent: true, opacity: 0.36, sizeAttenuation: true }));
  assembly.add(particlePoints);

  return { scene, camera, assembly, animated, rimLight };
}

export function ManufacturingScene3D({ stage, model, animated = true, onUnavailable, cinematic = false }: SceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef({ active: false, x: 0, y: 0 });
  const animatedRef = useRef(animated);
  const unavailableRef = useRef(onUnavailable);
  animatedRef.current = animated;
  unavailableRef.current = onUnavailable;

  useEffect(() => {
    const host = hostRef.current;
    if (!host || unavailable) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    } catch {
      setUnavailable(true);
      unavailableRef.current?.();
      return;
    }
    const mobile = window.matchMedia("(max-width: 700px)").matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.15 : 1.45));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;
    host.appendChild(renderer.domElement);
    const { scene, camera, assembly, animated: movingParts, rimLight } = createScene(stage, model, mobile, cinematic);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const cinematicStarted = performance.now();

    const resize = () => {
      const width = Math.max(host.clientWidth, 1);
      const height = Math.max(host.clientHeight, 1);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    resize();

    let visible = false;
    let frame = 0;
    let running = true;
    let elapsed = 0;
    const visibilityObserver = new IntersectionObserver((entries) => {
      visible = entries[0]?.isIntersecting ?? false;
      if (visible && frame === 0) frame = requestAnimationFrame(renderFrame);
    }, { rootMargin: "140px" });
    visibilityObserver.observe(host);

    const down = (event: PointerEvent) => {
      dragRef.current = { active: true, x: event.clientX, y: event.clientY };
      setDragging(true);
      renderer.domElement.setPointerCapture(event.pointerId);
    };
    const move = (event: PointerEvent) => {
      if (!dragRef.current.active) return;
      assembly.rotation.y += (event.clientX - dragRef.current.x) * 0.008;
      assembly.rotation.x = THREE.MathUtils.clamp(assembly.rotation.x + (event.clientY - dragRef.current.y) * 0.006, -0.55, 0.55);
      dragRef.current.x = event.clientX;
      dragRef.current.y = event.clientY;
    };
    const up = () => {
      dragRef.current.active = false;
      setDragging(false);
    };
    renderer.domElement.addEventListener("pointerdown", down);
    renderer.domElement.addEventListener("pointermove", move);
    renderer.domElement.addEventListener("pointerup", up);
    renderer.domElement.addEventListener("pointercancel", up);
    renderer.domElement.addEventListener("lostpointercapture", up);
    const contextLost = (event: Event) => {
      event.preventDefault();
      setUnavailable(true);
      unavailableRef.current?.();
    };
    renderer.domElement.addEventListener("webglcontextlost", contextLost);

    const renderFrame = () => {
      if (!running || !visible) {
        frame = 0;
        return;
      }
      frame = requestAnimationFrame(renderFrame);
      if (!reducedMotion.matches) {
        elapsed += 0.016;
        if (cinematic) {
          const progress = Math.min((performance.now() - cinematicStarted) / 2600, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          camera.position.set(14 - eased * 7.2, 8.6 - eased * 3.9, 17 - eased * 7.5);
          camera.lookAt(0, 0.7, 0);
        }
        if (animatedRef.current && !dragRef.current.active) assembly.rotation.y += 0.0016;
        if (animatedRef.current) movingParts.forEach((part, index) => {
          if (part instanceof THREE.Mesh && part.geometry.type === "CylinderGeometry") part.rotation.y += 0.009;
          if (stage === "beneficiation" && part.position.x < 5) part.position.x = -4 + ((part.position.x + 4 + 0.018) % 8);
          if (stage === "casting" && index === 0) part.position.x = 0.4 + ((part.position.x + 0.4 + 0.009) % 4.8);
        });
        if (stage === "steelmaking") {
          rimLight.intensity = 17 + Math.sin(elapsed * 1.4) * 2.2;
        }
      }
      renderer.render(scene, camera);
    };
    if (visible) frame = requestAnimationFrame(renderFrame);

    return () => {
      running = false;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      renderer.domElement.removeEventListener("pointerdown", down);
      renderer.domElement.removeEventListener("pointermove", move);
      renderer.domElement.removeEventListener("pointerup", up);
      renderer.domElement.removeEventListener("pointercancel", up);
      renderer.domElement.removeEventListener("lostpointercapture", up);
      renderer.domElement.removeEventListener("webglcontextlost", contextLost);
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments || object instanceof THREE.Points || object instanceof THREE.GridHelper) {
          object.geometry.dispose();
          const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
          objectMaterials.forEach((material) => material.dispose());
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [stage, model, cinematic, unavailable]);

  if (unavailable) {
    return <div className="manufacturing-scene-fallback" role="img" aria-label="Conceptual manufacturing scene unavailable; descriptive information remains available below"><span className="manufacturing-fallback-shape" aria-hidden="true" /><small>3D preview unavailable · conceptual scene</small></div>;
  }

  return <div className={`manufacturing-scene-canvas${dragging ? " is-dragging" : ""}`} ref={hostRef} role="img" aria-label={`Interactive conceptual ${stage === "downstream" ? `${model ?? "steel"} product` : `${stage.replace("-", " ")} process`} scene. Drag to rotate.`} />;
}
