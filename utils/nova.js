import { GoogleGenAI } from "@google/genai";
import { sendOneSignalNotification } from "./notifications.js";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const FLIGHT_ONLY_WARNING =
  "I am specialized only in flight-related inquiries. Please ask about schedules, airport info, or flight details.";

export const getNovaResponse = async (userMessage, history = []) => {
  const isFirstMessage = history.length === 0;

  try {
    // Define the system instructions and constraints
    const systemPrompt = `
      You are Nova, a strict flight-only assistant.
      RULE: If the query is NOT about flights/airports, reply ONLY: "${FLIGHT_ONLY_WARNING}"
      
      ${
        isFirstMessage
          ? `You MUST return a JSON object: {"title": "3-word chat summary", "message": "your response"}`
          : `Return your response as plain Markdown text.`
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", // Updated to the version in your snippet
      systemInstruction: systemPrompt,
      contents: [
        // Map history to the library's content format
        ...history.map((msg) => ({
          role: msg.sender_type === "user" ? "user" : "model",
          parts: [{ text: msg.message_text }],
        })),
        { role: "user", parts: [{ text: userMessage }] },
      ],
      config: isFirstMessage ? { responseMimeType: "application/json" } : {},
    });

    const text = response.text;

    if (isFirstMessage) {
      try {
        return JSON.parse(text);
      } catch (parseError) {
        return {
          title: "Flight Inquiry",
          message: text.trim(),
        };
      }
    }

    return { message: text.trim(), title: null };
  } catch (error) {
    console.error("Nova AI Error:", error);
    throw error;
  }
};

export const handleContextualAlert = async ({
  userId,
  flightId,
  title,
  message,
  type = "Alert",
  reaction_code = "CONCERNED",
  voiceScript,
  deepLinkAction = "orion://nova/alert",
  data = {},
}) =>
  sendOneSignalNotification({
    userId,
    flightId,
    title,
    message,
    type,
    reaction_code,
    voiceScript,
    deepLinkAction,
    data: {
      source: "nova-contextual-alert",
      ...data,
    },
  });

export const handleFlightDelayContextualAlert = async ({
  userId,
  flight,
  delayMinutes,
}) => {
  const flightLabel = flight.flight_number ?? "your flight";
  const title = "Flight Delay Alert";
  const message = `${flightLabel} is now delayed by ${delayMinutes} minutes. Nova will keep your checklist timing in sync.`;

  return handleContextualAlert({
    userId,
    flightId: flight.id,
    title,
    message,
    type: "Alert",
    reaction_code: "CONCERNED",
    voiceScript: `I noticed a delay for ${flightLabel}. The departure is now ${delayMinutes} minutes later than scheduled.`,
    deepLinkAction: `orion://flight/${flight.id}`,
    data: {
      event: "FLIGHT_DELAY_SIMULATED",
      delayMinutes,
      flightNumber: flight.flight_number,
    },
  });
};
