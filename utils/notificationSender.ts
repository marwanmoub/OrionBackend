import dotenv from "dotenv";
dotenv.config();

const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID!;
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY!;
const MY_EXTERNAL_ID = '531a970b-4cf4-4c11-9943-46d6a6bab9b0';

const options = {
  method: 'POST',
  headers: {
    // Note: Using the 'Key' prefix as per your template
    Authorization: `Key ${ONESIGNAL_REST_API_KEY}`, 
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    app_id: ONESIGNAL_APP_ID,
    contents: { en: 'Default message.' },
    headings: { en: 'Orion Project' },
    
    // Targeting by Alias (External ID)
    include_aliases: { 
        external_id: [MY_EXTERNAL_ID] 
    },
    target_channel: 'push',
    
    // Compatibility check: Removing other targeting params to avoid conflicts
    priority: 10,
    isAndroid: true,
    content_available: true,
    data: { project: "Orion" }
  })
};

console.log("Sending via Template logic...");

fetch('https://api.onesignal.com/notifications?c=push', options)
  .then(res => res.json())
  .then(res => {
    console.log("Response from OneSignal:");
    console.log(res);
  })
  .catch(err => {
    console.error("Network or Fetch Error:");
    console.error(err);
  });