import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

export default function ScanPage() {
  const { id } = useParams<{id: string}>()
  const navigate = useNavigate()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string|null>(null)
  const [showReport, setShowReport] = useState(false)
  const [reportText, setReportText] = useState('')

  const API = 'https://sig-ftth-production-a3aa.up.railway.app'

  useEffect(() => {
    if (!id) return
    fetch(`${API}/api/v1/noeuds-telecom/${id}`)
      .then(r => { if (!r.ok) throw new Error('Nœud introuvable'); return r.json() })
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  const soumettreRapport = async () => {
    if (!reportText.trim()) return
    alert(`Rapport soumis : ${reportText}\n\n(Fonctionnalité incidents à connecter)`)
    setShowReport(false)
    setReportText('')
  }

  const ETAT_COLORS: Record<string,string> = {
    actif: '#10B981', inactif: '#6B7280', maintenance: '#F59E0B', panne: '#EF4444'
  }

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:'#030712'}}>
      <div style={{textAlign:'center',color:'white'}}>
        <div style={{fontSize:48,marginBottom:16}}>⚙️</div>
        <p style={{color:'#9CA3AF'}}>Chargement...</p>
      </div>
    </div>
  )

  if (error) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:'#030712'}}>
      <div style={{textAlign:'center',color:'white',padding:24}}>
        <div style={{fontSize:48,marginBottom:16}}>❌</div>
        <p style={{color:'#EF4444',marginBottom:8}}>{error}</p>
        <p style={{color:'#6B7280',fontSize:14}}>ID: {id}</p>
      </div>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'#030712',padding:'16px',fontFamily:'sans-serif'}}>
      <div style={{maxWidth:480,margin:'0 auto'}}>

        {/* Header */}
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
          <div style={{fontSize:32}}>📡</div>
          <div>
            <h1 style={{color:'white',fontSize:20,fontWeight:700,margin:0}}>SIG FTTH</h1>
            <p style={{color:'#6B7280',fontSize:12,margin:0}}>Fiche équipement terrain</p>
          </div>
        </div>

        {/* Fiche nœud */}
        {data && (
          <div style={{background:'#111827',borderRadius:16,border:'1px solid #1F2937',overflow:'hidden',marginBottom:16}}>
            <div style={{padding:'16px',borderBottom:'1px solid #1F2937'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <h2 style={{color:'white',fontSize:16,fontWeight:700,margin:0}}>{data.nom_unique}</h2>
                <span style={{
                  background: (ETAT_COLORS[data.etat]||'#6B7280')+'22',
                  color: ETAT_COLORS[data.etat]||'#6B7280',
                  fontSize:11,padding:'3px 8px',borderRadius:20,fontWeight:500
                }}>{data.etat}</span>
              </div>
              <p style={{color:'#6B7280',fontSize:12,margin:'4px 0 0'}}>{data.type_noeud}</p>
            </div>
            <div style={{padding:'16px'}}>
              {[
                ['Type', data.type_noeud],
                ['État', data.etat],
                ['Marque', data.marque || '—'],
                ['Modèle', data.modele || '—'],
                ['N° série', data.numero_serie || '—'],
                ['Capacité', data.capacite_fibres_max ? `${data.capacite_fibres_max} fibres` : '—'],
                ['Latitude', data.latitude?.toFixed(6) || '—'],
                ['Longitude', data.longitude?.toFixed(6) || '—'],
              ].map(([label, value]) => (
                <div key={label} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid #1F2937'}}>
                  <span style={{color:'#9CA3AF',fontSize:13}}>{label}</span>
                  <span style={{color:'white',fontSize:13,fontWeight:500}}>{value}</span>
                </div>
              ))}
              {data.commentaire && (
                <div style={{marginTop:12,padding:'8px 12px',background:'#1F2937',borderRadius:8}}>
                  <p style={{color:'#9CA3AF',fontSize:11,margin:'0 0 4px'}}>Commentaire</p>
                  <p style={{color:'white',fontSize:13,margin:0}}>{data.commentaire}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions terrain */}
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          <button onClick={() => setShowReport(!showReport)}
            style={{padding:'14px',background:'#1D4ED8',border:'none',borderRadius:12,color:'white',fontSize:14,fontWeight:600,cursor:'pointer'}}>
            🔧 Signaler un incident
          </button>

          {showReport && (
            <div style={{background:'#111827',borderRadius:12,border:'1px solid #374151',padding:16}}>
              <p style={{color:'white',fontSize:13,fontWeight:500,marginBottom:8}}>Description de l'incident</p>
              <textarea value={reportText} onChange={e => setReportText(e.target.value)}
                placeholder="Décrivez le problème observé sur le terrain..."
                style={{width:'100%',background:'#1F2937',border:'1px solid #374151',borderRadius:8,color:'white',padding:'8px 12px',fontSize:13,minHeight:80,resize:'vertical',boxSizing:'border-box'}} />
              <button onClick={soumettreRapport}
                style={{marginTop:8,padding:'10px 16px',background:'#10B981',border:'none',borderRadius:8,color:'white',fontSize:13,fontWeight:600,cursor:'pointer',width:'100%'}}>
                ✅ Soumettre
              </button>
            </div>
          )}

          {data?.latitude && (
            <button onClick={() => window.open(`https://maps.google.com/?q=${data.latitude},${data.longitude}`,'_blank')}
              style={{padding:'14px',background:'#065F46',border:'none',borderRadius:12,color:'white',fontSize:14,fontWeight:600,cursor:'pointer'}}>
              🗺️ Ouvrir dans Google Maps
            </button>
          )}

          <button onClick={() => navigate('/')}
            style={{padding:'12px',background:'#1F2937',border:'none',borderRadius:12,color:'#9CA3AF',fontSize:13,cursor:'pointer'}}>
            ← Retour à l'application
          </button>
        </div>

        <p style={{textAlign:'center',color:'#374151',fontSize:11,marginTop:20}}>
          SIG FTTH v6.1 — Orange CI · ID: {id?.substring(0,8)}...
        </p>
      </div>
    </div>
  )
}
