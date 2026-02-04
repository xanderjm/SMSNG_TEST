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
  uniform float u_blur;

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

  // Calculate fill value for a given UV position
  float getFill(vec2 uv, float edge) {
    float d = sdRoundedBox(uv, u_rectSize, u_cornerRadius);
    return 1.0 - smoothstep(-edge, edge, d);
  }

  void main() {
    // Normalize coordinates with aspect ratio correction
    vec2 uv = v_position;
    float aspect = u_resolution.x / u_resolution.y;
    uv.x *= aspect;

    // Anti-aliasing edge detection
    float pixelSize = 2.0 / u_resolution.y;
    float edge = pixelSize * 1.5;

    // Blur sampling
    float fill = 0.0;

    if (u_blur < 0.5) {
      // No blur - single sample for performance
      fill = getFill(uv, edge);
    } else {
      // Gaussian-weighted blur using multiple samples
      float blurRadius = u_blur * pixelSize;
      float totalWeight = 0.0;

      // 9-tap gaussian blur pattern
      for (int x = -1; x <= 1; x++) {
        for (int y = -1; y <= 1; y++) {
          vec2 offset = vec2(float(x), float(y)) * blurRadius;
          float weight = 1.0 - length(vec2(float(x), float(y))) * 0.3;
          fill += getFill(uv + offset, edge + blurRadius * 0.5) * weight;
          totalWeight += weight;
        }
      }
      fill /= totalWeight;

      // Add additional blur passes for stronger effect
      if (u_blur > 8.0) {
        float extraBlur = 0.0;
        float extraWeight = 0.0;
        float largeRadius = blurRadius * 2.0;

        for (int x = -2; x <= 2; x++) {
          for (int y = -2; y <= 2; y++) {
            if (abs(x) > 1 || abs(y) > 1) {
              vec2 offset = vec2(float(x), float(y)) * largeRadius * 0.5;
              float weight = 1.0 - length(vec2(float(x), float(y))) * 0.15;
              extraBlur += getFill(uv + offset, edge + largeRadius) * weight;
              extraWeight += weight;
            }
          }
        }
        extraBlur /= extraWeight;
        fill = mix(fill, extraBlur, (u_blur - 8.0) / 12.0);
      }
    }

    // Simple white fill on dark background
    vec3 bgColor = vec3(0.05, 0.05, 0.08);
    vec3 fillColor = vec3(1.0);

    // Compose
    vec3 color = mix(bgColor, fillColor, fill);

    gl_FragColor = vec4(color, 1.0);
  }
`;
