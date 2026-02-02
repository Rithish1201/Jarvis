let lastMachine = null;
let lastIntent = null;
let awaitingReply = false;

export function setConversation(machineId, intent) {
  lastMachine = machineId;
  lastIntent = intent;
  awaitingReply = true;
}

export function getConversation() {
  return { lastMachine, lastIntent, awaitingReply };
}

export function clearConversation() {
  awaitingReply = false;
}
