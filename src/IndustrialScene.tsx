import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

type SceneKind = "billet" | "ore" | "process" | "logo" | "leadership";

const descriptions: Record<SceneKind, string> = {
  billet: "Interactive conceptual 3D steel billet. This visualization is not a production sample.",
  ore: "Interactive conceptual 3D mineral specimen. It is not a verified sample of company feedstock.",
  process: "Conceptual industrial forms only; this is not the final plant layout or equipment selection.",
  logo: "Approved Chalinze Steel Mills Ltd logo displayed on a three-dimensional, rotatable presentation plaque.",
  leadership: "Interactive three-dimensional architectural leadership stage visualization.",
};

export function IndustrialScene({ kind = "billet", size = "130" }: { kind?: SceneKind; size?: "130" | "150" }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const isPausedRef = useRef(false);
  const [unavailable, setUnavailable] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  isPausedRef.current = isPaused;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setUnavailable(true);
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 80);
    const mobile = window.matchMedia("(max-width: 680px)").matches;
    camera.position.set(0, kind === "logo" ? 0.15 : kind === "leadership" ? 1.1 : 1.6, kind === "logo" ? 10.2 : kind === "leadership" ? 13.5 : 8);
    if (kind === "leadership") camera.lookAt(0, 1, -0.5);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, kind === "leadership" && mobile ? 1.1 : 1.7));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    host.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);
    scene.add(new THREE.HemisphereLight(0xc9d8e7, 0x17120e, kind === "leadership" ? 1.7 : 2.4));
    const keyLight = new THREE.DirectionalLight(0xffe6c6, kind === "leadership" ? 2.8 : 4.2);
    keyLight.position.set(-4, 5, 6);
    scene.add(keyLight);
    const rimLight = new THREE.PointLight(0xf47721, kind === "leadership" ? 9 : 34, 20, 2);
    rimLight.position.set(3, -1.5, 3.5);
    scene.add(rimLight);
    const fillLight = new THREE.PointLight(0x8cb5dd, 16, 20, 2);
    fillLight.position.set(-4, 1.5, -2);
    scene.add(fillLight);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const metal = new THREE.MeshStandardMaterial({
      color: 0x89929c,
      metalness: 0.86,
      roughness: 0.29,
    });

    let logoTexture: THREE.Texture | undefined;

    if (kind === "logo") {
      const half = 2.42;
      const corner = 0.16;
      const plateShape = new THREE.Shape();
      plateShape.moveTo(-half + corner, -half);
      plateShape.lineTo(half - corner, -half);
      plateShape.quadraticCurveTo(half, -half, half, -half + corner);
      plateShape.lineTo(half, half - corner);
      plateShape.quadraticCurveTo(half, half, half - corner, half);
      plateShape.lineTo(-half + corner, half);
      plateShape.quadraticCurveTo(-half, half, -half, half - corner);
      plateShape.lineTo(-half, -half + corner);
      plateShape.quadraticCurveTo(-half, -half, -half + corner, -half);

      const plateGeometry = new THREE.ExtrudeGeometry(plateShape, {
        depth: 0.2,
        bevelEnabled: true,
        bevelSegments: 3,
        bevelSize: 0.045,
        bevelThickness: 0.04,
        curveSegments: 4,
      });
      const plate = new THREE.Mesh(
        plateGeometry,
        new THREE.MeshStandardMaterial({ color: 0x92703b, metalness: 0.86, roughness: 0.24 }),
      );
      plate.position.z = -0.13;
      group.add(plate);

      const frame = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.ShapeGeometry(plateShape)),
        new THREE.LineBasicMaterial({ color: 0xe8c982, transparent: true, opacity: 0.72 }),
      );
      frame.position.z = 0.12;
      group.add(frame);

      logoTexture = new THREE.TextureLoader().load(
        "/assets/brand/chalinze-logo-approved.webp",
        undefined,
        undefined,
        () => setUnavailable(true),
      );
      logoTexture.colorSpace = THREE.SRGBColorSpace;
      const artwork = new THREE.Mesh(
        new THREE.PlaneGeometry(4.58, 4.58),
        new THREE.MeshBasicMaterial({ map: logoTexture, toneMapped: false }),
      );
      artwork.position.z = 0.145;
      group.add(artwork);
      group.rotation.set(-0.08, -0.18, 0);
    } else if (kind === "billet") {
      const crossSection = size === "150" ? 1.96 : 1.7;
      const half = crossSection / 2;
      const shape = new THREE.Shape();
      shape.moveTo(-half + 0.1, -half);
      shape.lineTo(half - 0.1, -half);
      shape.lineTo(half, -half + 0.1);
      shape.lineTo(half, half - 0.1);
      shape.lineTo(half - 0.1, half);
      shape.lineTo(-half + 0.1, half);
      shape.lineTo(-half, half - 0.1);
      shape.lineTo(-half, -half + 0.1);
      shape.closePath();
      const billetGeometry = new THREE.ExtrudeGeometry(shape, {
        depth: 4.4,
        bevelEnabled: true,
        bevelSegments: 2,
        bevelSize: 0.045,
        bevelThickness: 0.045,
        curveSegments: 1,
      });
      billetGeometry.translate(0, 0, -2.2);
      const billet = new THREE.Mesh(billetGeometry, metal);
      billet.rotation.set(0.13, 0.1, -0.12);
      group.add(billet);
      const edge = new THREE.EdgesGeometry(billet.geometry);
      const wire = new THREE.LineSegments(edge, new THREE.LineBasicMaterial({ color: 0xe2e6e9, transparent: true, opacity: 0.4 }));
      wire.position.copy(billet.position);
      wire.rotation.copy(billet.rotation);
      group.add(wire);
    } else if (kind === "leadership") {
      const darkMetal = new THREE.MeshStandardMaterial({ color: 0x343b40, metalness: 0.84, roughness: 0.34 });
      const brightMetal = new THREE.MeshStandardMaterial({ color: 0x7a858b, metalness: 0.82, roughness: 0.32 });
      const orangeMetal = new THREE.MeshStandardMaterial({ color: 0x70401f, metalness: 0.68, roughness: 0.38, emissive: 0x140b04, emissiveIntensity: 0.12 });
      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(14, 18),
        new THREE.MeshStandardMaterial({ color: 0x171b1e, metalness: 0.58, roughness: 0.5 }),
      );
      floor.rotation.x = -Math.PI / 2;
      floor.position.set(0, -0.92, -3);
      group.add(floor);

      const dais = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.65, 0.22, 48), brightMetal);
      dais.position.set(0, -0.76, 0);
      group.add(dais);
      const daisInset = new THREE.Mesh(new THREE.CylinderGeometry(2.25, 2.35, 0.055, 48), darkMetal);
      daisInset.position.set(0, -0.62, 0);
      group.add(daisInset);

      for (const x of [-3.35, 3.35]) {
        const column = new THREE.Mesh(new THREE.BoxGeometry(0.24, 4.4, 0.32), metal);
        column.position.set(x, 1.25, -2.3);
        group.add(column);
        const columnFoot = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.12, 0.58), darkMetal);
        columnFoot.position.set(x, -0.94, -2.3);
        group.add(columnFoot);
      }

      const lintel = new THREE.Mesh(new THREE.BoxGeometry(7.1, 0.2, 0.4), brightMetal);
      lintel.position.set(0, 3.48, -2.3);
      group.add(lintel);
      const stageWall = new THREE.Mesh(new THREE.BoxGeometry(5.1, 2.65, 0.16), darkMetal);
      stageWall.position.set(0, 1.17, -2.48);
      group.add(stageWall);
      const lightRail = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.035, 0.035), orangeMetal);
      lightRail.position.set(0, -0.15, -2.37);
      group.add(lightRail);

      const particleCount = mobile ? 28 : 64;
      const positions = new Float32Array(particleCount * 3);
      for (let index = 0; index < particleCount; index += 1) {
        positions[index * 3] = Math.sin(index * 16.31) * 5;
        positions[index * 3 + 1] = -0.25 + (Math.abs(Math.sin(index * 4.73)) * 4.4);
        positions[index * 3 + 2] = -6 + Math.cos(index * 9.17) * 5;
      }
      const particleGeometry = new THREE.BufferGeometry();
      particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const particles = new THREE.Points(particleGeometry, new THREE.PointsMaterial({
        color: 0xc3cbd0,
        size: mobile ? 0.025 : 0.035,
        transparent: true,
        opacity: 0.55,
        sizeAttenuation: true,
      }));
      group.add(particles);
    } else if (kind === "ore") {
      const geometry = new THREE.IcosahedronGeometry(1.7, 2);
      const positions = geometry.attributes.position;
      for (let index = 0; index < positions.count; index += 1) {
        const variation = 0.82 + 0.36 * Math.abs(Math.sin(index * 19.17) * Math.cos(index * 2.31));
        positions.setXYZ(index, positions.getX(index) * variation, positions.getY(index) * variation, positions.getZ(index) * variation);
      }
      geometry.computeVertexNormals();
      const mineral = new THREE.MeshStandardMaterial({ color: 0x66402e, metalness: 0.3, roughness: 0.78, flatShading: true });
      group.add(new THREE.Mesh(geometry, mineral));
      const flecks = new THREE.Mesh(new THREE.IcosahedronGeometry(1.67, 1), new THREE.MeshStandardMaterial({ color: 0x9a6b3f, metalness: 0.72, roughness: 0.4, wireframe: true, transparent: true, opacity: 0.28 }));
      group.add(flecks);
    } else {
      const structures = new THREE.Group();
      for (let i = 0; i < 5; i += 1) {
        const height = 0.8 + (i % 3) * 0.36;
        const tower = new THREE.Mesh(new THREE.BoxGeometry(0.72, height, 0.75), metal);
        tower.position.set((i - 2) * 1.12, height / 2 - 0.8, (i % 2) * 0.55);
        structures.add(tower);
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.08, 12), new THREE.MeshStandardMaterial({ color: 0xf47721, metalness: 0.52, roughness: 0.32, emissive: 0x5c1f00, emissiveIntensity: 0.4 }));
        cap.position.set(tower.position.x, height - 0.76, tower.position.z);
        structures.add(cap);
      }
      const conveyor = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.15, 0.4), new THREE.MeshStandardMaterial({ color: 0x5e6670, metalness: 0.78, roughness: 0.38 }));
      conveyor.position.set(0, -0.48, 0.55);
      conveyor.rotation.z = -0.14;
      structures.add(conveyor);
      group.add(structures);
    }

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(kind === "leadership" ? 7 : 4.5, 64),
      new THREE.MeshBasicMaterial({ color: 0x15191d, transparent: true, opacity: 0.52 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = kind === "leadership" ? -0.96 : -1.42;
    scene.add(ground);

    const resize = () => {
      if (!host) return;
      const width = Math.max(host.clientWidth, 1);
      const height = Math.max(host.clientHeight, 1);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    let visible = true;
    let frame = 0;
    let running = true;
    const sceneEnteredAt = performance.now();
    const visibilityObserver = new IntersectionObserver((entries) => {
      visible = entries[0]?.isIntersecting ?? true;
      if (visible && frame === 0) frame = requestAnimationFrame(animate);
    });
    visibilityObserver.observe(host);

    let pointerDown = false;
    let previousX = 0;
    let previousY = 0;
    const down = (event: PointerEvent) => {
      pointerDown = true;
      previousX = event.clientX;
      previousY = event.clientY;
      renderer.domElement.setPointerCapture(event.pointerId);
    };
    const move = (event: PointerEvent) => {
      if (!pointerDown) return;
      group.rotation.y += (event.clientX - previousX) * 0.008;
      group.rotation.x += (event.clientY - previousY) * 0.006;
      previousX = event.clientX;
      previousY = event.clientY;
    };
    const up = () => { pointerDown = false; };
    renderer.domElement.addEventListener("pointerdown", down);
    renderer.domElement.addEventListener("pointermove", move);
    renderer.domElement.addEventListener("pointerup", up);
    renderer.domElement.addEventListener("pointercancel", up);
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      setUnavailable(true);
    };
    renderer.domElement.addEventListener("webglcontextlost", handleContextLost);

    const animate = () => {
      if (!running || !visible) {
        frame = 0;
        return;
      }
      frame = requestAnimationFrame(animate);
      if (kind === "leadership") {
        if (reducedMotion.matches) {
          camera.position.z = 8.5;
        } else {
          const progress = Math.min((performance.now() - sceneEnteredAt) / 1350, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          camera.position.z = 13.5 - eased * 5;
        }
      }
      if (!pointerDown && !isPausedRef.current && !reducedMotion.matches) {
        group.rotation.y += 0.002;
      }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      running = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      visibilityObserver.disconnect();
      renderer.domElement.removeEventListener("pointerdown", down);
      renderer.domElement.removeEventListener("pointermove", move);
      renderer.domElement.removeEventListener("pointerup", up);
      renderer.domElement.removeEventListener("pointercancel", up);
      renderer.domElement.removeEventListener("webglcontextlost", handleContextLost);
      logoTexture?.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments || object instanceof THREE.Points) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [kind, size, unavailable]);

  return (
    <div className="scene-wrap">
      {unavailable ? (
        <div className="scene-fallback" role="img" aria-label={`${descriptions[kind]} WebGL is unavailable.`}>
          {kind === "logo"
            ? <img className="logo-fallback-art" src="/assets/brand/chalinze-logo-approved.webp" alt="" />
            : <div className={`fallback-object fallback-${kind}`} aria-hidden="true" />}
          <span>3D preview unavailable in this browser</span>
        </div>
      ) : (
        <div className="scene-canvas" ref={hostRef} role="img" aria-label={descriptions[kind]} />
      )}
      {!unavailable && <div className="scene-controls">
        <span className="scene-hint">Drag to rotate</span>
        <button type="button" className="scene-toggle" onClick={() => setIsPaused((paused) => !paused)} aria-pressed={isPaused}>
          {isPaused ? "Resume rotation" : "Pause rotation"}
        </button>
      </div>}
      <p className="sr-only">{descriptions[kind]}</p>
    </div>
  );
}

export function LeadershipScene3D() {
  return <IndustrialScene kind="leadership" />;
}
