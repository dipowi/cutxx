import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";

function formatTime(sec: number) {
  if (!isFinite(sec)) return "0:00";
  const s = Math.floor(sec % 60)
    .toString()
    .padStart(2, "0");
  const m = Math.floor((sec / 60) % 60)
    .toString()
    .padStart(2, "0");
  const h = Math.floor(sec / 3600);
  return h > 0 ? `${h}:${m}:${s}` : `${Number(m)}:${s}`;
}

export const FrameGrabber = () => {
  const { toast } = useToast();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [videoUrl, setVideoUrl] = useState<string>("");
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [current, setCurrent] = useState<number>(0);
  const [loadingVideo, setLoadingVideo] = useState<boolean>(false);
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);

  const activeSrc = useMemo(() => fileUrl || videoUrl || "", [fileUrl, videoUrl]);

  useEffect(() => {
    return () => {
      if (fileUrl) URL.revokeObjectURL(fileUrl);
      if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    };
  }, [fileUrl, capturedUrl]);

  const onSelectFile = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      toast({
        title: "File tidak valid",
        description: "Silakan pilih file video.",
        variant: "destructive",
      });
      return;
    }
    const url = URL.createObjectURL(file);
    setFileUrl(url);
    setVideoUrl("");
    setCapturedUrl(null);
    setDuration(0);
    setCurrent(0);
  };

  const onLoadUrl = () => {
    if (!videoUrl) return;
    try {
      const u = new URL(videoUrl);
      const isDirect = /(\.mp4|\.webm|\.mov)(\?.*)?$/i.test(u.pathname);
      if (!isDirect) {
        toast({
          title: "Link platform terdeteksi",
          description:
            "Untuk menangkap frame, gunakan link video langsung (MP4/WEBM/MOV) atau unggah file. Link TikTok/YouTube/IG tidak mengizinkan akses frame di browser.",
          duration: 6000,
        });
      }
      // reset previous
      setFileUrl(null);
      setCapturedUrl(null);
      setDuration(0);
      setCurrent(0);
      setLoadingVideo(true);
      // set src on <video> via state; onloadedmetadata will update UI
      if (videoRef.current) {
        videoRef.current.crossOrigin = "anonymous";
      }
    } catch (e) {
      toast({ title: "URL tidak valid", variant: "destructive" });
    }
  };

  const handleMetadata = () => {
    const v = videoRef.current;
    if (!v) return;
    setDuration(v.duration || 0);
    setCurrent(0);
    setLoadingVideo(false);
  };

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    setCurrent(v.currentTime || 0);
  };

  const handleSeek = (val: number) => {
    const v = videoRef.current;
    if (!v) return;
    const target = Math.min(Math.max(val, 0), duration || 0);
    const onSeeked = () => {
      setCurrent(target);
      v.removeEventListener("seeked", onSeeked);
    };
    v.addEventListener("seeked", onSeeked);
    v.currentTime = target;
  };

  const captureFrame = async () => {
    const v = videoRef.current;
    if (!v) return;

    try {
      const canvas = canvasRef.current || document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas tidak tersedia");

      const vw = v.videoWidth;
      const vh = v.videoHeight;
      if (!vw || !vh) {
        toast({ title: "Video belum siap", description: "Tunggu metadata ter-load", variant: "destructive" });
        return;
      }

      canvas.width = vw;
      canvas.height = vh;
      ctx.drawImage(v, 0, 0, vw, vh);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            toast({ title: "Gagal membuat PNG", variant: "destructive" });
            return;
          }
          if (capturedUrl) URL.revokeObjectURL(capturedUrl);
          const url = URL.createObjectURL(blob);
          setCapturedUrl(url);
          toast({ title: "Frame tertangkap", description: "PNG siap diunduh" });
        },
        "image/png",
        1
      );
    } catch (e) {
      console.error(e);
      toast({ title: "Tidak bisa menangkap frame", description: "Sumber video mungkin dilindungi (CORS/DRM)", variant: "destructive" });
    }
  };

  const downloadPng = () => {
    if (!capturedUrl) return;
    const a = document.createElement("a");
    a.href = capturedUrl;
    a.download = `frame-${Math.floor(current * 1000)}ms.png`;
    a.click();
  };

  return (
    <section className="w-full max-w-[680px] mx-auto">
      <Card className="p-5 md:p-6 backdrop-blur-sm bg-card/80 border-muted shadow-elegant">
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="video-url">Tempel Link Video (MP4/WEBM/MOV)</Label>
            <div className="flex gap-2">
              <Input
                id="video-url"
                inputMode="url"
                placeholder="https://... .mp4"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="flex-1"
              />
              <Button variant="hero" onClick={onLoadUrl} disabled={!videoUrl || loadingVideo}>
                {loadingVideo ? "Memuat..." : "Muat"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Tip: Untuk link TikTok/YouTube/IG, unduh video dulu lalu unggah file untuk hasil terbaik.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="video-file">Atau Unggah File Video</Label>
            <Input
              id="video-file"
              type="file"
              accept="video/*"
              onChange={(e) => onSelectFile(e.target.files?.[0])}
            />
          </div>

          <div className="rounded-lg overflow-hidden border bg-muted/30">
            {/* Video Player */}
            <video
              ref={videoRef}
              className="w-full h-auto max-h-[420px] bg-background"
              src={activeSrc || undefined}
              playsInline
              controls
              crossOrigin="anonymous"
              onLoadedMetadata={handleMetadata}
              onTimeUpdate={handleTimeUpdate}
              onError={() =>
                toast({
                  title: "Gagal memuat video",
                  description: "Pastikan link langsung atau coba unggah file.",
                  variant: "destructive",
                })
              }
            />
          </div>

          {/* Timeline */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{formatTime(current)}</span>
              <span>{formatTime(duration)}</span>
            </div>
            <Slider
              value={[Number.isFinite(current) ? current : 0]}
              max={Number.isFinite(duration) && duration > 0 ? duration : 0}
              step={0.01}
              onValueChange={(v) => handleSeek(v[0] || 0)}
              disabled={!activeSrc || !duration}
            />
          </div>

          <div className="flex gap-2 justify-between">
            <Button variant="outline" onClick={() => handleSeek(Math.max(current - 0.04, 0))} disabled={!duration}>
              -1 frame (~0.04s)
            </Button>
            <div className="flex gap-2">
              <Button onClick={() => handleSeek(Math.max(current - 1, 0))} disabled={!duration}>-1s</Button>
              <Button onClick={() => handleSeek(Math.min(current + 1, duration))} disabled={!duration}>+1s</Button>
            </div>
            <Button variant="hero" onClick={captureFrame} disabled={!activeSrc || !duration}>
              Tangkap PNG
            </Button>
          </div>

          {/* Preview */}
          {capturedUrl && (
            <div className="space-y-3">
              <div className="rounded-lg overflow-hidden border">
                <img
                  src={capturedUrl}
                  alt="Hasil tangkapan frame video dalam format PNG"
                  className="w-full h-auto"
                  loading="lazy"
                />
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={downloadPng}>Unduh PNG</Button>
                <Button variant="outline" onClick={() => window.open(capturedUrl, "_blank")}>Buka</Button>
              </div>
            </div>
          )}
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </Card>
    </section>
  );
};

export default FrameGrabber;
