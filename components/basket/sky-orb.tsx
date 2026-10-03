"use client";

import { useEffect, useRef } from "react";

export type OrbMode = "idle" | "connecting" | "listening" | "thinking" | "talking";

const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uFlow;
uniform float uLevel;
uniform float uThink;
uniform float uScale;
out vec4 outColor;

vec4 permute(vec4 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
  i = mod(i, 289.0);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 1.0 / 7.0;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

float fbm(vec3 p) {
  float f = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    f += a * snoise(p);
    p = p * 2.03 + vec3(1.7, 9.2, 3.1);
    a *= 0.5;
  }
  return f;
}

void main() {
  float s = min(uRes.x, uRes.y);
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / (0.5 * s);
  float radius = 0.9 * uScale;
  vec2 p = uv / radius;
  float d = length(p);
  float aa = 2.5 / (s * radius * 0.5);
  float mask = 1.0 - smoothstep(1.0 - aa, 1.0, d);
  if (mask <= 0.0) { outColor = vec4(0.0); return; }

  float z = sqrt(max(0.0, 1.0 - d * d));
  vec3 n = vec3(p, z);
  float t = uFlow;

  vec3 q = vec3(p * 0.85, z * 0.6);
  vec3 w = vec3(
    snoise(q + vec3(t * 0.35, 0.0, t * 0.12)),
    snoise(q + vec3(4.1, t * 0.28, 1.7)),
    0.0
  );
  vec3 qw = q + w * (0.32 + 0.25 * uThink + 0.2 * uLevel);
  float a = snoise(qw * 1.1 + vec3(0.0, 0.0, t * 0.22));
  float b = snoise(qw * 0.9 + vec3(7.3, 2.1, -t * 0.18));
  float c = snoise(qw * 1.4 + vec3(-3.7, 5.5, t * 0.3));

  vec3 navy = vec3(0.05, 0.16, 0.45);
  vec3 royal = vec3(0.13, 0.42, 0.98);
  vec3 bright = vec3(0.30, 0.60, 1.0);
  vec3 sky = vec3(0.66, 0.84, 1.0);
  vec3 lilac = vec3(0.80, 0.72, 0.98);
  vec3 blush = vec3(0.93, 0.80, 0.96);

  float diag = dot(p, normalize(vec2(1.0, -1.0)));
  vec3 col = mix(navy, royal, smoothstep(-1.05, -0.15, diag + 0.35 * a));
  col = mix(col, bright, smoothstep(-0.2, 0.7, diag * 0.6 + 0.45 * b + 0.2));
  col = mix(col, sky, smoothstep(0.25, 0.95, -p.y * 0.7 + p.x * 0.25 + 0.45 * c + 0.15 * uLevel));
  float lil = smoothstep(0.15, 0.85, -p.x * 0.55 - p.y * 0.55 + 0.5 * a - 0.1);
  col = mix(col, lilac, lil * 0.75);
  col = mix(col, blush, smoothstep(0.55, 1.0, -p.x * 0.5 - p.y * 0.6 + 0.4 * b) * 0.5);

  vec3 L = normalize(vec3(-0.45, 0.65, 0.62));
  float diff = clamp(dot(n, L), 0.0, 1.0);
  col *= 0.9 + 0.14 * diff;
  float spec = pow(clamp(dot(reflect(-L, n), vec3(0.0, 0.0, 1.0)), 0.0, 1.0), 40.0);
  col += spec * 0.12;
  col = mix(col, col * 0.86, smoothstep(0.75, 1.0, d) * 0.5);

  outColor = vec4(col * mask, mask);
}`;

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) ?? "shader");
  return sh;
}

export function SkyOrb({
  mode,
  getInputVolume,
  getOutputVolume,
  className,
}: {
  mode: OrbMode;
  getInputVolume?: () => number;
  getOutputVolume?: () => number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modeRef = useRef(mode);
  const inRef = useRef(getInputVolume);
  const outRef = useRef(getOutputVolume);

  useEffect(() => {
    modeRef.current = mode;
    inRef.current = getInputVolume;
    outRef.current = getOutputVolume;
  }, [mode, getInputVolume, getOutputVolume]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl2", { premultipliedAlpha: true, antialias: true, alpha: true });
    if (!gl) return;

    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const u = {
      res: gl.getUniformLocation(prog, "uRes"),
      time: gl.getUniformLocation(prog, "uTime"),
      flow: gl.getUniformLocation(prog, "uFlow"),
      level: gl.getUniformLocation(prog, "uLevel"),
      think: gl.getUniformLocation(prog, "uThink"),
      scale: gl.getUniformLocation(prog, "uScale"),
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let raf = 0;
    let last = performance.now();
    let flow = Math.random() * 100;
    let level = 0;
    let think = 0;
    let scale = 0.94;
    let time = 0;

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      time += dt;
      const m = modeRef.current;
      const vin = inRef.current?.() ?? 0;
      const vout = outRef.current?.() ?? 0;

      const targetLevel =
        m === "talking" ? Math.max(vout, 0.25) : m === "listening" ? vin * 1.1 : m === "thinking" ? 0.25 + 0.15 * Math.sin(time * 3) : 0;
      level += (Math.min(1, targetLevel) - level) * (targetLevel > level ? 0.35 : 0.08);
      think += ((m === "thinking" || m === "connecting" ? 1 : 0) - think) * 0.05;

      const breathe = m === "idle" ? 0.012 * Math.sin(time * 1.4) : 0;
      const targetScale = (m === "idle" ? 0.94 : 0.97) + breathe + level * 0.06;
      scale += (targetScale - scale) * 0.18;

      const speed = 0.12 + level * 0.9 + think * 0.7;
      flow += dt * speed;

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(u.res, canvas.width, canvas.height);
      gl.uniform1f(u.time, time);
      gl.uniform1f(u.flow, flow);
      gl.uniform1f(u.level, level);
      gl.uniform1f(u.think, think);
      gl.uniform1f(u.scale, scale);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      gl.deleteProgram(prog);
      gl.deleteBuffer(buf);
    };
  }, []);

  return <canvas ref={canvasRef} className={className ?? "h-full w-full"} />;
}
