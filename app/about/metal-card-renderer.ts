import { blurShader, metalShader, vertexShader } from "./metal-card-shaders";

const ENV_WIDTH = 768;
const ENV_HEIGHT = 512;
const MAX_DRAWING_PIXELS = 1024 * 1024;

export function getDrawingBufferSize(width: number, height: number, dpr: number, limit: number) {
  const scale = Math.min(dpr, limit / width, limit / height, Math.sqrt(MAX_DRAWING_PIXELS / (width * height)));
  return [Math.max(1, Math.floor(width * scale)), Math.max(1, Math.floor(height * scale))] as const;
}

/** A planar, live Canvas2D studio. No downloaded images, camera or panorama. */
function drawEnvironment(context: CanvasRenderingContext2D, time: number, light: number) {
  context.fillStyle = "#575d64";
  context.fillRect(0, 0, ENV_WIDTH, ENV_HEIGHT);
  context.save();
  context.translate(120 + light * 12, 150);
  context.rotate(-0.21);
  context.fillStyle = "#6087b4";
  context.fillRect(-200, -260, 410, 650);
  context.fillStyle = "#9ab6d5";
  context.fillRect(-200, -260, 12, 650);
  context.restore();

  const x = 620 + Math.sin(time * 0.3) * 18 + light * 18;
  const y = 350 + Math.cos(time * 0.23) * 12;
  const sphere = context.createRadialGradient(x - 42, y - 45, 5, x, y, 145);
  sphere.addColorStop(0, "#ffe4bd");
  sphere.addColorStop(0.42, "#c98e59");
  sphere.addColorStop(1, "#4d3029");
  context.fillStyle = sphere;
  context.beginPath();
  context.arc(x, y, 145, 0, Math.PI * 2);
  context.fill();

  context.save();
  context.translate(390 + light * 38, 0);
  context.rotate(-0.47);
  context.fillStyle = "#f8f9fb";
  context.fillRect(-35, -180, 66, 780);
  context.fillStyle = "#aab4c2";
  context.fillRect(49, -180, 8, 780);
  context.restore();
  context.fillStyle = "#e7e9eb";
  context.fillRect(0, 478, ENV_WIDTH, 18);
}

export function createMetalRenderer(canvas: HTMLCanvasElement) {
  let creationError = "";
  const contextError = (event: Event) => { creationError = (event as WebGLContextEvent).statusMessage; };
  canvas.addEventListener("webglcontextcreationerror", contextError);
  let gl: WebGL2RenderingContext | null;
  try {
    gl = canvas.getContext("webgl2", {
      alpha: true, antialias: false, premultipliedAlpha: true,
      depth: false, stencil: false, failIfMajorPerformanceCaveat: false,
    });
  } finally {
    canvas.removeEventListener("webglcontextcreationerror", contextError);
  }
  if (!gl) throw new Error(creationError || "浏览器无法创建 WebGL2 上下文。请检查浏览器图形加速和显卡驱动后重试。");
  const shaders: WebGLShader[] = [];
  const programs: WebGLProgram[] = [];
  const textures: WebGLTexture[] = [];
  const buffers: WebGLFramebuffer[] = [];
  let vao: WebGLVertexArrayObject | null = null;
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    // Lost-context objects are already invalidated by WebGL.
    if (gl.isContextLost()) return;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.useProgram(null);
    gl.bindVertexArray(null);
    buffers.forEach(value => gl.deleteFramebuffer(value));
    textures.forEach(value => gl.deleteTexture(value));
    programs.forEach(value => gl.deleteProgram(value));
    shaders.forEach(value => gl.deleteShader(value));
    if (vao) gl.deleteVertexArray(vao);
  };
  try {
    const environment = document.createElement("canvas");
    environment.width = ENV_WIDTH;
    environment.height = ENV_HEIGHT;
    const context = environment.getContext("2d", { alpha: false });
    if (!context) throw new Error("Canvas2D is unavailable");
    function compile(type: number, source: string) {
      const shader = gl!.createShader(type);
      if (!shader) throw new Error("Unable to allocate shader");
      shaders.push(shader);
      gl!.shaderSource(shader, source);
      gl!.compileShader(shader);
      if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) throw new Error(gl!.getShaderInfoLog(shader) || "Shader compilation failed");
      return shader;
    }
    const vertex = compile(gl.VERTEX_SHADER, vertexShader);
    function program(source: string) {
      const value = gl!.createProgram();
      if (!value) throw new Error("Unable to allocate program");
      programs.push(value);
      gl!.attachShader(value, vertex);
      gl!.attachShader(value, compile(gl!.FRAGMENT_SHADER, source));
      gl!.linkProgram(value);
      if (!gl!.getProgramParameter(value, gl!.LINK_STATUS)) throw new Error(gl!.getProgramInfoLog(value) || "Shader linking failed");
      return value;
    }
    const blur = program(blurShader);
    const metal = program(metalShader);
    const blurImage = gl.getUniformLocation(blur, "u_image");
    const blurStep = gl.getUniformLocation(blur, "u_step");
    const metalImage = gl.getUniformLocation(metal, "u_image");
    const metalSize = gl.getUniformLocation(metal, "u_size");
    const metalAngles = gl.getUniformLocation(metal, "u_angles");
    function texture() {
      const value = gl!.createTexture();
      if (!value) throw new Error("Unable to allocate texture");
      textures.push(value);
      gl!.bindTexture(gl!.TEXTURE_2D, value);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
      gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, ENV_WIDTH, ENV_HEIGHT, 0, gl!.RGBA, gl!.UNSIGNED_BYTE, null);
      return value;
    }
    const source = texture();
    function target() {
      const image = texture();
      const framebuffer = gl!.createFramebuffer();
      if (!framebuffer) throw new Error("Unable to allocate framebuffer");
      buffers.push(framebuffer);
      gl!.bindFramebuffer(gl!.FRAMEBUFFER, framebuffer);
      gl!.framebufferTexture2D(gl!.FRAMEBUFFER, gl!.COLOR_ATTACHMENT0, gl!.TEXTURE_2D, image, 0);
      if (gl!.checkFramebufferStatus(gl!.FRAMEBUFFER) !== gl!.FRAMEBUFFER_COMPLETE) throw new Error("Incomplete blur framebuffer");
      return { image, framebuffer };
    }
    const horizontal = target();
    const vertical = target();
    vao = gl.createVertexArray();
    if (!vao) throw new Error("Unable to allocate vertex array");
    gl.bindVertexArray(vao);
    gl.activeTexture(gl.TEXTURE0);
    let width = 0, height = 0, dpr = 0;

    return {
      render(time: number, angleX: number, angleY: number, light: number) {
        if (disposed || gl.isContextLost()) return false;
        // clientWidth/Height are untransformed CSS sizes. Check DPR every frame,
        // including monitor changes without a resize event; reallocate only on change.
        const nextDpr = window.devicePixelRatio || 1;
        const nextWidth = Math.max(1, canvas.clientWidth);
        const nextHeight = Math.max(1, canvas.clientHeight);
        if (nextWidth !== width || nextHeight !== height || nextDpr !== dpr) {
          width = nextWidth; height = nextHeight; dpr = nextDpr;
          const limit = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) as number;
          const [pixelWidth, pixelHeight] = getDrawingBufferSize(width, height, dpr, limit);
          if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
          if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
        }
        drawEnvironment(context, time, light);
        gl.bindTexture(gl.TEXTURE_2D, source);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, environment);
        gl.useProgram(blur);
        gl.uniform1i(blurImage, 0);
        gl.viewport(0, 0, ENV_WIDTH, ENV_HEIGHT);
        gl.bindFramebuffer(gl.FRAMEBUFFER, horizontal.framebuffer);
        gl.uniform2f(blurStep, 2.6 / ENV_WIDTH, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.bindTexture(gl.TEXTURE_2D, horizontal.image);
        gl.bindFramebuffer(gl.FRAMEBUFFER, vertical.framebuffer);
        gl.uniform2f(blurStep, 0, 2.6 / ENV_HEIGHT);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.bindTexture(gl.TEXTURE_2D, vertical.image);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.useProgram(metal);
        gl.uniform1i(metalImage, 0);
        gl.uniform2f(metalSize, width, height);
        gl.uniform2f(metalAngles, angleX, angleY);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        return !gl.isContextLost();
      },
      dispose,
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
