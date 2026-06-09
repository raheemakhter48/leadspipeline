import Image from "next/image";

export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`${compact ? "size-10" : "size-14"} relative overflow-hidden rounded-xl bg-white shadow-sm`}>
        <Image alt="LeadsPipeline logo" className="object-cover" fill priority src="/image.png" sizes={compact ? "40px" : "56px"} />
      </div>
      {!compact && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#1f6f5b]">LeadsPipeline</p>
          <p className="text-sm text-[#65605a]">AI lead workspace</p>
        </div>
      )}
    </div>
  );
}
