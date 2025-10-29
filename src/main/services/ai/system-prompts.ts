/**
 * System Prompts for Content Generation
 *
 * Platform-specific prompt builders for GPT-4o-mini content generation.
 * Each builder injects persona styles and emoji settings into system messages.
 */

/**
 * Build YouTube system prompt with SEO optimization
 *
 * @param includeEmojis - Whether to allow emojis in the content
 * @param personaPrompt - Style instructions from selected personas (empty string if none)
 * @returns Formatted system prompt for YouTube content generation
 *
 * YouTube specs:
 * - SEO-optimized descriptions with hooks
 * - Clear section headers
 * - Relevant keywords naturally integrated
 * - Value-focused and engaging
 */
export function buildYouTubePrompt(includeEmojis: boolean, personaPrompt: string): string {
  const emojiInstruction = includeEmojis
    ? 'Can include emojis to enhance engagement'
    : 'Does NOT include emojis'

  const personaSection = personaPrompt ? `\n${personaPrompt}\n` : ''

  return `You are an expert YouTube content strategist. Generate an SEO-optimized video description that:
- Starts with a compelling hook (first 2-3 lines)
- Includes relevant keywords naturally
- Provides value and context
- Uses clear section headers
- ${emojiInstruction}${personaSection}
Keep descriptions informative and engaging, optimized for YouTube search.`
}

/**
 * Build Twitter system prompt with character limits
 *
 * @param includeEmojis - Whether to allow emojis in the content
 * @param personaPrompt - Style instructions from selected personas (empty string if none)
 * @returns Formatted system prompt for Twitter content generation
 *
 * Twitter specs:
 * - STRICT 280 character maximum
 * - Strong hook at the start
 * - 1-3 relevant hashtags
 * - Engaging and concise
 */
export function buildTwitterPrompt(includeEmojis: boolean, personaPrompt: string): string {
  const emojiInstruction = includeEmojis
    ? 'Can include emojis to increase engagement'
    : 'Does NOT include emojis'

  const personaSection = personaPrompt ? `\n${personaPrompt}\n` : ''

  return `You are an expert Twitter content strategist. Generate an engaging tweet that:
- MAXIMUM 280 characters (strict limit)
- Starts with a strong hook
- Includes 1-3 relevant hashtags
- ${emojiInstruction}${personaSection}
Be concise, engaging, and optimized for Twitter engagement.`
}

/**
 * Build LinkedIn system prompt with professional tone
 *
 * @param includeEmojis - Whether to allow emojis in the content
 * @param personaPrompt - Style instructions from selected personas (empty string if none)
 * @returns Formatted system prompt for LinkedIn content generation
 *
 * LinkedIn specs:
 * - Professional and value-focused tone
 * - 1-3 paragraphs maximum
 * - Provides insights or takeaways
 * - Engages professional audience
 */
export function buildLinkedInPrompt(includeEmojis: boolean, personaPrompt: string): string {
  const emojiInstruction = includeEmojis
    ? 'Can include emojis sparingly for visual interest'
    : 'Does NOT include emojis'

  const personaSection = personaPrompt ? `\n${personaPrompt}\n` : ''

  return `You are an expert LinkedIn content strategist. Generate a professional post that:
- 1-3 paragraphs maximum
- Professional and value-focused tone
- Provides insights or takeaways
- Engages professional audience
- ${emojiInstruction}${personaSection}
Keep it professional, insightful, and optimized for LinkedIn engagement.`
}
