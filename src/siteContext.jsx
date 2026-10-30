import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { apiGet } from './lib/api.js'
import { adapt } from './lib/adapt.js'

const EMPTY = adapt({})
const Ctx = createContext({ status: 'loading', data: EMPTY, nav: [], pages: null, error: '', retry() {} })
export const useSite = () => useContext(Ctx)
export const useData = () => useContext(Ctx).data
export const useNavTree = () => useContext(Ctx).nav

// Loads everything the public website shows from the API. Re-checks every minute and when the tab becomes visible again,
// so content the admin changes appears without a redeploy. The screen only re-renders when something actually changed.
export function SiteProvider({ children }) {
  const [s, setS] = useState({ status: 'loading', data: EMPTY, nav: [], pages: null, error: '' })
  const last = useRef('')
  const load = useCallback(async (silent) => {
    try {
      const raw = await apiGet('/public/site'), str = JSON.stringify(raw)
      if (str === last.current) return setS((x) => (x.status === 'ready' ? x : { ...x, status: 'ready' }))
      last.current = str
      setS({ status: 'ready', data: adapt(raw), nav: raw.nav || [], pages: raw.pages || [], error: '' })
    } catch (e) { if (!silent) setS((x) => ({ ...x, status: 'error', error: e.message })) }
  }, [])
  useEffect(() => {
    load(false)
    const t = setInterval(() => load(true), 60000), vis = () => document.visibilityState === 'visible' && load(true)
    document.addEventListener('visibilitychange', vis)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', vis) }
  }, [load])
  const value = useMemo(() => ({ ...s, retry: () => { setS((x) => ({ ...x, status: 'loading' })); load(false) } }), [s, load])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
