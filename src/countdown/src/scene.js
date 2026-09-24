import {
  BufferAttribute,
  CustomBlending,
  OneFactor,
  BufferGeometry,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  WebGLRenderer
} from 'three';
import { SPRITE_FRAGMENT_PREMULTIPLIED } from '../../shared/particles/sprite.js';

const FOV = 40;
// Share of the viewport height the digit takes; the ring around it is wider.
const FIT_HEIGHT = 0.42;
const FIT_RING_WIDTH = 0.86;
const RING_RADIUS = 0.62;
const RING_COUNT = 900;
const BRIGHTNESS = 0.55;

// Additive on a transparent canvas: colour and alpha both accumulate, so the
// page composites the particles as light over whatever lies beneath.
const ADDITIVE_PREMULTIPLIED = {
  blending: CustomBlending,
  blendSrc: OneFactor,
  blendDst: OneFactor,
  blendSrcAlpha: OneFactor,
  blendDstAlpha: OneFactor,
  premultipliedAlpha: true
};

// Five target sets live on the GPU as attributes; the CPU only picks which
// pair to blend and how far, plus a few envelope uniforms per frame.
const DIGIT_VERTEX = /* glsl */`
  uniform float uFrom;
  uniform float uTo;
  uniform float uMorph;
  uniform float uGather;
  uniform float uLoosen;
  uniform float uPulse;
  uniform float uTime;
  uniform float uSize;
  attribute vec3 aT0;
  attribute vec3 aT1;
  attribute vec3 aT2;
  attribute vec3 aT3;
  attribute vec3 aT4;
  attribute vec3 aStart;
  attribute float aSeed;
  varying vec3 vColor;
  varying float vAlpha;

  float easeOut(float x) { return 1.0 - pow(1.0 - x, 3.0); }
  float easeInOut(float x) { return x * x * (3.0 - 2.0 * x); }

  vec3 pick(float i) {
    if (i < 0.5) return aT0;
    if (i < 1.5) return aT1;
    if (i < 2.5) return aT2;
    if (i < 3.5) return aT3;
    return aT4;
  }

  void main() {
    float m = easeInOut(clamp((uMorph - aSeed * 0.35) / 0.65, 0.0, 1.0));
    vec3 p = mix(pick(uFrom), pick(uTo), m);
    // Mid-morph the particles swing out of the plane, which reads as depth.
    p.z += sin(m * 3.14159) * (aSeed - 0.5) * 0.4;

    float g = easeOut(clamp((uGather - aSeed * 0.3) / 0.7, 0.0, 1.0));
    p = mix(aStart, p, g);

    vec2 outward = normalize(p.xy + vec2(0.0001));
    vec3 scatter = vec3(sin(aSeed * 40.0), cos(aSeed * 33.0), sin(aSeed * 17.0));
    p += (vec3(outward, 0.0) * 0.08 + scatter * 0.06) * uLoosen;
    p.xy *= 1.0 + (uPulse - 0.5) * 0.02;

    p.z += sin(uTime * 2.0 + aSeed * 6.2831) * 0.01;
    p.xy += vec2(sin(uTime * 1.7 + aSeed * 9.0), cos(uTime * 1.3 + aSeed * 7.0)) * 0.002;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uSize * (0.75 + 0.5 * aSeed) / -mv.z;
    gl_Position = projectionMatrix * mv;
    vColor = mix(vec3(1.0), vec3(0.78, 0.84, 1.0), aSeed * 0.45);
    vAlpha = g * (1.0 - uLoosen * 0.45);
  }
`;

// The ring's particles sit on a circle; `uRing` is the remaining share of the
// current second, and everything past it (clockwise from twelve) fades out.
const RING_VERTEX = /* glsl */`
  uniform float uRing;
  uniform float uGather;
  uniform float uTime;
  uniform float uSize;
  uniform float uRadius;
  attribute float aAngle;
  attribute float aSeed;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float theta = 1.5707963 - aAngle * 6.2831853;
    float wobble = sin(uTime * 3.0 + aSeed * 20.0) * 0.006;
    vec3 p = vec3(cos(theta), sin(theta), 0.0) * (uRadius + wobble + (aSeed - 0.5) * 0.012);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uSize * (0.7 + 0.6 * aSeed) / -mv.z;
    gl_Position = projectionMatrix * mv;
    float visible = smoothstep(aAngle - 0.015, aAngle + 0.015, uRing);
    vColor = vec3(0.92, 0.94, 1.0);
    vAlpha = visible * uGather * 0.9;
  }
`;

const randomDirection = (random, out) => {
  const z = random() * 2 - 1;
  const r = Math.sqrt(1 - z * z);
  const phi = random() * Math.PI * 2;
  out[0] = r * Math.cos(phi);
  out[1] = r * Math.sin(phi);
  out[2] = z;
  return out;
};

function buildDigitGeometry(targets, random) {
  const count = targets[0].positions.length / 2;
  const geometry = new BufferGeometry();
  const dir = new Float32Array(3);
  const start = new Float32Array(count * 3);
  const seed = new Float32Array(count);

  targets.forEach((target, index) => {
    const attribute = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      attribute[i * 3] = target.positions[i * 2];
      attribute[i * 3 + 1] = target.positions[i * 2 + 1];
      attribute[i * 3 + 2] = (random() - 0.5) * 0.03;
    }
    geometry.setAttribute(`aT${index}`, new BufferAttribute(attribute, 3));
  });

  for (let i = 0; i < count; i++) {
    seed[i] = random();
    randomDirection(random, dir);
    const radius = 0.9 + random() * 1.8;
    start[i * 3] = dir[0] * radius;
    start[i * 3 + 1] = dir[1] * radius;
    start[i * 3 + 2] = dir[2] * radius;
  }

  // three.js needs a `position` attribute to know how many points to draw.
  geometry.setAttribute('position', geometry.getAttribute('aT0'));
  geometry.setAttribute('aStart', new BufferAttribute(start, 3));
  geometry.setAttribute('aSeed', new BufferAttribute(seed, 1));
  geometry.computeBoundingSphere();
  geometry.boundingSphere.radius = 4;
  return geometry;
}

function buildRingGeometry(random) {
  const geometry = new BufferGeometry();
  const angle = new Float32Array(RING_COUNT);
  const seed = new Float32Array(RING_COUNT);
  const position = new Float32Array(RING_COUNT * 3);
  for (let i = 0; i < RING_COUNT; i++) {
    angle[i] = (i + random() * 0.5) / RING_COUNT;
    seed[i] = random();
  }
  geometry.setAttribute('position', new BufferAttribute(position, 3));
  geometry.setAttribute('aAngle', new BufferAttribute(angle, 1));
  geometry.setAttribute('aSeed', new BufferAttribute(seed, 1));
  geometry.computeBoundingSphere();
  geometry.boundingSphere.radius = 2;
  return geometry;
}

export function createCountdownScene({ canvas, digits, width, height, dpr = 1, random = Math.random }) {
  const renderer = new WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, 0.01, 50);

  const digitMaterial = new ShaderMaterial({
    vertexShader: DIGIT_VERTEX,
    fragmentShader: SPRITE_FRAGMENT_PREMULTIPLIED,
    uniforms: {
      uFrom: { value: 0 },
      uTo: { value: 0 },
      uMorph: { value: 1 },
      uGather: { value: 0 },
      uLoosen: { value: 0 },
      uPulse: { value: 0 },
      uTime: { value: 0 },
      uSize: { value: 1 },
      uIntensity: { value: BRIGHTNESS }
    },
    ...ADDITIVE_PREMULTIPLIED,
    depthWrite: false,
    depthTest: false,
    transparent: true
  });
  const ringMaterial = new ShaderMaterial({
    vertexShader: RING_VERTEX,
    fragmentShader: SPRITE_FRAGMENT_PREMULTIPLIED,
    uniforms: {
      uRing: { value: 1 },
      uGather: { value: 0 },
      uTime: { value: 0 },
      uSize: { value: 1 },
      uRadius: { value: RING_RADIUS * digits.height },
      uIntensity: { value: BRIGHTNESS }
    },
    ...ADDITIVE_PREMULTIPLIED,
    depthWrite: false,
    depthTest: false,
    transparent: true
  });

  const digitGeometry = buildDigitGeometry(digits.targets, random);
  const ringGeometry = buildRingGeometry(random);
  scene.add(new Points(digitGeometry, digitMaterial));
  scene.add(new Points(ringGeometry, ringMaterial));

  const tanHalf = Math.tan((FOV / 2) * Math.PI / 180);
  const ringDiameter = RING_RADIUS * digits.height * 2.2;
  let distance = 1;

  const resize = (w, h) => {
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    distance = Math.max(
      digits.height / (2 * tanHalf * FIT_HEIGHT),
      ringDiameter / (2 * tanHalf * camera.aspect * FIT_RING_WIDTH)
    );
    const pixelsPerUnit = (h * dpr) / (2 * tanHalf);
    digitMaterial.uniforms.uSize.value = pixelsPerUnit * digits.spacing * 2.2;
    ringMaterial.uniforms.uSize.value = pixelsPerUnit * 0.018 * digits.height;
  };
  resize(width, height);

  const render = (at, time) => {
    const d = digitMaterial.uniforms;
    d.uFrom.value = at.from;
    d.uTo.value = at.to;
    d.uMorph.value = at.morph;
    d.uGather.value = at.gather;
    d.uLoosen.value = at.loosen;
    d.uPulse.value = at.pulse;
    d.uTime.value = time;
    d.uIntensity.value = BRIGHTNESS * (1 - at.fade * 0.5);

    const r = ringMaterial.uniforms;
    r.uRing.value = at.ring;
    r.uGather.value = at.gather * (1 - at.dive);
    r.uTime.value = time;

    // The last second ends in a dive through the "1", like the opener.
    const dive = at.dive * at.dive * at.dive;
    camera.position.set(0, 0, distance * (1 - dive * 0.96));
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  };

  const dispose = () => {
    digitGeometry.dispose();
    ringGeometry.dispose();
    digitMaterial.dispose();
    ringMaterial.dispose();
    renderer.dispose();
    renderer.forceContextLoss?.();
  };

  return { render, resize, dispose, camera };
}
