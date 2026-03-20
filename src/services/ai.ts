

/**
 * AI calls must NOT send provider API keys from the browser.
 *
 * This module supports:
 * - **Proxy mode** (recommended): POST to your own backend at `VITE_AI_PROXY_URL`
 * - **Mock mode** (default): returns simulated responses (safe for frontend-only projects)
 */
const PROXY_URL = import.meta.env.VITE_AI_PROXY_URL || '';

interface QueuedRequest {
  prompt: string;
  systemPrompt: string;
  attachments: any[];
  resolve: (value: string) => void;
  reject: (reason?: any) => void;
}

const arcQueue: QueuedRequest[] = [];

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('Back online. Processing AI queue...');
    while (arcQueue.length > 0) {
      const req = arcQueue.shift();
      if (req) {
        askAnthropic(req.prompt, req.systemPrompt, req.attachments)
          .then(req.resolve)
          .catch(req.reject);
      }
    }
  });
}

export async function askAnthropic(
  prompt: string, 
  systemPrompt: string, 
  attachments: { name: string; type: string; content: string }[] = []
): Promise<string> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return new Promise((resolve, reject) => {
      console.warn("Offline. AI request queued.");
      arcQueue.push({ prompt, systemPrompt, attachments, resolve, reject });
      // For immediate feedback, we can return a placeholder but the promise will resolve later
      // However, the caller expects a string, so we might want to throw or return a specific string.
      // But the requirement says "Queue AI requests". 
    });
  }
  if (!PROXY_URL) {
    // Simulate API locally if no proxy is provided (safe default)
    console.warn("No VITE_AI_PROXY_URL set. Returning simulated AI response.");
    await new Promise((r) => setTimeout(r, 800));

    if (systemPrompt.includes('Extract a learning roadmap')) {
      return JSON.stringify({
        title: "Extracted Roadmap",
        description: "Simulated extraction from file",
        milestones: ["Read documentation", "Setup environment", "Write code", "Test application"]
      });
    }

    if (prompt.toLowerCase().includes('plan my day')) {
      return "Sure! I've scheduled your tasks for today.\n\n```arc-update\n{\"taskId\":\"simulated_id\",\"completeMilestones\":[]}\n```\n\n```arc-create\n{\"alarms\":[{\"time\":\"09:00\",\"label\":\"Start Day\",\"repeat\":\"once\"}], \"tasks\":[]}\n```";
    }

    return "Simulated AI Response. To use real AI, configure VITE_AI_PROXY_URL to your backend proxy (where the API key stays server-side).";
  }

  try {
    const response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, systemPrompt, attachments }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(text || `Proxy request failed (${response.status})`);
    }

    const data = await response.json();
    if (typeof data === 'string') return data;
    if (typeof data?.text === 'string') return data.text;
    if (typeof data?.content?.[0]?.text === 'string') return data.content[0].text;
    return JSON.stringify(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("AI Error:", err);

    // If a proxy is configured but unreachable, fall back to safe mock output
    // so UI features like "Scan File" still work offline / without backend.
    await new Promise((r) => setTimeout(r, 600));

    if (systemPrompt.includes('Extract a learning roadmap')) {
      return JSON.stringify({
        title: "Extracted Roadmap (Fallback)",
        description: `Proxy unavailable (${message}). Using fallback extraction.`,
        milestones: [
          "Review the file content manually (proxy offline)",
          "Create 3–5 milestones from headings/sections",
          "Schedule the first milestone for today",
        ],
      });
    }

    return `Simulated AI Response (proxy unavailable: ${message}).`;
  }
}

export async function generateRoadmapFromFile(filePayload: {name: string, type: string, content: string}) {
  const systemPrompt = "Extract a learning roadmap from this file. Reply ONLY with JSON:\n{title:string, description:string, milestones:string[]}";
  
  const response = await askAnthropic("Please extract the roadmap.", systemPrompt, [filePayload]);
  
  try {
    // Attempt to parse JSON even if the AI added some markdown wrapping
    const jsonStr = response.replace(/```json\n?/, '').replace(/```\n?$/, '');
    const data = JSON.parse(jsonStr);
    return {
      title: data.title || "Untitled Roadmap",
      description: data.description || "Generated via AI Scan",
      milestones: data.milestones || []
    };
  } catch (e) {
    console.error("Failed to parse JSON response:", response);
    return {
      title: "Scan Failed",
      description: "Could not parse AI response",
      milestones: ["Check console logs"]
    };
  }
}
