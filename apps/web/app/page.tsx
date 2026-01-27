import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8">Terminus Web</h1>
      <p className="text-lg mb-8 text-muted-foreground">
        Advanced Web Terminal Interface
      </p>
      <Link 
        href="/terminal" 
        className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
      >
        Launch Terminal
      </Link>
    </main>
  );
}
