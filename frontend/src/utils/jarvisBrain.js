import { setConversation, getConversation, clearConversation } from "./conversation";

export function analyzeQuestion(question, machines) {
  const q = question.toLowerCase();
  const convo = getConversation();

  // 🟢 Follow-up answers
  if (convo.awaitingReply) {
    if (q.includes("solution") || q.includes("fix")) {
      clearConversation();
      return "I recommend checking cooling systems, inspecting bearings, and verifying alignment.";
    }

    if (q.includes("alternative")) {
      clearConversation();
      return "Alternatively, you can reduce load, monitor vibration closely, and plan maintenance during low production hours.";
    }

    if (q.includes("no")) {
      clearConversation();
      return "Alright. I will continue monitoring the system.";
    }
  }

  // 🔍 Detect machine
  const machine = machines.find(m =>
    q.includes(m.machine_id.toLowerCase())
  );

  if (machine) {
    let issues = [];

    if (machine.temperature > 80) issues.push("high temperature");
    if (machine.vibration > 1.2) issues.push("high vibration");

    if (issues.length === 0) {
      return `${machine.machine_id} is healthy and operating normally.`;
    }

    setConversation(machine.machine_id, "explanation");

    return `${machine.machine_id} is in ${machine.status} condition due to ${issues.join(
      " and "
    )}. Would you like solutions or alternatives?`;
  }

  // 🔄 General status
  if (q.includes("status")) {
    const bad = machines.filter(m => m.status !== "Healthy");
    if (bad.length === 0) return "All machines are running smoothly.";
    return `${bad.length} machines require attention. Would you like details?`;
  }

  return "You can ask me about a specific machine like PRESS-03.";
}
