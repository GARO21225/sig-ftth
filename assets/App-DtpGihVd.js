const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/LoginPage-Cnpj-DUN.js","assets/index-DpRO8GpU.js","assets/vendor-react-BeK1MbjZ.js","assets/index-BgiOwbCG.css","assets/api-C4-va_VY.js","assets/vendor-charts-dkL-Ffi_.js","assets/MotDePasseOubliePage-D116l1A8.js","assets/ResetPasswordPage-BFRUqDgR.js","assets/Layout-Bt9-rjuU.js","assets/MapPage-Ch0uI8Lb.js","assets/vendor-map-x5xERZJu.js","assets/leaflet-Dgihpmma.css","assets/DashboardPage-Dg_iUaMg.js","assets/TravauxPage-ChrNtWVv.js","assets/EligibilitePage-DMcS1qcY.js","assets/TerrainMobilePage-DKaJcg9P.js","assets/CataloguePage-CdAXRPeR.js","assets/AdminPage-DMfLqDQN.js","assets/ImportDWGPage-Df15owz0.js","assets/ScanPage-B18hOvLP.js","assets/AnalyticsPage-BZMnh2a2.js","assets/ELPage-BURviKwT.js","assets/SynoptiquePage-rqkV0bx1.js","assets/ExportPage-IN2BECO_.js"])))=>i.map(i=>d[i]);
import{j as i,_ as j}from"./index-DpRO8GpU.js";import{r as c,R as ne,B as ae,d as ie,e as x,N as $}from"./vendor-react-BeK1MbjZ.js";import{u as le}from"./vendor-charts-dkL-Ffi_.js";let ce={data:""},ue=e=>{if(typeof window=="object"){let t=(e?e.querySelector("#_goober"):window._goober)||Object.assign(document.createElement("style"),{innerHTML:" ",id:"_goober"});return t.nonce=window.__nonce__,t.parentNode||(e||document.head).appendChild(t),t.firstChild}return e||ce},de=/(?:([\u0080-\uFFFF\w-%@]+) *:? *([^{;]+?);|([^;}{]*?) *{)|(}\s*)/g,me=/\/\*[^]*?\*\/|  +/g,q=/\n+/g,k=(e,t)=>{let r="",s="",a="";for(let o in e){let n=e[o];o[0]=="@"?o[1]=="i"?r=o+" "+n+";":s+=o[1]=="f"?k(n,o):o+"{"+k(n,o[1]=="k"?"":t)+"}":typeof n=="object"?s+=k(n,t?t.replace(/([^,])+/g,u=>o.replace(/([^,]*:\S+\([^)]*\))|([^,])+/g,l=>/&/.test(l)?l.replace(/&/g,u):u?u+" "+l:l)):o):n!=null&&(o=/^--/.test(o)?o:o.replace(/[A-Z]/g,"-$&").toLowerCase(),a+=k.p?k.p(o,n):o+":"+n+";")}return r+(t&&a?t+"{"+a+"}":a)+s},I={},Y=e=>{if(typeof e=="object"){let t="";for(let r in e)t+=r+Y(e[r]);return t}return e},pe=(e,t,r,s,a)=>{let o=Y(e),n=I[o]||(I[o]=(l=>{let d=0,m=11;for(;d<l.length;)m=101*m+l.charCodeAt(d++)>>>0;return"go"+m})(o));if(!I[n]){let l=o!==e?e:(d=>{let m,p,h=[{}];for(;m=de.exec(d.replace(me,""));)m[4]?h.shift():m[3]?(p=m[3].replace(q," ").trim(),h.unshift(h[0][p]=h[0][p]||{})):h[0][m[1]]=m[2].replace(q," ").trim();return h[0]})(e);I[n]=k(a?{["@keyframes "+n]:l}:l,r?"":"."+n)}let u=r&&I.g?I.g:null;return r&&(I.g=I[n]),((l,d,m,p)=>{p?d.data=d.data.replace(p,l):d.data.indexOf(l)===-1&&(d.data=m?l+d.data:d.data+l)})(I[n],t,s,u),n},fe=(e,t,r)=>e.reduce((s,a,o)=>{let n=t[o];if(n&&n.call){let u=n(r),l=u&&u.props&&u.props.className||/^go/.test(u)&&u;n=l?"."+l:u&&typeof u=="object"?u.props?"":k(u,""):u===!1?"":u}return s+a+(n??"")},"");function N(e){let t=this||{},r=e.call?e(t.p):e;return pe(r.unshift?r.raw?fe(r,[].slice.call(arguments,1),t.p):r.reduce((s,a)=>Object.assign(s,a&&a.call?a(t.p):a),{}):r,ue(t.target),t.g,t.o,t.k)}let Z,H,W;N.bind({g:1});let T=N.bind({k:1});function ge(e,t,r,s){k.p=t,Z=e,H=r,W=s}function R(e,t){let r=this||{};return function(){let s=arguments;function a(o,n){let u=Object.assign({},o),l=u.className||a.className;r.p=Object.assign({theme:H&&H()},u),r.o=/ *go\d+/.test(l),u.className=N.apply(r,s)+(l?" "+l:"");let d=e;return e[0]&&(d=u.as||e,delete u.as),W&&d[0]&&W(u),Z(d,u)}return t?t(a):a}}var he=e=>typeof e=="function",C=(e,t)=>he(e)?e(t):e,ye=(()=>{let e=0;return()=>(++e).toString()})(),K=(()=>{let e;return()=>{if(e===void 0&&typeof window<"u"){let t=matchMedia("(prefers-reduced-motion: reduce)");e=!t||t.matches}return e}})(),ve=20,U="default",Q=(e,t)=>{let{toastLimit:r}=e.settings;switch(t.type){case 0:return{...e,toasts:[t.toast,...e.toasts].slice(0,r)};case 1:return{...e,toasts:e.toasts.map(n=>n.id===t.toast.id?{...n,...t.toast}:n)};case 2:let{toast:s}=t;return Q(e,{type:e.toasts.find(n=>n.id===s.id)?1:0,toast:s});case 3:let{toastId:a}=t;return{...e,toasts:e.toasts.map(n=>n.id===a||a===void 0?{...n,dismissed:!0,visible:!1}:n)};case 4:return t.toastId===void 0?{...e,toasts:[]}:{...e,toasts:e.toasts.filter(n=>n.id!==t.toastId)};case 5:return{...e,pausedAt:t.time};case 6:let o=t.time-(e.pausedAt||0);return{...e,pausedAt:void 0,toasts:e.toasts.map(n=>({...n,pauseDuration:n.pauseDuration+o}))}}},z=[],X={toasts:[],pausedAt:void 0,settings:{toastLimit:ve}},S={},ee=(e,t=U)=>{S[t]=Q(S[t]||X,e),z.forEach(([r,s])=>{r===t&&s(S[t])})},te=e=>Object.keys(S).forEach(t=>ee(e,t)),_e=e=>Object.keys(S).find(t=>S[t].toasts.some(r=>r.id===e)),M=(e=U)=>t=>{ee(t,e)},be={blank:4e3,error:4e3,success:2e3,loading:1/0,custom:4e3},xe=(e={},t=U)=>{let[r,s]=c.useState(S[t]||X),a=c.useRef(S[t]);c.useEffect(()=>(a.current!==S[t]&&s(S[t]),z.push([t,s]),()=>{let n=z.findIndex(([u])=>u===t);n>-1&&z.splice(n,1)}),[t]);let o=r.toasts.map(n=>{var u,l,d;return{...e,...e[n.type],...n,removeDelay:n.removeDelay||((u=e[n.type])==null?void 0:u.removeDelay)||(e==null?void 0:e.removeDelay),duration:n.duration||((l=e[n.type])==null?void 0:l.duration)||(e==null?void 0:e.duration)||be[n.type],style:{...e.style,...(d=e[n.type])==null?void 0:d.style,...n.style}}});return{...r,toasts:o}},Ee=(e,t="blank",r)=>({createdAt:Date.now(),visible:!0,dismissed:!1,type:t,ariaProps:{role:"status","aria-live":"polite"},message:e,pauseDuration:0,...r,id:(r==null?void 0:r.id)||ye()}),A=e=>(t,r)=>{let s=Ee(t,e,r);return M(s.toasterId||_e(s.id))({type:2,toast:s}),s.id},E=(e,t)=>A("blank")(e,t);E.error=A("error");E.success=A("success");E.loading=A("loading");E.custom=A("custom");E.dismiss=(e,t)=>{let r={type:3,toastId:e};t?M(t)(r):te(r)};E.dismissAll=e=>E.dismiss(void 0,e);E.remove=(e,t)=>{let r={type:4,toastId:e};t?M(t)(r):te(r)};E.removeAll=e=>E.remove(void 0,e);E.promise=(e,t,r)=>{let s=E.loading(t.loading,{...r,...r==null?void 0:r.loading});return typeof e=="function"&&(e=e()),e.then(a=>{let o=t.success?C(t.success,a):void 0;return o?E.success(o,{id:s,...r,...r==null?void 0:r.success}):E.dismiss(s),a}).catch(a=>{let o=t.error?C(t.error,a):void 0;o?E.error(o,{id:s,...r,...r==null?void 0:r.error}):E.dismiss(s)}),e};var je=1e3,we=(e,t="default")=>{let{toasts:r,pausedAt:s}=xe(e,t),a=c.useRef(new Map).current,o=c.useCallback((p,h=je)=>{if(a.has(p))return;let v=setTimeout(()=>{a.delete(p),n({type:4,toastId:p})},h);a.set(p,v)},[]);c.useEffect(()=>{if(s)return;let p=Date.now(),h=r.map(v=>{if(v.duration===1/0)return;let w=(v.duration||0)+v.pauseDuration-(p-v.createdAt);if(w<0){v.visible&&E.dismiss(v.id);return}return setTimeout(()=>E.dismiss(v.id,t),w)});return()=>{h.forEach(v=>v&&clearTimeout(v))}},[r,s,t]);let n=c.useCallback(M(t),[t]),u=c.useCallback(()=>{n({type:5,time:Date.now()})},[n]),l=c.useCallback((p,h)=>{n({type:1,toast:{id:p,height:h}})},[n]),d=c.useCallback(()=>{s&&n({type:6,time:Date.now()})},[s,n]),m=c.useCallback((p,h)=>{let{reverseOrder:v=!1,gutter:w=8,defaultPosition:y}=h||{},g=r.filter(_=>(_.position||y)===(p.position||y)&&_.height),b=g.findIndex(_=>_.id===p.id),f=g.filter((_,O)=>O<b&&_.visible).length;return g.filter(_=>_.visible).slice(...v?[f+1]:[0,f]).reduce((_,O)=>_+(O.height||0)+w,0)},[r]);return c.useEffect(()=>{r.forEach(p=>{if(p.dismissed)o(p.id,p.removeDelay);else{let h=a.get(p.id);h&&(clearTimeout(h),a.delete(p.id))}})},[r,o]),{toasts:r,handlers:{updateHeight:l,startPause:u,endPause:d,calculateOffset:m}}},Se=T`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
 transform: scale(1) rotate(45deg);
  opacity: 1;
}`,Ie=T`
from {
  transform: scale(0);
  opacity: 0;
}
to {
  transform: scale(1);
  opacity: 1;
}`,Te=T`
from {
  transform: scale(0) rotate(90deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(90deg);
	opacity: 1;
}`,Pe=R("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${e=>e.primary||"#ff4b4b"};
  position: relative;
  transform: rotate(45deg);

  animation: ${Se} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;

  &:after,
  &:before {
    content: '';
    animation: ${Ie} 0.15s ease-out forwards;
    animation-delay: 150ms;
    position: absolute;
    border-radius: 3px;
    opacity: 0;
    background: ${e=>e.secondary||"#fff"};
    bottom: 9px;
    left: 4px;
    height: 2px;
    width: 12px;
  }

  &:before {
    animation: ${Te} 0.15s ease-out forwards;
    animation-delay: 180ms;
    transform: rotate(90deg);
  }
`,ke=T`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`,Re=R("div")`
  width: 12px;
  height: 12px;
  box-sizing: border-box;
  border: 2px solid;
  border-radius: 100%;
  border-color: ${e=>e.secondary||"#e0e0e0"};
  border-right-color: ${e=>e.primary||"#616161"};
  animation: ${ke} 1s linear infinite;
`,Oe=T`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(45deg);
	opacity: 1;
}`,De=T`
0% {
	height: 0;
	width: 0;
	opacity: 0;
}
40% {
  height: 0;
	width: 6px;
	opacity: 1;
}
100% {
  opacity: 1;
  height: 10px;
}`,Ae=R("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${e=>e.primary||"#61d345"};
  position: relative;
  transform: rotate(45deg);

  animation: ${Oe} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;
  &:after {
    content: '';
    box-sizing: border-box;
    animation: ${De} 0.2s ease-out forwards;
    opacity: 0;
    animation-delay: 200ms;
    position: absolute;
    border-right: 2px solid;
    border-bottom: 2px solid;
    border-color: ${e=>e.secondary||"#fff"};
    bottom: 6px;
    left: 6px;
    height: 10px;
    width: 6px;
  }
`,Le=R("div")`
  position: absolute;
`,ze=R("div")`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  min-width: 20px;
  min-height: 20px;
`,$e=T`
from {
  transform: scale(0.6);
  opacity: 0.4;
}
to {
  transform: scale(1);
  opacity: 1;
}`,Ce=R("div")`
  position: relative;
  transform: scale(0.6);
  opacity: 0.4;
  min-width: 20px;
  animation: ${$e} 0.3s 0.12s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
`,Ne=({toast:e})=>{let{icon:t,type:r,iconTheme:s}=e;return t!==void 0?typeof t=="string"?c.createElement(Ce,null,t):t:r==="blank"?null:c.createElement(ze,null,c.createElement(Re,{...s}),r!=="loading"&&c.createElement(Le,null,r==="error"?c.createElement(Pe,{...s}):c.createElement(Ae,{...s})))},Me=e=>`
0% {transform: translate3d(0,${e*-200}%,0) scale(.6); opacity:.5;}
100% {transform: translate3d(0,0,0) scale(1); opacity:1;}
`,Fe=e=>`
0% {transform: translate3d(0,0,-1px) scale(1); opacity:1;}
100% {transform: translate3d(0,${e*-150}%,-1px) scale(.6); opacity:0;}
`,He="0%{opacity:0;} 100%{opacity:1;}",We="0%{opacity:1;} 100%{opacity:0;}",Ue=R("div")`
  display: flex;
  align-items: center;
  background: #fff;
  color: #363636;
  line-height: 1.3;
  will-change: transform;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1), 0 3px 3px rgba(0, 0, 0, 0.05);
  max-width: 350px;
  pointer-events: auto;
  padding: 8px 10px;
  border-radius: 8px;
`,Ve=R("div")`
  display: flex;
  justify-content: center;
  margin: 4px 10px;
  color: inherit;
  flex: 1 1 auto;
  white-space: pre-line;
`,qe=(e,t)=>{let r=e.includes("top")?1:-1,[s,a]=K()?[He,We]:[Me(r),Fe(r)];return{animation:t?`${T(s)} 0.35s cubic-bezier(.21,1.02,.73,1) forwards`:`${T(a)} 0.4s forwards cubic-bezier(.06,.71,.55,1)`}},Je=c.memo(({toast:e,position:t,style:r,children:s})=>{let a=e.height?qe(e.position||t||"top-center",e.visible):{opacity:0},o=c.createElement(Ne,{toast:e}),n=c.createElement(Ve,{...e.ariaProps},C(e.message,e));return c.createElement(Ue,{className:e.className,style:{...a,...r,...e.style}},typeof s=="function"?s({icon:o,message:n}):c.createElement(c.Fragment,null,o,n))});ge(c.createElement);var Be=({id:e,className:t,style:r,onHeightUpdate:s,children:a})=>{let o=c.useCallback(n=>{if(n){let u=()=>{let l=n.getBoundingClientRect().height;s(e,l)};u(),new MutationObserver(u).observe(n,{subtree:!0,childList:!0,characterData:!0})}},[e,s]);return c.createElement("div",{ref:o,className:t,style:r},a)},Ge=(e,t)=>{let r=e.includes("top"),s=r?{top:0}:{bottom:0},a=e.includes("center")?{justifyContent:"center"}:e.includes("right")?{justifyContent:"flex-end"}:{};return{left:0,right:0,display:"flex",position:"absolute",transition:K()?void 0:"all 230ms cubic-bezier(.21,1.02,.73,1)",transform:`translateY(${t*(r?1:-1)}px)`,...s,...a}},Ye=N`
  z-index: 9999;
  > * {
    pointer-events: auto;
  }
`,L=16,Ze=({reverseOrder:e,position:t="top-center",toastOptions:r,gutter:s,children:a,toasterId:o,containerStyle:n,containerClassName:u})=>{let{toasts:l,handlers:d}=we(r,o);return c.createElement("div",{"data-rht-toaster":o||"",style:{position:"fixed",zIndex:9999,top:L,left:L,right:L,bottom:L,pointerEvents:"none",...n},className:u,onMouseEnter:d.startPause,onMouseLeave:d.endPause},l.map(m=>{let p=m.position||t,h=d.calculateOffset(m,{reverseOrder:e,gutter:s,defaultPosition:t}),v=Ge(p,h);return c.createElement(Be,{id:m.id,key:m.id,onHeightUpdate:d.updateHeight,className:m.visible?Ye:"",style:v},m.type==="custom"?C(m.message,m):a?a(m):c.createElement(Je,{toast:m,position:p}))}))},$t=E;const Ke={},J=e=>{let t;const r=new Set,s=(m,p)=>{const h=typeof m=="function"?m(t):m;if(!Object.is(h,t)){const v=t;t=p??(typeof h!="object"||h===null)?h:Object.assign({},t,h),r.forEach(w=>w(t,v))}},a=()=>t,l={setState:s,getState:a,getInitialState:()=>d,subscribe:m=>(r.add(m),()=>r.delete(m)),destroy:()=>{(Ke?"production":void 0)!=="production"&&console.warn("[DEPRECATED] The `destroy` method will be unsupported in a future version. Instead use unsubscribe function returned by subscribe. Everything will be garbage-collected if store is garbage-collected."),r.clear()}},d=t=e(s,a,l);return l},Qe=e=>e?J(e):J,re={},{useDebugValue:Xe}=ne,{useSyncExternalStoreWithSelector:et}=le;let B=!1;const tt=e=>e;function rt(e,t=tt,r){(re?"production":void 0)!=="production"&&r&&!B&&(console.warn("[DEPRECATED] Use `createWithEqualityFn` instead of `create` or use `useStoreWithEqualityFn` instead of `useStore`. They can be imported from 'zustand/traditional'. https://github.com/pmndrs/zustand/discussions/1937"),B=!0);const s=et(e.subscribe,e.getState,e.getServerState||e.getInitialState,t,r);return Xe(s),s}const G=e=>{(re?"production":void 0)!=="production"&&typeof e!="function"&&console.warn("[DEPRECATED] Passing a vanilla store will be unsupported in a future version. Instead use `import { useStore } from 'zustand'`.");const t=typeof e=="function"?Qe(e):e,r=(s,a)=>rt(t,s,a);return Object.assign(r,t),r},F=e=>e?G(e):G,ot={};function st(e,t){let r;try{r=e()}catch{return}return{getItem:a=>{var o;const n=l=>l===null?null:JSON.parse(l,void 0),u=(o=r.getItem(a))!=null?o:null;return u instanceof Promise?u.then(n):n(u)},setItem:(a,o)=>r.setItem(a,JSON.stringify(o,void 0)),removeItem:a=>r.removeItem(a)}}const D=e=>t=>{try{const r=e(t);return r instanceof Promise?r:{then(s){return D(s)(r)},catch(s){return this}}}catch(r){return{then(s){return this},catch(s){return D(s)(r)}}}},nt=(e,t)=>(r,s,a)=>{let o={getStorage:()=>localStorage,serialize:JSON.stringify,deserialize:JSON.parse,partialize:g=>g,version:0,merge:(g,b)=>({...b,...g}),...t},n=!1;const u=new Set,l=new Set;let d;try{d=o.getStorage()}catch{}if(!d)return e((...g)=>{console.warn(`[zustand persist middleware] Unable to update item '${o.name}', the given storage is currently unavailable.`),r(...g)},s,a);const m=D(o.serialize),p=()=>{const g=o.partialize({...s()});let b;const f=m({state:g,version:o.version}).then(_=>d.setItem(o.name,_)).catch(_=>{b=_});if(b)throw b;return f},h=a.setState;a.setState=(g,b)=>{h(g,b),p()};const v=e((...g)=>{r(...g),p()},s,a);let w;const y=()=>{var g;if(!d)return;n=!1,u.forEach(f=>f(s()));const b=((g=o.onRehydrateStorage)==null?void 0:g.call(o,s()))||void 0;return D(d.getItem.bind(d))(o.name).then(f=>{if(f)return o.deserialize(f)}).then(f=>{if(f)if(typeof f.version=="number"&&f.version!==o.version){if(o.migrate)return o.migrate(f.state,f.version);console.error("State loaded from storage couldn't be migrated since no migrate function was provided")}else return f.state}).then(f=>{var _;return w=o.merge(f,(_=s())!=null?_:v),r(w,!0),p()}).then(()=>{b==null||b(w,void 0),n=!0,l.forEach(f=>f(w))}).catch(f=>{b==null||b(void 0,f)})};return a.persist={setOptions:g=>{o={...o,...g},g.getStorage&&(d=g.getStorage())},clearStorage:()=>{d==null||d.removeItem(o.name)},getOptions:()=>o,rehydrate:()=>y(),hasHydrated:()=>n,onHydrate:g=>(u.add(g),()=>{u.delete(g)}),onFinishHydration:g=>(l.add(g),()=>{l.delete(g)})},y(),w||v},at=(e,t)=>(r,s,a)=>{let o={storage:st(()=>localStorage),partialize:y=>y,version:0,merge:(y,g)=>({...g,...y}),...t},n=!1;const u=new Set,l=new Set;let d=o.storage;if(!d)return e((...y)=>{console.warn(`[zustand persist middleware] Unable to update item '${o.name}', the given storage is currently unavailable.`),r(...y)},s,a);const m=()=>{const y=o.partialize({...s()});return d.setItem(o.name,{state:y,version:o.version})},p=a.setState;a.setState=(y,g)=>{p(y,g),m()};const h=e((...y)=>{r(...y),m()},s,a);a.getInitialState=()=>h;let v;const w=()=>{var y,g;if(!d)return;n=!1,u.forEach(f=>{var _;return f((_=s())!=null?_:h)});const b=((g=o.onRehydrateStorage)==null?void 0:g.call(o,(y=s())!=null?y:h))||void 0;return D(d.getItem.bind(d))(o.name).then(f=>{if(f)if(typeof f.version=="number"&&f.version!==o.version){if(o.migrate)return[!0,o.migrate(f.state,f.version)];console.error("State loaded from storage couldn't be migrated since no migrate function was provided")}else return[!1,f.state];return[!1,void 0]}).then(f=>{var _;const[O,se]=f;if(v=o.merge(se,(_=s())!=null?_:h),r(v,!0),O)return m()}).then(()=>{b==null||b(v,void 0),v=s(),n=!0,l.forEach(f=>f(v))}).catch(f=>{b==null||b(void 0,f)})};return a.persist={setOptions:y=>{o={...o,...y},y.storage&&(d=y.storage)},clearStorage:()=>{d==null||d.removeItem(o.name)},getOptions:()=>o,rehydrate:()=>w(),hasHydrated:()=>n,onHydrate:y=>(u.add(y),()=>{u.delete(y)}),onFinishHydration:y=>(l.add(y),()=>{l.delete(y)})},o.skipHydration||w(),v||h},it=(e,t)=>"getStorage"in t||"serialize"in t||"deserialize"in t?((ot?"production":void 0)!=="production"&&console.warn("[DEPRECATED] `getStorage`, `serialize` and `deserialize` options are deprecated. Use `storage` option instead."),nt(e,t)):at(e,t),oe=it,V=F()(oe((e,t)=>({user:null,accessToken:null,refreshToken:null,login:r=>{localStorage.setItem("access_token",r.access_token),localStorage.setItem("refresh_token",r.refresh_token),e({user:r.user,accessToken:r.access_token,refreshToken:r.refresh_token})},logout:()=>{localStorage.clear(),e({user:null,accessToken:null,refreshToken:null}),window.location.href="/".replace(/\/$/,"")+"/login"},isAuthenticated:()=>!!t().accessToken,hasRole:(...r)=>{var s;return r.includes(((s=t().user)==null?void 0:s.role)||"")},canEdit:()=>{var r;return["admin","chef_projet","technicien"].includes(((r=t().user)==null?void 0:r.role)||"")}}),{name:"auth-storage"})),Ct=F()(oe(e=>({layers:{noeud_telecom:!0,noeud_gc:!0,lien_telecom:!0,lien_gc:!0,logement:!0,zone:!1},selectedFeature:null,drawMode:null,mapStyle:"dark",showPanel:!0,toggleLayer:t=>e(r=>({layers:{...r.layers,[t]:!r.layers[t]}})),setSelectedFeature:t=>e({selectedFeature:t}),setDrawMode:t=>e({drawMode:t}),setMapStyle:t=>e({mapStyle:t}),togglePanel:()=>e(t=>({showPanel:!t.showPanel}))}),{name:"map-storage"})),lt=F()(e=>({notifications:[],unreadCount:0,addNotif:t=>e(r=>({notifications:[{...t,id:Date.now(),timestamp:new Date().toISOString(),lu:!1},...r.notifications].slice(0,50),unreadCount:r.unreadCount+1})),markAllRead:()=>e(t=>({notifications:t.notifications.map(r=>({...r,lu:!0})),unreadCount:0})),clear:()=>e({notifications:[],unreadCount:0})}));F()(e=>({sidebarOpen:!0,activeModal:null,isLoading:!1,toggleSidebar:()=>e(t=>({sidebarOpen:!t.sidebarOpen})),openModal:t=>e({activeModal:t}),closeModal:()=>e({activeModal:null}),setLoading:t=>e({isLoading:t})}));function ct(){const{logout:e,isAuthenticated:t}=V();if(typeof window>"u")return;const r=10*60*1e3;let s;const a=()=>{clearTimeout(s),t()&&(s=setTimeout(()=>{e(),window.location.href="/login"},r))},o=["mousedown","mousemove","keydown","scroll","touchstart","click"];return o.forEach(n=>window.addEventListener(n,a,{passive:!0})),a(),()=>{clearTimeout(s),o.forEach(n=>window.removeEventListener(n,a))}}const ut="ws://localhost:8000";function dt(e="global"){const t=c.useRef(null),{accessToken:r}=V(),{addNotif:s}=lt(),a=c.useRef(null),o=c.useRef(!0),n=c.useCallback(()=>{if(!(!r||!o.current))try{t.current=new WebSocket(`${ut}/ws/${e}?token=${r}`),t.current.onopen=()=>{console.log(`✅ WS connecté — ${e}`)},t.current.onmessage=l=>{try{const d=JSON.parse(l.data);u(d)}catch{}},t.current.onclose=()=>{o.current&&(console.log("🔄 WS reconnexion..."),a.current=setTimeout(n,3e3))},t.current.onerror=()=>{var l;(l=t.current)==null||l.close()}}catch{}},[r,e]),u=l=>{var d,m,p;switch(l.type){case"ALERTE":s({type:"warning",message:((d=l.data)==null?void 0:d.message)||"Nouvelle alerte"});break;case"OT_MODIFIE":s({type:"info",message:`OT modifié : ${(m=l.data)==null?void 0:m.numero_ot}`});break;case"NOEUD_CREE":s({type:"success",message:`Nœud créé : ${(p=l.data)==null?void 0:p.nom_unique}`});break}};return c.useEffect(()=>(o.current=!0,n(),()=>{var l;o.current=!1,clearTimeout(a.current),(l=t.current)==null||l.close()}),[n]),t}const mt="/".replace(/\/$/,"")||"/",pt=c.lazy(()=>j(()=>import("./LoginPage-Cnpj-DUN.js"),__vite__mapDeps([0,1,2,3,4,5]))),ft=c.lazy(()=>j(()=>import("./MotDePasseOubliePage-D116l1A8.js"),__vite__mapDeps([6,1,2,3]))),gt=c.lazy(()=>j(()=>import("./ResetPasswordPage-BFRUqDgR.js"),__vite__mapDeps([7,1,2,3]))),ht=c.lazy(()=>j(()=>import("./Layout-Bt9-rjuU.js"),__vite__mapDeps([8,1,2,3,5]))),yt=c.lazy(()=>j(()=>import("./MapPage-Ch0uI8Lb.js"),__vite__mapDeps([9,1,2,3,4,10,5,11]))),vt=c.lazy(()=>j(()=>import("./DashboardPage-Dg_iUaMg.js"),__vite__mapDeps([12,1,2,3,4,5]))),_t=c.lazy(()=>j(()=>import("./TravauxPage-ChrNtWVv.js"),__vite__mapDeps([13,1,2,3,10,4,5,11]))),bt=c.lazy(()=>j(()=>import("./EligibilitePage-DMcS1qcY.js"),__vite__mapDeps([14,1,2,3,4,5]))),xt=c.lazy(()=>j(()=>import("./TerrainMobilePage-DKaJcg9P.js"),__vite__mapDeps([15,1,2,3,10,4,5,11]))),Et=c.lazy(()=>j(()=>import("./CataloguePage-CdAXRPeR.js"),__vite__mapDeps([16,1,2,3,4,5]))),jt=c.lazy(()=>j(()=>import("./AdminPage-DMfLqDQN.js"),__vite__mapDeps([17,1,2,3,4,5]))),wt=c.lazy(()=>j(()=>import("./ImportDWGPage-Df15owz0.js"),__vite__mapDeps([18,1,2,3,4,5]))),St=c.lazy(()=>j(()=>import("./ScanPage-B18hOvLP.js"),__vite__mapDeps([19,1,2,3]))),It=c.lazy(()=>j(()=>import("./AnalyticsPage-BZMnh2a2.js"),__vite__mapDeps([20,1,2,3,4,5]))),Tt=c.lazy(()=>j(()=>import("./ELPage-BURviKwT.js"),__vite__mapDeps([21,1,2,3,10,4,5,11]))),Pt=c.lazy(()=>j(()=>import("./SynoptiquePage-rqkV0bx1.js"),__vite__mapDeps([22,1,2,3,4,5]))),kt=c.lazy(()=>j(()=>import("./ExportPage-IN2BECO_.js"),__vite__mapDeps([23,1,2,3,4,5])));function Rt(){return i.jsx("div",{className:"min-h-screen bg-gray-950 flex items-center justify-center",children:i.jsxs("div",{className:"text-center space-y-4",children:[i.jsx("div",{className:"text-5xl animate-spin",children:"⚙️"}),i.jsx("p",{className:"text-gray-400 text-sm",children:"Chargement SIG FTTH..."})]})})}function P({children:e,roles:t=[]}){const{isAuthenticated:r,hasRole:s}=V();return r()?t.length>0&&!s(...t)?i.jsx($,{to:"/map",replace:!0}):i.jsx(i.Fragment,{children:e}):i.jsx($,{to:"/login",replace:!0})}function Ot(){return dt("global"),ct(),i.jsxs(ie,{children:[i.jsx(x,{path:"/login",element:i.jsx(pt,{})}),i.jsx(x,{path:"/scan/:id",element:i.jsx(St,{})}),i.jsx(x,{path:"/mot-de-passe-oublie",element:i.jsx(ft,{})}),i.jsx(x,{path:"/reset-password",element:i.jsx(gt,{})}),i.jsxs(x,{path:"/",element:i.jsx(P,{children:i.jsx(ht,{})}),children:[i.jsx(x,{index:!0,element:i.jsx($,{to:"/map",replace:!0})}),i.jsx(x,{path:"map",element:i.jsx(yt,{})}),i.jsx(x,{path:"dashboard",element:i.jsx(vt,{})}),i.jsx(x,{path:"travaux",element:i.jsx(_t,{})}),i.jsx(x,{path:"eligibilite",element:i.jsx(bt,{})}),i.jsx(x,{path:"terrain",element:i.jsx(P,{roles:["admin","chef_projet","technicien"],children:i.jsx(xt,{})})}),i.jsx(x,{path:"catalogue",element:i.jsx(Et,{})}),i.jsx(x,{path:"admin",element:i.jsx(P,{roles:["admin"],children:i.jsx(jt,{})})}),i.jsx(x,{path:"el",element:i.jsx(P,{children:i.jsx(Tt,{})})}),i.jsx(x,{path:"export",element:i.jsx(P,{children:i.jsx(kt,{})})}),i.jsx(x,{path:"synoptique",element:i.jsx(P,{children:i.jsx(Pt,{})})}),i.jsx(x,{path:"analytics",element:i.jsx(P,{roles:["admin","chef_projet","analyste"],children:i.jsx(It,{})})}),i.jsx(x,{path:"import-dwg",element:i.jsx(P,{roles:["admin","chef_projet","technicien"],children:i.jsx(wt,{})})})]}),i.jsx(x,{path:"*",element:i.jsx($,{to:"/map",replace:!0})})]})}function Dt(){return i.jsxs(ae,{basename:mt,children:[i.jsx(c.Suspense,{fallback:i.jsx(Rt,{}),children:i.jsx(Ot,{})}),i.jsx(Ze,{position:"top-right",toastOptions:{style:{background:"#1e293b",color:"#e2e8f0",border:"1px solid #334155",borderRadius:"12px"},success:{iconTheme:{primary:"#10b981",secondary:"#fff"}},error:{iconTheme:{primary:"#ef4444",secondary:"#fff"}}}})]})}const Nt=Object.freeze(Object.defineProperty({__proto__:null,default:Dt},Symbol.toStringTag,{value:"Module"}));export{Nt as A,Ct as a,V as u,$t as z};
