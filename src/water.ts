// Mar dibujado en la GPU con un shader: olas con relieve, cáusticas, nubes, espuma,
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
uniform float uLamp, uLampOn, uFlash, uIce, uLava;
uniform float uQ;       // calidad: 0 baja (sin detalle fino), 1 media, 2 alta

// Hash sin seno: estable también en GPUs de celular (el seno con números grandes se ve en bloques)
float hash(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
// Octavas rotadas: sin cuadrícula visible
float fbm(vec2 p){
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 5; i++) { s += a * noise(p); p = m * p; a *= 0.5; }
  return s;
}

float fbm3(vec2 p){
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 3; i++) { s += a * noise(p); p = m * p; a *= 0.5; }
  return s;
}

// Oleaje: suma de olas direccionales con crestas afiladas (exp(sin)), con su pendiente exacta.
// Devuelve (altura, pendiente x, pendiente y). p en unidades del juego.
vec3 swell(vec2 p, float t){
  float hgt = 0.0; vec2 g = vec2(0.0);
  float wl = 230.0, amp = 1.0, dir = 0.55;
  for (int i = 0; i < 7; i++) {
    vec2 d = vec2(cos(dir), sin(dir));
    float k = 6.28318 / wl;
    float x = dot(d, p) * k - t * sqrt(9.8 * k) * 9.0;
    float e = exp(sin(x) - 1.0);
    hgt += amp * e;
    g += amp * e * cos(x) * k * d;
    wl *= 0.66; amp *= 0.62; dir += 1.05 + 0.4 * float(i); // cada ola en otra dirección
  }
  return vec3(hgt, g);
}

void main(){
  vec2 frag = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 w = (frag - uC) / uS;
  // La cámara mira inclinada: el oleaje se ve algo más corto en vertical
  vec2 pw = vec2(w.x, w.y * 1.3);
  float t = uT;

  // Deformación lenta para que el patrón nunca se repita
  vec2 warp = vec2(fbm3(pw * 0.004 + vec2(t * 0.02, 0.0)), fbm3(pw * 0.004 + vec2(5.2, -t * 0.017))) - 0.5;
  vec2 pp = pw + warp * 60.0;

  vec3 sw = swell(pp, t);
  // Rizos que viajan con el viento (sin detalle más fino que un píxel, para que no parpadee)
  vec2 grad = sw.yz * 15.0;
  if (uQ > 0.5) {
    vec2 rp = pp * 0.035 + vec2(t * 0.25, t * 0.14);
    float rz = fbm3(rp), rzx = fbm3(rp + vec2(0.1, 0.0)), rzy = fbm3(rp + vec2(0.0, 0.1));
    grad += vec2(rz - rzx, rz - rzy) * 1.1 * clamp(uS * 0.6, 0.3, 1.0);
  }
  vec3 N = normalize(vec3(-grad.x, -grad.y, 1.0));

  float r = length(w);
  // Orilla: elipse de la isla (centro un poco abajo, achatada por la cámara)
  float re = length(vec2(w.x, (w.y - 3.0) / 0.62));
  float depth = smoothstep(42.0, 230.0, re);

  // Color del agua: turquesa cerca de la isla, oscuro mar adentro
  vec3 body = mix(uShal * 1.05, uDeep, depth);
  // Luz que atraviesa las crestas
  float crest = clamp(sw.x / 2.2, 0.0, 1.0);
  body += uShal * crest * crest * 0.35;

  // Reflejo del cielo nocturno (Fresnel): más reflejo en las caras que miran lejos de la cámara
  vec3 V = normalize(vec3(0.0, 0.55, 0.84));
  float fres = 0.02 + 0.98 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
  vec3 R = reflect(-V, N);
  vec3 sky = mix(uDeep * 1.6 + 0.03, uShal * 1.2 + vec3(0.05, 0.07, 0.1), clamp(R.z * 0.9 + 0.2, 0.0, 1.0));
  vec3 col = mix(body, sky, clamp(fres, 0.0, 0.75));
  // Relieve: las caras que miran a la luna se aclaran, las de atrás se oscurecen
  vec3 Lm = normalize(vec3(-0.45, -0.75, 0.5));
  col *= 0.62 + 0.55 * clamp(dot(N, normalize(vec3(Lm.xy, 0.9))), 0.0, 1.0);
  // Valles más oscuros, crestas más claras
  col *= 0.8 + 0.32 * clamp(sw.x / 2.0, 0.0, 1.0);

  // Luna: brillo intenso en las crestas y uno suave más amplio
  float rl = max(dot(R, Lm), 0.0);
  // Camino de luna: los destellos se juntan en una franja hacia la luna (arriba a la izquierda)
  vec2 md = normalize(vec2(-0.45, -0.75));
  float across = dot(w, vec2(-md.y, md.x)), along = dot(w, md);
  float path = exp(-pow(across / (90.0 + max(along, 0.0) * 0.35), 2.0)) * smoothstep(-120.0, 60.0, along);
  col += vec3(0.85, 0.92, 1.0) * (pow(rl, 120.0) * (0.25 + 1.3 * path) + pow(rl, 12.0) * 0.06 * (0.4 + path));

  // Sombras de nubes, grandes y lentas
  float cl = fbm3(w * 0.0035 + vec2(t * 0.01, t * 0.006));
  col *= mix(0.78, 1.05, smoothstep(0.3, 0.7, cl));

  // Fondo claro y ondulado cerca de la orilla (no cáusticas en bloques)
  float sh = 1.0 - smoothstep(48.0, 110.0, re);
  if (sh > 0.0) {
    float v = fbm3(w * 0.04 + vec2(t * 0.15, -t * 0.1) + warp * 2.0);
    float rid = pow(1.0 - abs(v * 2.0 - 1.0), 7.0);
    col += uTint * rid * 0.16 * sh;
  }

  // Espuma en las crestas más altas, en jirones
  float whitecap = smoothstep(1.35, 1.9, sw.x) * smoothstep(0.42, 0.72, fbm3(pp * 0.035 + t * 0.12));
  col = mix(col, vec3(0.85, 0.93, 1.0), whitecap * 0.55);
  // Vetas de espuma que arrastra el viento
  vec2 wd = vec2(cos(0.55), sin(0.55));
  vec2 sp = vec2(dot(pp, wd) * 0.012, dot(pp, vec2(-wd.y, wd.x)) * 0.06) + vec2(t * 0.05, 0.0);
  float streak = smoothstep(0.62, 0.8, fbm3(sp + warp));
  col += vec3(0.6, 0.72, 0.82) * streak * 0.07;

  // Haz del faro reflejado en el agua
  vec2 d = w - vec2(0.0, -48.0);
  float ang = atan(d.y, d.x);
  float da = abs(mod(ang - uLamp + 3.14159, 6.28318) - 3.14159);
  float len = length(d);
  float cone = smoothstep(0.22, 0.0, da) * smoothstep(340.0, 30.0, len) * uLampOn;
  float spec = pow(max(0.0, N.x * cos(uLamp) + N.y * sin(uLamp) + 0.2), 6.0);
  col += vec3(1.0, 0.9, 0.68) * cone * (0.1 + spec * 1.4);

  // Hielo flotando
  if (uIce > 0.0) {
    float f0 = fbm(w * 0.018 + vec2(t * 0.004, 0.0));
    float fl = smoothstep(0.66, 0.69, f0) * smoothstep(60.0, 90.0, re);
    float edge = smoothstep(0.63, 0.66, f0) * smoothstep(60.0, 90.0, re) - fl;
    vec3 ice = mix(vec3(0.58, 0.7, 0.8), vec3(0.82, 0.9, 0.97), fbm3(w * 0.03)) * (0.85 + 0.15 * N.z);
    col = mix(col, ice, fl * 0.85 * uIce);
    col += vec3(0.5, 0.65, 0.75) * edge * 0.35 * uIce;
  }
  // Grietas de lava bajo el agua
  if (uLava > 0.0) {
    float v = fbm3(w * 0.009 + vec2(0.0, t * 0.01));
    float crack = pow(1.0 - abs(v * 2.0 - 1.0), 26.0) * smoothstep(0.4, 0.6, fbm3(w * 0.02 + vec2(t * 0.03, 3.0)));
    col += vec3(1.0, 0.35, 0.06) * crack * (0.16 + 0.12 * sin(t * 2.0 + v * 20.0)) * uLava;
    col += vec3(0.25, 0.06, 0.0) * smoothstep(0.55, 0.8, v) * 0.25 * uLava; // brasa difusa
  }

  // Espuma de la orilla: sigue el borde de la isla, rota por el ruido
  float a = atan(w.y - 3.0, w.x);
  float fr = 43.0 + 2.5 * sin(t * 1.7 + a * 5.0) + 1.5 * sin(t * 2.6 - a * 9.0);
  float br = smoothstep(0.35, 0.65, fbm3(vec2(a * 6.0, t * 0.8)));
  float foam = smoothstep(7.0, 0.0, abs(re - fr)) * (0.35 + 0.65 * br);
  float ph = fract(t * 0.35);
  foam += smoothstep(4.0, 0.0, abs(re - fr - 6.0 - 16.0 * ph)) * (1.0 - ph) * 0.45 * br;
  col = mix(col, vec3(0.92, 0.97, 1.0), clamp(foam, 0.0, 1.0) * 0.65);

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
