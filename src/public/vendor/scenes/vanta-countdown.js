import{a as e,c as t,d as n,f as r,i,l as a,m as o,n as s,o as c,p as l,r as u,s as d}from"./three-DlM0134A.js";var f=420,p=512,m=`700 ${f}px Outfit, system-ui, sans-serif`,h=800;async function g(e=document.fonts){e!=null&&e.load&&await Promise.race([e.load(m,`54321`).catch(()=>{}),new Promise(e=>setTimeout(e,h))])}function _(e,t=()=>document.createElement(`canvas`)){let n=t();n.width=p,n.height=p;let r=n.getContext(`2d`,{willReadFrequently:!0});return r.clearRect(0,0,p,p),r.fillStyle=`#fff`,r.font=m,r.textAlign=`center`,r.textBaseline=`middle`,r.fillText(String(e),p/2,272.8),r.getImageData(0,0,p,p)}function v({digits:e=[5,4,3,2,1],count:t,random:i=Math.random,draw:a=_}){let o=e.map(e=>{let o=n(a(e),{count:t,random:i});return{digit:e,positions:r(o.positions),bounds:o.bounds,spacing:o.spacing}});return{targets:o,height:Math.max(...o.map(e=>e.bounds.maxY-e.bounds.minY)),width:Math.max(...o.map(e=>e.bounds.maxX-e.bounds.minX)),spacing:Math.max(...o.map(e=>e.spacing))}}var y=40,b=.46,x=.1,S=.7,C=.55,w={blending:5,blendSrc:201,blendDst:201,blendSrcAlpha:201,blendDstAlpha:201,premultipliedAlpha:!0},T=`
  uniform float uFrom;
  uniform float uTo;
  uniform float uMorph;
  uniform float uGather;
  uniform float uLoosen;
  uniform float uPulse;
  uniform float uTime;
  uniform float uSize;
  attribute vec3 aT0;
  attribute vec3 aT1;
  attribute vec3 aT2;
  attribute vec3 aT3;
  attribute vec3 aT4;
  attribute vec3 aStart;
  attribute float aSeed;
  varying vec3 vColor;
  varying float vAlpha;

  float easeOut(float x) { return 1.0 - pow(1.0 - x, 3.0); }
  float easeInOut(float x) { return x * x * (3.0 - 2.0 * x); }

  vec3 pick(float i) {
    if (i < 0.5) return aT0;
    if (i < 1.5) return aT1;
    if (i < 2.5) return aT2;
    if (i < 3.5) return aT3;
    return aT4;
  }

  void main() {
    float m = easeInOut(clamp((uMorph - aSeed * 0.35) / 0.65, 0.0, 1.0));
    vec3 p = mix(pick(uFrom), pick(uTo), m);
    // Mid-morph the particles swing out of the plane, which reads as depth.
    p.z += sin(m * 3.14159) * (aSeed - 0.5) * 0.4;

    float g = easeOut(clamp((uGather - aSeed * 0.3) / 0.7, 0.0, 1.0));
    p = mix(aStart, p, g);

    vec2 outward = normalize(p.xy + vec2(0.0001));
    vec3 scatter = vec3(sin(aSeed * 40.0), cos(aSeed * 33.0), sin(aSeed * 17.0));
    p += (vec3(outward, 0.0) * 0.08 + scatter * 0.06) * uLoosen;
    p.xy *= 1.0 + (uPulse - 0.5) * 0.02;

    p.z += sin(uTime * 2.0 + aSeed * 6.2831) * 0.01;
    p.xy += vec2(sin(uTime * 1.7 + aSeed * 9.0), cos(uTime * 1.3 + aSeed * 7.0)) * 0.002;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uSize * (0.75 + 0.5 * aSeed) / -mv.z;
    gl_Position = projectionMatrix * mv;
    vColor = mix(vec3(1.0), vec3(0.78, 0.84, 1.0), aSeed * 0.45);
    vAlpha = g * (1.0 - uLoosen * 0.45);
  }
`,E=(e,t)=>{let n=e()*2-1,r=Math.sqrt(1-n*n),i=e()*Math.PI*2;return t[0]=r*Math.cos(i),t[1]=r*Math.sin(i),t[2]=n,t};function D(t,n){let r=t[0].positions.length/2,a=new e,o=new Float32Array(3),s=new Float32Array(r*3),c=new Float32Array(r);t.forEach((e,t)=>{let o=new Float32Array(r*3);for(let t=0;t<r;t++)o[t*3]=e.positions[t*2],o[t*3+1]=e.positions[t*2+1],o[t*3+2]=(n()-.5)*.03;a.setAttribute(`aT${t}`,new i(o,3))});for(let e=0;e<r;e++){c[e]=n(),E(n,o);let t=.9+n()*1.8;s[e*3]=o[0]*t,s[e*3+1]=o[1]*t,s[e*3+2]=o[2]*t}return a.setAttribute(`position`,a.getAttribute(`aT0`)),a.setAttribute(`aStart`,new i(s,3)),a.setAttribute(`aSeed`,new i(c,1)),a.computeBoundingSphere(),a.boundingSphere.radius=4,a}function O({canvas:e,digits:n,width:r,height:i,dpr:o=1,random:l=Math.random}){let f=new u({canvas:e,antialias:!1,alpha:!0,powerPreference:`high-performance`});f.setPixelRatio(o),f.setClearColor(0,0);let p=new t,m=new c(y,1,.01,50),h=new a({vertexShader:T,fragmentShader:s,uniforms:{uFrom:{value:0},uTo:{value:0},uMorph:{value:1},uGather:{value:0},uLoosen:{value:0},uPulse:{value:0},uTime:{value:0},uSize:{value:1},uIntensity:{value:C}},...w,depthWrite:!1,depthTest:!1,transparent:!0}),g=D(n.targets,l);p.add(new d(g,h));let _=Math.tan(y/2*Math.PI/180),v=1,E=(e,t)=>{f.setSize(e,t,!1),m.aspect=e/t,m.updateProjectionMatrix(),v=Math.max(n.height/(2*_*b),n.width/(2*_*m.aspect*S));let r=t*o/(2*_);h.uniforms.uSize.value=r*n.spacing*2.2};return E(r,i),{render:(e,t)=>{let r=h.uniforms;r.uFrom.value=e.from,r.uTo.value=e.to,r.uMorph.value=e.morph,r.uGather.value=e.gather,r.uLoosen.value=e.loosen,r.uPulse.value=e.pulse,r.uTime.value=t,r.uIntensity.value=C*(1-e.fade*.5);let i=e.dive*e.dive*e.dive,a=-n.height*x*(1-i);m.position.set(0,a,v*(1-i*.96)),m.lookAt(0,a,0),f.render(p,m)},resize:E,dispose:()=>{var e;g.dispose(),h.dispose(),f.dispose(),(e=f.forceContextLoss)==null||e.call(f)},camera:m}}var k=.4,A=.3,j=.85,M=[4.55,5],N=[4.6,5],P=.3,F=e=>Math.min(1,Math.max(0,e)),I=([e,t],n)=>F((n-e)/(t-e)),L=e=>e*e*(3-2*e);function R(e,t,n=5e3){return n/1e3-(e-t)/1e3}function z(e,t=5e3){let n=t/1e3,r=Math.round(n),i=r-1,a=Math.min(n,Math.max(-.4,e)),o=Math.min(i,Math.max(0,Math.floor(a))),s=a<0?0:Math.min(1,a-o),c=L(F((a+k)/k)),l=o===0?1:F(s/A),u=o<i?L(F((s-j)/(1-j))):0,d=o>0?1-L(l):0;return{digit:r-o,from:Math.max(0,o-1),to:o,gather:c,morph:l,loosen:Math.max(u,d),pulse:Math.sin(Math.max(0,a)*Math.PI*2)*.5+.5,dive:I(M,a),fade:I(N,a),done:e>=n}}function B(e,t){let n=L(F(t/P));return n>=e.gather?e:{...e,gather:n}}var V=null;function H(){if(!V){let e=l();V=g().then(()=>v({count:e?5e3:12e3})),V.catch(()=>{V=null})}return V}async function U({container:e,fadeTarget:t=e,startsAtServerTimeMs:n,durationMs:r=5e3,now:i}){let a=l(),s=await H(),c=document.createElement(`canvas`);c.className=`watch-party-countdown-canvas`;let u=()=>({width:e.clientWidth||window.innerWidth,height:e.clientHeight||window.innerHeight}),d=u(),f=O({canvas:c,digits:s,width:d.width,height:d.height,dpr:o(a)});e.appendChild(c);let p=()=>{let e=u();f.resize(e.width,e.height)};window.addEventListener(`resize`,p);let m=null,h=!1,g,_=new Promise(e=>{g=e}),v=performance.now(),y=()=>{if(h)return;let e=B(z(R(n,i(),r),r),(performance.now()-v)/1e3);if(f.render(e,(performance.now()-v)/1e3),t.style.opacity=String(1-e.fade),e.done){g();return}m=requestAnimationFrame(y)};return m=requestAnimationFrame(y),{done:_,destroy(){h||(h=!0,m!==null&&cancelAnimationFrame(m),window.removeEventListener(`resize`,p),f.dispose(),c.remove(),t.style.opacity=``,g())}}}export{U as mountCountdown,H as prepareCountdown};