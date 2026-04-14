import{j as e}from"./index-CNAowNtC.js";import{r as a,u as v,L as N}from"./vendor-react-BeK1MbjZ.js";import{u as w,z as S}from"./App-BbYuajFV.js";import{a as C}from"./api-C4-va_VY.js";import"./vendor-charts-dkL-Ffi_.js";function L(){const[n,o]=a.useState(""),[r,c]=a.useState(""),[l,b]=a.useState(!1),[d,m]=a.useState(!1),[x,i]=a.useState(""),{login:g}=w(),j=v(),y=async t=>{var u,p,h;t.preventDefault(),m(!0),i("");try{const s=await C.post("/login",{email:n,mot_de_passe:r});g(s.data),S.success(`Bienvenue ${s.data.user.prenom} ! 👋`),j("/map")}catch(s){const f=((p=(u=s.response)==null?void 0:u.data)==null?void 0:p.detail)||"Erreur de connexion";i(f),((h=s.response)==null?void 0:h.status)===423&&i("🔒 Compte verrouillé. Réinitialisez votre mot de passe.")}finally{m(!1)}};return e.jsx("div",{className:`min-h-screen bg-gray-950
                    flex items-center justify-center
                    p-4`,children:e.jsxs("div",{className:"w-full max-w-md",children:[e.jsxs("div",{className:"text-center mb-8",children:[e.jsx("div",{className:"text-6xl mb-4",children:"🌐"}),e.jsx("h1",{className:"text-3xl font-bold text-white",children:"SIG FTTH"}),e.jsx("p",{className:"text-gray-400 text-sm mt-2",children:"Système d'Information Géographique"})]}),e.jsxs("div",{className:`bg-gray-900 rounded-2xl p-8
                        border border-gray-700
                        shadow-2xl`,children:[e.jsx("h2",{className:`text-xl font-bold
                         text-white mb-6`,children:"Connexion"}),e.jsxs("form",{onSubmit:y,className:"space-y-4",children:[e.jsxs("div",{children:[e.jsx("label",{className:`text-sm text-gray-400
                                block mb-2`,children:"Adresse email"}),e.jsx("input",{type:"email",value:n,onChange:t=>o(t.target.value),placeholder:"votre@email.com",required:!0,autoComplete:"email",className:`w-full bg-gray-800 rounded-xl
                           p-4 text-white border
                           border-gray-600
                           focus:border-blue-500
                           outline-none transition-colors`})]}),e.jsxs("div",{children:[e.jsx("label",{className:`text-sm text-gray-400
                                block mb-2`,children:"Mot de passe"}),e.jsxs("div",{className:"relative",children:[e.jsx("input",{type:l?"text":"password",value:r,onChange:t=>c(t.target.value),placeholder:"••••••••",required:!0,autoComplete:"current-password",className:`w-full bg-gray-800 rounded-xl
                             p-4 text-white border
                             border-gray-600
                             focus:border-blue-500
                             outline-none pr-12
                             transition-colors`}),e.jsx("button",{type:"button",onClick:()=>b(!l),className:`absolute right-4 top-1/2
                             -translate-y-1/2
                             text-gray-400
                             hover:text-white text-lg`,children:l?"🙈":"👁️"})]})]}),x&&e.jsxs("div",{className:`bg-red-950 border
                              border-red-600 rounded-xl
                              p-3 text-red-300 text-sm
                              animate-fade-in`,children:["❌ ",x]}),e.jsx("button",{type:"submit",disabled:d||!n||!r,className:`w-full bg-blue-600
                         hover:bg-blue-700
                         rounded-xl py-4 font-bold
                         text-white transition-all
                         disabled:opacity-50
                         active:scale-95
                         flex items-center
                         justify-center gap-2`,children:d?e.jsxs(e.Fragment,{children:[e.jsx("span",{className:"animate-spin",children:"⚙️"}),"Connexion..."]}):"🔐 Se connecter"}),e.jsx("div",{className:"text-center",children:e.jsx(N,{to:"/mot-de-passe-oublie",className:`text-blue-400
                           hover:text-blue-300
                           text-sm transition-colors`,children:"Mot de passe oublié ?"})})]})]}),e.jsxs("div",{className:`mt-4 bg-gray-900/50
                        rounded-xl p-4
                        border border-gray-800`,children:[e.jsx("p",{className:`text-xs text-gray-500
                        text-center mb-3`,children:"Comptes de démonstration"}),e.jsxs("div",{className:"space-y-2",children:[[{role:"👑 Admin",email:"admin@sig-ftth.ci",color:"blue"},{role:"💼 Commercial",email:"commercial@sig-ftth.ci",color:"green"},{role:"🔧 Technicien",email:"technicien@sig-ftth.ci",color:"orange"}].map(t=>e.jsxs("button",{onClick:()=>{o(t.email),c("Admin@2026!")},className:`w-full text-left px-3 py-2
                           bg-gray-800 rounded-lg
                           hover:bg-gray-700
                           transition-colors text-xs`,children:[e.jsx("span",{className:`font-medium
                                 text-white`,children:t.role}),e.jsx("span",{className:"text-gray-400 ml-2",children:t.email})]},t.email)),e.jsx("p",{className:`text-xs text-gray-600
                          text-center mt-1`,children:"MDP : Admin@2026!"})]})]}),e.jsx("p",{className:`text-center text-gray-600
                      text-xs mt-6`,children:"SIG FTTH v6.1 — Edgar KOUAME © 2026"})]})})}export{L as default};
