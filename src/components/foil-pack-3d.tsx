"use client";

import { useEffect, useRef } from "react";

/**
 * A flexible foil pack rendered as an actual UV-textured 3D mesh.
 * The sealed top and inflated body are separate pieces of geometry.
 * The opening moves and folds the meshes, not a CSS rectangle.
 */
export function FoilPack3D({ kind, progress, opened }: {
  kind: "live" | "scene";
  progress: number;
  opened: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const backupRef = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef(progress);
  const openedRef = useRef(opened);
  useEffect(() => { progressRef.current = progress; }, [progress]);
  useEffect(() => { openedRef.current = opened; }, [opened]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // JSDOM has no GPU or 2D canvas: avoid calling its unimplemented methods.
    if (/jsdom/i.test(navigator.userAgent)) return;
    const art = paintFoilArtwork(kind);
    // Independently painted foil stays visible if WebGL is unavailable or fails to draw.
    const stopBackup = backupRef.current
      ? startFoilBackup(backupRef.current, art, openedRef, progressRef)
      : () => {};
    const gl = canvas.getContext("webgl", {
      alpha: true, antialias: true, powerPreference: "low-power",
      premultipliedAlpha: false,
    });
    if (!gl) return stopBackup;

    const vertexSource = [
      "attribute vec3 aPosition;",
      "attribute vec3 aNormal;",
      "attribute vec2 aUv;",
      "attribute float aPiece;",
      "attribute float aSide;",
      "uniform float uTime;",
      "uniform float uOpen;",
      "uniform float uTear;",
      "uniform vec2 uTilt;",
      "varying vec2 vUv;",
      "varying vec3 vNormal;",
      "varying float vSide;",
      "void main() {",
      " vec3 p = aPosition;",
      " float t = smoothstep(0.,1.,uOpen);",
      " if (aPiece > .5) {",
      "   float angle = -.85*t;",
      "   p.xy = mat2(cos(angle),-sin(angle),sin(angle),cos(angle)) * (p.xy - vec2(0., .96)) + vec2(0.,.96);",
      "   p.x += t*1.38; p.y += t*.7; p.z += t*.57;",
      "   p.z += uTear*.034*sin(aUv.x*44.);",
      " } else {",
      "   float lip = 1. - smoothstep(.135,.23,aUv.y);",
      "   p.z += lip*uTear*(.1+.09*sin(aUv.x*22.));",
      "   p.y -= t*(.56+.13*(1.-aUv.y));",
      "   p.z -= t*(.18+lip*.35);",
      "   p.x *= 1.-t*.16;",
      " }",
      " float yaw = -.24 + uTilt.x + sin(uTime*.4)*.04;",
      " float pitch = .065 + uTilt.y;",
      " mat3 ry = mat3(cos(yaw),0.,-sin(yaw),0.,1.,0.,sin(yaw),0.,cos(yaw));",
      " mat3 rx = mat3(1.,0.,0.,0.,cos(pitch),sin(pitch),0.,-sin(pitch),cos(pitch));",
      " mat3 rot = ry*rx;",
      " p = rot*p;",
      " float lens = 3.5 / (3.5-p.z);",
      " gl_Position = vec4(p.x*lens*.97,p.y*lens*.73,-p.z*.15,1.);",
      " vUv = aUv; vNormal = normalize(rot*aNormal); vSide = aSide;",
      "}",
    ].join("\n");
    const fragmentSource = [
      "precision mediump float;",
      "uniform sampler2D uArt;",
      "uniform float uTime;",
      "uniform float uOpen;",
      "varying vec2 vUv;",
      "varying vec3 vNormal;",
      "varying float vSide;",
      "void main(){",
      " vec3 n=normalize(vNormal);",
      " vec3 light=normalize(vec3(-.5+sin(uTime*.36)*.44,.64,1.));",
      " vec3 eye=vec3(0.,0.,1.);",
      " float diff=max(dot(n,light),0.);",
      " float spec=pow(max(dot(reflect(-light,n),eye),0.),24.);",
      " float rim=pow(1.-max(dot(n,eye),0.),2.7);",
      " vec3 printColor=texture2D(uArt,vUv).rgb;",
      " float animatedSheen=pow(max(0.,1.-abs(vUv.x-.5-sin(uTime*.4)*.52)*4.),5.);",
      " vec3 color=printColor*(.65+.36*diff)+vec3(1.,.82,.73)*(spec*.62+rim*.16+animatedSheen*.07);",
      " color*=1.-vSide*.54;",
      " gl_FragColor=vec4(color,1.-smoothstep(.73,1.,uOpen)*.83);",
      "}",
    ].join("\n");
    const vertexShader = compile(gl, gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
    if (!vertexShader || !fragmentShader) return stopBackup;
    const program = gl.createProgram();
    if (!program) return stopBackup;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return stopBackup;
    gl.useProgram(program);
    const geometry = buildFoilGeometry();
    const buffer = gl.createBuffer();
    if (!buffer) return stopBackup;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geometry), gl.STATIC_DRAW);
    const stride = 10 * Float32Array.BYTES_PER_ELEMENT;
    const layout: Array<[string, number, number]> = [
      ["aPosition",3,0],["aNormal",3,12],["aUv",2,24],["aPiece",1,32],["aSide",1,36],
    ];
    for (const [name,size,offset] of layout) {
      const loc = gl.getAttribLocation(program,name);
      if (loc < 0) continue;
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc,size,gl.FLOAT,false,stride,offset);
    }
    const texture = gl.createTexture();
    if (!texture) return stopBackup;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,art);
    gl.uniform1i(gl.getUniformLocation(program,"uArt"),0);
    const uniforms = {
      time:gl.getUniformLocation(program,"uTime"),
      open:gl.getUniformLocation(program,"uOpen"),
      tear:gl.getUniformLocation(program,"uTear"),
      tilt:gl.getUniformLocation(program,"uTilt"),
    };
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);

    let request = 0;
    let openedAt: number | null = null;
    let visible = true;
    let tiltX = 0;
    let tiltY = 0;
    let smoothX = 0;
    let smoothY = 0;
    let gpuChecks = 0;
    let gpuFrames = 0;
    const start = performance.now();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const parent = canvas.parentElement;
    const pointer = (event: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      tiltX = Math.max(-.19,Math.min(.19,(event.clientX-r.left)/r.width*.38-.19));
      tiltY = Math.max(-.10,Math.min(.10,.1-(event.clientY-r.top)/r.height*.2));
    };
    const leave = () => { tiltX=0;tiltY=0; };
    parent?.addEventListener("pointermove",pointer);
    parent?.addEventListener("pointerleave",leave);
    const observer = new IntersectionObserver(entries => {
      visible=entries[0]?.isIntersecting ?? false;
    });
    observer.observe(canvas);
    const render = (now: number) => {
      request=requestAnimationFrame(render);
      if (!visible || document.hidden) return;
      const box=canvas.getBoundingClientRect();
      const dpr=Math.min(window.devicePixelRatio || 1,1.5);
      const width=Math.max(1,Math.round(box.width*dpr));
      const height=Math.max(1,Math.round(box.height*dpr));
      if (canvas.width!==width || canvas.height!==height) {
        canvas.width=width;canvas.height=height;gl.viewport(0,0,width,height);
      }
      if(openedRef.current && openedAt===null) openedAt=now;
      const open=openedAt===null?0:Math.min(1,(now-openedAt)/1100);
      smoothX+=(tiltX-smoothX)*.065;
      smoothY+=(tiltY-smoothY)*.065;
      gl.clearColor(0,0,0,0);
      gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      gl.uniform1f(uniforms.time,reduced?0:(now-start)/1000);
      gl.uniform1f(uniforms.open,open);
      gl.uniform1f(uniforms.tear,progressRef.current/100);
      gl.uniform2f(uniforms.tilt,smoothX,smoothY);
      gl.drawArrays(gl.TRIANGLES,0,geometry.length/10);
      // A canvas existing in the DOM is not proof the GPU drew anything.
      // Only hide the independently painted fallback after reading a real pixel.
      if (!canvas.dataset.rendered && !openedRef.current &&
          gpuChecks < 8 && gpuFrames++ % 8 === 0) {
        gpuChecks++;
        const pixel = new Uint8Array(4);
        gl.readPixels(Math.floor(width / 2), Math.floor(height / 2),
          1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
        if (pixel[3] > 0) {
          canvas.dataset.rendered = "true";
          stopBackup();
        }
      }
    };
    request=requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(request);
      stopBackup();
      observer.disconnect();
      parent?.removeEventListener("pointermove",pointer);
      parent?.removeEventListener("pointerleave",leave);
      gl.deleteBuffer(buffer);
      gl.deleteTexture(texture);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
    };
  }, [kind]);
  return (
    <>
      <canvas ref={backupRef} className="booster-pack-fallback" aria-hidden="true" />
      <canvas ref={canvasRef} className="booster-pack-canvas" aria-hidden="true" />
    </>
  );
}

function compile(gl: WebGLRenderingContext,type: number,source: string) {
  const shader=gl.createShader(type);
  if(!shader)return null;
  gl.shaderSource(shader,source);
  gl.compileShader(shader);
  if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function buildFoilGeometry() {
  const data: number[]=[];
  type V = [number,number,number,number,number,number,number,number,number,number];
  const point=(u:number,v:number,cap:number):V=>{
    const x=u*2-1;
    const bulge=Math.pow(Math.max(0,1-x*x),1.5)*Math.pow(Math.max(0,Math.sin(Math.PI*v)),.7);
    const sideCrease=.013*Math.sin(x*48+v*18)*Math.pow(Math.abs(x),4);
    const seal=(v < .085 || v > .92) ? .017 * Math.sin(u * 140) : 0;
    const nx=.30*x-.07*Math.cos(x*48+v*18);
    const ny=.25*(v-.5);
    const norm=Math.hypot(nx,ny,1);
    return [x*.82,(1-v*2)*1.17,.24*bulge+sideCrease+seal,nx/norm,ny/norm,1/norm,u,v,cap,0];
  };
  const push=(a:V,b:V,c:V)=>data.push(...a,...b,...c);
  for(const [vmin,vmax,rows,cap] of [[.135,1,56,0],[0,.135,10,1]]){
    for(let yi=0;yi<rows;yi++){
      const v0=vmin+(vmax-vmin)*yi/rows;
      const v1=vmin+(vmax-vmin)*(yi+1)/rows;
      for(let xi=0;xi<32;xi++){
        const u0=xi/32,u1=(xi+1)/32;
        const a=point(u0,v0,cap),b=point(u1,v0,cap);
        const c=point(u0,v1,cap),d=point(u1,v1,cap);
        push(a,c,b);push(b,c,d);
      }
    }
    // Genuine folded side walls give a visible edge when the foil rotates.
    for(let i=0;i<rows;i++){
      const v0=vmin+(vmax-vmin)*i/rows;
      const v1=vmin+(vmax-vmin)*(i+1)/rows;
      for(const u of [0,1]){
        const a=point(u,v0,cap),b=point(u,v1,cap);
        const sign=u===0?-1:1;
        const c:V=[a[0]-sign*.02,a[1],-.16,sign,0,.2,u,v0,cap,1];
        const d:V=[b[0]-sign*.02,b[1],-.16,sign,0,.2,u,v1,cap,1];
        push(a,c,b);push(b,c,d);
      }
    }
  }
  return data;
}

function paintFoilArtwork(kind:"live"|"scene"): HTMLCanvasElement {
  const canvas=document.createElement("canvas");
  canvas.width=768;canvas.height=1152;
  const g=canvas.getContext("2d");
  if(!g)return canvas;
  const scene=kind==="scene";
  const W=canvas.width,H=canvas.height;
  const base=g.createLinearGradient(0,0,W,H);
  const stops=scene
    ? ["#1b163b","#594078","#1b173a","#4e3477","#100d27"]
    : ["#171420","#7d2947","#291323","#9b3853","#140d1f"];
  stops.forEach((color,i)=>base.addColorStop(i/4,color));
  g.fillStyle=base;g.fillRect(0,0,W,H);
  const sheen=g.createLinearGradient(0,0,W,0);
  sheen.addColorStop(0,"rgba(255,232,208,.46)");
  sheen.addColorStop(.06,"rgba(1,0,18,.49)");
  sheen.addColorStop(.30,"rgba(255,217,222,.055)");
  sheen.addColorStop(.55,"rgba(0,0,0,.20)");
  sheen.addColorStop(.81,"rgba(255,218,225,.22)");
  sheen.addColorStop(.95,"rgba(0,0,0,.62)");
  sheen.addColorStop(1,"rgba(255,226,213,.52)");
  g.fillStyle=sheen;g.fillRect(0,0,W,H);
  const aura=g.createRadialGradient(W*.53,H*.58,18,W*.53,H*.58,W*.7);
  aura.addColorStop(0,scene?"rgba(186,133,249,.48)":"rgba(242,119,162,.4)");
  aura.addColorStop(1,"transparent");
  g.fillStyle=aura;g.fillRect(0,0,W,H);
  g.save();g.translate(W/2,H/2);g.rotate(-.3);
  for(let x=-W*2;x<W*2;x+=17){
    g.strokeStyle=x%34===0?"rgba(255,228,217,.07)":"rgba(0,0,0,.09)";
    g.lineWidth=1;g.beginPath();g.moveTo(x,-H);g.lineTo(x,H);g.stroke();
  }
  g.restore();
  g.fillStyle="rgba(255,215,207,.25)";
  g.fillRect(19,115,3,H-216);g.fillRect(W-25,115,5,H-216);
  g.strokeStyle="rgba(255,232,225,.52)";g.lineWidth=2;
  g.strokeRect(42,151,W-84,847);
  // Ultrasonic welds: each crimp catches light individually.
  for(const y of [0,1062]){
    const grad=g.createLinearGradient(0,y,0,y+90);
    grad.addColorStop(0,scene?"#b59cd8":"#e7aaa2");
    grad.addColorStop(.19,scene?"#362858":"#461a2c");
    grad.addColorStop(.81,scene?"#59427e":"#6d263c");
    grad.addColorStop(1,scene?"#a194cd":"#d18b98");
    g.fillStyle=grad;g.fillRect(0,y,W,90);
    for(let x=0;x<W;x+=12){
      g.fillStyle=x%24===0?"rgba(255,239,221,.32)":"rgba(12,2,18,.28)";
      g.fillRect(x,y+6,4,77);
    }
  }
  g.fillStyle="#fff2e5";g.textAlign="center";
  g.font="bold 24px Arial, sans-serif";
  g.fillText("C R E A T O R   D E C K",W/2,126);
  g.font="bold 23px Arial, sans-serif";
  g.fillStyle="rgba(255,240,223,.76)";
  g.fillText(scene?"S C E N E   /   0 1":"L I V E   /   0 1",W/2,224);
  g.textAlign="left";g.shadowColor="rgba(4,0,17,.76)";
  g.shadowBlur=18;g.shadowOffsetY=10;g.fillStyle="#fff4ea";
  g.font="900 76px Arial, sans-serif";g.fillText("CREATOR",70,345);
  g.font="900 171px Arial, sans-serif";g.fillText("DECK",60,485);
  g.shadowBlur=0;g.shadowOffsetY=0;
  // A dimensional engraved foil emblem rather than the old photo collage.
  const cx=W/2,cy=715;
  g.save();g.translate(cx,cy);g.rotate(-.19);
  for(const radius of [240,202,168]){
    g.beginPath();g.ellipse(0,0,radius,radius*.63,-.35,0,Math.PI*2);
    g.strokeStyle=scene?"rgba(220,189,255,.38)":"rgba(255,209,172,.37)";
    g.lineWidth=radius===240?4:2;g.stroke();
  }
  g.rotate(.19);
  g.beginPath();
  for(let i=0;i<6;i++){
    const a=Math.PI/3*i-Math.PI/2;
    const x=Math.cos(a)*146,y=Math.sin(a)*168;
    if(i===0)g.moveTo(x,y);else g.lineTo(x,y);
  }
  g.closePath();
  const metal=g.createLinearGradient(-145,-153,150,166);
  metal.addColorStop(0,scene?"#eee1ff":"#fff3e3");
  metal.addColorStop(.25,scene?"#a27acb":"#e8b9ac");
  metal.addColorStop(.55,scene?"#4b3070":"#82364b");
  metal.addColorStop(.81,scene?"#251739":"#411c34");
  metal.addColorStop(1,scene?"#b993e1":"#dba38d");
  g.fillStyle=metal;g.shadowColor=scene?"#9a66dd":"#f47f9e";
  g.shadowBlur=46;g.fill();g.shadowBlur=0;
  g.strokeStyle="rgba(255,241,228,.83)";g.lineWidth=8;g.stroke();
  g.beginPath();g.moveTo(-44,-102);g.lineTo(46,0);g.lineTo(-44,102);
  g.strokeStyle="rgba(255,250,245,.84)";g.lineWidth=18;
  g.lineCap="round";g.lineJoin="round";g.stroke();g.restore();
  g.textAlign="center";g.fillStyle="#fff1e4";
  g.font="bold 34px Arial, sans-serif";
  g.fillText(scene?"PAQUET SCÈNE":"TOP 1000 LIVE",W/2,972);
  g.font="bold 26px Arial, sans-serif";
  g.fillStyle="rgba(255,219,207,.78)";
  g.fillText("5  C A R T E S   •   É D I T I O N   I",W/2,1032);
  return canvas;
}


/** Reliable foil draw when Chromium/WebView cannot run a WebGL shader.
 * The cap and the body still separate; never show a blank canvas. */
function startFoilBackup(
  canvas: HTMLCanvasElement,
  art: HTMLCanvasElement,
  openedRef: { current: boolean },
  progressRef: { current: number },
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};
  let handle = 0;
  let openingAt: number | null = null;
  let lastPaintedAt = -1000;
  const render = (now: number) => {
    handle = requestAnimationFrame(render);
    if (document.hidden || now - lastPaintedAt < 32) return;
    lastPaintedAt = now;
    const b = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.max(1, Math.round(b.width * dpr));
    const h = Math.max(1, Math.round(b.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    if (openedRef.current && openingAt === null) openingAt = now;
    const open = openingAt === null ? 0 : Math.min(1, (now-openingAt)/1100);
    const tear = progressRef.current / 100;
    const packW = w * .76;
    const packH = h * .83;
    const x = -packW / 2;
    const y = -packH / 2;
    const cut = .135;
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(w * .5, h * .5);
    ctx.transform(.97, .01, -.10, .985, 0, 0);
    // Visible folded side, including a dark opposite face.
    ctx.fillStyle = "#130c1c";
    ctx.fillRect(x + 11, y + 8 + open*90, packW + 7, packH);
    ctx.shadowColor = "rgba(0,0,0,.8)";
    ctx.shadowBlur = packW * .12;
    ctx.shadowOffsetX = packW * .06;
    ctx.shadowOffsetY = packW * .07;
    ctx.drawImage(art, 0, art.height*cut, art.width, art.height*(1-cut),
      x + open*packW*.05, y + packH*cut + open*packH*.18,
      packW*(1-open*.10), packH*(1-cut));
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.save();
    ctx.translate(open*packW*.85, -open*packH*.24 - tear*packH*.018);
    ctx.rotate(-open*.68);
    ctx.drawImage(art, 0, 0, art.width, art.height*cut,
      x, y, packW, packH*cut);
    ctx.restore();
    ctx.restore();
  };
  handle = requestAnimationFrame(render);
  return () => cancelAnimationFrame(handle);
}
