// Mar dibujado en la GPU con un shader de agua estilizada: franjas de profundidad, espuma,
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
// Agua estilizada (como Wind Waker / Monument Valley): plana, sin reflejos ni relieve.
// Franjas de color por profundidad, líneas de espuma en la orilla y dibujos de espuma a la deriva.
uniform vec2 uRes;      // resolución en píxeles
uniform float uT;       // tiempo
uniform vec2 uC;        // centro del mundo en píxeles
uniform float uS;       // píxeles por unidad de mundo
uniform vec3 uDeep, uShal, uTint;
uniform float uLamp, uLampOn, uFlash, uIce, uLava, uQ;
uniform vec3 uBeam;     // color de la luz del faro

// Hash sin seno: en GPUs de celular el seno con números grandes se ve en bloques
float h(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float n(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h(i), h(i + vec2(1.0, 0.0)), f.x), mix(h(i + vec2(0.0, 1.0)), h(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p){
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 4; i++) { s += a * n(p); p = m * p; a *= 0.5; }
  return s;
}
// Borde nítido pero suave (1.5 px) para que las franjas no se vean dentadas
float edge(float d, float px){ return smoothstep(-px, px, d); }

void main(){
  vec2 frag = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 w = (frag - uC) / uS;
  float px = 1.5 / uS;                       // un píxel y medio en unidades del juego
  float t = uT;

  // Distancia a la orilla: la isla se ve como elipse achatada por la cámara
  float re = length(vec2(w.x, (w.y - 3.0) / 0.62));
  float a = atan(w.y - 3.0, w.x);
  float wob = (fbm(vec2(a * 3.0, t * 0.15)) - 0.5) * 14.0 + (fbm(w * 0.012 + t * 0.02) - 0.5) * 22.0;

  // 1) Franjas de color por profundidad (pocos tonos, bordes limpios)
  vec3 c0 = mix(uShal * 1.25, uTint * 0.55, 0.25);   // junto a la orilla
  vec3 c1 = uShal * 1.02;
  vec3 c2 = mix(uShal, uDeep, 0.55);
  vec3 c3 = uDeep;
  float d = re + wob;
  vec3 col = c3;
  col = mix(col, c2, 1.0 - edge(d - 175.0, px * 3.0));
  col = mix(col, c1, 1.0 - edge(d - 108.0, px * 2.0));
  col = mix(col, c0, 1.0 - edge(d - 66.0, px * 2.0));

  // Sombras de nubes, grandes y muy suaves
  float cl = fbm(w * 0.0035 + vec2(t * 0.01, t * 0.006));
  col *= mix(0.84, 1.03, smoothstep(0.3, 0.7, cl));

  // 3) Dibujos de espuma a la deriva: trazos curvos que aparecen y se desvanecen
  vec2 fp = w * 0.016 + vec2(t * 0.018, t * 0.011);
  float f1 = fbm(fp);
  float line = 1.0 - smoothstep(0.0, 0.018 + px * 0.012, abs(f1 - 0.52));
  float mask = smoothstep(0.55, 0.7, fbm(w * 0.006 - vec2(t * 0.01, -t * 0.008) + 9.0));
  float life = 0.5 + 0.5 * sin(t * 0.6 + f1 * 12.0);
  float drift = line * mask * life * smoothstep(55.0, 90.0, re);
  col = mix(col, vec3(0.8, 0.9, 1.0), drift * 0.45);

  // Brillo del haz del faro sobre el agua (plano, sin destellos)
  vec2 dl = w - vec2(0.0, -48.0);
  float ang = atan(dl.y, dl.x);
  float da = abs(mod(ang - uLamp + 3.14159, 6.28318) - 3.14159);
  float cone = smoothstep(0.22, 0.0, da) * smoothstep(340.0, 30.0, length(dl)) * uLampOn;
  col += uBeam * cone * 0.16;

  // Hielo: témpanos planos con borde claro
  if (uIce > 0.0) {
    float f0 = fbm(w * 0.016 + vec2(t * 0.004, 0.0));
    float far = smoothstep(70.0, 100.0, re);
    float fl = edge(f0 - 0.66, 0.006) * far;
    float rim = (edge(f0 - 0.64, 0.006) * far - fl);
    col = mix(col, vec3(0.8, 0.89, 0.96), fl * 0.9 * uIce);
    col = mix(col, vec3(0.93, 0.97, 1.0), rim * 0.8 * uIce);
  }
  // Lava: grietas brillantes bajo el agua
  if (uLava > 0.0) {
    float v = fbm(w * 0.01 + vec2(0.0, t * 0.01));
    float crack = pow(1.0 - abs(v * 2.0 - 1.0), 40.0);
    col += vec3(1.0, 0.35, 0.06) * crack * (0.35 + 0.3 * sin(t * 2.0 + v * 20.0)) * uLava;
  }

  // 2) Líneas de espuma de la orilla: una fija pegada a la roca y dos que se alejan y se apagan
  float shore = 1.0 - edge(abs(re - 44.0 - (fbm(vec2(a * 5.0, t * 0.5)) - 0.5) * 5.0) - 2.6, px);
  float foam = shore * (0.55 + 0.45 * step(0.35, fbm(vec2(a * 7.0, t * 0.3))));
  for (int k = 0; k < 2; k++) {
    float ph = fract(t * 0.22 + float(k) * 0.5);
    float rr = 48.0 + ph * 34.0 + (fbm(vec2(a * 4.0 + float(k) * 3.0, t * 0.2)) - 0.5) * 6.0;
    float ring = 1.0 - edge(abs(re - rr) - 1.6 * (1.0 - ph * 0.5), px);
    float dash = step(0.42, fbm(vec2(a * 9.0 + float(k) * 7.0, ph * 2.0)));
    foam = max(foam, ring * dash * (1.0 - ph));
  }
  col = mix(col, vec3(0.9, 0.96, 1.0), clamp(foam, 0.0, 1.0) * 0.85);

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
    for (const k of ['uRes', 'uT', 'uC', 'uS', 'uDeep', 'uShal', 'uTint', 'uLamp', 'uLampOn', 'uFlash', 'uIce', 'uLava', 'uQ', 'uBeam'])
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
  render(w: number, h: number, res: number, z: Zone, t: number, cx: number, cy: number, s: number, lamp: number, lampOn: number, flash: number, q = 2, beam = '255,236,160') {
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
    const bc = beam.split(',').map(v => +v / 255);
    gl.uniform3f(this.u.uBeam, bc[0], bc[1] * 0.95, bc[2] * 0.85);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    return this.canvas;
  }
}
