/**
 * Build Configuration Validation Tests
 * Tests for validating build system configuration integrity
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { parse } from 'yaml'

const PROJECT_ROOT = join(__dirname, '../../..')

/**
 * Load and parse package.json
 */
function loadPackageJson(): Record<string, any> {
  const path = join(PROJECT_ROOT, 'package.json')
  const content = readFileSync(path, 'utf-8')
  return JSON.parse(content)
}

/**
 * Load and parse electron-builder.yml
 */
function loadElectronBuilderConfig(): Record<string, any> {
  const path = join(PROJECT_ROOT, 'electron-builder.yml')
  const content = readFileSync(path, 'utf-8')
  return parse(content)
}

describe('Build Configuration', () => {
  describe('package.json', () => {
    it('should have required build scripts', () => {
      const pkg = loadPackageJson()

      expect(pkg.scripts).toBeDefined()
      expect(pkg.scripts.build).toBeDefined()
      expect(pkg.scripts.package).toBeDefined()
      expect(pkg.scripts['build:mac']).toBeDefined()
    })

    it('should have correct project metadata', () => {
      const pkg = loadPackageJson()

      expect(pkg.name).toBe('chop-shop')
      expect(pkg.version).toBeDefined()
      expect(pkg.version).toMatch(/^\d+\.\d+\.\d+$/)
    })

    it('should have electron-builder as dev dependency', () => {
      const pkg = loadPackageJson()

      expect(pkg.devDependencies).toBeDefined()
      expect(pkg.devDependencies['electron-builder']).toBeDefined()
    })
  })

  describe('electron-builder.yml', () => {
    it('should exist and be parseable', () => {
      const path = join(PROJECT_ROOT, 'electron-builder.yml')
      expect(existsSync(path)).toBe(true)

      // Should not throw
      expect(() => loadElectronBuilderConfig()).not.toThrow()
    })

    it('should have correct app metadata', () => {
      const config = loadElectronBuilderConfig()

      expect(config.appId).toBe('com.chopshop.app')
      expect(config.productName).toBe('Chop Shop')
    })

    it('should have macOS DMG configuration', () => {
      const config = loadElectronBuilderConfig()

      expect(config.mac).toBeDefined()
      expect(config.dmg).toBeDefined()
      expect(config.dmg.artifactName).toContain('${name}')
      expect(config.dmg.artifactName).toContain('${version}')
    })

    it('should have build resources directory configured', () => {
      const config = loadElectronBuilderConfig()

      expect(config.directories).toBeDefined()
      expect(config.directories.buildResources).toBe('build')
    })
  })

  describe('Build Files', () => {
    it('should have app icon in build resources', () => {
      const iconPath = join(PROJECT_ROOT, 'build', 'icon.icns')
      expect(existsSync(iconPath)).toBe(true)
    })

    it('should have electron-vite config', () => {
      const configPath = join(PROJECT_ROOT, 'electron.vite.config.ts')
      expect(existsSync(configPath)).toBe(true)
    })

    it('should have entitlements plist for macOS', () => {
      const entitlementsPath = join(PROJECT_ROOT, 'build', 'entitlements.mac.plist')
      expect(existsSync(entitlementsPath)).toBe(true)
    })
  })

  describe('Build Output', () => {
    it('should have output directory after build', () => {
      const outPath = join(PROJECT_ROOT, 'out')
      expect(existsSync(outPath)).toBe(true)
    })

    it('should have all three build outputs', () => {
      const outPath = join(PROJECT_ROOT, 'out')

      expect(existsSync(join(outPath, 'main'))).toBe(true)
      expect(existsSync(join(outPath, 'preload'))).toBe(true)
      expect(existsSync(join(outPath, 'renderer'))).toBe(true)
    })

    it('should have built renderer assets', () => {
      const rendererPath = join(PROJECT_ROOT, 'out', 'renderer')

      expect(existsSync(join(rendererPath, 'index.html'))).toBe(true)
      expect(existsSync(join(rendererPath, 'assets'))).toBe(true)
    })
  })
})
