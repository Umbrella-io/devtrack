import { createHmac } from "crypto";
import { supabaseAdmin } from "./supabase";

export interface WebhookPayload {
  event: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface WebhookDeliveryResult {
  success: boolean;
  statusCode?: number;
  error?: string;
}

const WEBHOOK_EVENTS = [
  "goal.completed",
  "goal.created",
  "streak.milestone",
  "daily.summary",
  "weekly.summary",
  "metrics.updated",
] as const;

export type WebhookEvent = typeof WEBHOOK_EVENTS[number];

export function isValidWebhookEvent(event: string): event is WebhookEvent {
  return WEBHOOK_EVENTS.includes(event as WebhookEvent);
}

export function getAvailableEvents(): readonly string[] {
  return WEBHOOK_EVENTS;
}

export function generateSecretKey(): string {
  const { randomBytes } = require("crypto");
  return randomBytes(32).toString("hex");
}

export function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export async function dispatchWebhook(
  webhookId: string,
  event: string,
  data: Record<string, unknown>
): Promise<WebhookDeliveryResult> {
  const { data: webhook, error } = await supabaseAdmin
    .from("webhook_configs")
    .select("*")
    .eq("id", webhookId)
    .eq("is_enabled", true)
    .single();

  if (error || !webhook) {
    return { success: false, error: "Webhook not found or disabled" };
  }

  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  };

  const payloadString = JSON.stringify(payload);
  const signature = signPayload(payloadString, webhook.secret_key);

  let statusCode: number | undefined;
  let errorMessage: string | undefined;

  try {
    const response = await fetch(webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": `sha256=${signature}`,
        "X-Webhook-Event": event,
        "X-Webhook-Delivery-Id": webhookId,
      },
      body: payloadString,
      signal: AbortSignal.timeout(10000),
    });

    statusCode = response.status;
    const success = response.ok;

    await supabaseAdmin.from("webhook_deliveries").insert({
      webhook_id: webhookId,
      event,
      payload,
      status_code: statusCode,
      success,
      error_message: success ? null : `HTTP ${statusCode}`,
    });

    return { success, statusCode };
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : "Unknown error";

    await supabaseAdmin.from("webhook_deliveries").insert({
      webhook_id: webhookId,
      event,
      payload,
      success: false,
      error_message: errorMessage,
    });

    return { success: false, error: errorMessage };
  }
}

export async function dispatchToAllWebhooks(
  userId: string,
  event: string,
  data: Record<string, unknown>
): Promise<void> {
  const { data: webhooks } = await supabaseAdmin
    .from("webhook_configs")
    .select("id")
    .eq("user_id", userId)
    .eq("is_enabled", true)
    .contains("events", [event]);

  if (!webhooks) return;

  await Promise.all(
    webhooks.map((webhook) => dispatchWebhook(webhook.id, event, data))
  );
}
