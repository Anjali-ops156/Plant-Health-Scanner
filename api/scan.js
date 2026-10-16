// api/scan.js
// A Vercel serverless function.
// It receives a plant/leaf photo from the page, sends it to Groq's image
// model, and sends back a structured JSON health report.

// The image model we use on Groq. If Groq renames or retires it,
// change it here (check console.groq.com/docs/vision).
const MODEL = "qwen/qwen3.8-27b";

const PROMPT = `You are a plant health expert looking at a photo of a plant or leaf.

Identify the plant if you can, assess its health, and list anything visibly
wrong with it (disease, pests, nutrient deficiency, under/over-watering,
sunburn, etc.). If the plant looks healthy, say so and return an empty
issues list.

Rules you must follow:
- Only report issues you can actually see in the photo (spots, discoloration, wilting, holes, mold, webbing, etc.). Do not guess problems that aren't visible.
- If the photo does not show a plant at all, set "plant_identified" to "Not a plant" and "health_status" to "Unknown", with an empty issues list and a single care tip explaining that no plant was detected.
- Keep every text field short and in plain language a home gardener understands, not a botanist.

Reply with ONLY a JSON object in exactly this shape, no other text:
{
  "plant_identified": "<best-guess common name, or 'Unknown plant' if unsure>",
  "health_status": "Healthy" | "Needs Attention" | "Diseased" | "Unknown",
  "confidence": "High" | "Medium" | "Low",
  "issues": [
    { "name": "<short issue name>", "severity": "Mild" | "Moderate" | "Severe", "description": "<one sentence on what you see>" }
  ],
  "care_tips": ["<short actionable tip>"]
}
Include at least one care tip even for a healthy plant (general upkeep advice).`;

export default async function handler(req, res) {
  // Only accept POST requests (the page sends the photo with POST).
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST to send a photo." });
  }

  // The key lives in .env.local (on your laptop) or in Vercel's settings — never in the page.
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GROQ_API_KEY is missing. Add it to .env.local and restart." });
  }

  // The page sends the photo as a "data URL": data:image/jpeg;base64,....
  const { image } = req.body || {};
  if (!image || !image.startsWith("data:image/")) {
    return res.status(400).json({ error: "No photo received." });
  }

  try {
    // Ask Groq's image model what it sees, and require a JSON reply.
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: PROMPT },
              { type: "image_url", image_url: { url: image } },
            ],
          },
        ],
        temperature: 0.2, // low = more consistent answers
        max_completion_tokens: 1024,
        response_format: { type: "json_object" },
      }),
    });

    const data = await groqResponse.json();

    // Groq sends an error (for example: wrong key, or too many requests).
    if (!groqResponse.ok) {
      const message = data?.error?.message || "Groq returned an error.";
      const hint = groqResponse.status === 429 ? " (Free limit reached — wait a minute and try again.)" : "";
      return res.status(groqResponse.status).json({ error: message + hint });
    }

    const raw = data.choices?.[0]?.message?.content || "";
    let result;
    try {
      result = JSON.parse(raw);
    } catch {
      return res.status(502).json({ error: "The model's reply wasn't valid JSON.", raw });
    }

    // Normalize the model's reply so the page always gets predictable shapes.
    const issues = Array.isArray(result.issues) ? result.issues : [];
    const careTips = Array.isArray(result.care_tips) ? result.care_tips : [];

    return res.status(200).json({
      plant_identified: result.plant_identified || "Unknown plant",
      health_status: result.health_status || "Unknown",
      confidence: result.confidence || "Low",
      issues,
      care_tips: careTips,
    });
  } catch (err) {
    return res.status(500).json({ error: "Could not reach Groq: " + err.message });
  }
}
