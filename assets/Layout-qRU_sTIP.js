import{j as e,r as h}from"./index-2YXPxrgw.js";import{u as m,N as b,c as g,a as p,d as f,O as u}from"./App-DNmp3Ftl.js";const j=[{path:"/map",icon:"🗺️",label:"Carte",roles:[],desc:"Carte interactive"},{path:"/dashboard",icon:"📊",label:"Dashboard",roles:[],desc:"KPI & statistiques"},{path:"/travaux",icon:"🏗️",label:"Travaux",roles:[],desc:"Ordres de travail"},{path:"/eligibilite",icon:"📡",label:"Éligibilité",roles:[],desc:"Vérifier la fibre"},{path:"/terrain",icon:"📱",label:"Terrain",roles:["admin","chef_projet","technicien"],desc:"Dessin mobile"},{path:"/catalogue",icon:"📦",label:"Catalogue",roles:[],desc:"Équipements"},{path:"/export",icon:"📤",label:"Exportation",roles:[],desc:"Export GeoJSON/PDF"},{path:"/el",icon:"🏠",label:"Table EL",roles:[],desc:"Équivalents logements"},{path:"/synoptique",icon:"📐",label:"Synoptique",roles:[],desc:"Vue réseau"},{path:"/analytics",icon:"📈",label:"Analytics",roles:["admin","chef_projet","analyste"],desc:"Saturation & prédictions"},{path:"/import-dwg",icon:"📥",label:"Import DWG",roles:["admin","chef_projet","technicien"],desc:"Import GeoJSON/DWG"},{path:"/admin",icon:"⚙️",label:"Admin",roles:["admin"],desc:"Administration"}];function x({onClose:s}){var r,l;const{user:t,logout:c,hasRole:i}=m(),o={admin:"bg-red-900 text-red-300",chef_projet:"bg-purple-900 text-purple-300",technicien:"bg-blue-900 text-blue-300",commercial:"bg-green-900 text-green-300",analyste:"bg-yellow-900 text-yellow-300",invite:"bg-gray-800 text-gray-400"};return e.jsxs("div",{className:`w-64 bg-gray-900 border-r
                    border-gray-700 flex flex-col
                    h-full`,children:[e.jsxs("div",{className:`p-5 border-b border-gray-700
                      flex items-center
                      justify-between`,children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("div",{className:`w-10 h-10 bg-blue-600
                          rounded-xl flex items-center
                          justify-center text-xl`,children:"🌐"}),e.jsxs("div",{children:[e.jsx("h1",{className:`font-bold text-white
                           text-base leading-tight`,children:"SIG FTTH"}),e.jsx("p",{className:"text-xs text-gray-500",children:"v6.1.0 — PCR v2.5"})]})]}),e.jsx("button",{onClick:s,className:`md:hidden text-gray-400
                     hover:text-white p-1`,children:"✕"})]}),e.jsx("nav",{className:`flex-1 p-3 space-y-1
                      overflow-y-auto`,children:j.map(n=>n.roles.length>0&&!i(...n.roles)?null:e.jsxs(b,{to:n.path,onClick:s,className:({isActive:d})=>`
                flex items-center gap-3 px-4 py-3
                rounded-xl transition-all text-sm
                font-medium group
                ${d?"bg-blue-600 text-white shadow-lg shadow-blue-900/50":"text-gray-400 hover:bg-gray-800 hover:text-white"}
              `,children:[e.jsx("span",{className:"text-xl flex-shrink-0",children:n.icon}),e.jsxs("div",{className:"min-w-0",children:[e.jsx("div",{className:"font-medium",children:n.label}),e.jsx("div",{className:`text-xs opacity-60
                                truncate`,children:n.desc})]})]},n.path))}),e.jsxs("div",{className:`p-4 border-t border-gray-700
                      space-y-3`,children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsxs("div",{className:`w-10 h-10 bg-gradient-to-br
                          from-blue-500 to-indigo-600
                          rounded-full flex items-center
                          justify-center font-bold
                          text-sm flex-shrink-0`,children:[(r=t==null?void 0:t.prenom)==null?void 0:r[0],(l=t==null?void 0:t.nom)==null?void 0:l[0]]}),e.jsxs("div",{className:"flex-1 min-w-0",children:[e.jsxs("p",{className:`text-sm font-semibold
                          text-white truncate`,children:[t==null?void 0:t.prenom," ",t==null?void 0:t.nom]}),e.jsx("span",{className:`
              text-xs px-2 py-0.5 rounded-full
              font-medium
              ${o[(t==null?void 0:t.role)||"invite"]}
            `,children:t==null?void 0:t.role})]})]}),e.jsx("button",{onClick:c,className:`w-full flex items-center
                     justify-center gap-2
                     bg-gray-800 hover:bg-red-900/40
                     hover:text-red-400 rounded-xl
                     py-2.5 text-sm text-gray-400
                     transition-all`,children:"🚪 Déconnexion"})]})]})}const v={"/map":"🗺️ Carte Interactive","/dashboard":"📊 Dashboard","/travaux":"🏗️ Suivi des Travaux","/eligibilite":"📡 Éligibilité FTTH","/terrain":"📱 Mode Terrain","/catalogue":"📦 Catalogue Équipements","/admin":"⚙️ Administration"};function y({onMenuClick:s,sidebarOpen:t}){const c=g();p();const[i,o]=h.useState(!1),{notifications:r,unreadCount:l,markAllRead:n}=f(),d=v[c.pathname]||"🌐 SIG FTTH";return e.jsxs("header",{className:`h-14 bg-gray-900 border-b
                       border-gray-700 flex items-center
                       justify-between px-4
                       flex-shrink-0 z-30`,children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("button",{onClick:s,className:`p-2 text-gray-400
                     hover:text-white
                     hover:bg-gray-800 rounded-lg
                     transition-colors`,children:t?"◀":"☰"}),e.jsx("h2",{className:`font-semibold text-white
                       text-base hidden sm:block`,children:d})]}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsxs("div",{className:`hidden sm:flex items-center
                        gap-1.5 bg-green-900/50
                        text-green-400 text-xs
                        px-3 py-1.5 rounded-full`,children:[e.jsx("span",{className:`w-1.5 h-1.5 bg-green-400
                           rounded-full
                           animate-pulse`}),"En ligne"]}),e.jsxs("div",{className:"relative",children:[e.jsxs("button",{onClick:()=>{o(!i),i||n()},className:`relative p-2 text-gray-400
                       hover:text-white
                       hover:bg-gray-800 rounded-lg
                       transition-colors`,children:["🔔",l>0&&e.jsx("span",{className:`absolute -top-0.5
                               -right-0.5
                               bg-red-500 text-white
                               text-xs rounded-full
                               w-4 h-4 flex items-center
                               justify-center font-bold
                               text-[10px]`,children:l>9?"9+":l})]}),i&&e.jsxs("div",{className:`absolute right-0 top-12
                            w-80 bg-gray-900 border
                            border-gray-700 rounded-2xl
                            shadow-2xl z-50
                            animate-slide-down`,children:[e.jsxs("div",{className:`p-4 border-b
                              border-gray-700 flex
                              items-center
                              justify-between`,children:[e.jsx("h3",{className:"font-semibold text-white",children:"Notifications"}),e.jsx("button",{onClick:()=>o(!1),className:`text-gray-400
                             hover:text-white text-sm`,children:"✕"})]}),e.jsx("div",{className:"max-h-80 overflow-y-auto",children:r.length===0?e.jsx("div",{className:`p-6 text-center
                                  text-gray-500 text-sm`,children:"Aucune notification"}):r.slice(0,10).map(a=>e.jsx("div",{className:`p-4 border-b
                                 border-gray-800
                                 hover:bg-gray-800
                                 transition-colors`,children:e.jsxs("div",{className:`flex items-start
                                      gap-3`,children:[e.jsxs("span",{className:"text-lg",children:[a.type==="success"&&"✅",a.type==="error"&&"❌",a.type==="warning"&&"⚠️",a.type==="info"&&"ℹ️"]}),e.jsxs("div",{className:"flex-1 min-w-0",children:[e.jsx("p",{className:`text-sm
                                        text-gray-300
                                        leading-snug`,children:a.message}),e.jsx("p",{className:`text-xs
                                        text-gray-500
                                        mt-1`,children:new Date(a.timestamp).toLocaleTimeString("fr-FR")})]})]})},a.id))})]})]})]})]})}function k(){const[s,t]=h.useState(!0);return e.jsxs("div",{className:"flex h-screen bg-gray-950 overflow-hidden",children:[e.jsx("div",{className:`
        flex-shrink-0 transition-all duration-300
        ${s?"w-64":"w-0 overflow-hidden"}
        hidden md:block
      `,children:e.jsx(x,{onClose:()=>t(!1)})}),s&&e.jsx("div",{className:"fixed inset-0 bg-black/60 z-20 md:hidden",onClick:()=>t(!1)}),e.jsx("div",{className:`
        fixed inset-y-0 left-0 z-30 w-64
        transform transition-transform duration-300
        md:hidden
        ${s?"translate-x-0":"-translate-x-full"}
      `,children:e.jsx(x,{onClose:()=>t(!1)})}),e.jsxs("div",{className:"flex-1 flex flex-col min-w-0 overflow-hidden",children:[e.jsx(y,{onMenuClick:()=>t(!s),sidebarOpen:s}),e.jsx("main",{className:"flex-1 overflow-auto",children:e.jsx(u,{})})]})]})}export{k as default};
