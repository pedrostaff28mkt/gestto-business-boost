import logoAsset from "@/assets/logo.png.asset.json";

export function Logo({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <img
      src={logoAsset.url}
      alt="Gestto"
      width={size}
      height={size}
      className={`inline-block object-contain ${className}`}
    />
  );
}
