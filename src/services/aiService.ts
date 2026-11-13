/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { API_BASE_URL } from "../lib/apiConfig";
import {
  getAuthorizationHeaders,
  handleUnauthorizedResponse,
} from "../lib/authSession";

export interface InventoryInsightsParams {
  lowStockItems?: string[];
  recentSales?: string[];
}

export async function suggestBanglaReceiptName(
  internalName: string,
  signal?: AbortSignal,
): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/ai/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthorizationHeaders(),
    },
    body: JSON.stringify({
      prompt: `Suggest a concise Bengali receipt display name for this product. Preserve brand names, model numbers, and common technical terms when appropriate. Return only the suggested product name, with no quotes or explanation.\n\nProduct name: ${internalName}`,
      systemInstruction:
        "You create accurate, customer-friendly Bengali product names for retail receipts. Do not add product details that are not present in the input.",
    }),
    signal,
  });

  if (!response.ok) {
    handleUnauthorizedResponse(response.status);
    const errorResult = await response.json().catch(() => null);
    const message =
      typeof errorResult?.message === "string"
        ? errorResult.message
        : `AI name suggestion failed with HTTP ${response.status}`;
    throw new Error(message);
  }

  const result = await response.json();
  const suggestion =
    typeof result?.data?.text === "string" ? result.data.text.trim() : "";
  if (!suggestion) {
    throw new Error("AI returned an empty receipt name suggestion");
  }
  return suggestion;
}

/**
 * Fetches AI-generated inventory insights from the backend server.
 * The backend manages the Gemini API call securely using gemini-3.8-flash.
 */
export async function getInventoryInsights(params?: InventoryInsightsParams): Promise<string> {
  try {
    const response = await fetch(`${API_BASE_URL}/ai/insights`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthorizationHeaders(),
      },
      body: JSON.stringify(params || {}),
    });

    if (!response.ok) {
      handleUnauthorizedResponse(response.status);
      throw new Error(`Server returned HTTP ${response.status}`);
    }

    const result = await response.json();
    if (result?.data?.insights) {
      return result.data.insights;
    }
    return "Inventory levels and recent sales activity reviewed. Operational status nominal.";
  } catch (error) {
    console.error("AI Insight Error:", error);
    return "Unable to generate insights at this time. Please check your stock manually.";
  }
}

/**
 * Streams AI-generated inventory insights from the server via Server-Sent Events (SSE).
 */
export function streamInventoryInsights(
  onChunk: (chunkText: string) => void,
  onComplete?: () => void,
  onError?: (err: any) => void
): () => void {
  const controller = new AbortController();
  void (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/ai/insights/stream`, {
        headers: getAuthorizationHeaders(),
        signal: controller.signal,
      });
      if (!response.ok) {
        handleUnauthorizedResponse(response.status);
        throw new Error(`Server returned HTTP ${response.status}`);
      }
      if (!response.body) throw new Error("AI stream response is unavailable");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finished = false;
      while (!finished) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const messages = buffer.split(/\r?\n\r?\n/);
        buffer = messages.pop() || "";
        for (const message of messages) {
          const data = message
            .split(/\r?\n/)
            .filter((line) => line.startsWith("data:"))
            .map((line) => line.slice(5).trimStart())
            .join("\n");
          if (!data) continue;
          if (data === "[DONE]") {
            finished = true;
            onComplete?.();
            break;
          }
          try {
            const parsed = JSON.parse(data);
            if (parsed.text) onChunk(parsed.text);
          } catch {
            onChunk(data);
          }
        }
        if (done) finished = true;
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        console.error("AI Stream Error:", error);
        onError?.(error);
      }
    }
  })();

  return () => controller.abort();
}

