import Link from "next/link";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card max-w-md text-center">
        <div className="text-5xl mb-4">📡</div>
        <h1 className="text-xl font-bold mb-2">Sem conexão</h1>
        <p className="text-[var(--muted)] mb-6">
          Você está offline. Verifique sua internet e tente novamente.
        </p>
        <Link href="/dashboard" className="btn-primary inline-block">
          Tentar novamente
        </Link>
      </div>
    </div>
  );
}
