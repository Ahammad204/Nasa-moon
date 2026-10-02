import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { missions } from '../../lib/missions';
import { groupPayloads } from '../../lib/payloads';
import { attachPicker } from '../pick';
import { requestNavigate, scene, setPayloadFocus, useSceneFlags } from '../sceneStore';

const MISSION_R = 2.3;
const PAYLOAD_R = 4.3;

// Payload relationship graph (L05): mission nodes on an inner ring, payload
// groups on an outer ring, edges = carried-by (real `groupPayloads` data).
// Nodes are InstancedMesh (one draw batch per node type). Click a mission node
// → navigate to its detail; click a payload node → highlight its list card.
export default function PayloadsScene() {
  const groupRef = useRef<THREE.Group>(null);
  const missionRef = useRef<THREE.InstancedMesh>(null);
  const payloadRef = useRef<THREE.InstancedMesh>(null);
  const { gl, camera } = useThree();
  const { payloadFocus } = useSceneFlags();

  const data = useMemo(() => {
    const groups = groupPayloads(missions);
    const missionIds = [...new Set(missions.map((m) => m.id))];
    const missionPos = new Map<string, [number, number, number]>();
    missionIds.forEach((id, i) => {
      const a = (i / missionIds.length) * Math.PI * 2;
      missionPos.set(id, [Math.cos(a) * MISSION_R, 0, Math.sin(a) * MISSION_R]);
    });
    const payloadPos = new Map<string, [number, number, number]>();
    groups.forEach((g, i) => {
      const a = (i / groups.length) * Math.PI * 2;
      payloadPos.set(g.name, [
        Math.cos(a) * PAYLOAD_R,
        ((i % 5) - 2) * 0.35,
        Math.sin(a) * PAYLOAD_R,
      ]);
    });
    const segs: number[] = [];
    const cols: number[] = [];
    groups.forEach((g) =>
      g.entries.forEach((e) => {
        const p = missionPos.get(e.mission.id);
        const q = payloadPos.get(g.name);
        if (p && q) {
          segs.push(p[0], p[1], p[2], q[0], q[1], q[2]);
          cols.push(0.18, 0.45, 0.62, 0.12, 0.3, 0.42);
        }
      })
    );
    const edgeGeo = new THREE.BufferGeometry();
    edgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(segs, 3));
    edgeGeo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    return { groups, missionIds, missionPos, payloadPos, edgeGeo };
  }, []);

  useLayoutEffect(() => {
    const dummy = new THREE.Object3D();
    data.missionIds.forEach((id, i) => {
      const p = data.missionPos.get(id)!;
      dummy.position.set(p[0], p[1], p[2]);
      dummy.updateMatrix();
      missionRef.current?.setMatrixAt(i, dummy.matrix);
    });
    data.groups.forEach((g, i) => {
      const p = data.payloadPos.get(g.name)!;
      dummy.position.set(p[0], p[1], p[2]);
      dummy.updateMatrix();
      payloadRef.current?.setMatrixAt(i, dummy.matrix);
    });
    if (missionRef.current) missionRef.current.instanceMatrix.needsUpdate = true;
    if (payloadRef.current) payloadRef.current.instanceMatrix.needsUpdate = true;
  }, [data]);

  useEffect(() => {
    const mesh = payloadRef.current;
    if (!mesh) return;
    const c = new THREE.Color();
    data.groups.forEach((g, i) => {
      c.set(g.name === payloadFocus ? '#38bdf8' : '#7dd3fc');
      mesh.setColorAt(i, c);
    });
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [data, payloadFocus]);

  useEffect(() => {
    const root = groupRef.current;
    if (!root) return;
    return attachPicker(gl.domElement, camera, root, (hit) => {
      const kind = hit.object.userData.kind as string | undefined;
      if (kind === 'mission' && hit.instanceId !== undefined) {
        const id = data.missionIds[hit.instanceId];
        if (id) requestNavigate(`/mission/${id}`);
      } else if (kind === 'payload' && hit.instanceId !== undefined) {
        const g = data.groups[hit.instanceId];
        if (g) setPayloadFocus(g.name);
      }
    });
  }, [gl, camera, data]);

  useEffect(() => {
    const el = gl.domElement;
    let dragging = false;
    let px = 0;
    let py = 0;
    const down = (e: PointerEvent) => {
      dragging = true;
      px = e.clientX;
      py = e.clientY;
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      scene.globe.yaw += (e.clientX - px) * 0.005;
      scene.globe.pitch = Math.max(-1.1, Math.min(1.1, scene.globe.pitch + (e.clientY - py) * 0.003));
      px = e.clientX;
      py = e.clientY;
    };
    const up = () => {
      dragging = false;
    };
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [gl]);

  useFrame((_, dt) => {
    if (!groupRef.current) return;
    scene.globe.yaw += dt * 0.04;
    groupRef.current.rotation.y = scene.globe.yaw;
    groupRef.current.rotation.x = scene.globe.pitch * 0.5;
    groupRef.current.scale.setScalar(6 / scene.globe.zoom);
  });

  return (
    <group ref={groupRef} position={[0, 1.7, 0]}>
      <lineSegments geometry={data.edgeGeo}>
        <lineBasicMaterial vertexColors transparent opacity={0.55} />
      </lineSegments>
      <instancedMesh
        ref={missionRef}
        args={[undefined, undefined, data.missionIds.length]}
        userData={{ kind: 'mission' }}
      >
        <sphereGeometry args={[0.12, 12, 12]} />
        <meshBasicMaterial color="#38bdf8" />
      </instancedMesh>
      <instancedMesh
        ref={payloadRef}
        args={[undefined, undefined, data.groups.length]}
        userData={{ kind: 'payload' }}
      >
        <sphereGeometry args={[0.07, 10, 10]} />
        <meshBasicMaterial color="#7dd3fc" />
      </instancedMesh>
    </group>
  );
}
