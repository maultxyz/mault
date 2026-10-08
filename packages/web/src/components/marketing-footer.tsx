import { BrandMark } from "@/components/brand-mark";
import { MARKETING_FOOTER_LINK_CLASS } from "@/lib/constants/landing";
import type { MarketingFooterProps } from "@/lib/interfaces/marketing-footer";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

export function MarketingFooter({ links, end, wide }: MarketingFooterProps) {
  return (
    <footer className="border-t">
      <div
        className={cn(
          "mx-auto flex flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row",
          wide ? "max-w-6xl" : "max-w-4xl",
        )}
      >
        <BrandMark />

        <nav className="flex flex-col items-center gap-2 text-sm text-foreground/70 sm:flex-row sm:gap-5">
          {links.map((link) =>
            link.to ? (
              <Link
                key={link.label}
                to={link.to}
                className={MARKETING_FOOTER_LINK_CLASS}
              >
                {link.label}
              </Link>
            ) : (
              <a
                key={link.label}
                href={link.href}
                className={MARKETING_FOOTER_LINK_CLASS}
                {...(link.external && {
                  target: "_blank",
                  rel: "noopener noreferrer",
                })}
              >
                {link.label}
              </a>
            ),
          )}
        </nav>

        {end}
      </div>
    </footer>
  );
}
