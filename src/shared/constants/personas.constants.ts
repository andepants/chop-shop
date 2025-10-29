/**
 * Voice Personas Constants
 *
 * Defines voice personas for content generation style blending.
 * Each persona includes a description that influences the tone and style of generated posts.
 */

/**
 * Voice persona category types
 */
export type PersonaCategory = 'business' | 'creative' | 'professional'

/**
 * Voice persona interface
 */
export interface VoicePersona {
  id: string
  name: string
  category: PersonaCategory
  description: string
}

/**
 * All available voice personas (12+)
 * Organized by category: Business/Tech, Creative/Humor, Professional
 */
export const VOICE_PERSONAS: readonly VoicePersona[] = [
  // Business/Tech
  {
    id: 'naval',
    name: 'Naval Ravikant',
    category: 'business',
    description: 'Concise, philosophical, focused on first principles and timeless wisdom'
  },
  {
    id: 'elon',
    name: 'Elon Musk',
    category: 'business',
    description: 'Direct, visionary, ambitious with engineering-focused problem-solving'
  },
  {
    id: 'garyvee',
    name: 'Gary Vaynerchuk',
    category: 'business',
    description: 'Energetic, direct, motivational with urgency and hustle mentality'
  },
  {
    id: 'tim',
    name: 'Tim Ferriss',
    category: 'business',
    description: 'Analytical, experimental, focused on optimization and life-hacking'
  },

  // Creative/Humor
  {
    id: 'scott',
    name: 'Scott Adams',
    category: 'creative',
    description: 'Witty, satirical, focused on systems thinking and persuasion'
  },
  {
    id: 'seth',
    name: 'Seth Godin',
    category: 'creative',
    description: 'Thought-provoking, concise marketing wisdom with memorable metaphors'
  },
  {
    id: 'casey',
    name: 'Casey Neistat',
    category: 'creative',
    description: 'Authentic storytelling with visual creativity and raw honesty'
  },
  {
    id: 'mkbhd',
    name: 'MKBHD',
    category: 'creative',
    description: 'Clear, detailed tech analysis with balanced perspective and quality focus'
  },

  // Professional
  {
    id: 'simon',
    name: 'Simon Sinek',
    category: 'professional',
    description: 'Inspirational leadership focused on purpose and the "why" behind actions'
  },
  {
    id: 'brene',
    name: 'Brené Brown',
    category: 'professional',
    description: 'Vulnerable, empathetic, research-backed insights on human connection'
  },
  {
    id: 'adam',
    name: 'Adam Grant',
    category: 'professional',
    description: 'Evidence-based organizational psychology with practical workplace insights'
  },
  {
    id: 'malcolm',
    name: 'Malcolm Gladwell',
    category: 'professional',
    description: 'Analytical insights with compelling narratives and counterintuitive observations'
  }
] as const

/**
 * Get persona by ID
 * @param id - Persona ID to find
 * @returns VoicePersona or undefined if not found
 */
export function getPersonaById(id: string): VoicePersona | undefined {
  return VOICE_PERSONAS.find((p) => p.id === id)
}

/**
 * Get personas by category
 * @param category - Category to filter by
 * @returns Array of personas in the category
 */
export function getPersonasByCategory(category: PersonaCategory): VoicePersona[] {
  return VOICE_PERSONAS.filter((p) => p.category === category)
}

/**
 * Category display names
 */
export const CATEGORY_LABELS: Record<PersonaCategory, string> = {
  business: 'Business/Tech',
  creative: 'Creative/Humor',
  professional: 'Professional'
}
