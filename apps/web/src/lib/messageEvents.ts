export const MESSAGES_UPDATED_EVENT = "expiry-alert:messages-updated";

export function emitMessagesUpdated() {
  window.dispatchEvent(new CustomEvent(MESSAGES_UPDATED_EVENT));
}
