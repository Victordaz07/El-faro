import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
// Renderiza el modelo como sprite para el juego: cámara ortográfica con la elevación
// de la vista 2.5D, fondo transparente y la posición de la base y la linterna en píxeles.
window.makeSprite = async (url, elevDeg, azDeg, px) => {
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setPixelRatio(1); r.setSize(px, px); r.outputColorSpace = THREE.SRGBColorSpace;
  r.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const obj = (await new GLTFLoader().loadAsync(url)).scene;
  scene.add(obj);
  const box = new THREE.Box3().setFromObject(obj);
  const base = new THREE.Vector3((box.min.x + box.max.x) / 2, box.min.y, (box.min.z + box.max.z) / 2);
  obj.position.sub(base); // origen = centro de la base de la isla
  let lamp = new THREE.Vector3();
  obj.traverse(o => { if (o.isMesh && /Glass/.test(o.material.name)) { const b = new THREE.Box3().setFromObject(o); b.getCenter(lamp); } });
  scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x3a4250, 1.35));
  const key = new THREE.DirectionalLight(0xfff2dd, 1.6); key.position.set(-4, 7, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0x9fc0ff, 0.6); rim.position.set(5, 3, -4); scene.add(rim);
  const H = box.max.y - box.min.y, W = Math.max(box.max.x - box.min.x, box.max.z - box.min.z);
  const half = Math.max(H, W) * 0.62;
  const cam = new THREE.OrthographicCamera(-half, half, half, -half, 0.01, 100);
  const a = azDeg * Math.PI / 180, e = elevDeg * Math.PI / 180;
  const target = new THREE.Vector3(0, H * 0.38, 0);
  cam.position.set(Math.sin(a) * Math.cos(e) * 30, Math.sin(e) * 30 + target.y, Math.cos(a) * Math.cos(e) * 30);
  cam.lookAt(target);
  cam.updateMatrixWorld();
  r.render(scene, cam);
  const toPx = v => { const p = v.clone().project(cam); return [(p.x + 1) / 2 * px, (1 - p.y) / 2 * px]; };
  return { png: r.domElement.toDataURL('image/png'), origin: toPx(new THREE.Vector3(0, 0, 0)), lamp: toPx(lamp) };
};
