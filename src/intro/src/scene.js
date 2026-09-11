import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  WebGLRenderer
} from 'three';
import { timelineAt } from './timeline.js';

const FOV = 42;
const FIT_WIDTH = 0.8;
const FIT_HEIGHT = 0.55;
// Additive sprites overlap ~2x, so each one carries about half the logo colour.
const BRIGHTNESS = 0.5;

// All motion lives on the GPU: the start, V-centred and final positions are
// attributes, the CPU only advances a handful of progress uniforms per frame.
const VERTEX = /* glsl */`
  uniform float uForm;
  uniform float uSlide;
  uniform float uWrite;
  uniform float uTime;
  uniform float uSize;
  uniform vec3 uVShift;
  attribute vec3 aStart;
  attribute vec3 aColor;
  attribute float aGroup;
  attribute float aOrder;
  attribute float aSeed;
  varying vec3 vColor;
  varying float vAlpha;

  float easeOut(float x) { return 1.0 - pow(1.0 - x, 3.0); }
  float easeInOut(float x) { return x * x * (3.0 - 2.0 * x); }

  void main() {
    vec3 p;
    float alpha;
    if (aGroup < 0.5) {
      float f = easeOut(clamp((uForm - aSeed * 0.35) / 0.65, 0.0, 1.0));
      vec3 formed = position + uVShift;
      p = mix(mix(aStart, formed, f), position, easeInOut(uSlide));
      alpha = f;
    } else {
      float f = easeOut(clamp((uWrite - aOrder * 0.7) / 0.3, 0.0, 1.0));
      p = mix(aStart, position, f);
      alpha = f;
    }
    p.z += sin(uTime * 2.0 + aSeed * 6.2831) * 0.012;
    p.xy += vec2(sin(uTime * 1.7 + aSeed * 9.0), cos(uTime * 1.3 + aSeed * 7.0)) * 0.002;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uSize * (0.75 + 0.5 * aSeed) / -mv.z;
    gl_Position = projectionMatrix * mv;
    vColor = aColor;
    vAlpha = alpha;
  }
`;

const FRAGMENT = /* glsl */`
  uniform float uIntensity;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec2 d = gl_PointCoord - 0.5;
    float r2 = dot(d, d);
    if (r2 > 0.25) discard;
    float a = smoothstep(0.25, 0.0, r2);
    a *= a;
    gl_FragColor = vec4(vColor * a * vAlpha * uIntensity, 1.0);
  }
`;

const randomDirection = (random, out, offset) => {
  const z = random() * 2 - 1;
  const r = Math.sqrt(1 - z * z);
  const phi = random() * Math.PI * 2;
  out[offset] = r * Math.cos(phi);
  out[offset + 1] = r * Math.sin(phi);
  out[offset + 2] = z;
};

function buildGeometry(sample, random) {
  const { count, positions, colors, groups, orders, bounds } = sample;
  const vShift = [-(bounds.v.minX + bounds.v.maxX) / 2, -(bounds.v.minY + bounds.v.maxY) / 2, 0];
  const position = new Float32Array(count * 3);
  const start = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  const dir = new Float32Array(3);

  for (let i = 0; i < count; i++) {
    const x = positions[i * 2];
    const y = positions[i * 2 + 1];
    position[i * 3] = x;
    position[i * 3 + 1] = y;
    position[i * 3 + 2] = (random() - 0.5) * 0.04;
    seed[i] = random();

    randomDirection(random, dir, 0);
    if (groups[i] < 0.5) {
      // The V condenses from a wide cloud around its centred position.
      const radius = 0.5 + random() * 1.6;
      start[i * 3] = x + vShift[0] + dir[0] * radius;
      start[i * 3 + 1] = y + vShift[1] + dir[1] * radius;
      start[i * 3 + 2] = dir[2] * radius;
    } else {
      // The word only gathers from a thin haze right where it appears.
      const radius = 0.12 + random() * 0.3;
      start[i * 3] = x + dir[0] * radius;
      start[i * 3 + 1] = y + dir[1] * radius;
      start[i * 3 + 2] = dir[2] * radius;
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(position, 3));
  geometry.setAttribute('aStart', new BufferAttribute(start, 3));
  geometry.setAttribute('aColor', new BufferAttribute(colors, 3));
  geometry.setAttribute('aGroup', new BufferAttribute(groups, 1));
  geometry.setAttribute('aOrder', new BufferAttribute(orders, 1));
  geometry.setAttribute('aSeed', new BufferAttribute(seed, 1));
  // Everything moves in the shader, so keep the bounding sphere generous.
  geometry.computeBoundingSphere();
  geometry.boundingSphere.radius = 4;
  return { geometry, vShift };
}

export function createIntroScene({ canvas, sample, width, height, dpr = 1, random = Math.random }) {
  const renderer = new WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 1);

  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, 0.01, 50);
  const { geometry, vShift } = buildGeometry(sample, random);
  const material = new ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: {
      uForm: { value: 0 },
      uSlide: { value: 0 },
      uWrite: { value: 0 },
      uTime: { value: 0 },
      uSize: { value: 1 },
      uIntensity: { value: 1 },
      uVShift: { value: vShift }
    },
    blending: AdditiveBlending,
    depthWrite: false,
    depthTest: false,
    transparent: true
  });
  scene.add(new Points(geometry, material));

  const tanHalf = Math.tan((FOV / 2) * Math.PI / 180);
  const logoWidth = sample.bounds.logo.maxX - sample.bounds.logo.minX;
  const logoHeight = sample.bounds.logo.maxY - sample.bounds.logo.minY;
  const wordCentreX = (sample.bounds.word.minX + sample.bounds.word.maxX) / 2;
  let distance = 1;

  const resize = (w, h) => {
    width = w;
    height = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // Fit the whole logo into the viewport whatever the orientation.
    distance = Math.max(
      logoWidth / (2 * tanHalf * camera.aspect * FIT_WIDTH),
      logoHeight / (2 * tanHalf * FIT_HEIGHT)
    );
    // Sprite diameter in device pixels at the resting distance, before the
    // shader divides by depth: ~2 particle spacings so the surface reads solid.
    material.uniforms.uSize.value = (h * dpr * sample.spacing * 2.0) / (2 * tanHalf);
  };
  resize(width, height);

  const render = (t) => {
    const at = timelineAt(t);
    const u = material.uniforms;
    u.uForm.value = at.form;
    u.uSlide.value = at.slide;
    u.uWrite.value = at.write;
    u.uTime.value = t;
    u.uIntensity.value = BRIGHTNESS * (1 - at.fade * 0.6);

    // Dive between the letters: the camera moves toward the word and ends
    // just short of the particle plane.
    const dive = at.zoom * at.zoom * at.zoom;
    camera.position.set(wordCentreX * 0.5 * dive, 0, distance * (1 - dive * 0.94));
    camera.lookAt(camera.position.x, 0, 0);

    renderer.render(scene, camera);
    return at;
  };

  const dispose = () => {
    geometry.dispose();
    material.dispose();
    renderer.dispose();
    renderer.forceContextLoss?.();
  };

  return { render, resize, dispose, camera };
}
