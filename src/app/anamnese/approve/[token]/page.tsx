"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function AnamneseApprovePage() {
  const params = useParams();
  const token = params.token as string;
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [clientName, setClientName] = useState("");

  useEffect(() => {
    fetch(`/api/anamnese/approve/${token}`, { method: "POST" })
      .then(async (res) => {
        if (!res.ok) throw new Error();
        const data = await res.json();
        setClientName(data.clientName);
        setStatus("success");
      })
      .catch(() => setStatus("error"));
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card max-w-md text-center">
        {status === "loading" && (
          <>
            <div className="text-4xl mb-4 animate-pulse">⏳</div>
            <p>Aprovando ficha...</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="text-5xl mb-4">✅</div>
            <h1 className="text-xl font-bold mb-2">Ficha Aprovada!</h1>
            <p className="text-[var(--muted)]">
              Anamnese de {clientName} aprovada com sucesso.
            </p>
          </>
        )}
        {status === "error" && (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h1 className="text-xl font-bold mb-2">Erro</h1>
            <p className="text-[var(--muted)]">
              Não foi possível aprovar esta ficha. Verifique se já foi preenchida.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
