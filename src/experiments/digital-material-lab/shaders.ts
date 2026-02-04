/**
 * GLSL Shaders for the Digital Material Lab
 *
 * Includes:
 * - Main shape shader (SDF rounded rectangle with squircle)
 * - Trail shader (framebuffer feedback for persistence)
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

// Main fragment shader - renders the shape
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
  uniform float u_squircle;      // Superellipse exponent: 2.0 = circle, >2 = squircle
  uniform float u_blur;

  // Trail effect - ghost shapes at previous sizes
  uniform float u_trailEnabled;
  uniform float u_trailAmount;
  uniform vec2 u_trailSize0;     // Previous size 1 (oldest)
  uniform vec2 u_trailSize1;     // Previous size 2
  uniform vec2 u_trailSize2;     // Previous size 3
  uniform vec2 u_trailSize3;     // Previous size 4 (newest ghost)
  uniform vec3 u_trailColor0;
  uniform vec3 u_trailColor1;
  uniform vec3 u_trailColor2;
  uniform vec3 u_trailColor3;
  uniform vec4 u_trailColorPositions;  // positions for the 4 color stops

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

  // Calculate fill value for a given UV position and size
  float getFillAtSize(vec2 uv, vec2 size, float cornerRadius, float edge) {
    // Clamp corner radius to half the shortest edge
    float maxRadius = min(size.x, size.y);
    float clampedRadius = min(cornerRadius, maxRadius);
    float d = sdRoundedBox(uv, size, clampedRadius, u_squircle);
    return 1.0 - smoothstep(-edge, edge, d);
  }

  // Calculate fill value for current shape
  float getFill(vec2 uv, float edge) {
    return getFillAtSize(uv, u_rectSize, u_cornerRadius, edge);
  }

  // Sample color from gradient ramp
  vec3 sampleColorRamp(float t) {
    t = clamp(t, 0.0, 1.0);

    // Find which segment we're in
    if (t <= u_trailColorPositions.x) {
      return u_trailColor0;
    } else if (t <= u_trailColorPositions.y) {
      float localT = (t - u_trailColorPositions.x) / max(0.001, u_trailColorPositions.y - u_trailColorPositions.x);
      return mix(u_trailColor0, u_trailColor1, localT);
    } else if (t <= u_trailColorPositions.z) {
      float localT = (t - u_trailColorPositions.y) / max(0.001, u_trailColorPositions.z - u_trailColorPositions.y);
      return mix(u_trailColor1, u_trailColor2, localT);
    } else if (t <= u_trailColorPositions.w) {
      float localT = (t - u_trailColorPositions.z) / max(0.001, u_trailColorPositions.w - u_trailColorPositions.z);
      return mix(u_trailColor2, u_trailColor3, localT);
    }
    return u_trailColor3;
  }

  void main() {
    // Normalize coordinates with aspect ratio correction
    vec2 uv = v_position;
    float aspect = u_resolution.x / u_resolution.y;
    uv.x *= aspect;

    // Anti-aliasing edge detection
    float pixelSize = 2.0 / u_resolution.y;
    float edge = pixelSize * 1.5;

    // Get background color
    vec3 bgColor = vec3(0.05, 0.05, 0.08);
    if (u_hasBackground > 0.5) {
      // Flip Y for proper image orientation
      vec2 bgUV = vec2(v_texCoord.x, 1.0 - v_texCoord.y);
      bgColor = texture2D(u_backgroundTexture, bgUV).rgb;
    }

    // Start with background
    vec3 color = bgColor;

    // Draw trail ghosts (oldest to newest, so newer ones layer on top)
    if (u_trailEnabled > 0.5 && u_trailAmount > 0.01) {
      float trailEdge = edge * 2.0;  // Softer edges for trail ghosts

      // Ghost 0 (oldest) - most faded
      float ghost0 = getFillAtSize(uv, u_trailSize0, u_cornerRadius, trailEdge);
      if (ghost0 > 0.01) {
        vec3 ghostColor0 = sampleColorRamp(0.0);
        color = color + ghostColor0 * ghost0 * u_trailAmount * 0.3;
      }

      // Ghost 1
      float ghost1 = getFillAtSize(uv, u_trailSize1, u_cornerRadius, trailEdge);
      if (ghost1 > 0.01) {
        vec3 ghostColor1 = sampleColorRamp(0.33);
        color = color + ghostColor1 * ghost1 * u_trailAmount * 0.45;
      }

      // Ghost 2
      float ghost2 = getFillAtSize(uv, u_trailSize2, u_cornerRadius, trailEdge);
      if (ghost2 > 0.01) {
        vec3 ghostColor2 = sampleColorRamp(0.66);
        color = color + ghostColor2 * ghost2 * u_trailAmount * 0.6;
      }

      // Ghost 3 (newest ghost) - brightest
      float ghost3 = getFillAtSize(uv, u_trailSize3, u_cornerRadius, trailEdge);
      if (ghost3 > 0.01) {
        vec3 ghostColor3 = sampleColorRamp(1.0);
        color = color + ghostColor3 * ghost3 * u_trailAmount * 0.8;
      }
    }

    // Blur sampling for main shape
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

// Trail accumulation shader - blends current frame with previous for persistence
export const trailFragmentShaderSource = `
  precision highp float;

  varying vec2 v_texCoord;

  uniform sampler2D u_currentFrame;    // Current rendered frame
  uniform sampler2D u_previousTrail;   // Previous trail buffer
  uniform float u_persistence;         // How much trail persists (0-1)
  uniform float u_trailAmount;         // Trail intensity
  uniform float u_deltaTime;           // Time since last frame for aging

  void main() {
    vec4 current = texture2D(u_currentFrame, v_texCoord);
    vec4 previous = texture2D(u_previousTrail, v_texCoord);

    // Calculate the brightness of the current frame as mask for new trail
    float currentBrightness = dot(current.rgb, vec3(0.299, 0.587, 0.114));

    // Age the previous trail (stored in red channel)
    float previousAge = previous.r + u_deltaTime * 2.0;
    float previousIntensity = previous.a * u_persistence;

    // New trail contribution (from bright areas in current frame)
    float newTrailMask = smoothstep(0.3, 0.8, currentBrightness) * u_trailAmount;

    // Combine: keep stronger intensity, blend age
    float finalIntensity = max(previousIntensity, newTrailMask);
    float finalAge = newTrailMask > previousIntensity ? 0.0 : previousAge;

    // Output: r = age, g = unused, b = unused, a = intensity
    gl_FragColor = vec4(finalAge, 0.0, 0.0, finalIntensity);
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
