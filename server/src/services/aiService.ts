import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function extractTask(userInput: string) {
  try {
    const res = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 1024,
      system: `You are a task extraction assistant for "ARC Clock", a minimalist hacker-themed productivity app.
      EXTRACT:
      - Alarms (time in 24h HH:MM, repeat pattern, label)
      - Reminders (title, note, datetime)
      - Routines (multi-step tasks)
      
      FORMAT:
      {
        "type": "alarm" | "reminder" | "routine",
        "label": "string",
        "time": "HH:MM" | null,
        "datetime": "ISO string" | null,
        "repeat": "once" | "daily" | "weekdays" | "weekends",
        "note": "string" | null,
        "steps": ["step 1", "step 2"] | null
      }
      
      Respond with ONLY the JSON object.`,
      messages: [{ role: "user", content: userInput }]
    });

    const block = res.content[0];
    if (block.type === 'text') {
      return JSON.parse(block.text.replace(/```json\n?/, '').replace(/```\n?$/, ''));
    }
    throw new Error('Unexpected AI response format');
  } catch (error: any) {
    console.error("AI Error:", error);
    throw error;
  }
}

export async function extractRoadmapFromFile(file: { name: string; type: string; content: string }) {
  try {
    const isBase64 = file.content.startsWith('data:');
    const mediaType = file.type.split(';')[0];
    
    let content: any[] = [{ type: 'text', text: "Extract a learning roadmap or schedule from this file." }];
    
    if (isBase64 && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
      const base64Data = file.content.split(',')[1];
      content.push({
        type: file.type.startsWith('image/') ? 'image' : 'document',
        source: {
          type: 'base64',
          media_type: mediaType || 'image/png',
          data: base64Data
        }
      });
    } else {
      content.push({ type: 'text', text: `File Content: \n\n${file.content}` });
    }

    const res = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 2048,
      system: `Extract a learning roadmap or schedule into this JSON format:
      {
        "title": "Roadmap Title",
        "description": "Short description",
        "milestones": ["step 1", "step 2", ...]
      }
      Respond with ONLY valid JSON.`,
      messages: [{ role: "user", content }]
    });

    const block = res.content[0];
    if (block.type === 'text') {
      return JSON.parse(block.text.replace(/```json\n?/, '').replace(/```\n?$/, ''));
    }
    throw new Error('Unexpected AI response format');
  } catch (error: any) {
    console.error("AI File Error:", error);
    throw error;
  }
}

