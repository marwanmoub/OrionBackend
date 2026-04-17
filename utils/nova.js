import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Define your static warning as a constant
const FLIGHT_ONLY_WARNING =
  "I am specialized only in flight-related inquiries. Please ask about schedules, airport info, or flight details.";

export const getNovaResponse = async (userMessage, history = []) => {
  const isFirstMessage = history.length === 0;

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-3-flash",
      // Force JSON mode only for the first message
      generationConfig: isFirstMessage
        ? { responseMimeType: "application/json" }
        : {},
    });

    const systemPrompt = `
      You are Nova, a strict flight-only assistant.
      RULE: If the query is NOT about flights/airports, reply ONLY: "I am specialized only in flight-related inquiries. Please ask about schedules, airport info, or flight details."
      
      ${
        isFirstMessage
          ? `You MUST return a JSON object: {"title": "3-word chat summary", "message": "your response"}`
          : `Return your response as plain Markdown text.`
      }
    `;

    const chat = model.startChat({
      history: history.map((msg) => ({
        role: msg.sender_type === "user" ? "user" : "model",
        parts: [{ text: msg.message_text }],
      })),
      systemInstruction: systemPrompt,
    });

    const result = await chat.sendMessage(userMessage);
    const text = result.response.text();

    if (isFirstMessage) {
      return JSON.parse(text);
    }
    return { message: text.trim(), title: null };
  } catch (error) {
    throw new Error("Nova integration failed.");
  }
};
