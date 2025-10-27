/**
 * Format Time Utility Tests
 * Tests for seconds-to-time-string conversion
 */

import { describe, it, expect } from 'vitest'
import { formatTime } from '../formatTime.util'

describe('formatTime', () => {
  it('formats 0 seconds (AC: #1)', () => {
    expect(formatTime(0)).toBe('00:00')
  })

  it('handles negative values gracefully (AC: #1)', () => {
    expect(formatTime(-10)).toBe('00:00')
  })

  it('formats seconds only (AC: #1)', () => {
    expect(formatTime(45)).toBe('00:45')
    expect(formatTime(9)).toBe('00:09')
  })

  it('formats minutes and seconds (AC: #1)', () => {
    expect(formatTime(60)).toBe('01:00')
    expect(formatTime(125)).toBe('02:05')
    expect(formatTime(599)).toBe('09:59')
  })

  it('formats hours, minutes, and seconds for durations >= 1 hour (AC: #1)', () => {
    expect(formatTime(3600)).toBe('1:00:00')
    expect(formatTime(3661)).toBe('1:01:01')
    expect(formatTime(7384)).toBe('2:03:04')
  })

  it('pads minutes and seconds with leading zeros (AC: #1)', () => {
    expect(formatTime(305)).toBe('05:05')
    expect(formatTime(3665)).toBe('1:01:05')
  })

  it('handles typical video durations (AC: #1)', () => {
    expect(formatTime(120)).toBe('02:00') // 2 minutes
    expect(formatTime(180.5)).toBe('03:00') // 3 minutes (floors decimals)
    expect(formatTime(600)).toBe('10:00') // 10 minutes
    expect(formatTime(3599)).toBe('59:59') // just under 1 hour
  })
})
