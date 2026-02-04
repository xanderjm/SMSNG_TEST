/**
 * GLSL Shaders for the Digital Material Lab
 *
 * Includes:
 * - Main shape shader (SDF rounded rectangle with squircle)
 * - Trail accumulation shader (framebuffer ping-pong for smooth trails)
 * - Composite shader (combines background, trails, and shape)
 */

export const vertexShaderSource = `
  attribute vec2 a_position;
  varying vec2 v_position;
  varying vec2 v_texCoord;

  void main() {
    v_position = a_position;
    v_texCoord = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

// Shape-only fragment shader - renders just the shape mask and color
// Used for rendering to the trail accumulation buffer
export const shapeFragmentShaderSource = `
  precision highp float;

  varying vec2 v_position;
  varying vec2 v_texCoord;

  uniform vec2 u_resolution;
  uniform vec2 u_rectSize;
  uniform float u_cornerRadius;
  uniform float u_squircle;
  uniform float u_blur;

  // Lp norm (generalized length function)
  float lpLength(vec2 v, float p) {
    vec2 av = abs(v);
    if (av.x < 0.0001 && av.y < 0.0001) return 0.0;
    return pow(pow(av.x, p) + pow(av.y, p), 1.0 / p);
  }

  // Signed Distance Function for rounded box with squircle corners
  float sdRoundedBox(vec2 p, vec2 b, float r, float n) {
    vec2 q = abs(p) - b + r;
    return min(max(q.x, q.y), 0.0) + lpLength(max(q, vec2(0.0)), n) - r;
  }

  float getFill(vec2 uv, float edge) {
    float maxRadius = min(u_rectSize.x, u_rectSize.y);
    float clampedRadius = min(u_cornerRadius, maxRadius);
    float d = sdRoundedBox(uv, u_rectSize, clampedRadius, u_squircle);
    return 1.0 - smoothstep(-edge, edge, d);
  }

  void main() {
    vec2 uv = v_position;
    float aspect = u_resolution.x / u_resolution.y;
    uv.x *= aspect;

    float pixelSize = 2.0 / u_resolution.y;
    float edge = pixelSize * 1.5;

    float fill = 0.0;

    if (u_blur < 0.5) {
      fill = getFill(uv, edge);
    } else {
      float blurRadius = u_blur * pixelSize;
      float totalWeight = 0.0;

      for (int x = -1; x <= 1; x++) {
        for (int y = -1; y <= 1; y++) {
          vec2 offset = vec2(float(x), float(y)) * blurRadius;
          float weight = 1.0 - length(vec2(float(x), float(y))) * 0.3;
          fill += getFill(uv + offset, edge + blurRadius * 0.5) * weight;
          totalWeight += weight;
        }
      }
      fill /= totalWeight;

      if (u_blur > 8.0) {
        float extraBlur = 0.0;
        float extraWeight = 0.0;
        float largeRadius = blurRadius * 2.0;

        for (int x = -2; x <= 2; x++) {
          for (int y = -2; y <= 2; y++) {
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

    // Output: RGB = white shape, A = shape mask
    gl_FragColor = vec4(1.0, 1.0, 1.0, fill);
  }
`;

// Trail accumulation shader - blends current shape with previous trail buffer
// Only adds to trail when there's movement (velocity > 0)
export const trailAccumulateShaderSource = `
  precision highp float;

  varying vec2 v_texCoord;

  uniform sampler2D u_currentShape;    // Current shape (from shapeFragmentShader)
  uniform sampler2D u_previousTrail;   // Previous trail buffer
  uniform float u_persistence;         // Fade multiplier per frame (0.8-0.98)
  uniform float u_trailAmount;         // Trail intensity/opacity
  uniform vec3 u_trailColor;           // Current trail color
  uniform float u_velocity;            // Movement velocity magnitude (0 = stationary)

  void main() {
    // Sample previous trail (no smear - expansion doesn't have a direction)
    vec4 previousTrail = texture2D(u_previousTrail, v_texCoord);
    vec4 currentShape = texture2D(u_currentShape, v_texCoord);

    // Simple multiplicative fade - will actually reach zero
    // Apply a threshold to kill very dim values and prevent ghosting
    vec3 fadedTrail = previousTrail.rgb * u_persistence;

    // Kill values below threshold to prevent permanent ghosting
    // Higher threshold (0.03) ensures complete fade even at high persistence
    float maxChannel = max(max(fadedTrail.r, fadedTrail.g), fadedTrail.b);
    fadedTrail = fadedTrail * step(0.03, maxChannel);

    // Only add new trail when there's movement
    // smoothstep creates a gradual ramp: no trail when still, full trail when moving fast
    float movementMask = smoothstep(0.0, 0.02, u_velocity);

    // New trail contribution - only when moving
    vec3 newTrailColor = u_trailColor * currentShape.a * u_trailAmount * movementMask;

    // Simple additive blend (no soft clamp - allows proper fading)
    vec3 result = fadedTrail + newTrailColor;

    // Hard clamp to prevent blowout but allow zeros
    result = min(result, vec3(1.5));

    gl_FragColor = vec4(result, 1.0);
  }
`;

// Main composite shader - combines background, trail buffer, and current shape
export const fragmentShaderSource = `
  precision highp float;

  varying vec2 v_position;
  varying vec2 v_texCoord;

  // Resolution and time
  uniform vec2 u_resolution;
  uniform float u_time;
  uniform float u_animProgress;

  // Geometry
  uniform vec2 u_rectSize;
  uniform float u_cornerRadius;
  uniform float u_squircle;
  uniform float u_blur;

  // Trail
  uniform float u_trailEnabled;
  uniform sampler2D u_trailBuffer;     // Accumulated trail texture

  // Background
  uniform float u_hasBackground;
  uniform sampler2D u_backgroundTexture;

  // Digital Material (for future use)
  uniform float u_viscosity;
  uniform float u_elasticity;
  uniform float u_surfaceTension;
  uniform float u_momentum;
  uniform float u_gravAttention;

  // Lp norm (generalized length function)
  float lpLength(vec2 v, float p) {
    vec2 av = abs(v);
    if (av.x < 0.0001 && av.y < 0.0001) return 0.0;
    return pow(pow(av.x, p) + pow(av.y, p), 1.0 / p);
  }

  // Signed Distance Function for rounded box with squircle corners
  float sdRoundedBox(vec2 p, vec2 b, float r, float n) {
    vec2 q = abs(p) - b + r;
    return min(max(q.x, q.y), 0.0) + lpLength(max(q, vec2(0.0)), n) - r;
  }

  float getFill(vec2 uv, float edge) {
    float maxRadius = min(u_rectSize.x, u_rectSize.y);
    float clampedRadius = min(u_cornerRadius, maxRadius);
    float d = sdRoundedBox(uv, u_rectSize, clampedRadius, u_squircle);
    return 1.0 - smoothstep(-edge, edge, d);
  }

  void main() {
    vec2 uv = v_position;
    float aspect = u_resolution.x / u_resolution.y;
    uv.x *= aspect;

    float pixelSize = 2.0 / u_resolution.y;
    float edge = pixelSize * 1.5;

    // Get background color
    vec3 bgColor = vec3(0.05, 0.05, 0.08);
    if (u_hasBackground > 0.5) {
      vec2 bgUV = vec2(v_texCoord.x, 1.0 - v_texCoord.y);
      bgColor = texture2D(u_backgroundTexture, bgUV).rgb;
    }

    // Start with background
    vec3 color = bgColor;

    // Add trail (additive blend for glow)
    if (u_trailEnabled > 0.5) {
      vec4 trail = texture2D(u_trailBuffer, v_texCoord);
      color = color + trail.rgb;
    }

    // Render main shape with blur
    float fill = 0.0;

    if (u_blur < 0.5) {
      fill = getFill(uv, edge);
    } else {
      float blurRadius = u_blur * pixelSize;
      float totalWeight = 0.0;

      for (int x = -1; x <= 1; x++) {
        for (int y = -1; y <= 1; y++) {
          vec2 offset = vec2(float(x), float(y)) * blurRadius;
          float weight = 1.0 - length(vec2(float(x), float(y))) * 0.3;
          fill += getFill(uv + offset, edge + blurRadius * 0.5) * weight;
          totalWeight += weight;
        }
      }
      fill /= totalWeight;

      if (u_blur > 8.0) {
        float extraBlur = 0.0;
        float extraWeight = 0.0;
        float largeRadius = blurRadius * 2.0;

        for (int x = -2; x <= 2; x++) {
          for (int y = -2; y <= 2; y++) {
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

    // Main shape color (white)
    vec3 fillColor = vec3(1.0);

    // Draw main shape on top
    color = mix(color, fillColor, fill);

    gl_FragColor = vec4(color, 1.0);
  }
`;

// Simple passthrough shader for copying textures
export const copyFragmentShaderSource = `
  precision highp float;

  varying vec2 v_texCoord;
  uniform sampler2D u_texture;

  void main() {
    gl_FragColor = texture2D(u_texture, v_texCoord);
  }
`;
