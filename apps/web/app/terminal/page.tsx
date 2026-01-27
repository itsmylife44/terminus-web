export default function TerminalPage() {
  return (
    <main className="flex min-h-screen flex-col bg-black p-4">
      <div className="border border-white/20 p-4 rounded h-full text-green-500 font-mono">
        <p>Terminal initialized...</p>
        <p className="animate-pulse">_</p>
      </div>
    </main>
  );
}
