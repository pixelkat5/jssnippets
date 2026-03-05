import{b as R,j as S}from"./index-DNjbCz78.js";import{W as X,S as _,P as O,Q,n as L,X as V,u as Y,r as z}from"./three.module-c5Q8TOe8.js";const B=`
varying vec2 vUv;
uniform float uTime;
uniform float uEnableWaves;
void main() {
    vUv = uv;
    float time = uTime * 5.;
    vec3 p = position;
    p.x += sin(time + position.y) * 0.4 * uEnableWaves;
    p.y += cos(time + position.z) * 0.15 * uEnableWaves;
    p.z += sin(time + position.x) * 0.70 * uEnableWaves;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`,H=`
varying vec2 vUv;
uniform float uTime;
uniform sampler2D uTexture;
void main() {
    vec2 pos = vUv;
    float r = texture2D(uTexture, pos + cos(uTime*2.-uTime+pos.x)*.01).r;
    float g = texture2D(uTexture, pos + tan(uTime*.5+pos.x-uTime)*.01).g;
    float b = texture2D(uTexture, pos - cos(uTime*2.+uTime+pos.y)*.01).b;
    float a = texture2D(uTexture, pos).a;
    gl_FragColor = vec4(r, g, b, a);
}
`;function U(i,t,o,e,c){return(i-t)/(o-t)*(c-e)+e}const A=" .:-=+*#%@";function J(i,t){const o=document.createElement("canvas"),e=o.getContext("2d"),c=`bold ${t}px monospace`;e.font=c;const d=e.measureText(i),r=Math.ceil(d.width)+t,u=t*1.4;return o.width=r,o.height=u,e.font=c,e.fillStyle="#fff",e.textBaseline="middle",e.fillText(i,t/2,u/2),o}function ee({text:i="Hello",asciiFontSize:t=8,textFontSize:o=180,planeBaseHeight:e=12}){const c=R.useRef(null),d=R.useRef(!1);return R.useEffect(()=>{const r=c.current;if(!r||d.current)return;d.current=!0;const{width:u,height:h}=r.getBoundingClientRect();if(!u||!h)return;const l=new X({antialias:!1,alpha:!0});l.setPixelRatio(1),l.setClearColor(0,0),l.setSize(u,h);const $=t*.6,m=Math.floor(u/$),f=Math.floor(h/t),C=document.createElement("canvas");C.width=m,C.height=f;const g=C.getContext("2d",{willReadFrequently:!0});g.imageSmoothingEnabled=!1;const p=document.createElement("pre");p.style.cssText=`
      position:absolute; inset:0;
      margin:0; padding:0;
      font-family:monospace;
      font-size:${t}px;
      line-height:${t}px;
      white-space:pre;
      overflow:hidden;
      background-image: radial-gradient(circle, #ff6188 0%, #fc9867 50%, #ffd866 100%);
      background-attachment: fixed;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      user-select: none;
      pointer-events: none;
      z-index: 2;
    `,r.appendChild(p);const M=new _,W=50,w=new O(W,u/h,.1,1e3),q=e/2/Math.tan(W/2*(Math.PI/180))*2.5;w.position.z=q;const E=J(i,o),b=new Q(E);b.minFilter=L,b.magFilter=L;const F=E.width/E.height,k=new V(e*F,e,40,20),y=new Y({vertexShader:B,fragmentShader:H,transparent:!0,uniforms:{uTime:{value:0},uTexture:{value:b},uEnableWaves:{value:1}}}),v=new z(k,y);M.add(v);let D;const P=()=>{D=requestAnimationFrame(P),y.uniforms.uTime.value=Date.now()*.001,l.render(M,w),g.clearRect(0,0,m,f),g.drawImage(l.domElement,0,0,m,f);const a=g.getImageData(0,0,m,f).data;let n="";for(let s=0;s<f;s++){for(let x=0;x<m;x++){const T=(s*m+x)*4;if(a[T+3]===0){n+=" ";continue}const G=(.3*a[T]+.6*a[T+1]+.1*a[T+2])/255;n+=A[Math.floor(G*(A.length-1))]}n+=`
`}p.textContent=n};P();const j=a=>{const n=r.getBoundingClientRect(),s=U(a.clientY,n.top,n.bottom,-.45,.45),x=U(a.clientX,n.left,n.right,-.35,.35);v.rotation.x+=(s-v.rotation.x)*.06,v.rotation.y+=(x-v.rotation.y)*.06};document.addEventListener("mousemove",j);const I=new ResizeObserver(([a])=>{const{width:n,height:s}=a.contentRect;!n||!s||(l.setSize(n,s),w.aspect=n/s,w.updateProjectionMatrix())});return I.observe(r),()=>{d.current=!1,cancelAnimationFrame(D),document.removeEventListener("mousemove",j),I.disconnect(),l.dispose(),k.dispose(),y.dispose(),b.dispose(),r.contains(p)&&r.removeChild(p)}},[i,t,o,e]),S.jsx("div",{ref:c,style:{position:"relative",width:"100%",height:"100%",background:"#0a0a0f",overflow:"hidden"}})}export{ee as default};
