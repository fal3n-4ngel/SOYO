export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <div className="flex flex-col items-center gap-5">
        <span className="text-3xl font-black lowercase tracking-tight text-fg">soyo</span>
        <span className="h-0.5 w-24 overflow-hidden rounded-full bg-line-strong">
          <span className="block h-full w-1/3 animate-[soyo-shimmer_1.2s_infinite] bg-accent" />
        </span>
      </div>
    </div>
  );
}
