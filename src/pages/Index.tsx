import FrameGrabber from "@/components/FrameGrabber";

const Index = () => {
  const ldJson = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "FrameGrabber",
    applicationCategory: "Multimedia",
    operatingSystem: "Web, iOS (Safari)",
    description:
      "Ambil frame video jadi PNG dari link MP4 atau unggah video. Simple, cepat, satu kolom, ramah iPhone Pro Max.",
  };

  return (
    <div className="min-h-screen bg-hero-gradient">
      <header className="container py-12">
        <div className="max-w-[680px] mx-auto text-center space-y-3">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Ambil Frame Video jadi PNG (TikTok, YouTube, Reels)
          </h1>
          <p className="text-muted-foreground">
            Tempel link video langsung (MP4/WEBM/MOV) atau unggah file. Pilih frame, simpan PNG—super cepat.
          </p>
        </div>
      </header>
      <main className="container pb-16">
        <FrameGrabber />
      </main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ldJson) }}
      />
    </div>
  );
};

export default Index;
