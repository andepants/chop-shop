/**
 * Persona Prompt Builder Tests
 *
 * Tests for persona blending logic in buildPersonaPrompt function.
 * Covers single persona, multiple persona blending, and edge cases.
 */

import { describe, it, expect } from 'vitest'
import { buildPersonaPrompt } from '../persona-prompt-builder'

describe('buildPersonaPrompt', () => {
  describe('No personas (neutral tone)', () => {
    it('should return empty string when no personas selected', () => {
      const result = buildPersonaPrompt([])
      expect(result).toBe('')
    })

    it('should return empty string when persona IDs array is empty', () => {
      const result = buildPersonaPrompt([])
      expect(result).toBe('')
    })

    it('should return empty string when invalid persona IDs provided', () => {
      const result = buildPersonaPrompt(['invalid', 'nonexistent'])
      expect(result).toBe('')
    })
  })

  describe('Single persona', () => {
    it('should format single persona correctly (Naval)', () => {
      const result = buildPersonaPrompt(['naval'])
      expect(result).toBe(
        'Write in the style of Naval Ravikant: Concise, philosophical, focused on first principles and timeless wisdom.'
      )
    })

    it('should format single persona correctly (Gary Vee)', () => {
      const result = buildPersonaPrompt(['garyvee'])
      expect(result).toBe(
        'Write in the style of Gary Vaynerchuk: Energetic, direct, motivational with urgency and hustle mentality.'
      )
    })

    it('should format single persona correctly (Simon Sinek)', () => {
      const result = buildPersonaPrompt(['simon'])
      expect(result).toBe(
        'Write in the style of Simon Sinek: Inspirational leadership focused on purpose and the "why" behind actions.'
      )
    })

    it('should handle single persona with some invalid IDs', () => {
      const result = buildPersonaPrompt(['invalid', 'naval', 'nonexistent'])
      expect(result).toBe(
        'Write in the style of Naval Ravikant: Concise, philosophical, focused on first principles and timeless wisdom.'
      )
    })
  })

  describe('Multiple personas (blended)', () => {
    it('should blend 2 personas correctly', () => {
      const result = buildPersonaPrompt(['naval', 'garyvee'])
      expect(result).toContain('Write in a style that combines')
      expect(result).toContain('Naval Ravikant')
      expect(result).toContain('Gary Vaynerchuk')
    })

    it('should blend 3 personas correctly', () => {
      const result = buildPersonaPrompt(['naval', 'garyvee', 'simon'])
      expect(result).toContain('Write in a style that combines')
      expect(result).toContain('Naval Ravikant')
      expect(result).toContain('Gary Vaynerchuk')
      expect(result).toContain('Simon Sinek')
      // Should use commas and "and" for 3+ personas
      expect(result).toMatch(/,.*and/)
    })

    it('should blend 4 personas correctly', () => {
      const result = buildPersonaPrompt(['naval', 'elon', 'casey', 'malcolm'])
      expect(result).toContain('Write in a style that combines')
      expect(result).toContain('Naval Ravikant')
      expect(result).toContain('Elon Musk')
      expect(result).toContain('Casey Neistat')
      expect(result).toContain('Malcolm Gladwell')
    })

    it('should blend 5 personas correctly (max limit)', () => {
      const result = buildPersonaPrompt(['naval', 'elon', 'garyvee', 'simon', 'malcolm'])
      expect(result).toContain('Write in a style that combines')
      expect(result).toContain('Naval Ravikant')
      expect(result).toContain('Elon Musk')
      expect(result).toContain('Gary Vaynerchuk')
      expect(result).toContain('Simon Sinek')
      expect(result).toContain('Malcolm Gladwell')
    })

    it('should extract key traits from personas', () => {
      const result = buildPersonaPrompt(['naval', 'garyvee'])
      // Should extract traits like "philosophical" or "energetic"
      expect(result.toLowerCase()).toMatch(/concise|philosophical|energetic|direct|motivational/)
    })
  })

  describe('Edge cases', () => {
    it('should handle all valid persona IDs', () => {
      const allIds = [
        'naval',
        'elon',
        'garyvee',
        'tim',
        'scott',
        'seth',
        'casey',
        'mkbhd',
        'simon',
        'brene',
        'adam',
        'malcolm'
      ]

      allIds.forEach((id) => {
        const result = buildPersonaPrompt([id])
        expect(result).toBeTruthy()
        expect(result).toContain('Write in the style of')
      })
    })

    it('should filter out invalid IDs in mixed array', () => {
      const result = buildPersonaPrompt(['invalid', 'naval', 'bad-id', 'garyvee'])
      expect(result).toContain('Naval Ravikant')
      expect(result).toContain('Gary Vaynerchuk')
      expect(result).not.toContain('invalid')
      expect(result).not.toContain('bad-id')
    })

    it('should produce valid prompt string (no undefined or null)', () => {
      const testCases = [
        [],
        ['naval'],
        ['naval', 'elon'],
        ['naval', 'elon', 'garyvee'],
        ['invalid']
      ]

      testCases.forEach((ids) => {
        const result = buildPersonaPrompt(ids)
        expect(typeof result).toBe('string')
        expect(result).not.toContain('undefined')
        expect(result).not.toContain('null')
      })
    })

    it('should return valid prompt for all category combinations', () => {
      // Test mixing personas from different categories
      const mixedCategories = ['naval', 'casey', 'simon'] // business, creative, professional
      const result = buildPersonaPrompt(mixedCategories)
      expect(result).toContain('Write in a style that combines')
      expect(result).toContain('Naval Ravikant')
      expect(result).toContain('Casey Neistat')
      expect(result).toContain('Simon Sinek')
    })
  })

  describe('Prompt format validation', () => {
    it('should end with period for single persona', () => {
      const result = buildPersonaPrompt(['naval'])
      expect(result).toMatch(/\.$/)
    })

    it('should end with period for multiple personas', () => {
      const result = buildPersonaPrompt(['naval', 'garyvee'])
      expect(result).toMatch(/\.$/)
    })

    it('should start with "Write in" for non-empty results', () => {
      const testCases = [['naval'], ['naval', 'elon'], ['simon', 'brene', 'adam']]

      testCases.forEach((ids) => {
        const result = buildPersonaPrompt(ids)
        expect(result).toMatch(/^Write in/)
      })
    })
  })
})
