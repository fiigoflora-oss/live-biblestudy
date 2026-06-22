import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, PhoneOff, Radio, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface Participant {
  id: string;
  name: string;
  speaking: boolean;
  muted: boolean;
  self?: boolean;
}

interface VoiceRoomProps {
  groupId: string;
  groupName: string;
}

/**
 * A serene, mock voice-room experience.
 *
 * No external API keys are configured for LiveKit, so this component
 * simulates a live audio room: it uses the local microphone (via
 * getUserMedia + WebAudio) to drive a real audio-level meter for the
 * current user, and animates a few sample participants so the UX —
 * grid of speakers, mute toggle, leave button, wave indicator —
 * matches what a real LiveKit room would feel like.
 */
export function VoiceRoom({ groupId, groupName }: VoiceRoomProps) {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [muted, setMuted] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selfLevel, setSelfLevel] = useState(0);

  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const tickRef = useRef<number | null>(null);

  const connect = async () => {
    setConnecting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const selfName = user?.email?.split("@")[0] ?? "You";

      // Real local mic for the self meter — gracefully degrade if denied.
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        const ctx = new (window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        audioCtxRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        analyserRef.current = analyser;

        const data = new Uint8Array(analyser.frequencyBinCount);
        const loop = () => {
          analyser.getByteTimeDomainData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) {
            const v = (data[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / data.length);
          setSelfLevel(muted ? 0 : Math.min(1, rms * 4));
          rafRef.current = requestAnimationFrame(loop);
        };
        loop();
      } catch {
        // mic denied — still allow joining as a listener
      }

      // Seed sample participants (mock LiveKit room)
      setParticipants([
        { id: "self", name: selfName, speaking: false, muted: false, self: true },
        { id: "p1", name: "Hannah", speaking: false, muted: false },
        { id: "p2", name: "Micah", speaking: false, muted: false },
        { id: "p3", name: "Ruth", speaking: false, muted: true },
      ]);

      // Animate other participants' speaking state
      tickRef.current = window.setInterval(() => {
        setParticipants((prev) =>
          prev.map((p) =>
            p.self
              ? p
              : { ...p, speaking: !p.muted && Math.random() > 0.55 },
          ),
        );
      }, 900);

      setConnected(true);
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (tickRef.current) clearInterval(tickRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close().catch(() => {});
    streamRef.current = null;
    audioCtxRef.current = null;
    analyserRef.current = null;
    setConnected(false);
    setMuted(false);
    setSelfLevel(0);
    setParticipants([]);
  };

  useEffect(() => () => disconnect(), []);

  useEffect(() => {
    if (!streamRef.current) return;
    streamRef.current.getAudioTracks().forEach((t) => (t.enabled = !muted));
  }, [muted]);

  // Reflect self speaking state in the grid
  useEffect(() => {
    setParticipants((prev) =>
      prev.map((p) =>
        p.self ? { ...p, speaking: selfLevel > 0.08, muted } : p,
      ),
    );
  }, [selfLevel, muted]);

  if (!connected) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Radio className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-scripture text-base font-semibold text-foreground">
                Voice Room
              </h3>
              <p className="text-xs text-muted-foreground">
                Gather and study aloud with members of {groupName}
              </p>
            </div>
          </div>
          <Button onClick={connect} disabled={connecting} size="sm">
            {connecting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Mic className="h-4 w-4" /> Join Voice Room
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-primary/20 bg-card shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
          </span>
          <h3 className="font-scripture text-base font-semibold text-foreground">
            Live · {participants.length} in room
          </h3>
        </div>
        <span className="hidden text-xs text-muted-foreground sm:inline">
          Room: {groupId.slice(0, 8)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 px-5 py-5 sm:grid-cols-4">
        {participants.map((p) => (
          <ParticipantTile
            key={p.id}
            participant={p}
            level={p.self ? selfLevel : p.speaking ? 0.6 : 0.05}
          />
        ))}
      </div>

      <div className="flex items-center justify-center gap-3 border-t border-border px-5 py-4">
        <Button
          variant={muted ? "secondary" : "outline"}
          size="sm"
          onClick={() => setMuted((m) => !m)}
          className="gap-2"
        >
          {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          {muted ? "Unmute" : "Mute"}
        </Button>
        <Button variant="destructive" size="sm" onClick={disconnect} className="gap-2">
          <PhoneOff className="h-4 w-4" /> Leave
        </Button>
      </div>
    </div>
  );
}

function ParticipantTile({
  participant,
  level,
}: {
  participant: Participant;
  level: number;
}) {
  const active = participant.speaking && !participant.muted;
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 rounded-xl border bg-background/60 p-4 transition-colors",
        active ? "border-primary/60 bg-primary/5" : "border-border",
      )}
    >
      <div className="relative">
        {active && (
          <span className="absolute inset-0 -m-1 animate-pulse rounded-full border-2 border-primary/50" />
        )}
        <div
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-full font-scripture text-lg font-semibold",
            active
              ? "bg-primary text-primary-foreground"
              : "bg-accent text-accent-foreground",
          )}
        >
          {participant.name[0]?.toUpperCase()}
        </div>
      </div>
      <div className="flex max-w-full items-center gap-1.5">
        {participant.muted ? (
          <MicOff className="h-3 w-3 text-muted-foreground" />
        ) : (
          <Mic className={cn("h-3 w-3", active ? "text-primary" : "text-muted-foreground")} />
        )}
        <span className="truncate text-xs font-medium text-foreground">
          {participant.name}
          {participant.self && " (you)"}
        </span>
      </div>
      <WaveBars level={participant.muted ? 0 : level} active={active} />
    </div>
  );
}

function WaveBars({ level, active }: { level: number; active: boolean }) {
  const bars = 5;
  return (
    <div className="flex h-5 items-end gap-0.5">
      {Array.from({ length: bars }).map((_, i) => {
        const center = (bars - 1) / 2;
        const distance = Math.abs(i - center);
        const factor = 1 - distance * 0.18;
        const h = Math.max(3, Math.min(20, level * 22 * factor + (active ? 3 : 1)));
        return (
          <span
            key={i}
            className={cn(
              "w-1 rounded-full transition-all duration-150",
              active ? "bg-primary" : "bg-muted-foreground/40",
            )}
            style={{ height: `${h}px` }}
          />
        );
      })}
    </div>
  );
}
