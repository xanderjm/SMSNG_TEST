/**
 * GLSL Shaders for the Digital Material Lab
 *
 * Simplified shader with:
 * - Signed Distance Function (SDF) for rounded rectangle
 * - Analytical anti-aliasing
 * - Clean fill with subtle edge
 * - Digital physics uniforms (for future use)
 */

export const vertexShaderSource = `
  attribute vec2 a_position;
  varying vec2 v_position;

  void main() {
    v_position = a_position;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

export const fragmentShaderSource = `
  precision highp float;

  varying vec2 v_position;

  // Resolution and time
  uniform vec2 u_resolution;
  uniform float u_time;
  uniform float u_animProgress;

  // Geometry
  uniform vec2 u_rectSize;
  uniform float u_cornerRadius;

  // Digital Material (for future use)
  uniform float u_viscosity;
  uniform float u_elasticity;
  uniform float u_surfaceTension;
  uniform float u_momentum;
  uniform float u_gravAttention;

  // Signed Distance Function for rounded box
  float sdRoundedBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
  }

  void main() {
    // Normalize coordinates with aspect ratio correction
    vec2 uv = v_position;
    float aspect = u_resolution.x / u_resolution.y;
    uv.x *= aspect;

    // Calculate SDF for main shape
    float d = sdRoundedBox(uv, u_rectSize, u_cornerRadius);

    // Anti-aliasing edge detection
    float pixelSize = 2.0 / u_resolution.y;
    float edge = pixelSize * 1.5;

    // Fill mask (inside shape)
    float fill = 1.0 - smoothstep(-edge, edge, d);

    // Simple white fill on dark background
    vec3 bgColor = vec3(0.05, 0.05, 0.08);
    vec3 fillColor = vec3(1.0);

    // Compose
    vec3 color = mix(bgColor, fillColor, fill);

    gl_FragColor = vec4(color, 1.0);
  }
`;
