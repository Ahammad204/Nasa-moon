import * as THREE from 'three';

// Deterministic scene picking from DOM clicks: raycast the live scene at the
// click's NDC and hand back the first hit (with instanceId for InstancedMesh).
// R3F's synthetic onClick proved unreliable under automation; plain DOM events
// + a real raycaster work everywhere.
export function attachPicker(
  dom: HTMLElement,
  camera: THREE.Camera,
  root: THREE.Object3D,
  onPick: (hit: THREE.Intersection) => void
): () => void {
  const raycaster = new THREE.Raycaster();
  raycaster.params.Line.threshold = 0.01; // wireframe/edges must not eat picks
  const ndc = new THREE.Vector2();

  const onClick = (e: MouseEvent) => {
    const rect = dom.getBoundingClientRect();
    ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObject(root, true);
    // Only tagged pickables count: decorative lines/meshes never intercept.
    const hit = hits.find((h) => Boolean(h.object.userData.kind));
    if (hit) onPick(hit);
  };

  dom.addEventListener('click', onClick);
  return () => dom.removeEventListener('click', onClick);
}
