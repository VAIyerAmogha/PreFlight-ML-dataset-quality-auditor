"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function SimulationPage() {
  const { jobId } = useParams();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/jobs/${jobId}/report`);
  }, [jobId, router]);

  return (
    <main className="min-h-screen bg-[#f4f7f1] px-5 py-8">
      <section className="mx-auto flex w-full max-w-4xl items-center justify-center rounded-lg border border-slate-200 bg-white p-8 text-sm font-semibold text-slate-600 shadow-soft">
        Simulation has been removed. Redirecting to the report dashboard.
      </section>
    </main>
  );
}
