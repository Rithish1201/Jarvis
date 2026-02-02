export default function ConversationPanel({ messages }) {
  return (
    <div className="
      rounded-2xl
      bg-white/5
      border border-white/10
      p-4
      backdrop-blur-xl
      h-64
      overflow-y-auto
    ">
      <h3 className="text-sm text-gray-400 mb-3">🧠 Jarvis Conversation</h3>

      {messages.length === 0 && (
        <p className="text-gray-500 text-sm">No conversation yet</p>
      )}

      {messages.map((msg, i) => (
        <div key={i} className="mb-2 text-sm">
          <span className="text-indigo-400">You:</span> {msg.q}<br />
          <span className="text-green-400">Jarvis:</span> {msg.a}
        </div>
      ))}
    </div>
  );
}
