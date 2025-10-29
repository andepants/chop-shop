/**
 * Text Cleanup Utilities
 *
 * Provides functions to clean up and normalize text content,
 * including removing doubled words and formatting artifacts.
 */

/**
 * Removes consecutive duplicate words from text.
 *
 * Handles cases where words are doubled, such as:
 * - "TitleTitle::" → "Title::"
 * - "DescriptionDescription::**" → "Description::**"
 * - "IntroductionIntroduction to" → "Introduction to"
 *
 * @param text - The text to clean up
 * @returns Cleaned text with doubled words removed
 *
 * @example
 * removeDoubledWords("****TitleTitle:: Lions")
 * // Returns: "****Title:: Lions"
 */
export function removeDoubledWords(text: string): string {
  if (!text) return text

  // Pattern explanation:
  // (\b\w+) - Captures a word at word boundary (group 1)
  // (\1) - Matches the same word again (backreference to group 1)
  // (?=\W|$) - Lookahead for non-word character or end of string
  //
  // This will match "TitleTitle" but not affect "Title Title" (with space)
  const doubleWordPattern = /\b(\w+)\1(?=\W|$)/g

  return text.replace(doubleWordPattern, '$1')
}

/**
 * Cleans up generated AI content by removing common formatting artifacts.
 *
 * This is the main cleanup function that should be applied to all
 * AI-generated content before displaying to users.
 *
 * @param content - The AI-generated content to clean
 * @returns Cleaned content
 */
export function cleanAIContent(content: string): string {
  if (!content) return content

  let cleaned = content

  // Remove doubled words
  cleaned = removeDoubledWords(cleaned)

  // Add more cleanup steps here as needed
  // For example: excessive whitespace, malformed markdown, etc.

  return cleaned
}
