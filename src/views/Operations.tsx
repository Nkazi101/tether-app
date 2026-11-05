import React from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { comparisonRequest } from "../lib/comparison-client";
export function Operations() {
  const status = useQuery({
    queryKey: ["operations"],
    queryFn: ({ signal }) =>
      comparisonRequest<{
        jobs: Array<{
          id: string;
          kind: string;
          status: string;
          attempts: number;
          updated_at: string;
          error_message: string | null;
        }>;
        usage: Array<{ scope_key: string; day: string; units: number }>;
        runtime: Array<{ kind: string; seen_at: string }>;
        quarantined?: Array<{
          case_version_id: string;
          reason: string;
          recorded_at: string;
        }>;
      }>("/operations/status", { signal }),
    refetchInterval: 15000,
  });
  const ingest = useMutation({
    mutationFn: () =>
      comparisonRequest("/operations/ingest", { method: "POST" }),
    onSuccess: () => status.refetch(),
  });
  const retry = useMutation({
    mutationFn: (id: string) =>
      comparisonRequest(`/operations/jobs/${id}/retry`, {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
      }),
    onSuccess: () => status.refetch(),
  });
  return (
    <section className="living-section">
      <p className="eyebrow">Administrator operations</p>
      <h2>Evidence and publication jobs</h2>
      <button
        className="button-secondary"
        onClick={() => ingest.mutate()}
        disabled={ingest.isPending}
      >
        Queue a reporting refresh
      </button>
      {ingest.isSuccess && (
        <p role="status">The refresh is queued. Its progress appears below.</p>
      )}
      {ingest.error && <p role="alert">{ingest.error.message}</p>}
      {retry.error && <p role="alert">{retry.error.message}</p>}
      {status.error ? (
        <p role="alert">{status.error.message}</p>
      ) : (
        <>
          <div className="living-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Job</th>
                  <th>State</th>
                  <th>Attempts</th>
                  <th>Last activity</th>
                </tr>
              </thead>
              <tbody>
                {status.data?.jobs.map((job) => (
                  <tr key={job.id}>
                    <td>{job.kind}</td>
                    <td>
                      {job.status}
                      {job.error_message && <p>{job.error_message}</p>}
                    </td>
                    <td>
                      {job.attempts}
                      {job.status === "failed" && (
                        <button
                          className="text-link"
                          disabled={retry.isPending}
                          onClick={() => retry.mutate(job.id)}
                        >
                          Queue a new attempt
                        </button>
                      )}
                    </td>
                    <td>{new Date(job.updated_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3>Worker and scheduler heartbeats</h3>
          {status.data?.runtime.map((row, index) => (
            <p key={index}>
              {row.kind} · {new Date(row.seen_at).toLocaleString()}
              {Date.parse(row.seen_at) < Date.now() - 90000
                ? " · Stale"
                : " · Active"}
            </p>
          ))}
          <h3>Quarantined case versions</h3>
          {status.data?.quarantined?.map((row) => (
            <p key={row.case_version_id}>
              {row.reason} · {row.case_version_id}
            </p>
          ))}
          <h3>Reserved resource usage</h3>
          {status.data?.usage.map((row) => (
            <p key={row.scope_key + row.day}>
              {row.day} · {row.scope_key}: {row.units}
            </p>
          ))}
        </>
      )}
    </section>
  );
}
