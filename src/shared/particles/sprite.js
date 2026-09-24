// Round, soft-edged additive sprite shared by the particle scenes. Expects
// `vColor` and `vAlpha` from the vertex shader and a `uIntensity` uniform.
export const SPRITE_FRAGMENT = /* glsl */`
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
