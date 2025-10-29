/**
 * System Prompts Unit Tests
 *
 * Tests platform-specific prompt builders for GPT-4o-mini content generation.
 * Validates emoji inclusion/exclusion and persona prompt injection.
 */

import { describe, it, expect } from 'vitest'
import { buildYouTubePrompt, buildTwitterPrompt, buildLinkedInPrompt } from '../system-prompts'

describe('buildYouTubePrompt', () => {
  it('should include emoji instruction when includeEmojis is true', () => {
    const prompt = buildYouTubePrompt(true, '')
    expect(prompt).toContain('Can include emojis')
    expect(prompt).not.toContain('Does NOT include emojis')
  })

  it('should exclude emoji instruction when includeEmojis is false', () => {
    const prompt = buildYouTubePrompt(false, '')
    expect(prompt).toContain('Does NOT include emojis')
    expect(prompt).not.toContain('Can include emojis')
  })

  it('should inject persona prompt when provided', () => {
    const personaPrompt = 'Write in the style of Naval Ravikant: concise and philosophical.'
    const prompt = buildYouTubePrompt(false, personaPrompt)
    expect(prompt).toContain(personaPrompt)
  })

  it('should not add persona section when personaPrompt is empty', () => {
    const prompt = buildYouTubePrompt(false, '')
    // Should not have extra blank lines or sections
    expect(prompt).not.toMatch(/\n\n\n/)
  })

  it('should include YouTube-specific instructions', () => {
    const prompt = buildYouTubePrompt(false, '')
    expect(prompt).toContain('YouTube content strategist')
    expect(prompt).toContain('SEO-optimized')
    expect(prompt).toContain('compelling hook')
    expect(prompt).toContain('relevant keywords')
  })
})

describe('buildTwitterPrompt', () => {
  it('should include emoji instruction when includeEmojis is true', () => {
    const prompt = buildTwitterPrompt(true, '')
    expect(prompt).toContain('Can include emojis')
    expect(prompt).not.toContain('Does NOT include emojis')
  })

  it('should exclude emoji instruction when includeEmojis is false', () => {
    const prompt = buildTwitterPrompt(false, '')
    expect(prompt).toContain('Does NOT include emojis')
    expect(prompt).not.toContain('Can include emojis')
  })

  it('should inject persona prompt when provided', () => {
    const personaPrompt = 'Write in the style of Gary Vaynerchuk: energetic and urgent.'
    const prompt = buildTwitterPrompt(false, personaPrompt)
    expect(prompt).toContain(personaPrompt)
  })

  it('should not add persona section when personaPrompt is empty', () => {
    const prompt = buildTwitterPrompt(false, '')
    expect(prompt).not.toMatch(/\n\n\n/)
  })

  it('should include Twitter-specific instructions', () => {
    const prompt = buildTwitterPrompt(false, '')
    expect(prompt).toContain('Twitter content strategist')
    expect(prompt).toContain('280 characters')
    expect(prompt).toContain('strict limit')
    expect(prompt).toContain('strong hook')
    expect(prompt).toContain('hashtags')
  })
})

describe('buildLinkedInPrompt', () => {
  it('should include emoji instruction when includeEmojis is true', () => {
    const prompt = buildLinkedInPrompt(true, '')
    expect(prompt).toContain('Can include emojis')
    expect(prompt).not.toContain('Does NOT include emojis')
  })

  it('should exclude emoji instruction when includeEmojis is false', () => {
    const prompt = buildLinkedInPrompt(false, '')
    expect(prompt).toContain('Does NOT include emojis')
    expect(prompt).not.toContain('Can include emojis')
  })

  it('should inject persona prompt when provided', () => {
    const personaPrompt = 'Write in the style of Simon Sinek: inspirational and purposeful.'
    const prompt = buildLinkedInPrompt(false, personaPrompt)
    expect(prompt).toContain(personaPrompt)
  })

  it('should not add persona section when personaPrompt is empty', () => {
    const prompt = buildLinkedInPrompt(false, '')
    expect(prompt).not.toMatch(/\n\n\n/)
  })

  it('should include LinkedIn-specific instructions', () => {
    const prompt = buildLinkedInPrompt(false, '')
    expect(prompt).toContain('LinkedIn content strategist')
    expect(prompt).toContain('Professional')
    expect(prompt).toContain('value-focused')
    expect(prompt).toContain('1-3 paragraphs')
    expect(prompt).toContain('insights')
  })
})

describe('Cross-platform consistency', () => {
  it('should all include emoji instructions', () => {
    const youtubePrompt = buildYouTubePrompt(true, '')
    const twitterPrompt = buildTwitterPrompt(true, '')
    const linkedinPrompt = buildLinkedInPrompt(true, '')

    expect(youtubePrompt).toContain('emojis')
    expect(twitterPrompt).toContain('emojis')
    expect(linkedinPrompt).toContain('emojis')
  })

  it('should all inject persona prompts when provided', () => {
    const personaPrompt = 'Test persona style'
    const youtubePrompt = buildYouTubePrompt(false, personaPrompt)
    const twitterPrompt = buildTwitterPrompt(false, personaPrompt)
    const linkedinPrompt = buildLinkedInPrompt(false, personaPrompt)

    expect(youtubePrompt).toContain(personaPrompt)
    expect(twitterPrompt).toContain(personaPrompt)
    expect(linkedinPrompt).toContain(personaPrompt)
  })
})
