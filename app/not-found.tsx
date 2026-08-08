import Link from "next/link";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-bg px-6 text-center">
      <div className="pointer-events-none absolute inset-0 bg-grid bg-grid-fade" />

      <div className="relative">
        <h1 className="text-[clamp(4rem,18vw,11rem)] font-bold leading-none tracking-tighter text-fg">
          404
        </h1>
        <p className="mt-4 max-w-md text-balance text-lg text-muted">
          That page isn&apos;t here. The file may have been moved, renamed, or removed from your
          library.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link href="/" className="btn btn-primary">
            Go home
          </Link>
          <Link href="/browse" className="btn btn-ghost">
            Browse library
          </Link>
        </div>
      </div>
    </div>
  );
}
