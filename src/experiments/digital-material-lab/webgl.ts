/**
 * WebGL utilities for the Digital Material Lab
 */

export function createWebGLContext(canvas: HTMLCanvasElement): WebGLRenderingContext | null {
  const options: WebGLContextAttributes = {
    alpha: false,
    antialias: true,
    depth: false,
    preserveDrawingBuffer: true, // Required for video recording
    powerPreference: 'high-performance',
  };

  const gl = canvas.getContext('webgl', options) || canvas.getContext('experimental-webgl', options);
  return gl as WebGLRenderingContext | null;
}

export function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) {
    console.error('Failed to create shader');
    return null;
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    console.error('Shader compilation error:', info);
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

export function createProgram(
  gl: WebGLRenderingContext,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader
): WebGLProgram | null {
  const program = gl.createProgram();
  if (!program) {
    console.error('Failed to create program');
    return null;
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    console.error('Program linking error:', info);
    gl.deleteProgram(program);
    return null;
  }

  return program;
}

// Framebuffer with attached texture for render-to-texture
export interface FramebufferObject {
  framebuffer: WebGLFramebuffer;
  texture: WebGLTexture;
  width: number;
  height: number;
}

export function createFramebuffer(
  gl: WebGLRenderingContext,
  width: number,
  height: number
): FramebufferObject | null {
  // Create texture
  const texture = gl.createTexture();
  if (!texture) {
    console.error('Failed to create framebuffer texture');
    return null;
  }

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  // Create framebuffer
  const framebuffer = gl.createFramebuffer();
  if (!framebuffer) {
    gl.deleteTexture(texture);
    console.error('Failed to create framebuffer');
    return null;
  }

  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

  // Check status
  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  if (status !== gl.FRAMEBUFFER_COMPLETE) {
    console.error('Framebuffer not complete:', status);
    gl.deleteFramebuffer(framebuffer);
    gl.deleteTexture(texture);
    return null;
  }

  // Unbind
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.bindTexture(gl.TEXTURE_2D, null);

  return { framebuffer, texture, width, height };
}

export function deleteFramebuffer(gl: WebGLRenderingContext, fbo: FramebufferObject): void {
  gl.deleteFramebuffer(fbo.framebuffer);
  gl.deleteTexture(fbo.texture);
}

// Clear a framebuffer to transparent black
export function clearFramebuffer(gl: WebGLRenderingContext, fbo: FramebufferObject | null): void {
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo?.framebuffer ?? null);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
}
