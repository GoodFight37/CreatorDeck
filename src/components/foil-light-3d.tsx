"use client";

import { useEffect, useRef } from "react";

/**
 * Lightweight WebGL foil illumination. A subdivided, gently folded 3D mesh
 * receives directional specular light, so highlights respond to movement.
 * Transparent canvas sits OVER the printed artwork like a varnish layer.
 * CSS foil remains fully usable on devices without WebGL.
 */
export function FoilLight3D({ opened }: { opened: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const openedRef = useRef(opened);
  useEffect(() => { openedRef.current = opened; }, [opened]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof WebGLRenderingContext === "undefined") return;
    const gl = canvas.getContext("webgl", {
      alpha: true, antialias: true, premultipliedAlpha: false, powerPreference: "low-power",
    });
    if (!gl) return;
    const vertexSource = `
      attribute vec3 aPosition;
      attribute vec3 aNormal;
      attribute vec2 aUv;
      uniform float uTime;
      uniform vec2 uTilt;
      varying vec3 vNormal;
      varying vec2 vUv;
      varying vec3 vPosition;
      void main() {
        float fold = sin(aUv.x * 24.0 + aUv.y * 8.0 + uTime * .55) * .013;
        vec3 pos = aPosition + vec3(0.0, 0.0, fold);
        float ay = uTilt.x;
        float ax = uTilt.y;
        mat3 rotateY = mat3(cos(ay), 0., -sin(ay), 0., 1., 0., sin(ay), 0., cos(ay));
        mat3 rotateX = mat3(1., 0., 0., 0., cos(ax), sin(ax), 0., -sin(ax), cos(ax));
        mat3 rotation = rotateX * rotateY;
        vNormal = normalize(rotation * aNormal);
        vUv = aUv;
        vPosition = rotation * pos;
        gl_Position = vec4(vPosition.xy * vec2(.94, .95), vPosition.z * .05, 1.0);
      }
    `;
    const fragmentSource = `
      precision mediump float;
      uniform float uTime;
      uniform float uOpen;
      varying vec3 vNormal;
      varying vec2 vUv;
      varying vec3 vPosition;
      void main() {
        vec3 lightDir = normalize(vec3(sin(uTime * .32) * .65 + .42, .3, 1.));
        float spec = pow(max(dot(reflect(-lightDir, normalize(vNormal)), vec3(0., 0., 1.)), 0.), 30.);
        float crease = pow(abs(sin(vUv.x * 32. + vUv.y * 6. + uTime * .3)), 14.);
        float edge = pow(abs(vUv.x * 2. - 1.), 8.);
        float movingGlint = pow(max(0., 1. - abs(vUv.x - (.5 + sin(uTime * .38) * .42)) * 7.), 3.);
        float gloss = spec * .47 + crease * .05 + edge * .13 + movingGlint * .065;
        vec3 tint = mix(vec3(.92, .50, .62), vec3(1., .92, .80), spec);
        float alpha = min(.34, gloss) * (1. - uOpen);
        gl_FragColor = vec4(tint, alpha);
      }
    `;
    function makeShader(type: number, source: string) {
      const s = gl!.createShader(type);
      if (!s) return null;
      gl!.shaderSource(s, source);
      gl!.compileShader(s);
      if (!gl!.getShaderParameter(s, gl!.COMPILE_STATUS)) { gl!.deleteShader(s); return null; }
      return s;
    }
    const vs = makeShader(gl.VERTEX_SHADER, vertexSource);
    const fs = makeShader(gl.FRAGMENT_SHADER, fragmentSource);
    if (!vs || !fs) return;
    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      return;
    }
    gl.useProgram(program);
    const vertices: number[] = [];
    const indices: number[] = [];
    const cols = 34;
    const rows = 50;
    for (let y = 0; y <= rows; y++) for (let x = 0; x <= cols; x++) {
      const u = x / cols;
      const v = y / rows;
      const side = Math.abs(u - .5) * 2;
      const z = .11 * Math.pow(side, 2) + .018 * Math.sin(u * 28 + v * 4) * (1. - side * .65);
      const dzdx = .44 * (u - .5) + .5 * Math.cos(u * 28 + v * 4);
      const nx = -dzdx * .25;
      vertices.push((u * 2 - 1) * .84, (1 - v * 2) * .96, z, nx, .015, 1, u, v);
    }
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const i = y * (cols + 1) + x;
      indices.push(i, i + 1, i + cols + 1, i + 1, i + cols + 2, i + cols + 1);
    }
    const vertexBuffer = gl.createBuffer();
    const indexBuffer = gl.createBuffer();
    if (!vertexBuffer || !indexBuffer) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
    const stride = 8 * 4;
    for (const [name, size, offset] of [["aPosition", 3, 0], ["aNormal", 3, 12], ["aUv", 2, 24]] as const) {
      const location = gl.getAttribLocation(program, name);
      if (location < 0) continue;
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, size, gl.FLOAT, false, stride, offset);
    }
    const timeLocation = gl.getUniformLocation(program, "uTime");
    const tiltLocation = gl.getUniformLocation(program, "uTilt");
    const openLocation = gl.getUniformLocation(program, "uOpen");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let visible = true;
    let tiltX = 0;
    let tiltY = 0;
    const start = performance.now();
    const move = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      tiltX = Math.max(-.2, Math.min(.2, ((event.clientX - bounds.left) / bounds.width - .5) * .4));
      tiltY = Math.max(-.12, Math.min(.12, ((event.clientY - bounds.top) / bounds.height - .5) * .24));
    };
    const observer = new IntersectionObserver(entries => { visible = entries[0]?.isIntersecting ?? false; });
    observer.observe(canvas);
    const parent = canvas.parentElement;
    parent?.addEventListener("pointermove", move);
    const render = (now: number) => {
      frame = requestAnimationFrame(render);
      if (!visible || document.hidden || openedRef.current) return;
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width * Math.min(devicePixelRatio, 1.5)));
      const height = Math.max(1, Math.round(rect.height * Math.min(devicePixelRatio, 1.5)));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.uniform1f(timeLocation, reducedMotion ? 0 : (now - start) / 1000);
      gl.uniform2f(tiltLocation, tiltX, tiltY);
      gl.uniform1f(openLocation, openedRef.current ? 1 : 0);
      gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
    };
    frame = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      parent?.removeEventListener("pointermove", move);
      gl.deleteBuffer(vertexBuffer);
      gl.deleteBuffer(indexBuffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, []);

  return <canvas className="booster-foil-webgl" ref={canvasRef} aria-hidden="true" />;
}
