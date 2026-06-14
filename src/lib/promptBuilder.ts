import type { CharacterConfig } from "@/components/CharacterForm";

/**
 * Builds an AI prompt string from character customization inputs.
 * Falls back to sensible defaults if any field is empty.
 */
export function buildStoryPrompt(config: CharacterConfig): string {
  const heroName = config.heroName || "Alex";
  const villainName = config.villainName || "Shadow";
  const setting = config.setting || "a mysterious forest";
  const mood = config.mood || "adventurous";

  return `Write a ${mood} story set in ${setting}. The hero is named ${heroName} and the villain is named ${villainName}. Make the story engaging, vivid, and around 200 words.`;
}