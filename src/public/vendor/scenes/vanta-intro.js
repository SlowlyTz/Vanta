import{a as e,c as t,i as n,l as r,m as i,o as a,p as o,r as s,s as c,t as l,u}from"./three-DlM0134A.js";var d=()=>({minX:1/0,maxX:-1/0,minY:1/0,maxY:-1/0}),f=(e,t,n)=>{t<e.minX&&(e.minX=t),t>e.maxX&&(e.maxX=t),n<e.minY&&(e.minY=n),n>e.maxY&&(e.maxY=n)};function p(e,t=Math.max(1,Math.floor(e.length*.01))){let n=-1,r=!1;for(let i=0;i<e.length;i++)if(e[i]>0){if(r&&n>=0&&i-n>=t)return i;n=-1,r=!0}else n<0&&(n=i);return e.length}function m(e,{count:t,random:n=Math.random,alphaThreshold:r=40}={}){let{width:i,height:a,data:o}=e,s=new Uint32Array(i),c=[];for(let e=0;e<a;e++)for(let t=0;t<i;t++){let n=(e*i+t)*4;o[n+3]>r&&(c.push(n/4),s[t]++)}let l=p(s),u=Math.min(t||c.length,c.length),m=c.length/u,h={v:d(),word:d(),logo:d()},g=new Uint32Array(u);for(let e=0;e<u;e++){let t=c[Math.min(c.length-1,Math.floor(e*m+n()*m))];g[e]=t;let r=t%i,a=(t-r)/i;f(h.logo,r,a),f(r<l?h.v:h.word,r,a)}let _=e=>({minX:(e.minX-i/2)/a,maxX:(e.maxX+1-i/2)/a,minY:(a/2-(e.maxY+1))/a,maxY:(a/2-e.minY)/a}),v={v:_(h.v),word:_(h.word),logo:_(h.logo)},y=(v.logo.minX+v.logo.maxX)/2,b=(v.logo.minY+v.logo.maxY)/2,x=e=>({minX:e.minX-y,maxX:e.maxX-y,minY:e.minY-b,maxY:e.maxY-b});v.v=x(v.v),v.word=x(v.word),v.logo=x(v.logo);let S=new Float32Array(u*2),C=new Float32Array(u*3),w=new Float32Array(u),T=new Float32Array(u),E=Math.max(1e-6,v.word.maxX-v.word.minX);for(let e=0;e<u;e++){let t=g[e],r=t%i,s=(t-r)/i,c=(r+n()-i/2)/a-y,u=(a/2-(s+n()))/a-b;S[e*2]=c,S[e*2+1]=u,C[e*3]=o[t*4]/255,C[e*3+1]=o[t*4+1]/255,C[e*3+2]=o[t*4+2]/255;let d=r>=l;w[e]=+!!d,T[e]=d?(c-v.word.minX)/E:0}return{count:u,positions:S,colors:C,groups:w,orders:T,bounds:v,spacing:Math.sqrt(c.length/u)/a}}var h={form:[0,1.3],slide:[1.4,2.2],write:[1.6,2.7],zoom:[3.1,4],fade:[3.4,4]},g=([e,t],n)=>Math.min(1,Math.max(0,(n-e)/(t-e)));function _(e){return{form:g(h.form,e),slide:g(h.slide,e),write:g(h.write,e),zoom:g(h.zoom,e),fade:g(h.fade,e),done:e>=4}}var v=42,y=.8,b=.55,x=.5,S=`
  uniform float uForm;
  uniform float uSlide;
  uniform float uWrite;
  uniform float uTime;
  uniform float uSize;
  uniform vec3 uVShift;
  attribute vec3 aStart;
  attribute vec3 aColor;
  attribute float aGroup;
  attribute float aOrder;
  attribute float aSeed;
  varying vec3 vColor;
  varying float vAlpha;

  float easeOut(float x) { return 1.0 - pow(1.0 - x, 3.0); }
  float easeInOut(float x) { return x * x * (3.0 - 2.0 * x); }

  void main() {
    vec3 p;
    float alpha;
    if (aGroup < 0.5) {
      float f = easeOut(clamp((uForm - aSeed * 0.35) / 0.65, 0.0, 1.0));
      vec3 formed = position + uVShift;
      p = mix(mix(aStart, formed, f), position, easeInOut(uSlide));
      alpha = f;
    } else {
      float f = easeOut(clamp((uWrite - aOrder * 0.7) / 0.3, 0.0, 1.0));
      p = mix(aStart, position, f);
      alpha = f;
    }
    p.z += sin(uTime * 2.0 + aSeed * 6.2831) * 0.012;
    p.xy += vec2(sin(uTime * 1.7 + aSeed * 9.0), cos(uTime * 1.3 + aSeed * 7.0)) * 0.002;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uSize * (0.75 + 0.5 * aSeed) / -mv.z;
    gl_Position = projectionMatrix * mv;
    vColor = aColor;
    vAlpha = alpha;
  }
`,C=(e,t,n)=>{let r=e()*2-1,i=Math.sqrt(1-r*r),a=e()*Math.PI*2;t[n]=i*Math.cos(a),t[n+1]=i*Math.sin(a),t[n+2]=r};function w(t,r){let{count:i,positions:a,colors:o,groups:s,orders:c,bounds:l}=t,u=[-(l.v.minX+l.v.maxX)/2,-(l.v.minY+l.v.maxY)/2,0],d=new Float32Array(i*3),f=new Float32Array(i*3),p=new Float32Array(i),m=new Float32Array(3);for(let e=0;e<i;e++){let t=a[e*2],n=a[e*2+1];if(d[e*3]=t,d[e*3+1]=n,d[e*3+2]=(r()-.5)*.04,p[e]=r(),C(r,m,0),s[e]<.5){let i=.5+r()*1.6;f[e*3]=t+u[0]+m[0]*i,f[e*3+1]=n+u[1]+m[1]*i,f[e*3+2]=m[2]*i}else{let i=.12+r()*.3;f[e*3]=t+m[0]*i,f[e*3+1]=n+m[1]*i,f[e*3+2]=m[2]*i}}let h=new e;return h.setAttribute(`position`,new n(d,3)),h.setAttribute(`aStart`,new n(f,3)),h.setAttribute(`aColor`,new n(o,3)),h.setAttribute(`aGroup`,new n(s,1)),h.setAttribute(`aOrder`,new n(c,1)),h.setAttribute(`aSeed`,new n(p,1)),h.computeBoundingSphere(),h.boundingSphere.radius=4,{geometry:h,vShift:u}}function T({canvas:e,sample:n,width:i,height:o,dpr:u=1,random:d=Math.random}){let f=new s({canvas:e,antialias:!1,alpha:!1,powerPreference:`high-performance`});f.setPixelRatio(u),f.setClearColor(0,1);let p=new t,m=new a(v,1,.01,50),{geometry:h,vShift:g}=w(n,d),C=new r({vertexShader:S,fragmentShader:l,uniforms:{uForm:{value:0},uSlide:{value:0},uWrite:{value:0},uTime:{value:0},uSize:{value:1},uIntensity:{value:1},uVShift:{value:g}},blending:2,depthWrite:!1,depthTest:!1,transparent:!0});p.add(new c(h,C));let T=Math.tan(v/2*Math.PI/180),E=n.bounds.logo.maxX-n.bounds.logo.minX,D=n.bounds.logo.maxY-n.bounds.logo.minY,O=(n.bounds.word.minX+n.bounds.word.maxX)/2,k=1,A=(e,t)=>{i=e,o=t,f.setSize(e,t,!1),m.aspect=e/t,m.updateProjectionMatrix(),k=Math.max(E/(2*T*m.aspect*y),D/(2*T*b)),C.uniforms.uSize.value=t*u*n.spacing*2/(2*T)};return A(i,o),{render:e=>{let t=_(e),n=C.uniforms;n.uForm.value=t.form,n.uSlide.value=t.slide,n.uWrite.value=t.write,n.uTime.value=e,n.uIntensity.value=x*(1-t.fade*.6);let r=t.zoom*t.zoom*t.zoom;return m.position.set(O*.5*r,0,k*(1-r*.94)),m.lookAt(m.position.x,0,0),f.render(p,m),t},resize:A,dispose:()=>{var e;h.dispose(),C.dispose(),f.dispose(),(e=f.forceContextLoss)==null||e.call(f)},camera:m}}var E=1086,D=e=>new Promise((t,n)=>{let r=new Image;r.onload=()=>t(r),r.onerror=()=>n(Error(`intro logo failed to load: ${e}`)),r.src=e});async function O(e,{logo:t=`/assets/logo2.png`,signal:n=null}={}){if(n!=null&&n.aborted)return;let r=e.querySelector(`canvas`)||e.appendChild(document.createElement(`canvas`)),a=o(),s=T({canvas:r,sample:m(u(await D(t),E),{count:a?16e3:38e3}),width:window.innerWidth,height:window.innerHeight,dpr:i(a)}),c=()=>s.resize(window.innerWidth,window.innerHeight);window.addEventListener(`resize`,c);try{await new Promise(t=>{let r=0;n==null||n.addEventListener(`abort`,t,{once:!0});let i=a=>{if(n!=null&&n.aborted)return;r||(r=a);let o=(a-r)/1e3,c=s.render(Math.min(o,4));e.style.opacity=String(1-c.fade),c.done?t():requestAnimationFrame(i)};requestAnimationFrame(i)})}finally{window.removeEventListener(`resize`,c),s.dispose()}}export{O as playIntro};