// Mar dibujado en la GPU con un shader: olas suaves, luz del fondo, nubes, espuma,
// reflejo del haz del faro y efectos por zona (hielo, lava). Se dibuja en un canvas
// WebGL fuera de pantalla que luego se copia al canvas 2D principal.
import type { Zone } from './data';

const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes;      // resolución en píxeles
uniform float uT;       // tiempo
uniform vec2 uC;        // centro del mundo en píxeles
uniform float uS;       // píxeles por unidad de mundo
uniform vec3 uDeep, uShal, uTint;
uniform float uLamp, uLampOn, uFlash, uIce, uLava, uQ;

// Hash sin seno: en GPUs de celular el seno con números grandes se ve en bloques
float h(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float n(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h(i), h(i + vec2(1.0, 0.0)), f.x), mix(h(i + vec2(0.0, 1.0)), h(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p){
  float a = 0.5, s = 0.0;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6); // octavas rotadas: sin cuadrícula ni repeticiones visibles
  for (int i = 0; i < 4; i++) { s += a * n(p); p = m * p; a *= 0.5; }
  return s;
}
float height(vec2 q){
  return fbm(q + vec2(uT * 0.05, uT * 0.03)) + 0.5 * fbm(q * 2.3 - vec2(uT * 0.08, -uT * 0.05));
}
// Luz del fondo cerca de la orilla: ondas suaves (sin la red de líneas que se veía en piezas)
float caustic(vec2 p){
  float v = fbm(p + vec2(uT * 0.12, -uT * 0.08) + 0.6 * vec2(fbm(p * 0.5 + uT * 0.05), fbm(p * 0.5 - uT * 0.04)));
  return pow(1.0 - abs(v * 2.0 - 1.0), 5.0);
}
void main(){
  vec2 frag = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 w = (frag - uC) / uS;
  float r = length(w);

  // Relieve de las olas -> normal
  vec2 q = w * 0.018;
  float e = 0.03;
  float h0 = height(q), hx = height(q + vec2(e, 0.0)), hy = height(q + vec2(0.0, e));
  vec3 nrm = normalize(vec3((h0 - hx) * 7.0, (h0 - hy) * 7.0, 1.0));

  // Color base: más claro cerca de la isla
  float depth = smoothstep(45.0, 210.0, r);
  vec3 col = mix(uShal, uDeep, depth);

  // Luz difusa de la luna y brillos
  float dif = dot(nrm, normalize(vec3(-0.35, -0.55, 1.0)));
  col *= 0.72 + 0.38 * dif;
  col += pow(max(0.0, dif), 80.0) * 0.25;

  // Cáusticas, más fuertes en lo poco profundo
  float ca = caustic(w * 0.03 + vec2(40.0));
  col += uTint * ca * 0.14 * (1.0 - smoothstep(50.0, 140.0, r));

  // Oleaje suave: franjas largas que avanzan, solo cambio de tono (sin brillos ni relieve)
  vec2 sp = vec2(w.x, w.y * 1.3) + 40.0 * vec2(fbm(w * 0.004 + uT * 0.02), fbm(w * 0.004 - uT * 0.015));
  float sw = sin(dot(sp, vec2(0.85, 0.53)) * 0.045 - uT * 0.9) * 0.6 + sin(dot(sp, vec2(0.2, 0.98)) * 0.07 - uT * 1.2) * 0.4;
  col *= 0.95 + 0.07 * sw;
  // Sombras de nubes
  float cl = fbm(w * 0.0045 + vec2(uT * 0.012, uT * 0.007));
  col *= mix(0.7, 1.06, smoothstep(0.32, 0.72, cl));

  // Haz del faro reflejado en el agua
  vec2 d = w - vec2(0.0, -52.0);
  float ang = atan(d.y, d.x);
  float da = abs(mod(ang - uLamp + 3.14159, 6.28318) - 3.14159);
  float len = length(d);
  float cone = smoothstep(0.2, 0.0, da) * smoothstep(340.0, 30.0, len) * uLampOn;
  float spec = pow(max(0.0, nrm.x * cos(uLamp) + nrm.y * sin(uLamp) + 0.25), 5.0);
  col += vec3(1.0, 0.92, 0.7) * cone * (0.18 + spec * 1.1);

  // Hielo flotando
  if (uIce > 0.0) {
    float fl = smoothstep(0.6, 0.64, fbm(w * 0.012 + vec2(uT * 0.004, 0.0)));
    float edge = smoothstep(0.58, 0.6, fbm(w * 0.012 + vec2(uT * 0.004, 0.0))) - fl;
    col = mix(col, vec3(0.78, 0.88, 0.96) * (0.8 + 0.2 * dif), fl * 0.75 * uIce);
    col += edge * 0.25 * uIce;
  }
  // Grietas de lava bajo el agua
  if (uLava > 0.0) {
    float v = fbm(w * 0.01 + vec2(0.0, uT * 0.01));
    float crack = pow(1.0 - abs(v * 2.0 - 1.0), 40.0);
    col += vec3(1.0, 0.35, 0.06) * crack * (0.35 + 0.3 * sin(uT * 2.0 + v * 20.0)) * uLava;
  }

  // Espuma alrededor de la isla
  float re = length(vec2(w.x, (w.y - 3.0) / 0.62)); // la isla se ve achatada por la cámara
  float a = atan(w.y - 3.0, w.x);
  float fr = 43.0 + 2.5 * sin(uT * 2.0 + a * 5.0) + 1.5 * sin(uT * 3.1 - a * 9.0);
  float foam = smoothstep(7.0, 0.0, abs(re - fr)) * (0.45 + 0.55 * n(w * 0.12 + uT * 1.2));
  foam += smoothstep(4.0, 0.0, abs(re - fr - 10.0 - 8.0 * fract(uT * 0.4))) * 0.3 * (1.0 - fract(uT * 0.4));
  col = mix(col, vec3(0.92, 0.97, 1.0), clamp(foam, 0.0, 1.0) * 0.7);

  col += uFlash * vec3(0.45, 0.5, 0.62);
  gl_FragColor = vec4(col, 1.0);
}
`;

const hex = (s: string): [number, number, number] => {
  const v = parseInt(s.slice(1), 16);
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
};

export class Water {
  canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext;
  private u: Record<string, WebGLUniformLocation | null> = {};
  private colors = new Map<string, number[][]>();

  private constructor(canvas: HTMLCanvasElement, gl: WebGLRenderingContext, prog: WebGLProgram) {
    this.canvas = canvas;
    this.gl = gl;
    for (const k of ['uRes', 'uT', 'uC', 'uS', 'uDeep', 'uShal', 'uTint', 'uLamp', 'uLampOn', 'uFlash', 'uIce', 'uLava', 'uQ'])
      this.u[k] = gl.getUniformLocation(prog, k);
  }

  static create(): Water | null {
    try {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl', { antialias: false, alpha: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' });
      if (!gl) return null;
      const sh = (type: number, src: string) => {
        const s = gl.createShader(type)!;
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader');
        return s;
      };
      const prog = gl.createProgram()!;
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || 'link');
      gl.useProgram(prog);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, 'p');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      return new Water(c, gl, prog);
    } catch (e) {
      console.warn('Mar WebGL no disponible, se usa el modo 2D', e);
      return null;
    }
  }

  private zoneColors(z: Zone) {
    let c = this.colors.get(z.id);
    if (!c) {
      const s0 = hex(z.sky0), s1 = hex(z.sky1), ring = z.ring.split(',').map(v => +v / 255);
      c = [
        s1.map((v, i) => Math.min(1, v * 1.3 + s0[i] * 0.3)),   // profundo
        s0.map(v => Math.min(1, v * 1.25 + 0.02)),              // poco profundo
        ring.map(v => v * 0.8),                                 // tinte de cáusticas
      ];
      this.colors.set(z.id, c);
    }
    return c;
  }

  /** Dibuja el mar; cx, cy y s describen la cámara en píxeles CSS. */
  render(w: number, h: number, res: number, z: Zone, t: number, cx: number, cy: number, s: number, lamp: number, lampOn: number, flash: number, q = 2) {
    const gl = this.gl, W = Math.max(1, Math.round(w * res)), H = Math.max(1, Math.round(h * res));
    if (this.canvas.width !== W || this.canvas.height !== H) { this.canvas.width = W; this.canvas.height = H; }
    gl.viewport(0, 0, W, H);
    const [deep, shal, tint] = this.zoneColors(z);
    gl.uniform2f(this.u.uRes, W, H);
    gl.uniform1f(this.u.uT, t % 1000);
    gl.uniform2f(this.u.uC, cx * res, cy * res);
    gl.uniform1f(this.u.uS, s * res);
    gl.uniform3fv(this.u.uDeep, deep);
    gl.uniform3fv(this.u.uShal, shal);
    gl.uniform3fv(this.u.uTint, tint);
    gl.uniform1f(this.u.uLamp, lamp);
    gl.uniform1f(this.u.uLampOn, lampOn);
    gl.uniform1f(this.u.uFlash, flash);
    gl.uniform1f(this.u.uIce, z.mech === 'ice' ? 1 : 0);
    gl.uniform1f(this.u.uLava, z.mech === 'lava' ? 1 : 0);
    gl.uniform1f(this.u.uQ, q);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    return this.canvas;
  }
}
