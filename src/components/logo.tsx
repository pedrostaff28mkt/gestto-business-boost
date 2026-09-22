import darkLogoAsset from "@/assets/logo-dark.png.asset.json";
import lightLogoAsset from "@/assets/logo-light.png.asset.json";
import { useTheme } from "@/components/theme-provider";

export function Logo({ size = 32, className = "" }: { size?: number; className?: string }) {
  const { resolvedTheme } = useTheme();

  return (
    <span className="inline-flex shrink-0" data-theme={resolvedTheme}>
      <img
        src={lightLogoAsset.url}
        alt="Gestto"
        width={size}
        height={size}
        className={`inline-block object-contain dark:hidden ${className}`}
      />
      <img
        src={darkLogoAsset.url}
        alt="Gestto"
        width={size}
        height={size}
        className={`hidden object-contain dark:inline-block ${className}`}
      />
    </span>
  );
}
