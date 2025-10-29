/**
 * Persona Prompt Builder
 *
 * Blends selected voice personas into unified style instructions for system prompts.
 * Handles single persona, multiple persona blending, and default (neutral) cases.
 */

import {
  VOICE_PERSONAS,
  type VoicePersona
} from '../../../shared/constants/personas.constants'

/**
 * Build persona style prompt from selected persona IDs
 *
 * @param personaIds - Array of persona IDs to blend
 * @returns Formatted prompt string for style blending (empty string if no personas)
 *
 * @example
 * // No personas (neutral tone)
 * buildPersonaPrompt([]) // ""
 *
 * @example
 * // Single persona
 * buildPersonaPrompt(['naval'])
 * // "Write in the style of Naval Ravikant: concise, philosophical, focused on first principles and timeless wisdom."
 *
 * @example
 * // Multiple personas (blended)
 * buildPersonaPrompt(['naval', 'garyvee', 'simon'])
 * // "Write in a style that combines Naval Ravikant's philosophical conciseness with Gary Vaynerchuk's energetic urgency and Simon Sinek's inspirational leadership."
 */
export function buildPersonaPrompt(personaIds: string[]): string {
  // No personas selected → neutral tone (empty string)
  if (!personaIds || personaIds.length === 0) {
    return ''
  }

  // Find all valid personas
  const personas: VoicePersona[] = personaIds
    .map((id) => VOICE_PERSONAS.find((p) => p.id === id))
    .filter((p): p is VoicePersona => p !== undefined)

  // No valid personas found
  if (personas.length === 0) {
    return ''
  }

  // Single persona
  if (personas.length === 1) {
    const persona = personas[0]
    return `Write in the style of ${persona.name}: ${persona.description}.`
  }

  // Multiple personas → blend styles
  return blendMultiplePersonas(personas)
}

/**
 * Blend multiple personas into unified style instruction
 * Extracts key traits from each persona and combines them
 *
 * @param personas - Array of VoicePersona objects to blend
 * @returns Blended style instruction
 */
function blendMultiplePersonas(personas: VoicePersona[]): string {
  // Extract key traits from descriptions
  const traits = personas.map((persona) => {
    const trait = extractKeyTrait(persona.description)
    return `${persona.name}'s ${trait}`
  })

  // Join traits with proper grammar
  let combinedTraits: string
  if (traits.length === 2) {
    combinedTraits = traits.join(' with ')
  } else {
    const lastTrait = traits[traits.length - 1]
    const otherTraits = traits.slice(0, -1).join(', ')
    combinedTraits = `${otherTraits}, and ${lastTrait}`
  }

  return `Write in a style that combines ${combinedTraits}.`
}

/**
 * Extract the most prominent trait from a persona description
 * Attempts to identify the first key characteristic mentioned
 *
 * @param description - Persona description string
 * @returns Key trait extracted from description
 */
function extractKeyTrait(description: string): string {
  // Take the first clause (before comma or "with")
  const firstClause = description.split(/,| with | and /)[0].trim()

  // If it's short enough, use as-is
  if (firstClause.length < 50) {
    return firstClause
  }

  // Fallback to full description if no clear trait
  return description
}
