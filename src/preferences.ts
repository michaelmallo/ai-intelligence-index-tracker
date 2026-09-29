import type { VendorOrder } from './model-data'

export const STORAGE_KEYS = {
  THEME: 'theme',
  VENDOR_ORDER: 'vendorOrder',
  ALL_VENDORS_SELECTED: 'allVendorsSelected',
  SELECTED_VENDORS: 'selectedVendors',
} as const

export const VALID_VENDOR_ORDERS: readonly VendorOrder[] = [
  'A-Z',
  'Z-A',
  'Current Best Index (decreasing)',
  'Current Best Index (increasing)',
]

export function loadThemePreference(storage?: Storage): boolean {
  try {
    const store = storage ?? (typeof localStorage !== 'undefined' ? localStorage : undefined)
    if (!store) return false
    const saved = store.getItem(STORAGE_KEYS.THEME)
    if (saved !== null) {
      return saved === 'dark'
    }
    // Fallback to sessionStorage if transitioning
    if (typeof sessionStorage !== 'undefined') {
      const sessionSaved = sessionStorage.getItem(STORAGE_KEYS.THEME)
      if (sessionSaved !== null) {
        return sessionSaved === 'dark'
      }
    }
  } catch {
    // Ignore storage access errors
  }
  return false
}

export function saveThemePreference(darkMode: boolean, storage?: Storage): void {
  try {
    const store = storage ?? (typeof localStorage !== 'undefined' ? localStorage : undefined)
    store?.setItem(STORAGE_KEYS.THEME, darkMode ? 'dark' : 'light')
  } catch {
    // Ignore storage access errors
  }
}

export function loadVendorOrderPreference(storage?: Storage): VendorOrder {
  try {
    const store = storage ?? (typeof localStorage !== 'undefined' ? localStorage : undefined)
    if (!store) return 'A-Z'
    const saved = store.getItem(STORAGE_KEYS.VENDOR_ORDER)
    if (saved && (VALID_VENDOR_ORDERS as readonly string[]).includes(saved)) {
      return saved as VendorOrder
    }
  } catch {
    // Ignore storage access errors
  }
  return 'A-Z'
}

export function saveVendorOrderPreference(order: VendorOrder, storage?: Storage): void {
  try {
    const store = storage ?? (typeof localStorage !== 'undefined' ? localStorage : undefined)
    store?.setItem(STORAGE_KEYS.VENDOR_ORDER, order)
  } catch {
    // Ignore storage access errors
  }
}

export type SelectedVendorsPreference = {
  allSelected: boolean
  selectedVendors: string[]
}

export function loadSelectedVendorsPreference(storage?: Storage): SelectedVendorsPreference {
  try {
    const store = storage ?? (typeof localStorage !== 'undefined' ? localStorage : undefined)
    if (!store) {
      return { allSelected: true, selectedVendors: [] }
    }
    const allSaved = store.getItem(STORAGE_KEYS.ALL_VENDORS_SELECTED)
    const listSaved = store.getItem(STORAGE_KEYS.SELECTED_VENDORS)

    // Default to all selected if not set
    if (allSaved === null && listSaved === null) {
      return { allSelected: true, selectedVendors: [] }
    }

    const allSelected = allSaved !== 'false'
    let selectedVendors: string[] = []

    if (listSaved) {
      try {
        const parsed = JSON.parse(listSaved)
        if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')) {
          selectedVendors = parsed
        }
      } catch {
        // Corrupted JSON; keep selectedVendors as empty array
      }
    }

    return { allSelected, selectedVendors }
  } catch {
    return { allSelected: true, selectedVendors: [] }
  }
}

export function saveSelectedVendorsPreference(
  allSelected: boolean,
  selectedVendors: string[],
  storage?: Storage,
): void {
  try {
    const store = storage ?? (typeof localStorage !== 'undefined' ? localStorage : undefined)
    store?.setItem(STORAGE_KEYS.ALL_VENDORS_SELECTED, String(allSelected))
    store?.setItem(STORAGE_KEYS.SELECTED_VENDORS, JSON.stringify(selectedVendors))
  } catch {
    // Ignore storage access errors
  }
}
