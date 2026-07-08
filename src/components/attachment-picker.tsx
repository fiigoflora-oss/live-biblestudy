import { useRef, useState } from "react";
import { Paperclip, X, Loader2, FileText, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface AttachmentMeta {
  name: string;
  path: string;
  size: number;
  type: string;
  url: string;
}

interface Props {
  groupId: string;
  value: AttachmentMeta[];
  onChange: (next: AttachmentMeta[]) => void;
  disabled?: boolean;
}

const MAX_SIZE = 50 * 1024 * 1024; // 50MB

function humanSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function AttachmentPicker({ groupId, value, onChange, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const uploaded: AttachmentMeta[] = [];
      for (const file of Array.from(files)) {
        if (file.size > MAX_SIZE) {
          toast.error(`${file.name} (${humanSize(file.size)}) exceeds the 50 MB limit`);
          continue;
        }
        const safeName = file.name.replace(/[^\w.\-]+/g, "_");
        const path = `${groupId}/${user.id}/${Date.now()}-${safeName}`;
        const uploadToast = toast.loading(`Uploading ${file.name} (${humanSize(file.size)})…`);
        const { error } = await supabase.storage
          .from("group-attachments")
          .upload(path, file, {
            contentType: file.type || "application/octet-stream",
            cacheControl: "3600",
            upsert: false,
          });
        if (error) {
          toast.error(`${file.name}: ${error.message}`, { id: uploadToast });
          continue;
        }
        toast.success(`${file.name} uploaded`, { id: uploadToast });
        const { data: signed } = await supabase.storage
          .from("group-attachments")
          .createSignedUrl(path, 60 * 60 * 24 * 7);
        uploaded.push({
          name: file.name,
          path,
          size: file.size,
          type: file.type || "application/octet-stream",
          url: signed?.signedUrl ?? "",
        });
      }
      if (uploaded.length) onChange([...value, ...uploaded]);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = async (att: AttachmentMeta) => {
    await supabase.storage.from("group-attachments").remove([att.path]).catch(() => {});
    onChange(value.filter((a) => a.path !== att.path));
  };

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((a) => (
            <div
              key={a.path}
              className="group relative flex items-center gap-2 rounded-md border border-border bg-muted/40 px-2 py-1.5 text-xs"
            >
              {a.type.startsWith("image/") ? (
                <ImageIcon className="h-3.5 w-3.5 text-primary" />
              ) : (
                <FileText className="h-3.5 w-3.5 text-primary" />
              )}
              <span className="max-w-[140px] truncate">{a.name}</span>
              <button
                type="button"
                onClick={() => remove(a)}
                className="text-muted-foreground hover:text-destructive"
                aria-label={`Remove ${a.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabled || uploading}
        onClick={() => inputRef.current?.click()}
        className={cn("h-8 gap-1.5 text-xs", uploading && "opacity-60")}
      >
        {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
        Attach files
      </Button>
    </div>
  );
}

export function AttachmentList({ attachments }: { attachments: AttachmentMeta[] }) {
  if (!attachments?.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {attachments.map((a) => {
        const isImage = a.type?.startsWith("image/");
        return (
          <a
            key={a.path}
            href={a.url}
            target="_blank"
            rel="noreferrer noopener"
            className="group flex items-center gap-2 rounded-md border border-border bg-background/60 px-2 py-1.5 text-xs text-foreground transition-colors hover:bg-muted"
          >
            {isImage ? (
              <img
                src={a.url}
                alt={a.name}
                className="h-10 w-10 rounded object-cover"
              />
            ) : (
              <FileText className="h-4 w-4 text-primary" />
            )}
            <span className="max-w-[160px] truncate">{a.name}</span>
          </a>
        );
      })}
    </div>
  );
}
