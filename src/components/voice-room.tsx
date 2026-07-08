import { useEffect, useMemo, useRef, useState } from "react";
import { Mic, MicOff, PhoneOff, Radio, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface PresencePayload {
  user_id: string;
  name: string;
  muted: boolean;
  joined_at: number;
}

interface Participant extends PresencePayload {
  level: number;
  self: boolean;
}

interface VoiceRoomProps {
  groupId: string;
  groupName: string;
}

/**
 * Live voice-room presence built on Supabase Realtime.
 *
 * - Each participant broadcasts { name, muted } via presence.
 * - Real microphone RMS drives the local level meter.
 * - Level samples are broadcast to the channel so other clients can
 *   render live speaker indicators for remote participants.
 * - Audio transport is intentionally out-of-scope (no SFU/WebRTC),
 *   so this delivers a real, multi-user "who is here / who is talking"
 *   experience without requiring third-party media keys.
 */
export function VoiceRoom({ groupId, groupName }: VoiceRoomProps) {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [muted, setMuted] = useState(false);
  const [selfLevel, setSelfLevel] = useState(0);
  const [presence, setPresence] = useState<Record<string, PresencePayload>>({});
  const [remoteLevels, setRemoteLevels] = useState<Record<string, number>>({});
  const [selfId, setSelfId] = useState<string | null>(null);
  const [selfName, setSelfName] = useState<string>("You");

  const channelRef = useRef<RealtimeChannel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastBroadcastRef = useRef(0);
  const mutedRef = useRef(false);

  useEffect(() => { mutedRef.current = muted; }, [muted]);

  const connect = async () => {
    setConnecting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Look up a friendlier display name from profiles → memberships → email.
      let name = user.email?.split("@")[0] ?? "Member";
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle();
      if (profile?.display_name) name = profile.display_name;
      const { data: membership } = await supabase
        .from("group_memberships")
        .select("display_name")
        .eq("group_id", groupId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (membership?.display_name) name = membership.display_name;

      setSelfId(user.id);
      setSelfName(name);

      // Try to open the mic — degrade gracefully if denied.
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        const AC =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AC();
        audioCtxRef.current = ctx;
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        src.connect(analyser);
        analyserRef.current = analyser;
      } catch {
        // listener-only mode
      }

      const channel = supabase.channel(`voice:${groupId}`, {
        config: { presence: { key: user.id } },
      });
      channelRef.current = channel;

      channel.on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresencePayload>();
        const map: Record<string, PresencePayload> = {};
        Object.entries(state).forEach(([id, metas]) => {
          const meta = metas[metas.length - 1];
          if (meta) map[id] = { ...meta, user_id: id };
        });
        setPresence(map);
      });

      channel.on("presence", { event: "leave" }, ({ key }) => {
        setRemoteLevels((prev) => {
          const next = { ...prev };
          delete next[key as string];
          return next;
        });
      });

      channel.on("broadcast", { event: "level" }, ({ payload }) => {
        const p = payload as { user_id: string; level: number };
        if (!p?.user_id || p.user_id === user.id) return;
        setRemoteLevels((prev) => ({ ...prev, [p.user_id]: p.level }));
      });

      await channel.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: user.id,
            name,
            muted: false,
            joined_at: Date.now(),
          } satisfies PresencePayload);
        }
      });

      // Meter + broadcast loop
      const data = new Uint8Array(analyserRef.current?.frequencyBinCount ?? 0);
      const loop = () => {
        const analyser = analyserRef.current;
        let rms = 0;
        if (analyser && !mutedRef.current) {
          analyser.getByteTimeDomainData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) {
            const v = (data[i] - 128) / 128;
            sum += v * v;
          }
          rms = Math.min(1, Math.sqrt(sum / data.length) * 4);
        }
        setSelfLevel(rms);

        const now = performance.now();
        if (now - lastBroadcastRef.current > 200) {
          lastBroadcastRef.current = now;
          channelRef.current?.send({
            type: "broadcast",
            event: "level",
            payload: { user_id: user.id, level: rms },
          });
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      loop();

      setConnected(true);
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (channelRef.current) {
      channelRef.current.untrack().catch(() => {});
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close().catch(() => {});
    streamRef.current = null;
    audioCtxRef.current = null;
    analyserRef.current = null;
    setConnected(false);
    setMuted(false);
    setSelfLevel(0);
    setPresence({});
    setRemoteLevels({});
  };

  useEffect(() => () => disconnect(), []);

  // Toggle mic track + update presence when mute state changes.
  useEffect(() => {
    if (!connected) return;
    streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !muted));
    if (channelRef.current && selfId) {
      channelRef.current.track({
        user_id: selfId,
        name: selfName,
        muted,
        joined_at: Date.now(),
      } satisfies PresencePayload);
    }
  }, [muted, connected, selfId, selfName]);

  const participants: Participant[] = useMemo(() => {
    const list = Object.values(presence).map((p) => ({
      ...p,
      self: p.user_id === selfId,
      level: p.user_id === selfId ? selfLevel : remoteLevels[p.user_id] ?? 0,
    }));
    list.sort((a, b) => (a.self ? -1 : b.self ? 1 : a.joined_at - b.joined_at));
    return list;
  }, [presence, remoteLevels, selfLevel, selfId]);

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
          {groupName}
        </span>
      </div>

      {participants.length <= 1 && (
        <div className="border-b border-border bg-muted/40 px-5 py-2 text-center text-xs text-muted-foreground">
          You're the only one here. Invite a member to join.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 px-5 py-5 sm:grid-cols-4">
        {participants.map((p) => (
          <ParticipantTile key={p.user_id} participant={p} />
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

function ParticipantTile({ participant }: { participant: Participant }) {
  const active = !participant.muted && participant.level > 0.08;
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
          {participant.name[0]?.toUpperCase() ?? "?"}
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
      <WaveBars level={participant.muted ? 0 : participant.level} active={active} />
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
