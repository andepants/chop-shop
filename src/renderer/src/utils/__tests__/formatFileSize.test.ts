/**
 * Format File Size Utility Tests
 * Tests for byte-to-human-readable file size conversion
 */

import { describe, it, expect } from 'vitest'
import { formatFileSize } from '../formatFileSize.util'

describe('formatFileSize', () => {
  it('formats 0 bytes (AC: #6)', () => {
    expect(formatFileSize(0)).toBe('0 B')
  })

  it('formats bytes correctly (AC: #6)', () => {
    expect(formatFileSize(500)).toBe('500.0 B')
  })

  it('formats kilobytes correctly (AC: #6)', () => {
    expect(formatFileSize(1024)).toBe('1.0 KB')
    expect(formatFileSize(1536)).toBe('1.5 KB')
    expect(formatFileSize(2048)).toBe('2.0 KB')
  })

  it('formats megabytes correctly (AC: #6)', () => {
    expect(formatFileSize(1048576)).toBe('1.0 MB') // 1024 * 1024
    expect(formatFileSize(45234567)).toBe('43.1 MB')
    expect(formatFileSize(104857600)).toBe('100.0 MB')
  })

  it('formats gigabytes correctly (AC: #6)', () => {
    expect(formatFileSize(1073741824)).toBe('1.0 GB') // 1024^3
    expect(formatFileSize(5368709120)).toBe('5.0 GB')
  })

  it('rounds to 1 decimal place (AC: #6)', () => {
    expect(formatFileSize(1536)).toBe('1.5 KB')
    expect(formatFileSize(1638)).toBe('1.6 KB')
    expect(formatFileSize(1740)).toBe('1.7 KB')
  })

  it('handles large file sizes (AC: #6)', () => {
    const largeSize = 10737418240 // 10 GB
    expect(formatFileSize(largeSize)).toBe('10.0 GB')
  })
})
