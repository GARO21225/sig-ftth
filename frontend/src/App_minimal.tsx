export default function App() {
  return (
    <div style={{background:'#030712',minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{textAlign:'center',fontFamily:'sans-serif'}}>
        <h1 style={{color:'#3b82f6',fontSize:'2rem',marginBottom:'1rem'}}>✅ SIG FTTH v6.1</h1>
        <p style={{color:'#22c55e',fontSize:'1.1rem'}}>React fonctionne !</p>
        <p style={{color:'#9ca3af',marginTop:'0.5rem',fontSize:'0.875rem'}}>
          Backend: <a href="https://sig-ftth-production-a3aa.up.railway.app/health" 
            style={{color:'#60a5fa'}} target="_blank">tester</a>
        </p>
      </div>
    </div>
  )
}
