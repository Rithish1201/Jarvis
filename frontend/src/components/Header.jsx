export default function Header({ alertCount }) {
  return (
    <div className="
      flex justify-between items-center
      rounded-2xl
      bg-white/5
      border border-white/10
      p-6
      backdrop-blur-xl
    ">
      <div>
        <h1 className="text-3xl font-bold tracking-wide">
          Jarvis — AI Command Center
        </h1>
        <p className="text-sm mt-2 text-gray-400">
          {alertCount === 0
            ? "🟢 All systems operational"
            : `⚠️ ${alertCount} active alerts`}
        </p>
      </div>

      <button className="
        px-4 py-2 rounded-xl
        bg-indigo-600 hover:bg-indigo-700
        transition font-medium
      ">
        🎤 Ask Jarvis
      </button>
    </div>
  );
}
