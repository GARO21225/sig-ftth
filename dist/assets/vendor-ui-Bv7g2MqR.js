import{r as d,g as te,R as re}from"./vendor-react-DI-t83gz.js";let oe={data:""},ae=e=>{if(typeof window=="object"){let t=(e?e.querySelector("#_goober"):window._goober)||Object.assign(document.createElement("style"),{innerHTML:" ",id:"_goober"});return t.nonce=window.__nonce__,t.parentNode||(e||document.head).appendChild(t),t.firstChild}return e||oe},se=/(?:([\u0080-\uFFFF\w-%@]+) *:? *([^{;]+?);|([^;}{]*?) *{)|(}\s*)/g,ie=/\/\*[^]*?\*\/|  +/g,M=/\n+/g,E=(e,t)=>{let r="",a="",s="";for(let i in e){let o=e[i];i[0]=="@"?i[1]=="i"?r=i+" "+o+";":a+=i[1]=="f"?E(o,i):i+"{"+E(o,i[1]=="k"?"":t)+"}":typeof o=="object"?a+=E(o,t?t.replace(/([^,])+/g,n=>i.replace(/([^,]*:\S+\([^)]*\))|([^,])+/g,l=>/&/.test(l)?l.replace(/&/g,n):n?n+" "+l:l)):i):o!=null&&(i=/^--/.test(i)?i:i.replace(/[A-Z]/g,"-$&").toLowerCase(),s+=E.p?E.p(i,o):i+":"+o+";")}return r+(t&&s?t+"{"+s+"}":s)+a},h={},H=e=>{if(typeof e=="object"){let t="";for(let r in e)t+=r+H(e[r]);return t}return e},ne=(e,t,r,a,s)=>{let i=H(e),o=h[i]||(h[i]=(l=>{let f=0,u=11;for(;f<l.length;)u=101*u+l.charCodeAt(f++)>>>0;return"go"+u})(i));if(!h[o]){let l=i!==e?e:(f=>{let u,c,p=[{}];for(;u=se.exec(f.replace(ie,""));)u[4]?p.shift():u[3]?(c=u[3].replace(M," ").trim(),p.unshift(p[0][c]=p[0][c]||{})):p[0][u[1]]=u[2].replace(M," ").trim();return p[0]})(e);h[o]=E(s?{["@keyframes "+o]:l}:l,r?"":"."+o)}let n=r&&h.g?h.g:null;return r&&(h.g=h[o]),((l,f,u,c)=>{c?f.data=f.data.replace(c,l):f.data.indexOf(l)===-1&&(f.data=u?l+f.data:f.data+l)})(h[o],t,a,n),o},le=(e,t,r)=>e.reduce((a,s,i)=>{let o=t[i];if(o&&o.call){let n=o(r),l=n&&n.props&&n.props.className||/^go/.test(n)&&n;o=l?"."+l:n&&typeof n=="object"?n.props?"":E(n,""):n===!1?"":n}return a+s+(o??"")},"");function O(e){let t=this||{},r=e.call?e(t.p):e;return ne(r.unshift?r.raw?le(r,[].slice.call(arguments,1),t.p):r.reduce((a,s)=>Object.assign(a,s&&s.call?s(t.p):s),{}):r,ae(t.target),t.g,t.o,t.k)}let W,T,P;O.bind({g:1});let x=O.bind({k:1});function ue(e,t,r,a){E.p=t,W=e,T=r,P=a}function w(e,t){let r=this||{};return function(){let a=arguments;function s(i,o){let n=Object.assign({},i),l=n.className||s.className;r.p=Object.assign({theme:T&&T()},n),r.o=/ *go\d+/.test(l),n.className=O.apply(r,a)+(l?" "+l:"");let f=e;return e[0]&&(f=n.as||e,delete n.as),P&&f[0]&&P(n),W(f,n)}return s}}var ce=e=>typeof e=="function",_=(e,t)=>ce(e)?e(t):e,de=(()=>{let e=0;return()=>(++e).toString()})(),U=(()=>{let e;return()=>{if(e===void 0&&typeof window<"u"){let t=matchMedia("(prefers-reduced-motion: reduce)");e=!t||t.matches}return e}})(),fe=20,N="default",B=(e,t)=>{let{toastLimit:r}=e.settings;switch(t.type){case 0:return{...e,toasts:[t.toast,...e.toasts].slice(0,r)};case 1:return{...e,toasts:e.toasts.map(o=>o.id===t.toast.id?{...o,...t.toast}:o)};case 2:let{toast:a}=t;return B(e,{type:e.toasts.find(o=>o.id===a.id)?1:0,toast:a});case 3:let{toastId:s}=t;return{...e,toasts:e.toasts.map(o=>o.id===s||s===void 0?{...o,dismissed:!0,visible:!1}:o)};case 4:return t.toastId===void 0?{...e,toasts:[]}:{...e,toasts:e.toasts.filter(o=>o.id!==t.toastId)};case 5:return{...e,pausedAt:t.time};case 6:let i=t.time-(e.pausedAt||0);return{...e,pausedAt:void 0,toasts:e.toasts.map(o=>({...o,pauseDuration:o.pauseDuration+i}))}}},k=[],G={toasts:[],pausedAt:void 0,settings:{toastLimit:fe}},b={},Y=(e,t=N)=>{b[t]=B(b[t]||G,e),k.forEach(([r,a])=>{r===t&&a(b[t])})},Z=e=>Object.keys(b).forEach(t=>Y(e,t)),pe=e=>Object.keys(b).find(t=>b[t].toasts.some(r=>r.id===e)),C=(e=N)=>t=>{Y(t,e)},me={blank:4e3,error:4e3,success:2e3,loading:1/0,custom:4e3},ge=(e={},t=N)=>{let[r,a]=d.useState(b[t]||G),s=d.useRef(b[t]);d.useEffect(()=>(s.current!==b[t]&&a(b[t]),k.push([t,a]),()=>{let o=k.findIndex(([n])=>n===t);o>-1&&k.splice(o,1)}),[t]);let i=r.toasts.map(o=>{var n,l,f;return{...e,...e[o.type],...o,removeDelay:o.removeDelay||((n=e[o.type])==null?void 0:n.removeDelay)||(e==null?void 0:e.removeDelay),duration:o.duration||((l=e[o.type])==null?void 0:l.duration)||(e==null?void 0:e.duration)||me[o.type],style:{...e.style,...(f=e[o.type])==null?void 0:f.style,...o.style}}});return{...r,toasts:i}},ye=(e,t="blank",r)=>({createdAt:Date.now(),visible:!0,dismissed:!1,type:t,ariaProps:{role:"status","aria-live":"polite"},message:e,pauseDuration:0,...r,id:(r==null?void 0:r.id)||de()}),D=e=>(t,r)=>{let a=ye(t,e,r);return C(a.toasterId||pe(a.id))({type:2,toast:a}),a.id},g=(e,t)=>D("blank")(e,t);g.error=D("error");g.success=D("success");g.loading=D("loading");g.custom=D("custom");g.dismiss=(e,t)=>{let r={type:3,toastId:e};t?C(t)(r):Z(r)};g.dismissAll=e=>g.dismiss(void 0,e);g.remove=(e,t)=>{let r={type:4,toastId:e};t?C(t)(r):Z(r)};g.removeAll=e=>g.remove(void 0,e);g.promise=(e,t,r)=>{let a=g.loading(t.loading,{...r,...r==null?void 0:r.loading});return typeof e=="function"&&(e=e()),e.then(s=>{let i=t.success?_(t.success,s):void 0;return i?g.success(i,{id:a,...r,...r==null?void 0:r.success}):g.dismiss(a),s}).catch(s=>{let i=t.error?_(t.error,s):void 0;i?g.error(i,{id:a,...r,...r==null?void 0:r.error}):g.dismiss(a)}),e};var ve=1e3,be=(e,t="default")=>{let{toasts:r,pausedAt:a}=ge(e,t),s=d.useRef(new Map).current,i=d.useCallback((c,p=ve)=>{if(s.has(c))return;let m=setTimeout(()=>{s.delete(c),o({type:4,toastId:c})},p);s.set(c,m)},[]);d.useEffect(()=>{if(a)return;let c=Date.now(),p=r.map(m=>{if(m.duration===1/0)return;let y=(m.duration||0)+m.pauseDuration-(c-m.createdAt);if(y<0){m.visible&&g.dismiss(m.id);return}return setTimeout(()=>g.dismiss(m.id,t),y)});return()=>{p.forEach(m=>m&&clearTimeout(m))}},[r,a,t]);let o=d.useCallback(C(t),[t]),n=d.useCallback(()=>{o({type:5,time:Date.now()})},[o]),l=d.useCallback((c,p)=>{o({type:1,toast:{id:c,height:p}})},[o]),f=d.useCallback(()=>{a&&o({type:6,time:Date.now()})},[a,o]),u=d.useCallback((c,p)=>{let{reverseOrder:m=!1,gutter:y=8,defaultPosition:$}=p||{},z=r.filter(v=>(v.position||$)===(c.position||$)&&v.height),ee=z.findIndex(v=>v.id===c.id),F=z.filter((v,A)=>A<ee&&v.visible).length;return z.filter(v=>v.visible).slice(...m?[F+1]:[0,F]).reduce((v,A)=>v+(A.height||0)+y,0)},[r]);return d.useEffect(()=>{r.forEach(c=>{if(c.dismissed)i(c.id,c.removeDelay);else{let p=s.get(c.id);p&&(clearTimeout(p),s.delete(c.id))}})},[r,i]),{toasts:r,handlers:{updateHeight:l,startPause:n,endPause:f,calculateOffset:u}}},he=x`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
 transform: scale(1) rotate(45deg);
  opacity: 1;
}`,xe=x`
from {
  transform: scale(0);
  opacity: 0;
}
to {
  transform: scale(1);
  opacity: 1;
}`,Ee=x`
from {
  transform: scale(0) rotate(90deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(90deg);
	opacity: 1;
}`,we=w("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${e=>e.primary||"#ff4b4b"};
  position: relative;
  transform: rotate(45deg);

  animation: ${he} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;

  &:after,
  &:before {
    content: '';
    animation: ${xe} 0.15s ease-out forwards;
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
    animation: ${Ee} 0.15s ease-out forwards;
    animation-delay: 180ms;
    transform: rotate(90deg);
  }
`,Se=x`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`,$e=w("div")`
  width: 12px;
  height: 12px;
  box-sizing: border-box;
  border: 2px solid;
  border-radius: 100%;
  border-color: ${e=>e.secondary||"#e0e0e0"};
  border-right-color: ${e=>e.primary||"#616161"};
  animation: ${Se} 1s linear infinite;
`,De=x`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(45deg);
	opacity: 1;
}`,je=x`
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
}`,ke=w("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${e=>e.primary||"#61d345"};
  position: relative;
  transform: rotate(45deg);

  animation: ${De} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;
  &:after {
    content: '';
    box-sizing: border-box;
    animation: ${je} 0.2s ease-out forwards;
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
`,_e=w("div")`
  position: absolute;
`,Oe=w("div")`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  min-width: 20px;
  min-height: 20px;
`,Ce=x`
from {
  transform: scale(0.6);
  opacity: 0.4;
}
to {
  transform: scale(1);
  opacity: 1;
}`,Ie=w("div")`
  position: relative;
  transform: scale(0.6);
  opacity: 0.4;
  min-width: 20px;
  animation: ${Ce} 0.3s 0.12s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
`,ze=({toast:e})=>{let{icon:t,type:r,iconTheme:a}=e;return t!==void 0?typeof t=="string"?d.createElement(Ie,null,t):t:r==="blank"?null:d.createElement(Oe,null,d.createElement($e,{...a}),r!=="loading"&&d.createElement(_e,null,r==="error"?d.createElement(we,{...a}):d.createElement(ke,{...a})))},Ae=e=>`
0% {transform: translate3d(0,${e*-200}%,0) scale(.6); opacity:.5;}
100% {transform: translate3d(0,0,0) scale(1); opacity:1;}
`,Re=e=>`
0% {transform: translate3d(0,0,-1px) scale(1); opacity:1;}
100% {transform: translate3d(0,${e*-150}%,-1px) scale(.6); opacity:0;}
`,Te="0%{opacity:0;} 100%{opacity:1;}",Pe="0%{opacity:1;} 100%{opacity:0;}",Ne=w("div")`
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
`,Fe=w("div")`
  display: flex;
  justify-content: center;
  margin: 4px 10px;
  color: inherit;
  flex: 1 1 auto;
  white-space: pre-line;
`,Me=(e,t)=>{let r=e.includes("top")?1:-1,[a,s]=U()?[Te,Pe]:[Ae(r),Re(r)];return{animation:t?`${x(a)} 0.35s cubic-bezier(.21,1.02,.73,1) forwards`:`${x(s)} 0.4s forwards cubic-bezier(.06,.71,.55,1)`}},Le=d.memo(({toast:e,position:t,style:r,children:a})=>{let s=e.height?Me(e.position||t||"top-center",e.visible):{opacity:0},i=d.createElement(ze,{toast:e}),o=d.createElement(Fe,{...e.ariaProps},_(e.message,e));return d.createElement(Ne,{className:e.className,style:{...s,...r,...e.style}},typeof a=="function"?a({icon:i,message:o}):d.createElement(d.Fragment,null,i,o))});ue(d.createElement);var Ve=({id:e,className:t,style:r,onHeightUpdate:a,children:s})=>{let i=d.useCallback(o=>{if(o){let n=()=>{let l=o.getBoundingClientRect().height;a(e,l)};n(),new MutationObserver(n).observe(o,{subtree:!0,childList:!0,characterData:!0})}},[e,a]);return d.createElement("div",{ref:i,className:t,style:r},s)},He=(e,t)=>{let r=e.includes("top"),a=r?{top:0}:{bottom:0},s=e.includes("center")?{justifyContent:"center"}:e.includes("right")?{justifyContent:"flex-end"}:{};return{left:0,right:0,display:"flex",position:"absolute",transition:U()?void 0:"all 230ms cubic-bezier(.21,1.02,.73,1)",transform:`translateY(${t*(r?1:-1)}px)`,...a,...s}},We=O`
  z-index: 9999;
  > * {
    pointer-events: auto;
  }
`,j=16,bt=({reverseOrder:e,position:t="top-center",toastOptions:r,gutter:a,children:s,toasterId:i,containerStyle:o,containerClassName:n})=>{let{toasts:l,handlers:f}=be(r,i);return d.createElement("div",{"data-rht-toaster":i||"",style:{position:"fixed",zIndex:9999,top:j,left:j,right:j,bottom:j,pointerEvents:"none",...o},className:n,onMouseEnter:f.startPause,onMouseLeave:f.endPause},l.map(u=>{let c=u.position||t,p=f.calculateOffset(u,{reverseOrder:e,gutter:a,defaultPosition:t}),m=He(c,p);return d.createElement(Ve,{id:u.id,key:u.id,onHeightUpdate:f.updateHeight,className:u.visible?We:"",style:m},u.type==="custom"?_(u.message,u):s?s(u):d.createElement(Le,{toast:u,position:c}))}))},ht=g;const Ue={},L=e=>{let t;const r=new Set,a=(u,c)=>{const p=typeof u=="function"?u(t):u;if(!Object.is(p,t)){const m=t;t=c??(typeof p!="object"||p===null)?p:Object.assign({},t,p),r.forEach(y=>y(t,m))}},s=()=>t,l={setState:a,getState:s,getInitialState:()=>f,subscribe:u=>(r.add(u),()=>r.delete(u)),destroy:()=>{(Ue?"production":void 0)!=="production"&&console.warn("[DEPRECATED] The `destroy` method will be unsupported in a future version. Instead use unsubscribe function returned by subscribe. Everything will be garbage-collected if store is garbage-collected."),r.clear()}},f=t=e(a,s,l);return l},Be=e=>e?L(e):L;var K={exports:{}},Q={},J={exports:{}},X={};/**
 * @license React
 * use-sync-external-store-shim.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var S=d;function Ge(e,t){return e===t&&(e!==0||1/e===1/t)||e!==e&&t!==t}var Ye=typeof Object.is=="function"?Object.is:Ge,Ze=S.useState,Ke=S.useEffect,Qe=S.useLayoutEffect,Je=S.useDebugValue;function Xe(e,t){var r=t(),a=Ze({inst:{value:r,getSnapshot:t}}),s=a[0].inst,i=a[1];return Qe(function(){s.value=r,s.getSnapshot=t,R(s)&&i({inst:s})},[e,r,t]),Ke(function(){return R(s)&&i({inst:s}),e(function(){R(s)&&i({inst:s})})},[e]),Je(r),r}function R(e){var t=e.getSnapshot;e=e.value;try{var r=t();return!Ye(e,r)}catch{return!0}}function qe(e,t){return t()}var et=typeof window>"u"||typeof window.document>"u"||typeof window.document.createElement>"u"?qe:Xe;X.useSyncExternalStore=S.useSyncExternalStore!==void 0?S.useSyncExternalStore:et;J.exports=X;var tt=J.exports;/**
 * @license React
 * use-sync-external-store-shim/with-selector.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var I=d,rt=tt;function ot(e,t){return e===t&&(e!==0||1/e===1/t)||e!==e&&t!==t}var at=typeof Object.is=="function"?Object.is:ot,st=rt.useSyncExternalStore,it=I.useRef,nt=I.useEffect,lt=I.useMemo,ut=I.useDebugValue;Q.useSyncExternalStoreWithSelector=function(e,t,r,a,s){var i=it(null);if(i.current===null){var o={hasValue:!1,value:null};i.current=o}else o=i.current;i=lt(function(){function l(m){if(!f){if(f=!0,u=m,m=a(m),s!==void 0&&o.hasValue){var y=o.value;if(s(y,m))return c=y}return c=m}if(y=c,at(u,m))return y;var $=a(m);return s!==void 0&&s(y,$)?(u=m,y):(u=m,c=$)}var f=!1,u,c,p=r===void 0?null:r;return[function(){return l(t())},p===null?void 0:function(){return l(p())}]},[t,r,a,s]);var n=st(e,i[0],i[1]);return nt(function(){o.hasValue=!0,o.value=n},[n]),ut(n),n};K.exports=Q;var ct=K.exports;const dt=te(ct),q={},{useDebugValue:ft}=re,{useSyncExternalStoreWithSelector:pt}=dt;let V=!1;const mt=e=>e;function gt(e,t=mt,r){(q?"production":void 0)!=="production"&&r&&!V&&(console.warn("[DEPRECATED] Use `createWithEqualityFn` instead of `create` or use `useStoreWithEqualityFn` instead of `useStore`. They can be imported from 'zustand/traditional'. https://github.com/pmndrs/zustand/discussions/1937"),V=!0);const a=pt(e.subscribe,e.getState,e.getServerState||e.getInitialState,t,r);return ft(a),a}const yt=e=>{(q?"production":void 0)!=="production"&&typeof e!="function"&&console.warn("[DEPRECATED] Passing a vanilla store will be unsupported in a future version. Instead use `import { useStore } from 'zustand'`.");const t=typeof e=="function"?Be(e):e,r=(a,s)=>gt(t,a,s);return Object.assign(r,t),r},xt=e=>yt;export{bt as F,xt as c,ht as z};
