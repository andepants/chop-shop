/**
 * Tests for timeline utilities (gap detection and black screen generation)
 */

import { describe, it, expect } from 'vitest'
import { detectGaps, generateBlackSegmentFilter } from '../timeline.utils'
import type { Clip } from '../../../renderer/src/components/Timeline/timeline.types'

describe('detectGaps', () => {
  it('should return empty array for empty clips', () => {
    const result = detectGaps([])
    expect(result).toEqual([])
  })

  it('should return empty array for single clip', () => {
    const clips: Clip[] = [
      {
        id: '1',
        sourceFile: '/test.mp4',
        intermediatePath: '/test-int.mp4',
        startTime: 0,
        duration: 10,
        trimIn: 0,
        trimOut: 0,
        trackId: 1
      }
    ]
    const result = detectGaps(clips)
    expect(result).toEqual([])
  })

  it('should detect single gap between two clips', () => {
    const clips: Clip[] = [
      {
        id: '1',
        sourceFile: '/test1.mp4',
        intermediatePath: '/test1-int.mp4',
        startTime: 0,
        duration: 5,
        trimIn: 0,
        trimOut: 0,
        trackId: 1
      },
      {
        id: '2',
        sourceFile: '/test2.mp4',
        intermediatePath: '/test2-int.mp4',
        startTime: 10,
        duration: 5,
        trimIn: 0,
        trimOut: 0,
        trackId: 1
      }
    ]
    const result = detectGaps(clips)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      startTime: 5,
      duration: 5,
      position: 1
    })
  })

  it('should detect multiple gaps', () => {
    const clips: Clip[] = [
      { id: '1', sourceFile: '/1.mp4', intermediatePath: '/1.mp4', startTime: 0, duration: 3, trimIn: 0, trimOut: 0, trackId: 1 },
      { id: '2', sourceFile: '/2.mp4', intermediatePath: '/2.mp4', startTime: 5, duration: 2, trimIn: 0, trimOut: 0, trackId: 1 },
      { id: '3', sourceFile: '/3.mp4', intermediatePath: '/3.mp4', startTime: 10, duration: 4, trimIn: 0, trimOut: 0, trackId: 1 }
    ]
    const result = detectGaps(clips)
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ startTime: 3, duration: 2, position: 1 })
    expect(result[1]).toMatchObject({ startTime: 7, duration: 3, position: 2 })
  })

  it('should return empty array for continuous clips (no gaps)', () => {
    const clips: Clip[] = [
      { id: '1', sourceFile: '/1.mp4', intermediatePath: '/1.mp4', startTime: 0, duration: 5, trimIn: 0, trimOut: 0, trackId: 1 },
      { id: '2', sourceFile: '/2.mp4', intermediatePath: '/2.mp4', startTime: 5, duration: 5, trimIn: 0, trimOut: 0, trackId: 1 },
      { id: '3', sourceFile: '/3.mp4', intermediatePath: '/3.mp4', startTime: 10, duration: 5, trimIn: 0, trimOut: 0, trackId: 1 }
    ]
    const result = detectGaps(clips)
    expect(result).toEqual([])
  })

  it('should handle trimmed clips correctly', () => {
    const clips: Clip[] = [
      {
        id: '1',
        sourceFile: '/1.mp4',
        intermediatePath: '/1.mp4',
        startTime: 0,
        duration: 10,
        trimIn: 0,
        trimOut: 5, // Effective duration: 5s
        trackId: 1
      },
      {
        id: '2',
        sourceFile: '/2.mp4',
        intermediatePath: '/2.mp4',
        startTime: 10,
        duration: 10,
        trimIn: 0,
        trimOut: 3, // Effective duration: 7s
        trackId: 1
      }
    ]
    const result = detectGaps(clips)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      startTime: 5, // End of first clip (0 + 10 - 5)
      duration: 5, // Gap from 5s to 10s
      position: 1
    })
  })
})

describe('generateBlackSegmentFilter', () => {
  it('should generate correct FFmpeg filters for black screen and silent audio', () => {
    const result = generateBlackSegmentFilter(0, 5.0, 1920, 1080)

    expect(result.video).toBe('color=black:s=1920x1080:d=5:r=30[gap0v]')
    expect(result.audio).toBe('anullsrc=channel_layout=stereo:sample_rate=48000:duration=5[gap0a]')
  })

  it('should use unique labels for different gap indices', () => {
    const gap0 = generateBlackSegmentFilter(0, 3.0, 1280, 720)
    const gap1 = generateBlackSegmentFilter(1, 2.0, 1280, 720)

    expect(gap0.video).toContain('[gap0v]')
    expect(gap0.audio).toContain('[gap0a]')
    expect(gap1.video).toContain('[gap1v]')
    expect(gap1.audio).toContain('[gap1a]')
  })

  it('should handle different resolutions correctly', () => {
    const result720p = generateBlackSegmentFilter(0, 1.0, 1280, 720)
    const result1080p = generateBlackSegmentFilter(0, 1.0, 1920, 1080)

    expect(result720p.video).toContain('s=1280x720')
    expect(result1080p.video).toContain('s=1920x1080')
  })
})
