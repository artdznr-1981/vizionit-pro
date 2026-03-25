/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface StagingConfig {
  intensity: number;
  temp: string;
  style: string;
  customDetail: string;
  room: string;
  productName?: string;
  productStyle?: string;
  fixtureType?: string;  // from image analysis: "wall mount" | "pendant" | "chandelier" | "flush mount" | "semi-flush"
}

export interface ProductSpecs {
  name: string;
  fixtureType: string;
  style: string;
  dimensions: string;
  bulbs: string;
  hangingHeight: string;
  location: string;
  finishColor: string;
  shade: string;
}

export async function analyzeProductImage(base64Image: string): Promise<ProductSpecs> {
  console.log("[VizionIt] analyzeProductImage called via backend proxy");

  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64Image }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }));
    console.error("[VizionIt] Analysis failed:", err);
    throw new Error(err.error || `HTTP ${response.status}`);
  }

  const result = await response.json();
  console.log("[VizionIt] Analysis success:", result.name);
  return result;
}

export async function generateStagedImage(
  base64Image: string,
  config: StagingConfig,
): Promise<{ imageUrl: string; description: string }> {
  console.log("[VizionIt] generateStagedImage called for room:", config.room);

  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64Image, config }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }));
    console.error("[VizionIt] Generation failed:", err);
    throw new Error(err.error || `HTTP ${response.status}`);
  }

  const result = await response.json();

  // Validate that an actual image came back — AI can return HTTP 200 with no image
  if (!result.imageUrl) {
    console.error("[VizionIt] Generation returned no image for:", config.room);
    throw new Error("No image was generated. The AI may be busy — please try again.");
  }

  console.log("[VizionIt] Generation success for:", config.room);
  return result;
}
