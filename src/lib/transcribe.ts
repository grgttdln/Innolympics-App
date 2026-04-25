export async function transcribe(blob: Blob): Promise<string> {
  const form = new FormData();
  form.append("audio", blob, "recording.webm");
  const res = await fetch("/api/transcribe", { method: "POST", body: form });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Transcription failed (${res.status})`);
  }
  const data = (await res.json()) as { transcript: string };
  return data.transcript;
}
