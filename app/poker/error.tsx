"use client"

export default function PokerError({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="cyber-card rounded-lg p-8 max-w-md w-full text-center">
        <h2 className="text-2xl font-bold text-pink-500 mb-4 font-mono">POKER ERROR</h2>
        <p className="text-pink-400 font-mono mb-4">Something went wrong on /poker.</p>
        <pre className="whitespace-pre-wrap text-sm text-pink-300/70 bg-black/50 p-3 rounded border border-pink-500/30 mb-6 text-left overflow-auto max-h-32">
          {error?.message}
        </pre>
        <button onClick={reset} className="cyber-button px-6 py-2 font-mono font-bold">
          TRY AGAIN
        </button>
      </div>
    </div>
  )
}
