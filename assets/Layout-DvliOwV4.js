import{j as e}from"./index-DISFIu0D.js";import{h as m,i as b,u as f,r as x,O as p}from"./vendor-react-BeK1MbjZ.js";import{u as g,a as u}from"./App-BlkpGdAs.js";import"./vendor-charts-dkL-Ffi_.js";const j=[{path:"/map",icon:"🗺️",label:"Carte",roles:[],desc:"Carte interactive"},{path:"/dashboard",icon:"📊",label:"Dashboard",roles:[],desc:"KPI & statistiques"},{path:"/travaux",icon:"🏗️",label:"Travaux",roles:[],desc:"Ordres de travail"},{path:"/eligibilite",icon:"📡",label:"Éligibilité",roles:[],desc:"Vérifier la fibre"},{path:"/terrain",icon:"📱",label:"Terrain",roles:["admin","chef_projet","technicien"],desc:"Dessin mobile"},{path:"/catalogue",icon:"📦",label:"Catalogue",roles:[],desc:"Équipements"},{path:"/export",icon:"📤",label:"Exportation",roles:[],desc:"Export GeoJSON/PDF"},{path:"/el",icon:"🏠",label:"Table EL",roles:[],desc:"Équivalents logements"},{path:"/synoptique",icon:"📐",label:"Synoptique",roles:[],desc:"Vue réseau"},{path:"/analytics",icon:"📈",label:"Analytics",roles:["admin","chef_projet","analyste"],desc:"Saturation & prédictions"},{path:"/import-dwg",icon:"📥",label:"Import DWG",roles:["admin","chef_projet","technicien"],desc:"Import GeoJSON/DWG"},{path:"/admin",icon:"⚙️",label:"Admin",roles:["admin"],desc:"Administration"}];function h({onClose:n}){var o,l;const{user:t,logout:r,hasRole:s}=g(),d={admin:"bg-red-900 text-red-300",chef_projet:"bg-purple-900 text-purple-300",technicien:"bg-blue-900 text-blue-300",commercial:"bg-green-900 text-green-300",analyste:"bg-yellow-900 text-yellow-300",invite:"bg-gray-800 text-gray-400"};return e.jsxs("div",{className:`w-64 bg-gray-900 border-r
                    border-gray-700 flex flex-col
                    h-full`,children:[e.jsxs("div",{className:`p-5 border-b border-gray-700
                      flex items-center
                      justify-between`,children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("div",{className:`w-10 h-10 bg-blue-600
                          rounded-xl flex items-center
                          justify-center text-xl`,children:"🌐"}),e.jsxs("div",{children:[e.jsx("h1",{className:`font-bold text-white
                           text-base leading-tight`,children:"SIG FTTH"}),e.jsx("p",{className:"text-xs text-gray-500",children:"v6.1.0 — PCR v2.5"})]})]}),e.jsx("button",{onClick:n,className:`md:hidden text-gray-400
                     hover:text-white p-1`,children:"✕"})]}),e.jsx("nav",{className:`flex-1 p-3 space-y-1
                      overflow-y-auto`,children:j.map(a=>a.roles.length>0&&!s(...a.roles)?null:e.jsxs(m,{to:a.path,onClick:n,className:({isActive:c})=>`
                flex items-center gap-3 px-4 py-3
                rounded-xl transition-all text-sm
                font-medium group
                ${c?"bg-blue-600 text-white shadow-lg shadow-blue-900/50":"text-gray-400 hover:bg-gray-800 hover:text-white"}
              `,children:[e.jsx("span",{className:"text-xl flex-shrink-0",children:a.icon}),e.jsxs("div",{className:"min-w-0",children:[e.jsx("div",{className:"font-medium",children:a.label}),e.jsx("div",{className:`text-xs opacity-60
                                truncate`,children:a.desc})]})]},a.path))}),e.jsxs("div",{className:`p-4 border-t border-gray-700
                      space-y-3`,children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsxs("div",{className:`w-10 h-10 bg-gradient-to-br
                          from-blue-500 to-indigo-600
                          rounded-full flex items-center
                          justify-center font-bold
                          text-sm flex-shrink-0`,children:[(o=t==null?void 0:t.prenom)==null?void 0:o[0],(l=t==null?void 0:t.nom)==null?void 0:l[0]]}),e.jsxs("div",{className:"flex-1 min-w-0",children:[e.jsxs("p",{className:`text-sm font-semibold
                          text-white truncate`,children:[t==null?void 0:t.prenom," ",t==null?void 0:t.nom]}),e.jsx("span",{className:`
              text-xs px-2 py-0.5 rounded-full
              font-medium
              ${d[(t==null?void 0:t.role)||"invite"]}
            `,children:t==null?void 0:t.role})]})]}),e.jsx("button",{onClick:r,className:`w-full flex items-center
                     justify-center gap-2
                     bg-gray-800 hover:bg-red-900/40
                     hover:text-red-400 rounded-xl
                     py-2.5 text-sm text-gray-400
                     transition-all`,children:"🚪 Déconnexion"})]})]})}const v={"/map":"🗺️ Carte Interactive","/dashboard":"📊 Dashboard","/travaux":"🏗️ Suivi des Travaux","/eligibilite":"📡 Éligibilité FTTH","/terrain":"📱 Mode Terrain","/catalogue":"📦 Catalogue Équipements","/admin":"⚙️ Administration"};function y({onMenuClick:n,sidebarOpen:t}){const r=b();f();const[s,d]=x.useState(!1),{notifications:o,unreadCount:l,markAllRead:a}=u(),c=v[r.pathname]||"🌐 SIG FTTH";return e.jsxs("header",{className:`h-14 bg-gray-900 border-b
                       border-gray-700 flex items-center
                       justify-between px-4
                       flex-shrink-0 z-30`,children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("button",{onClick:n,className:`p-2 text-gray-400
                     hover:text-white
                     hover:bg-gray-800 rounded-lg
                     transition-colors`,children:t?"◀":"☰"}),e.jsx("h2",{className:`font-semibold text-white
                       text-base hidden sm:block`,children:c})]}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsxs("div",{className:`hidden sm:flex items-center
                        gap-1.5 bg-green-900/50
                        text-green-400 text-xs
                        px-3 py-1.5 rounded-full`,children:[e.jsx("span",{className:`w-1.5 h-1.5 bg-green-400
                           rounded-full
                           animate-pulse`}),"En ligne"]}),e.jsxs("div",{className:"relative",children:[e.jsxs("button",{onClick:()=>{d(!s),s||a()},className:`relative p-2 text-gray-400
                       hover:text-white
                       hover:bg-gray-800 rounded-lg
                       transition-colors`,children:["🔔",l>0&&e.jsx("span",{className:`absolute -top-0.5
                               -right-0.5
                               bg-red-500 text-white
                               text-xs rounded-full
                               w-4 h-4 flex items-center
                               justify-center font-bold
                               text-[10px]`,children:l>9?"9+":l})]}),s&&e.jsxs("div",{className:`absolute right-0 top-12
                            w-80 bg-gray-900 border
                            border-gray-700 rounded-2xl
                            shadow-2xl z-50
                            animate-slide-down`,children:[e.jsxs("div",{className:`p-4 border-b
                              border-gray-700 flex
                              items-center
                              justify-between`,children:[e.jsx("h3",{className:"font-semibold text-white",children:"Notifications"}),e.jsx("button",{onClick:()=>d(!1),className:`text-gray-400
                             hover:text-white text-sm`,children:"✕"})]}),e.jsx("div",{className:"max-h-80 overflow-y-auto",children:o.length===0?e.jsx("div",{className:`p-6 text-center
                                  text-gray-500 text-sm`,children:"Aucune notification"}):o.slice(0,10).map(i=>e.jsx("div",{className:`p-4 border-b
                                 border-gray-800
                                 hover:bg-gray-800
                                 transition-colors`,children:e.jsxs("div",{className:`flex items-start
                                      gap-3`,children:[e.jsxs("span",{className:"text-lg",children:[i.type==="success"&&"✅",i.type==="error"&&"❌",i.type==="warning"&&"⚠️",i.type==="info"&&"ℹ️"]}),e.jsxs("div",{className:"flex-1 min-w-0",children:[e.jsx("p",{className:`text-sm
                                        text-gray-300
                                        leading-snug`,children:i.message}),e.jsx("p",{className:`text-xs
                                        text-gray-500
                                        mt-1`,children:new Date(i.timestamp).toLocaleTimeString("fr-FR")})]})]})},i.id))})]})]})]})]})}function S(){const[n,t]=x.useState(()=>window.innerWidth>=768);x.useEffect(()=>{const s=()=>{window.innerWidth>=768&&t(!0)};return window.addEventListener("resize",s),()=>window.removeEventListener("resize",s)},[]);const r=()=>{window.innerWidth<768&&t(!1)};return e.jsxs("div",{className:"flex h-screen bg-gray-950 overflow-hidden",children:[e.jsx("div",{className:`
        flex-shrink-0 transition-all duration-300
        ${n?"w-64":"w-0 overflow-hidden"}
        hidden md:block
      `,children:e.jsx(h,{onClose:()=>t(!1)})}),n&&e.jsx("div",{className:"fixed inset-0 bg-black/70 z-20 md:hidden",onClick:()=>t(!1)}),e.jsx("div",{className:`
        fixed inset-y-0 left-0 z-30 w-72
        transform transition-transform duration-300 ease-in-out
        md:hidden
        ${n?"translate-x-0":"-translate-x-full"}
      `,children:e.jsx(h,{onClose:()=>t(!1)})}),e.jsxs("div",{className:"flex-1 flex flex-col min-w-0 overflow-hidden",children:[e.jsx(y,{onMenuClick:()=>t(s=>!s),sidebarOpen:n}),e.jsx("main",{className:"flex-1 overflow-auto",onClick:r,children:e.jsx(p,{})})]})]})}export{S as default};
