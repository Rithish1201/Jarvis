let lastTopic = null;

export function setContext(topic) {
  lastTopic = topic;
}

export function getContext() {
  return lastTopic;
}
