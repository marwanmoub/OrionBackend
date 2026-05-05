export const INFORMATION_ZONE_FAQS = [
  {
    id: "security-liquids",
    category: "Security",
    question: "What liquids can I bring through security?",
    answer:
      "Carry liquids in small containers and keep them together for screening. Check your airline and airport rules before packing.",
    voiceScript:
      "For security, keep your liquids grouped and ready for screening. Check your airline and airport rules before you leave.",
    keywords: ["liquid", "security", "carry on", "carry-on", "screening"],
  },
  {
    id: "gate-change",
    category: "Flight Updates",
    question: "How will I know if my gate changes?",
    answer:
      "ORION sends official flight updates in your flight room and through Nova push alerts when your simulated flight data changes.",
    voiceScript:
      "If your gate changes, I will alert you and the official update will appear in your flight group room.",
    keywords: ["gate", "change", "flight update", "boarding"],
  },
  {
    id: "airport-arrival",
    category: "Journey Planning",
    question: "When should I arrive at the airport?",
    answer:
      "Use your journey checklist as the source of truth. Nova tracks due times and can remind you before critical steps.",
    voiceScript:
      "Your journey checklist is the source of truth. I will remind you before critical steps.",
    keywords: ["arrive", "arrival", "airport", "late", "when"],
  },
  {
    id: "ar-navigation",
    category: "AR Navigation",
    question: "When can I use AR navigation?",
    answer:
      "AR navigation becomes available after ORION detects that you have entered the airport boundary and loads nearby points of interest.",
    voiceScript:
      "AR navigation becomes available after you enter the airport boundary and nearby points of interest are ready.",
    keywords: ["ar", "augmented", "navigation", "poi", "camera"],
  },
];

const normalize = (value = "") =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const getInformationZoneItems = () =>
  INFORMATION_ZONE_FAQS.map(({ keywords, ...item }) => item);

export const findInformationZoneAnswer = (input) => {
  const normalizedInput = normalize(input);

  if (!normalizedInput) {
    return null;
  }

  return (
    INFORMATION_ZONE_FAQS.find((item) =>
      item.keywords.some((keyword) => normalizedInput.includes(keyword)),
    ) ?? null
  );
};

export const processNovaCommand = (input) => {
  const normalizedInput = normalize(input);

  if (!normalizedInput) {
    return null;
  }

  if (
    normalizedInput.includes("open my flight") ||
    normalizedInput.includes("go to my flight") ||
    normalizedInput.includes("show my flight")
  ) {
    return {
      type: "NAVIGATION",
      title: "Flight Shortcut",
      message: "Opening your active flight page.",
      voiceScript: "Opening your active flight page.",
      reaction_code: "HELPFUL",
      deepLinkAction: "orion://flight/current",
    };
  }

  if (
    normalizedInput.includes("information zone") ||
    normalizedInput.includes("airport help") ||
    normalizedInput.includes("airside help") ||
    normalizedInput.includes("landside help")
  ) {
    return {
      type: "INFORMATION_ZONE",
      title: "Information Zone",
      message: "Here are the current Information Zone topics.",
      voiceScript: "Here are the current Information Zone topics.",
      reaction_code: "HELPFUL",
      deepLinkAction: "orion://nova/information-zone",
      items: getInformationZoneItems(),
    };
  }

  const faq = findInformationZoneAnswer(input);
  if (!faq) {
    return null;
  }

  return {
    type: "INFORMATION_ZONE",
    title: faq.category,
    message: faq.answer,
    voiceScript: faq.voiceScript,
    reaction_code: "HELPFUL",
    deepLinkAction: `orion://nova/information-zone/${faq.id}`,
  };
};
