/**
 * GLSL Shaders for the Digital Material Lab
 *
 * Fragment shader implements:
 * - Signed Distance Function (SDF) for rounded rectangle
 * - Analytical anti-aliasing
 * - Glow and shadow effects from distance field
 * - Lighting and material properties
 * - Digital material behaviors
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

  // Lighting
  uniform float u_lightIntensity;
  uniform vec3 u_lightColor;
  uniform float u_lightDiffusion;
  uniform vec2 u_lightDirection;
  uniform float u_lightFocus;

  // Material
  uniform float u_emission;
  uniform float u_transparency;
  uniform float u_refraction;
  uniform float u_dispersion;
  uniform float u_absorption;
  uniform float u_scattering;
  uniform float u_reflection;

  // Shadows
  uniform float u_shadowIntensity;
  uniform float u_shadowSoftness;
  uniform vec2 u_shadowOffset;

  // Digital Material
  uniform float u_viscosity;
  uniform float u_elasticity;
  uniform float u_surfaceTension;
  uniform float u_momentum;
  uniform float u_gravAttention;

  // Pointer
  uniform vec2 u_pointerPos;

  // Signed Distance Function for rounded box
  float sdRoundedBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
  }

  // Smooth minimum for blending shapes
  float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
  }

  // Hash function for noise
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  // Smooth noise
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));

    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  void main() {
    // Normalize coordinates with aspect ratio correction
    vec2 uv = v_position;
    float aspect = u_resolution.x / u_resolution.y;
    uv.x *= aspect;

    // Apply gravitational attention (pointer warping)
    vec2 pointerUV = u_pointerPos;
    pointerUV.x *= aspect;
    vec2 toPointer = pointerUV - uv;
    float pointerDist = length(toPointer);
    float warpStrength = u_gravAttention * 0.1 / (pointerDist + 0.3);
    vec2 warpedUV = uv + normalize(toPointer + 0.001) * warpStrength * smoothstep(1.0, 0.0, pointerDist);

    // Calculate SDF for main shape
    float d = sdRoundedBox(warpedUV, u_rectSize, u_cornerRadius);

    // Calculate SDF for shadow
    vec2 shadowUV = warpedUV - u_shadowOffset;
    float shadowD = sdRoundedBox(shadowUV, u_rectSize, u_cornerRadius);

    // Anti-aliasing edge detection
    float pixelSize = 2.0 / u_resolution.y;
    float edge = pixelSize * 1.5;

    // Fill mask (inside shape)
    float fill = 1.0 - smoothstep(-edge, edge, d);

    // === SHADOW ===
    float shadowMask = 1.0 - smoothstep(-u_shadowSoftness * 0.1, u_shadowSoftness * 0.3, shadowD);
    shadowMask *= u_shadowIntensity;
    shadowMask *= (1.0 - fill); // Don't show shadow inside shape

    // === GLOW / DIFFUSION ===
    // Multi-layer glow for soft diffusion
    float glow = 0.0;
    float glowScale = u_lightDiffusion * 15.0 + 5.0;

    // Inner glow (bright)
    glow += exp(-d * glowScale) * 0.6;

    // Mid glow
    glow += exp(-d * glowScale * 0.5) * 0.3;

    // Outer glow (atmospheric)
    glow += exp(-d * glowScale * 0.2) * 0.15;

    // Directional bias for glow
    float dirBias = dot(normalize(warpedUV + 0.001), normalize(u_lightDirection + 0.001));
    dirBias = dirBias * 0.5 + 0.5;
    float directionalGlow = glow * mix(0.7, 1.3, dirBias * u_lightFocus);

    // === EMISSION (Self-illumination) ===
    float emissionMask = fill * u_emission;

    // === REFRACTION & DISPERSION ===
    // Calculate surface normal from SDF gradient
    vec2 eps = vec2(0.001, 0.0);
    vec2 normal = normalize(vec2(
      sdRoundedBox(warpedUV + eps.xy, u_rectSize, u_cornerRadius) - sdRoundedBox(warpedUV - eps.xy, u_rectSize, u_cornerRadius),
      sdRoundedBox(warpedUV + eps.yx, u_rectSize, u_cornerRadius) - sdRoundedBox(warpedUV - eps.yx, u_rectSize, u_cornerRadius)
    ));

    // Chromatic dispersion - sample at offset positions
    float dispersionOffset = u_dispersion * 0.05;
    vec2 uvR = warpedUV + normal * dispersionOffset * (1.0 - fill) * u_refraction;
    vec2 uvB = warpedUV - normal * dispersionOffset * (1.0 - fill) * u_refraction;

    float dR = sdRoundedBox(uvR, u_rectSize, u_cornerRadius);
    float dB = sdRoundedBox(uvB, u_rectSize, u_cornerRadius);

    float fillR = 1.0 - smoothstep(-edge, edge, dR);
    float fillB = 1.0 - smoothstep(-edge, edge, dB);

    // === ABSORPTION (Beer-Lambert) ===
    float depth = max(0.0, -d * 10.0); // Approximate depth inside shape
    vec3 absorptionColor = exp(-vec3(0.2, 0.1, 0.05) * depth * u_absorption * 5.0);

    // === SCATTERING (Subsurface approximation) ===
    float scatterDist = max(0.0, -d);
    float scatter = (1.0 - exp(-scatterDist * 20.0)) * u_scattering;
    vec3 scatterColor = u_lightColor * scatter * 0.5;

    // === REFLECTION (Environment approximation) ===
    float fresnel = pow(1.0 - abs(dot(normal, vec2(0.0, 1.0))), 3.0);
    float reflectionMask = fresnel * u_reflection * fill;
    vec3 reflectionColor = vec3(0.9, 0.95, 1.0) * reflectionMask;

    // === COMPOSE FINAL COLOR ===

    // Background gradient
    vec3 bgColor = mix(
      vec3(0.02, 0.02, 0.04),
      vec3(0.06, 0.04, 0.08),
      v_position.y * 0.5 + 0.5
    );

    // Add subtle background noise
    float bgNoise = noise(v_position * 100.0 + u_time * 0.1) * 0.02;
    bgColor += bgNoise;

    // Shadow layer
    vec3 shadowColor = bgColor * (1.0 - shadowMask * 0.7);

    // Glow layer with chromatic dispersion
    vec3 glowColorR = u_lightColor * vec3(1.2, 0.9, 0.8);
    vec3 glowColorG = u_lightColor;
    vec3 glowColorB = u_lightColor * vec3(0.8, 0.9, 1.2);

    float glowR = exp(-dR * (glowScale * 0.8)) * directionalGlow;
    float glowG = directionalGlow;
    float glowB = exp(-dB * (glowScale * 0.8)) * directionalGlow;

    vec3 composedGlow = vec3(
      glowColorR.r * glowR,
      glowColorG.g * glowG,
      glowColorB.b * glowB
    ) * u_lightIntensity;

    // Fill color with material properties
    vec3 fillColor = u_lightColor * 1.2;
    fillColor *= absorptionColor;
    fillColor += scatterColor;
    fillColor += reflectionColor;
    fillColor += emissionMask * u_lightColor * 0.5;

    // Dispersion on fill edges
    vec3 dispersedFill = vec3(fillR, fill, fillB);
    dispersedFill = mix(vec3(fill), dispersedFill, u_dispersion);

    // Compose layers
    vec3 color = shadowColor;
    color += composedGlow;
    color = mix(color, fillColor, fill * (1.0 - u_transparency));

    // Add edge highlight
    float edgeHighlight = smoothstep(edge * 2.0, 0.0, abs(d)) * 0.3;
    color += u_lightColor * edgeHighlight * u_lightIntensity;

    // Subtle color grading
    color = pow(color, vec3(0.95)); // Slight gamma lift
    color = mix(color, color * vec3(1.0, 0.98, 1.02), 0.3); // Subtle tint

    // Output with proper alpha
    float alpha = max(fill, max(glow * 0.5, shadowMask * 0.3));
    alpha = clamp(alpha, 0.0, 1.0);

    gl_FragColor = vec4(color, 1.0);
  }
`;
