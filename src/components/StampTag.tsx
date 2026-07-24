import { clsx } from "clsx";

export type StampTone = "accept" | "reject" | "pending" | "neutral";

const TONE_STYLES: Record<StampTone, { border: string; text: string; bg: string }> = {
    accept: { border: "border-[var(--accept)]", text: "text-[var(--accept)]", bg: "bg-[var(--accept)]/10" },
    reject: { border: "border-[var(--reject)]", text: "text-[var(--reject)]", bg: "bg-[var(--reject)]/10" },
    pending: { border: "border-[var(--pending)]", text: "text-[var(--pending)]", bg: "bg-[var(--pending)]/10" },
    neutral: { border: "border-[var(--rule-strong)]", text: "text-[var(--text-dim)]", bg: "bg-transparent" },
};

export default function StampTag({
    label,
    tone,
    size = "md",
    tilt = true,
}: {
    label: string;
    tone: StampTone;
    size?: "sm" | "md" | "lg";
    tilt?: boolean;
}) {
    const styles = TONE_STYLES[tone];
    const sizeClasses =
        size === "lg" ? "text-sm px-4 py-1.5" : size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-3 py-1";

    return (
        <span
            className={clsx(
                "docket-label stamp-texture inline-flex items-center justify-center rounded-sm border-2",
                sizeClasses,
                styles.border,
                styles.text,
                styles.bg,
                tilt && "-rotate-2"
            )}
            style={{
                boxShadow: `0 0 0 1px var(--ink), inset 0 0 0 1px currentColor`,
            }}
        >
            {label}
        </span>
    );
}