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
  uniform float u_squircle;      // Superellipse exponent: 2.0 = circle, >2 = squircle
  uniform float u_blur;

  // Digital Material (for future use)
  uniform float u_viscosity;
  uniform float u_elasticity;
  uniform float u_surfaceTension;
  uniform float u_momentum;
  uniform float u_gravAttention;

  // Signed Distance Function for rounded box (standard rounded corners)
  float sdRoundedBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
  }

  // Signed Distance Function for superellipse/squircle
  // n = 2.0 gives standard ellipse, n > 2 gives squircle (iOS-style corners)
  float sdSuperellipse(vec2 p, vec2 b, float n) {
    // Normalize position by size
    vec2 pn = abs(p) / b;
    // Superellipse formula: |x/a|^n + |y/b|^n = 1
    float d = pow(pow(pn.x, n) + pow(pn.y, n), 1.0 / n);
    // Convert to signed distance (inside = negative, outside = positive)
    return (d - 1.0) * min(b.x, b.y);
  }

  // Calculate fill value for a given UV position
  // Blends between rounded box and squircle based on u_squircle
  float getFill(vec2 uv, float edge) {
    // When squircle is close to 2.0, use rounded box for better corner radius control
    // As squircle increases, blend toward superellipse for iOS-style corners
    float squircleBlend = smoothstep(2.0, 3.0, u_squircle);

    // Rounded box SDF (for standard rounded corners)
    float dBox = sdRoundedBox(uv, u_rectSize, u_cornerRadius);

    // Superellipse SDF (for squircle corners)
    // Adjust size to account for corner radius visual equivalence
    vec2 squircleSize = u_rectSize - u_cornerRadius * 0.3 * squircleBlend;
    float dSquircle = sdSuperellipse(uv, squircleSize, u_squircle);

    // Blend between the two based on squircle amount
    float d = mix(dBox, dSquircle, squircleBlend);

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
            // Note: abs() only works with float in GLSL ES, so cast to float
            float fx = float(x);
            float fy = float(y);
            if (abs(fx) > 1.0 || abs(fy) > 1.0) {
              vec2 offset = vec2(fx, fy) * largeRadius * 0.5;
              float weight = 1.0 - length(vec2(fx, fy)) * 0.15;
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
