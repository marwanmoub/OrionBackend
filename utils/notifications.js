import prisma from "../lib/prisma.js";

const ONESIGNAL_PUSH_URL = "https://api.onesignal.com/notifications?c=push";

const getNotificationStatus = (type) =>
  String(type).toLowerCase() === "alert" ? "Alert" : "Normal";

const buildOneSignalPayload = ({
  userId,
  externalUserId,
  title,
  message,
  type = "Normal",
  reaction_code,
  voiceScript,
  deepLinkAction,
  data = {},
}) => ({
  app_id: process.env.ONESIGNAL_APP_ID,
  include_aliases: {
    external_id: [String(externalUserId || userId)],
  },
  target_channel: "push",
  headings: { en: title },
  contents: { en: message },
  priority: getNotificationStatus(type) === "Alert" ? 10 : 5,
  data: {
    ...data,
    type: getNotificationStatus(type),
    reaction_code,
    voiceScript,
    deepLinkAction,
  },
});

const createNotificationLog = async (data) => {
  try {
    return await prisma.notificationLog.create({ data });
  } catch (error) {
    console.error("NotificationLog create error:", error);
    return null;
  }
};

const toJson = (value) => JSON.parse(JSON.stringify(value));

const updateNotificationLog = async (id, data) => {
  if (!id) return null;

  try {
    return await prisma.notificationLog.update({
      where: { id },
      data,
    });
  } catch (error) {
    console.error("NotificationLog update error:", error);
    return null;
  }
};

export const sendOneSignalNotification = async ({
  userId,
  externalUserId,
  flightId,
  title,
  message,
  type = "Normal",
  reaction_code = "NEUTRAL",
  voiceScript,
  deepLinkAction,
  data = {},
}) => {
  const normalizedType = getNotificationStatus(type);
  const payload = buildOneSignalPayload({
    userId,
    externalUserId,
    title,
    message,
    type: normalizedType,
    reaction_code,
    voiceScript,
    deepLinkAction,
    data: {
      ...data,
      userId,
      flightId,
    },
  });

  const log = await createNotificationLog({
    userId,
    flightId,
    type: normalizedType,
    title,
    message,
    reaction_code,
    payload: toJson(payload),
    status: "PENDING",
    sentAt: new Date(),
  });

  if (!process.env.ONESIGNAL_APP_ID || !process.env.ONESIGNAL_REST_API_KEY) {
    await updateNotificationLog(log?.id, { status: "SKIPPED_MISSING_CONFIG" });
    return {
      status: false,
      skipped: true,
      reason: "Missing OneSignal configuration",
      logId: log?.id ?? null,
    };
  }

  try {
    const response = await fetch(ONESIGNAL_PUSH_URL, {
      method: "POST",
      headers: {
        Authorization: `Key ${process.env.ONESIGNAL_REST_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseBody = await response.json().catch(() => ({}));
    await updateNotificationLog(log?.id, {
      status: response.ok ? "SENT" : "FAILED",
      providerMessageId: responseBody.id ?? null,
      payload: toJson({
        request: payload,
        response: responseBody,
      }),
    });

    return {
      status: response.ok,
      providerStatus: response.status,
      providerResponse: responseBody,
      logId: log?.id ?? null,
    };
  } catch (error) {
    await updateNotificationLog(log?.id, {
      status: "FAILED",
      payload: toJson({
        request: payload,
        error: error.message,
      }),
    });

    console.error("OneSignal notification error:", error);
    return {
      status: false,
      error: error.message,
      logId: log?.id ?? null,
    };
  }
};
