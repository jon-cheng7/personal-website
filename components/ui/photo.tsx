// Photo — one gallery photo as a responsive <picture>.
// Fits: any page showing content/photos. AVIF → WebP; browser picks width from `sizes` × DPR (sharp on retina, light on phones).
// Blurred placeholder + dominant color underneath; aspect ratio reserved → no layout shift. Server component.

/* eslint-disable @next/next/no-img-element -- variants are pre-built; next/image would re-process them */
import type { CSSProperties } from "react";
import { type Photo as PhotoData, altFor, photoUrl, srcSet } from "@/content/photos";
import "./photo.css";

type Props = {
  photo: PhotoData;
  /** rendered width hint, e.g. grid "(max-width: 700px) 50vw, 25vw" · fullscreen "100vw" */
  sizes: string;
  /** above the fold → eager + high fetch priority */
  priority?: boolean;
  /** box aspect ratio, e.g. "1" for square crops. Default = photo's own */
  aspect?: string;
  /** "cover" crops to the box, "contain" letterboxes */
  fit?: "cover" | "contain";
  className?: string;
};

export function Photo({ photo: p, sizes, priority = false, aspect, fit = "cover", className }: Props) {
  const style = {
    aspectRatio: aspect ?? `${p.width} / ${p.height}`,
    backgroundColor: p.color,
    "--photo-fit": fit,
  } as CSSProperties;

  return (
    <span className={`photo${className ? ` ${className}` : ""}`} style={style}>
      <img className="photo__placeholder" src={p.placeholder} alt="" aria-hidden />
      <picture>
        {p.formats.includes("avif") && <source type="image/avif" srcSet={srcSet(p, "avif")} sizes={sizes} />}
        <img
          className="photo__img"
          src={photoUrl(p, "webp")}
          srcSet={srcSet(p, "webp")}
          sizes={sizes}
          width={p.width}
          height={p.height}
          alt={altFor(p)}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
        />
      </picture>
    </span>
  );
}
