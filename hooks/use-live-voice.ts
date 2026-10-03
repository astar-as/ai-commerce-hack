"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DelegateOutput, OrderState, TranscriptLine } from "@/lib/types";

type Status = "idle" | "connecting" | "live" | "ending" | "error";
export type AgentState = null | "listening" | "thinking" | "talking";

type LiveEvent = {
  type: string;
  delta?: string;
  delegation?: { id: string; target: string };
  session?: { id: string };
  error?: { message?: string };
};

function rms(analyser: AnalyserNode | null, buf: Float32Array<ArrayBuffer> | null) {
  if (!analyser || !buf) return 0;
  analyser.getFloatTimeDomainData(buf);
  let sum = 0;
  for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
  return Math.min(1, Math.sqrt(sum / buf.length) * 4.5);
}

export function useLiveVoice({
  order,
  onOrder,
}: {
  order: OrderState;
  onOrder: (order: OrderState) => void;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [agentState, setAgentState] = useState<AgentState>(null);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);

  const orderRef = useRef(order);
  const transcriptRef = useRef<TranscriptLine[]>([]);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const micRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const inAnalyser = useRef<AnalyserNode | null>(null);
  const outAnalyser = useRef<AnalyserNode | null>(null);
  const inBuf = useRef<Float32Array<ArrayBuffer> | null>(null);
  const outBuf = useRef<Float32Array<ArrayBuffer> | null>(null);
  const pendingRef = useRef(0);
  const lastOutputAt = useRef(0);
  const onOrderRef = useRef(onOrder);

  useEffect(() => {
    orderRef.current = order;
    onOrderRef.current = onOrder;
  }, [order, onOrder]);

  const getInputVolume = useCallback(() => rms(inAnalyser.current, inBuf.current), []);
  const getOutputVolume = useCallback(() => rms(outAnalyser.current, outBuf.current), []);

  const pushDelta = useCallback((role: TranscriptLine["role"], delta: string) => {
    const lines = transcriptRef.current;
    const last = lines[lines.length - 1];
    const now = Date.now();
    const next =
      last && last.role === role && now - last.at < 4000
        ? [...lines.slice(0, -1), { role, text: last.text + delta, at: now }]
        : [...lines, { role, text: delta.trimStart(), at: now }];
    transcriptRef.current = next.slice(-40);
    setTranscript(transcriptRef.current);
  }, []);

  const send = useCallback((event: Record<string, unknown>) => {
    const ch = channelRef.current;
    if (ch?.readyState === "open") ch.send(JSON.stringify(event));
  }, []);

  const delegate = useCallback(
    async (delegationId: string) => {
      pendingRef.current += 1;
      setAgentState("thinking");
      await new Promise((r) => setTimeout(r, 350));
      try {
        const res = await fetch("/api/delegate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            delegation_id: delegationId,
            transcript: transcriptRef.current,
            order: orderRef.current,
          }),
        });
        const out = (await res.json()) as DelegateOutput;
        if (out.order) {
          orderRef.current = out.order;
          onOrderRef.current(out.order);
        }
        send({
          type: "session.commentary.append",
          event_id: `result_${delegationId}`,
          delegation_id: delegationId,
          content: out.say,
        });
      } catch {
        send({
          type: "session.commentary.append",
          event_id: `result_${delegationId}`,
          delegation_id: delegationId,
          content: "Something went wrong on my side. Could you say that again?",
        });
      } finally {
        pendingRef.current = Math.max(0, pendingRef.current - 1);
      }
    },
    [send],
  );

  const cleanup = useCallback(() => {
    micRef.current?.getTracks().forEach((t) => t.stop());
    channelRef.current?.close();
    peerRef.current?.close();
    ctxRef.current?.close().catch(() => {});
    if (audioRef.current) audioRef.current.srcObject = null;
    micRef.current = null;
    channelRef.current = null;
    peerRef.current = null;
    ctxRef.current = null;
    inAnalyser.current = null;
    outAnalyser.current = null;
    pendingRef.current = 0;
    setAgentState(null);
  }, []);

  const start = useCallback(async () => {
    if (peerRef.current) return;
    setError(null);
    setStatus("connecting");
    try {
      const pc = new RTCPeerConnection();
      peerRef.current = pc;
      const ctx = new AudioContext();
      ctxRef.current = ctx;

      if (!audioRef.current) {
        audioRef.current = new Audio();
        audioRef.current.autoplay = true;
      }
      pc.addEventListener("track", (event) => {
        const stream = new MediaStream([event.track]);
        audioRef.current!.srcObject = stream;
        audioRef.current!.play().catch(() => {});
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        ctx.createMediaStreamSource(stream).connect(analyser);
        outAnalyser.current = analyser;
        outBuf.current = new Float32Array(analyser.fftSize);
      });

      const mic = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      micRef.current = mic;
      mic.getAudioTracks().forEach((t) => pc.addTrack(t, mic));
      const micAnalyser = ctx.createAnalyser();
      micAnalyser.fftSize = 1024;
      ctx.createMediaStreamSource(mic).connect(micAnalyser);
      inAnalyser.current = micAnalyser;
      inBuf.current = new Float32Array(micAnalyser.fftSize);

      const channel = pc.createDataChannel("oai-events");
      channelRef.current = channel;
      channel.addEventListener("message", ({ data }) => {
        const event = JSON.parse(data) as LiveEvent;
        switch (event.type) {
          case "session.started":
            setStatus("live");
            setAgentState("listening");
            break;
          case "session.input_transcript.delta":
            if (event.delta) pushDelta("user", event.delta);
            break;
          case "session.output_transcript.delta":
            if (event.delta) {
              lastOutputAt.current = Date.now();
              pushDelta("assistant", event.delta);
            }
            break;
          case "session.delegation.created":
            if (event.delegation?.target === "client") void delegate(event.delegation.id);
            break;
          case "session.closed":
            cleanup();
            setStatus("idle");
            break;
          case "error":
            setError(event.error?.message ?? "Voice error");
            break;
        }
      });
      channel.addEventListener("close", () => {
        if (peerRef.current) {
          cleanup();
          setStatus("idle");
        }
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      if (pc.iceGatheringState !== "complete") {
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(resolve, 3000);
          pc.addEventListener("icegatheringstatechange", () => {
            if (pc.iceGatheringState === "complete") {
              clearTimeout(timeout);
              resolve();
            }
          });
        });
      }
      const res = await fetch("/api/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sdp: pc.localDescription?.sdp }),
      });
      if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Could not start voice");
      const result = (await res.json()) as { transport: { sdp: string } };
      await pc.setRemoteDescription({ type: "answer", sdp: result.transport.sdp });
    } catch (e) {
      cleanup();
      setStatus("error");
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [cleanup, delegate, pushDelta]);

  const stop = useCallback(() => {
    if (channelRef.current?.readyState === "open") {
      setStatus("ending");
      send({ type: "session.close" });
      setTimeout(() => {
        if (peerRef.current) {
          cleanup();
          setStatus("idle");
        }
      }, 4000);
    } else {
      cleanup();
      setStatus("idle");
    }
  }, [cleanup, send]);

  const say = useCallback(
    (content: string) => send({ type: "session.commentary.append", event_id: `ui_${Date.now()}`, delegation_id: null, content }),
    [send],
  );

  const note = useCallback(
    (content: string) => send({ type: "session.thinking.append", event_id: `ui_${Date.now()}`, delegation_id: null, content }),
    [send],
  );

  useEffect(() => {
    if (status !== "live") return;
    const id = setInterval(() => {
      const out = getOutputVolume();
      const speaking = out > 0.03 || Date.now() - lastOutputAt.current < 500;
      const next: AgentState = speaking ? "talking" : pendingRef.current > 0 ? "thinking" : "listening";
      setAgentState((prev) => (prev === next ? prev : next));
    }, 120);
    return () => clearInterval(id);
  }, [status, getOutputVolume]);

  useEffect(() => cleanup, [cleanup]);

  return { status, agentState, error, transcript, start, stop, say, note, getInputVolume, getOutputVolume };
}
