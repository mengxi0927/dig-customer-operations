import type { CSSProperties } from "react";

export default function RollingNumber({ value, ready = true }: { value: string | number; ready?: boolean }) {
  const text = String(value);
  const animate = ready && /[0-9]/.test(text);
  return (
    <span className="g-roll-number" data-roll-ready={animate || undefined} onAnimationEnd={event => {
      if (event.animationName === "g-roll-reveal") event.currentTarget.removeAttribute("data-roll-play");
    }}>
      <i className="g-roll-value">{text}</i>
      {animate && <i className="g-roll-reels" aria-hidden="true">
        {Array.from(text, (character, index) => {
          if (!/[0-9]/.test(character)) return <i key={index}>{character}</i>;
          const steps = 7 + index % 4;
          const digit = Number(character);
          const strip = Array.from({ length: steps + 1 }, (_, row) => (digit + 10 - steps + row) % 10).join("\\a ");
          return <i className="g-roll-digit" key={index} style={{
            "--roll-strip": `"${strip}"`,
            "--roll-steps": steps,
            "--roll-delay": `${(index % 5) * 19}ms`,
          } as CSSProperties} />;
        })}
      </i>}
    </span>
  );
}
