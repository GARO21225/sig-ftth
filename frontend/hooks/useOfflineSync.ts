import {
  useCallback,
  useEffect,
  useState
} from 'react'
import api from '@services/api'

const DB_NAME = 'sig_ftth_offline'
const STORE_NAME = 'pending_objects'
const DB_VERSION = 1

// Initialiser IndexedDB
async function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = (e: any) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {
          keyPath: 'id',
          autoIncrement: true,
        })
      }
    }

    req.onsuccess = (e: any) => resolve(e.target.result)
    req.onerror = () => reject(req.error)
  })
}

// Endpoint selon type d'objet
function getEndpoint(type: string): string {
  const map: Record<string, string> = {
    noeud_t:  '/noeuds-telecom',
    noeud_gc: '/noeuds-gc',
    lien_t:   '/liens-telecom',
    lien_gc:  '/liens-gc',
    logement: '/logements',
  }
  return map[type] || '/noeuds-telecom'
}

export function useOfflineSync() {
  const [syncCount, setSyncCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isOnline, setIsOnline] = useState(
    navigator.onLine
  )

  // Surveiller connexion
  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true)
      synchroniser()
    }
    const onOffline = () => setIsOnline(false)

    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    compterEnAttente()

    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  // Compter objets en attente
  const compterEnAttente = useCallback(async () => {
    try {
      const db = await getDB()
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const req = store.count()
      req.onsuccess = () => setSyncCount(req.result)
    } catch {
      // IndexedDB non disponible
    }
  }, [])

  // Sauvegarder localement
  const sauvegarderLocal = useCallback(
    async (objet: any) => {
      try {
        const db = await getDB()
        const tx = db.transaction(
          STORE_NAME, 'readwrite'
        )
        const store = tx.objectStore(STORE_NAME)
        store.add({
          ...objet,
          timestamp: new Date().toISOString(),
          synced: false,
        })
        await compterEnAttente()
        return true
      } catch {
        return false
      }
    },
    [compterEnAttente]
  )

  // Synchroniser avec le serveur
  const synchroniser = useCallback(async () => {
    if (isSyncing || !navigator.onLine) return
    setIsSyncing(true)

    try {
      const db = await getDB()
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)

      const objets: any[] = await new Promise(
        (resolve) => {
          const req = store.getAll()
          req.onsuccess = () => resolve(req.result)
        }
      )

      let syncOk = 0
      for (const objet of objets) {
        try {
          const endpoint = getEndpoint(objet.type)
          await api.post(endpoint, objet)

          // Supprimer si succès
          const delDb = await getDB()
          const delTx = delDb.transaction(
            STORE_NAME, 'readwrite'
          )
          delTx.objectStore(STORE_NAME).delete(objet.id)
          syncOk++
        } catch {
          // Garder pour retry
        }
      }

      if (syncOk > 0) {
        console.log(`✅ ${syncOk} objets synchronisés`)
      }
      await compterEnAttente()
    } finally {
      setIsSyncing(false)
    }
  }, [isSyncing, compterEnAttente])

  return {
    sauvegarderLocal,
    synchroniser,
    syncCount,
    isSyncing,
    isOnline,
  }
}
