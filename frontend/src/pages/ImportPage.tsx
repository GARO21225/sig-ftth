import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function ImportPage() {
  const navigate = useNavigate()
  useEffect(() => { navigate('/import-dwg', { replace: true }) }, [])
  return null
}
