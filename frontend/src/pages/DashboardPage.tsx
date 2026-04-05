import { useState, useEffect, useRef } from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  useMap,
  useMapEvents
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import api from '@services/api'
import { useMapStore } from '@store/useStore'
import { useAuthStore } from '@store/useStore'
import toast from 'react-hot-toast'

// Fix icônes Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Icônes personnalisées
const makeIcon = (color: string, emoji: string) =>
  L.divIcon({
    html: `
      <div style="
        background:${color};
        width:32px;height:32px;
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        border:3px solid white;
        box-shadow:0 2px 8px rgba(0,0,0,0.4);
        display:flex;align-items:center;
        justify-content:center;
      ">
        <span style="
          transform:rotate(45deg);
          font-size:14px;
          line-height:1;
        ">${emoji}</span>
      </div>
    `,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  })

const ICONS: Record<string, L.DivIcon> = {
  NRO: makeIcon('#1D4ED8', '🔵'),
  SRO: makeIcon('#6366F1', '🟣'),
  PBO: makeIcon('#8B5CF6', '🔷'),
  PTO: makeIcon('#A78BFA', '◾'),
  PM:  makeIcon('#60A5FA', '🔹'),
  GC:  makeIcon('#F59E0B', '🟡'),
  LOG: makeIcon('#10B981', '🏠'),
}

const TILE_STYLES = {
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    label: '🌑 Sombre'
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    label: '🛰️ Satellite'
  },
  streets: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    label: '🗺️ Rues'
  },
}

// ─────────────────────────────────────────────
// Composant principal
// ─────────────────────────────────────────────
export default function MapPage() {
  const [noeuds, setNoeuds] = useState<any[]>([])
  const [noeudsGC, setNoeudsGC] = useState<any[]>([])
  const [liens, setLiens] = useState<any[]>([])
  const [liensGC, setLiensGC] = useState<any[]>([])
  const [logements, setLogements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any>(null)
  const [showLayerPanel, setShowLayerPanel] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])

  const {
    layers,
    toggleLayer,
    mapStyle,
    setMapStyle
  } = useMapStore()

  const { canEdit } = useAuthStore()

  // Charger données
  useEffect(() => {
    chargerDonnees()
  }, [])

  const chargerDonnees = async () => {
    setLoading(true)
    try {
      const [
        resNoeuds,
        resNoeudsGC,
        resLiens,
        resLiensGC,
        resLogements
      ] = await Promise.all([
        api.get('/noeuds-telecom'),
        api.get('/noeuds-gc'),
        api.get('/liens-telecom'),
        api.get('/liens-gc'),
        api.get('/logements'),
      ])
      setNoeuds(resNoeuds.data)
      setNoeudsGC(resNoeudsGC.data)
      setLiens(resLiens.data)
      setLiensGC(resLiensGC.data)
      setLogements(resLogements.data)
    } catch (err) {
      toast.error('Erreur chargement données')
    } finally {
      setLoading(false)
    }
  }

  // Recherche
  const rechercher = (q: string) => {
    setSearchQuery(q)
    if (!q.trim()) {
      setSearchResults([])
      return
    }
    const ql = q.toLowerCase()
    const results = [
      ...noeuds.filter(n =>
        n.nom_unique?.toLowerCase().includes(ql)
      ).map(n => ({ ...n, _type: 'noeud_telecom' })),
      ...noeudsGC.filter(n =>
        n.nom_unique?.toLowerCase().includes(ql)
      ).map(n => ({ ...n, _type: 'noeud_gc' })),
      ...logements.filter(l =>
        l.nom_unique?.toLowerCase().includes(ql)
        || l.adresse?.toLowerCase().includes(ql)
        || l.commune?.toLowerCase().includes(ql)
      ).map(l => ({ ...l, _type: 'logement' })),
    ].slice(0, 8)
    setSearchResults(results)
  }

  const tileUrl = TILE_STYLES[mapStyle]?.url
    || TILE_STYLES.dark.url

  return (
    <div className="relative h-full w-full">

      {/* ── CARTE ─────────────────────────── */}
      <MapContainer
        center={[5.3599, -4.0083]}
        zoom={13}
        className="h-full w-full"
        zoomControl={false}
      >
        <TileLayer
          url={tileUrl}
          attribution="© CartoDB / OSM"
          maxZoom={20}
        />

        {/* Zoom control repositionné */}
        <ZoomControl />

        {/* Noeuds Télécom */}
        {layers.noeud_telecom && noeuds.map(n => (
          <Marker
            key={n.id}
            position={[n.latitude, n.longitude]}
            icon={ICONS[n.type_noeud] || ICONS.PBO}
            eventHandlers={{
              click: () => setSelected({
                ...n, _type: 'noeud_telecom'
              })
            }}
          >
            <Popup>
              <PopupNoeudTelecom noeud={n} />
            </Popup>
          </Marker>
        ))}

        {/* Noeuds GC */}
        {layers.noeud_gc && noeudsGC.map(n => (
          <Marker
            key={n.id}
            position={[n.latitude, n.longitude]}
            icon={ICONS.GC}
            eventHandlers={{
              click: () => setSelected({
                ...n, _type: 'noeud_gc'
              })
            }}
          >
            <Popup>
              <PopupNoeudGC noeud={n} />
            </Popup>
          </Marker>
        ))}

        {/* Logements */}
        {layers.logement && logements.map(l => (
          <Marker
            key={l.id}
            position={[l.latitude, l.longitude]}
            icon={ICONS.LOG}
            eventHandlers={{
              click: () => setSelected({
                ...l, _type: 'logement'
              })
            }}
          >
            <Popup>
              <PopupLogement logement={l} />
            </Popup>
          </Marker>
        ))}

        {/* Liens Télécom */}
        {layers.lien_telecom && liens.map(l => {
          if (!l.geom) return null
          return (
            <LienTelecomLayer
              key={l.id}
              lien={l}
              onClick={() => setSelected({
                ...l, _type: 'lien_telecom'
              })}
            />
          )
        })}

        {/* Liens GC */}
        {layers.lien_gc && liensGC.map(l => {
          if (!l.geom) return null
          return (
            <LienGCLayer
              key={l.id}
              lien={l}
              onClick={() => setSelected({
                ...l, _type: 'lien_gc'
              })}
            />
          )
        })}

        {/* Centrage sur sélection */}
        {selected && (
          <CenterOnFeature feature={selected} />
        )}
      </MapContainer>

      {/* ── BARRE OUTILS HAUT ─────────────── */}
      <div className="absolute top-4 left-4 right-4
                      z-[1000] flex items-center gap-2">

        {/* Recherche */}
        <div className="flex-1 relative">
          <div className="flex items-center
                          bg-gray-900/95 backdrop-blur-sm
                          rounded-2xl border border-gray-700
                          shadow-2xl overflow-hidden">
            <span className="pl-4 text-gray-400">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={e => rechercher(e.target.value)}
              onFocus={() => setShowSearch(true)}
              placeholder="Rechercher nœud, logement, adresse..."
              className="flex-1 bg-transparent px-3 py-3
                         text-white text-sm outline-none
                         placeholder-gray-500"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setSearchResults([])
                }}
                className="pr-4 text-gray-400
                           hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* Résultats recherche */}
          {searchResults.length > 0 && (
            <div className="absolute top-14 left-0
                            right-0 bg-gray-900/98
                            border border-gray-700
                            rounded-2xl shadow-2xl
                            overflow-hidden z-50">
              {searchResults.map((r, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setSelected(r)
                    setSearchQuery(r.nom_unique || '')
                    setSearchResults([])
                  }}
                  className="w-full flex items-center
                             gap-3 px-4 py-3
                             hover:bg-gray-800
                             transition-colors text-left
                             border-b border-gray-800
                             last:border-0"
                >
                  <span className="text-xl">
                    {r._type === 'noeud_telecom' && '📡'}
                    {r._type === 'noeud_gc'      && '🏗️'}
                    {r._type === 'logement'       && '🏠'}
                  </span>
                  <div>
                    <p className="text-sm font-medium
                                  text-white">
                      {r.nom_unique}
                    </p>
                    <p className="text-xs text-gray-400">
                      {r._type === 'logement'
                        ? r.commune || r.adresse
                        : r.type_noeud || r.type_lien}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Bouton couches */}
        <button
          onClick={() => setShowLayerPanel(!showLayerPanel)}
          className={`
            p-3 rounded-2xl border shadow-2xl
            backdrop-blur-sm transition-all
            ${showLayerPanel
              ? 'bg-blue-600 border-blue-500 text-white'
              : 'bg-gray-900/95 border-gray-700 text-gray-300'
            }
          `}
        >
          🗂️
        </button>

        {/* Rafraîchir */}
        <button
          onClick={chargerDonnees}
          className="p-3 bg-gray-900/95 backdrop-blur-sm
                     rounded-2xl border border-gray-700
                     text-gray-300 shadow-2xl
                     hover:bg-gray-800 transition-all"
        >
          🔄
        </button>
      </div>

      {/* ── PANNEAU COUCHES ───────────────── */}
      {showLayerPanel && (
        <div className="absolute top-20 right-4
                        z-[1000] w-64
                        bg-gray-900/98 backdrop-blur-sm
                        border border-gray-700
                        rounded-2xl shadow-2xl
                        animate-slide-down">

          <div className="p-4 border-b border-gray-700">
            <h3 className="font-bold text-white text-sm">
              🗂️ Couches
            </h3>
          </div>

          <div className="p-3 space-y-1">
            {[
              {
                key: 'noeud_telecom',
                label: 'Nœuds Télécom',
                icon: '📡',
                count: noeuds.length
              },
              {
                key: 'noeud_gc',
                label: 'Nœuds GC',
                icon: '🏗️',
                count: noeudsGC.length
              },
              {
                key: 'lien_telecom',
                label: 'Câbles Optiques',
                icon: '〰️',
                count: liens.length
              },
              {
                key: 'lien_gc',
                label: 'Fourreaux GC',
                icon: '⚡',
                count: liensGC.length
              },
              {
                key: 'logement',
                label: 'Logements',
                icon: '🏠',
                count: logements.length
              },
            ].map(layer => (
              <button
                key={layer.key}
                onClick={() => toggleLayer(layer.key)}
                className={`
                  w-full flex items-center gap-3
                  px-3 py-2.5 rounded-xl
                  transition-all text-sm
                  ${layers[layer.key]
                    ? 'bg-blue-900/50 text-blue-300'
                    : 'text-gray-500 hover:bg-gray-800'
                  }
                `}
              >
                <span className="text-lg">{layer.icon}</span>
                <span className="flex-1 text-left font-medium">
                  {layer.label}
                </span>
                <span className="text-xs opacity-60">
                  {layer.count}
                </span>
                <span className={`
                  w-4 h-4 rounded border-2 flex-shrink-0
                  ${layers[layer.key]
                    ? 'bg-blue-500 border-blue-500'
                    : 'border-gray-600'
                  }
                `} />
              </button>
            ))}
          </div>

          {/* Style carte */}
          <div className="p-3 border-t border-gray-700">
            <p className="text-xs text-gray-500 mb-2 px-1">
              Style de carte
            </p>
            <div className="grid grid-cols-3 gap-1">
              {Object.entries(TILE_STYLES).map(
                ([key, val]) => (
                  <button
                    key={key}
                    onClick={() =>
                      setMapStyle(
                        key as 'dark'|'satellite'|'streets'
                      )
                    }
                    className={`
                      py-2 rounded-lg text-xs font-medium
                      transition-all
                      ${mapStyle === key
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }
                    `}
                  >
                    {val.label}
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── STATS BAS DE CARTE ────────────── */}
      <div className="absolute bottom-6 left-4
                      z-[1000] flex gap-2 flex-wrap">
        {[
          {
            label: 'Nœuds T',
            value: noeuds.length,
            color: 'blue'
          },
          {
            label: 'Nœuds GC',
            value: noeudsGC.length,
            color: 'yellow'
          },
          {
            label: 'Logements',
            value: logements.length,
            color: 'green'
          },
        ].map((s, i) => (
          <div key={i}
            className="bg-gray-900/95 backdrop-blur-sm
                       border border-gray-700
                       rounded-xl px-3 py-2
                       text-center shadow-lg">
            <div className="text-lg font-bold text-white">
              {s.value}
            </div>
            <div className="text-xs text-gray-400">
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* ── LOADING ───────────────────────── */}
      {loading && (
        <div className="absolute inset-0 z-[2000]
                        bg-gray-950/80 backdrop-blur-sm
                        flex items-center justify-center">
          <div className="bg-gray-900 rounded-2xl p-8
                          border border-gray-700
                          text-center">
            <div className="text-4xl animate-spin mb-4">
              ⚙️
            </div>
            <p className="text-gray-400 text-sm">
              Chargement de la carte...
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// Composants auxiliaires
// ─────────────────────────────────────────────

function ZoomControl() {
  const map = useMap()
  return (
    <div className="absolute bottom-6 right-4
                    z-[1000] flex flex-col gap-1">
      <button
        onClick={() => map.zoomIn()}
        className="w-10 h-10 bg-gray-900/95
                   border border-gray-700
                   rounded-xl text-white text-xl
                   hover:bg-gray-800 shadow-lg
                   flex items-center justify-center"
      >
        +
      </button>
      <button
        onClick={() => map.zoomOut()}
        className="w-10 h-10 bg-gray-900/95
                   border border-gray-700
                   rounded-xl text-white text-xl
                   hover:bg-gray-800 shadow-lg
                   flex items-center justify-center"
      >
        −
      </button>
    </div>
  )
}

function CenterOnFeature({ feature }: { feature: any }) {
  const map = useMap()
  useEffect(() => {
    if (feature?.latitude && feature?.longitude) {
      map.flyTo(
        [feature.latitude, feature.longitude],
        16,
        { duration: 1 }
      )
    }
  }, [feature, map])
  return null
}

function LienTelecomLayer({
  lien,
  onClick
}: {
  lien: any
  onClick: () => void
}) {
  const coords = lien.geom?.coordinates?.map(
    (c: number[]) => [c[1], c[0]] as [number, number]
  ) || []

  const couleur =
    lien.taux_saturation_pct >= 90 ? '#EF4444' :
    lien.taux_saturation_pct >= 70 ? '#F59E0B' :
    '#6366F1'

  return (
    <Polyline
      positions={coords}
      pathOptions={{
        color: couleur,
        weight: 3,
        opacity: 0.85,
      }}
      eventHandlers={{ click: onClick }}
    />
  )
}

function LienGCLayer({
  lien,
  onClick
}: {
  lien: any
  onClick: () => void
}) {
  const coords = lien.geom?.coordinates?.map(
    (c: number[]) => [c[1], c[0]] as [number, number]
  ) || []

  return (
    <Polyline
      positions={coords}
      pathOptions={{
        color: '#F59E0B',
        weight: 3,
        opacity: 0.7,
        dashArray: '8,4',
      }}
      eventHandlers={{ click: onClick }}
    />
  )
}

function PopupNoeudTelecom({ noeud }: { noeud: any }) {
  const sat = noeud.taux_saturation_pct || 0
  return (
    <div className="min-w-48 text-gray-900">
      <div className="font-bold text-base mb-2">
        📡 {noeud.nom_unique}
      </div>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Type</span>
          <span className="font-medium">
            {noeud.type_noeud}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">État</span>
          <span className={`font-medium ${
            noeud.etat === 'actif'
              ? 'text-green-600'
              : 'text-red-600'
          }`}>
            {noeud.etat}
          </span>
        </div>
        {noeud.capacite_fibres_max && (
          <>
            <div className="flex justify-between">
              <span className="text-gray-500">Fibres</span>
              <span className="font-medium">
                {noeud.fibres_utilisees}/
                {noeud.capacite_fibres_max}
              </span>
            </div>
            <div className="mt-2">
              <div className="flex justify-between
                              text-xs mb-1">
                <span>Saturation</span>
                <span className={
                  sat >= 90 ? 'text-red-600' :
                  sat >= 70 ? 'text-orange-500' :
                  'text-green-600'
                }>
                  {sat}%
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full">
                <div
                  className={`h-2 rounded-full ${
                    sat >= 90 ? 'bg-red-500' :
                    sat >= 70 ? 'bg-orange-400' :
                    'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(sat,100)}%` }}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function PopupNoeudGC({ noeud }: { noeud: any }) {
  return (
    <div className="min-w-44 text-gray-900">
      <div className="font-bold text-base mb-2">
        🏗️ {noeud.nom_unique}
      </div>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Type</span>
          <span className="font-medium">
            {noeud.type_noeud}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Dimension</span>
          <span className="font-medium">
            {noeud.dimension || '—'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Fourreaux</span>
          <span className="font-medium">
            {noeud.fourreaux_occupes}/
            {noeud.nb_fourreaux || '—'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">État</span>
          <span className={`font-medium ${
            noeud.etat === 'actif'
              ? 'text-green-600'
              : 'text-orange-500'
          }`}>
            {noeud.etat}
          </span>
        </div>
      </div>
    </div>
  )
}

function PopupLogement({ logement }: { logement: any }) {
  const STATUT_COLORS: Record<string, string> = {
    raccorde:     'text-green-600',
    en_cours:     'text-blue-600',
    prevu:        'text-yellow-600',
    non_prevu:    'text-gray-500',
    refuse:       'text-red-600',
    inaccessible: 'text-orange-600',
  }
  return (
    <div className="min-w-44 text-gray-900">
      <div className="font-bold text-base mb-2">
        🏠 {logement.nom_unique}
      </div>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Type</span>
          <span className="font-medium text-xs">
            {logement.type_nom}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">EL réels</span>
          <span className="font-bold">
            {logement.nb_el_reel}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Raccordés</span>
          <span className="font-medium text-green-600">
            {logement.nb_el_raccordes || 0}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Statut</span>
          <span className={`font-medium ${
            STATUT_COLORS[logement.statut_ftth]
            || 'text-gray-600'
          }`}>
            {logement.statut_ftth}
          </span>
        </div>
        {logement.commune && (
          <div className="flex justify-between">
            <span className="text-gray-500">Commune</span>
            <span className="font-medium">
              {logement.commune}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
