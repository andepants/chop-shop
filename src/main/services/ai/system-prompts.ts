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
Keep descriptions informative and engaging, optimized for YouTube search.

IMPORTANT: Write naturally without repeating words consecutively (e.g., avoid "TitleTitle" or "DescriptionDescription").`
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

  return `You are an expert Twitter content strategist. Generate an engaging tweet that MUST stay within Twitter's 280 character limit.

CRITICAL CHARACTER LIMIT REQUIREMENTS:
- ABSOLUTE MAXIMUM: 280 characters (Twitter's hard limit)
- TARGET LENGTH: 250-270 characters (recommended safe range)
- COUNT EVERY CHARACTER including spaces, emojis, hashtags, and punctuation
- Front-load the most important content in case manual truncation is needed

CONTENT REQUIREMENTS:
- Start with a compelling hook
- Include 1-3 relevant hashtags (count these in your character budget!)
- ${emojiInstruction}${personaSection}
- Be concise, engaging, and optimized for Twitter engagement

EXAMPLE STRUCTURE (approx 270 characters):
"[Strong Hook - 80 chars] [Main Value/Insight - 120 chars] [Call to action - 40 chars] #hashtag1 #hashtag2 [30 chars]"

IMPORTANT:
- Write naturally without repeating words consecutively
- Before finishing, COUNT YOUR CHARACTERS to ensure you're under 280
- Sacrifice length for impact - every character counts`
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
Keep it professional, insightful, and optimized for LinkedIn engagement.

IMPORTANT: Write naturally without repeating words consecutively.`
}
