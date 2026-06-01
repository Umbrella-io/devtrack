/**
 * Discord Webhook URL Validator
 *
 * Validates Discord webhook URLs before use to prevent SSRF attacks
 * and unexpected errors from malformed URLs.
 */

const DISCORD_WEBHOOK_PATTERN =
  /^https:\/\/discord\.com\/api\/webhooks\/\d+\/[\w-]+$/;

const DISCORD_PTB_WEBHOOK_PATTERN =
  /^https:\/\/ptb\.discord\.com\/api\/webhooks\/\d+\/[\w-]+$/;

const DISCORD_CANARY_WEBHOOK_PATTERN =
  /^https:\/\/canary\.discord\.com\/api\/webhooks\/\d+\/[\w-]+$/;

/**
 * Validate a Discord webhook URL.
 *
 * @param url - The webhook URL to validate
 * @returns {valid: boolean, error?: string}
 */
export function validateDiscordWebhookUrl(url: string): {
  valid: boolean;
  error?: string;
} {
  if (!url || typeof url !== "string") {
    return { valid: false, error: "Webhook URL is required" };
  }

  const trimmed = url.trim();

  const isValid =
    DISCORD_WEBHOOK_PATTERN.test(trimmed) ||
    DISCORD_PTB_WEBHOOK_PATTERN.test(trimmed) ||
    DISCORD_CANARY_WEBHOOK_PATTERN.test(trimmed);

  if (!isValid) {
    return {
      valid: false,
      error:
        "Invalid Discord webhook URL. Expected format: https://discord.com/api/webhooks/{id}/{token}",
    };
  }

  return { valid: true };
}

/**
 * Assert that a Discord webhook URL is valid.
 * Throws a TypeError if invalid.
 */
export function assertValidDiscordWebhook(url: string): void {
  const result = validateDiscordWebhookUrl(url);
  if (!result.valid) {
    throw new TypeError(`[DevTrack] ${result.error}`);
  }
}
