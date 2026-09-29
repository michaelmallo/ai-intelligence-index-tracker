import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  loadSelectedVendorsPreference,
  loadThemePreference,
  loadVendorOrderPreference,
  saveSelectedVendorsPreference,
  saveThemePreference,
  saveVendorOrderPreference,
  STORAGE_KEYS,
  VALID_VENDOR_ORDERS,
} from './preferences'

class MockStorage implements Storage {
  private store = new Map<string, string>()

  get length(): number {
    return this.store.size
  }

  clear(): void {
    this.store.clear()
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null
  }

  removeItem(key: string): void {
    this.store.delete(key)
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value))
  }
}

describe('preferences module', () => {
  let mockStorage: MockStorage

  beforeEach(() => {
    mockStorage = new MockStorage()
  })

  describe('theme preference', () => {
    it('defaults to false (light mode) when storage is empty', () => {
      expect(loadThemePreference(mockStorage)).toBe(false)
    })

    it('loads true when dark mode is stored', () => {
      mockStorage.setItem(STORAGE_KEYS.THEME, 'dark')
      expect(loadThemePreference(mockStorage)).toBe(true)
    })

    it('loads false when light mode is stored', () => {
      mockStorage.setItem(STORAGE_KEYS.THEME, 'light')
      expect(loadThemePreference(mockStorage)).toBe(false)
    })

    it('saves dark theme correctly', () => {
      saveThemePreference(true, mockStorage)
      expect(mockStorage.getItem(STORAGE_KEYS.THEME)).toBe('dark')
    })

    it('saves light theme correctly', () => {
      saveThemePreference(false, mockStorage)
      expect(mockStorage.getItem(STORAGE_KEYS.THEME)).toBe('light')
    })

    it('handles throwing storage gracefully', () => {
      const brokenStorage = {
        getItem: vi.fn(() => { throw new Error('SecurityError') }),
        setItem: vi.fn(() => { throw new Error('QuotaExceededError') }),
      } as unknown as Storage

      expect(loadThemePreference(brokenStorage)).toBe(false)
      expect(() => saveThemePreference(true, brokenStorage)).not.toThrow()
    })
  })

  describe('vendor order preference', () => {
    it('defaults to A-Z when storage is empty', () => {
      expect(loadVendorOrderPreference(mockStorage)).toBe('A-Z')
    })

    it('saves and loads each valid vendor order', () => {
      for (const order of VALID_VENDOR_ORDERS) {
        saveVendorOrderPreference(order, mockStorage)
        expect(loadVendorOrderPreference(mockStorage)).toBe(order)
      }
    })

    it('falls back to A-Z if stored order is invalid', () => {
      mockStorage.setItem(STORAGE_KEYS.VENDOR_ORDER, 'invalid-order')
      expect(loadVendorOrderPreference(mockStorage)).toBe('A-Z')
    })

    it('handles throwing storage gracefully', () => {
      const brokenStorage = {
        getItem: vi.fn(() => { throw new Error('Blocked') }),
        setItem: vi.fn(() => { throw new Error('Blocked') }),
      } as unknown as Storage

      expect(loadVendorOrderPreference(brokenStorage)).toBe('A-Z')
      expect(() => saveVendorOrderPreference('Z-A', brokenStorage)).not.toThrow()
    })
  })

  describe('selected vendors preference', () => {
    it('defaults to allSelected: true when storage is empty', () => {
      const prefs = loadSelectedVendorsPreference(mockStorage)
      expect(prefs.allSelected).toBe(true)
      expect(prefs.selectedVendors).toEqual([])
    })

    it('saves and loads allSelected: true with empty vendor list', () => {
      saveSelectedVendorsPreference(true, [], mockStorage)
      expect(mockStorage.getItem(STORAGE_KEYS.ALL_VENDORS_SELECTED)).toBe('true')
      expect(mockStorage.getItem(STORAGE_KEYS.SELECTED_VENDORS)).toBe('[]')

      const loaded = loadSelectedVendorsPreference(mockStorage)
      expect(loaded.allSelected).toBe(true)
      expect(loaded.selectedVendors).toEqual([])
    })

    it('saves and loads custom subset of selected vendors', () => {
      const vendors = ['Anthropic', 'OpenAI']
      saveSelectedVendorsPreference(false, vendors, mockStorage)
      expect(mockStorage.getItem(STORAGE_KEYS.ALL_VENDORS_SELECTED)).toBe('false')
      expect(mockStorage.getItem(STORAGE_KEYS.SELECTED_VENDORS)).toBe(JSON.stringify(vendors))

      const loaded = loadSelectedVendorsPreference(mockStorage)
      expect(loaded.allSelected).toBe(false)
      expect(loaded.selectedVendors).toEqual(vendors)
    })

    it('handles corrupted JSON gracefully by returning empty array', () => {
      mockStorage.setItem(STORAGE_KEYS.ALL_VENDORS_SELECTED, 'false')
      mockStorage.setItem(STORAGE_KEYS.SELECTED_VENDORS, '{bad-json}')

      const loaded = loadSelectedVendorsPreference(mockStorage)
      expect(loaded.allSelected).toBe(false)
      expect(loaded.selectedVendors).toEqual([])
    })

    it('handles non-string array JSON gracefully', () => {
      mockStorage.setItem(STORAGE_KEYS.ALL_VENDORS_SELECTED, 'false')
      mockStorage.setItem(STORAGE_KEYS.SELECTED_VENDORS, '[1, 2, 3]')

      const loaded = loadSelectedVendorsPreference(mockStorage)
      expect(loaded.allSelected).toBe(false)
      expect(loaded.selectedVendors).toEqual([])
    })

    it('handles throwing storage gracefully', () => {
      const brokenStorage = {
        getItem: vi.fn(() => { throw new Error('Blocked') }),
        setItem: vi.fn(() => { throw new Error('Blocked') }),
      } as unknown as Storage

      expect(loadSelectedVendorsPreference(brokenStorage)).toEqual({ allSelected: true, selectedVendors: [] })
      expect(() => saveSelectedVendorsPreference(false, ['OpenAI'], brokenStorage)).not.toThrow()
    })
  })

  describe('end-to-end user preference lifecycle', () => {
    it('persists changes across multiple sessions and dynamically includes new vendors when allSelected is true', () => {
      // Session 1: First-time user opens the page with default preferences
      expect(loadThemePreference(mockStorage)).toBe(false)
      expect(loadVendorOrderPreference(mockStorage)).toBe('A-Z')
      const initialVendors = loadSelectedVendorsPreference(mockStorage)
      expect(initialVendors.allSelected).toBe(true)

      // User customizes preferences: switches to dark mode, changes sort order, selects specific vendors
      saveThemePreference(true, mockStorage)
      saveVendorOrderPreference('Current Best Index (decreasing)', mockStorage)
      saveSelectedVendorsPreference(false, ['Google', 'OpenAI'], mockStorage)

      // Session 2: User revisits the site
      expect(loadThemePreference(mockStorage)).toBe(true)
      expect(loadVendorOrderPreference(mockStorage)).toBe('Current Best Index (decreasing)')
      const session2Vendors = loadSelectedVendorsPreference(mockStorage)
      expect(session2Vendors.allSelected).toBe(false)
      expect(session2Vendors.selectedVendors).toEqual(['Google', 'OpenAI'])

      // User re-selects "All" vendors
      saveSelectedVendorsPreference(true, [], mockStorage)

      // Session 3: User revisits the site after data has updated with new vendors
      const session3Vendors = loadSelectedVendorsPreference(mockStorage)
      expect(session3Vendors.allSelected).toBe(true)
      // Because allSelected is true, any dataset containing new vendors (e.g. ['Anthropic', 'Google', 'Meta', 'NewVendor', 'OpenAI'])
      // will dynamically include all vendors without requiring manual intervention
    })
  })
})

