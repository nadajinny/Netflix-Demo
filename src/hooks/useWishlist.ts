import { useCallback, useEffect, useState } from 'react'

export type WishlistEntry = {
  id: number
  title: string
  poster_path: string | null
}

const STORAGE_KEY = 'movieWishlist'

const canUseStorage = () => typeof window !== 'undefined' && !!window.localStorage

const readWishlist = (): WishlistEntry[] => {
  if (!canUseStorage()) return []
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw) as WishlistEntry[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item) => typeof item?.id === 'number' && !!item?.title)
  } catch {
    return []
  }
}

export const useWishlist = () => {
  const [wishlist, setWishlist] = useState<WishlistEntry[]>(() => readWishlist())

  useEffect(() => {
    if (!canUseStorage()) return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(wishlist))
  }, [wishlist])

  useEffect(() => {
    if (!canUseStorage()) return undefined

    const syncFromStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        setWishlist(readWishlist())
      }
    }

    window.addEventListener('storage', syncFromStorage)
    return () => window.removeEventListener('storage', syncFromStorage)
  }, [])

  const isInWishlist = useCallback(
    (movieId: number) => wishlist.some((entry) => entry.id === movieId),
    [wishlist],
  )

  const toggleWishlist = useCallback((entry: WishlistEntry) => {
    setWishlist((current) => {
      const exists = current.some((item) => item.id === entry.id)
      if (exists) {
        return current.filter((item) => item.id !== entry.id)
      }
      return [entry, ...current]
    })
  }, [])

  return { wishlist, toggleWishlist, isInWishlist }
}

export default useWishlist
