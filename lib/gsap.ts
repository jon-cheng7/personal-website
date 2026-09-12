"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";
import { useGSAP } from "@gsap/react";

// Registered once, here, so every component imports from this one file
// instead of registering the plugin redundantly in each place it's used.
// Add future GSAP plugins (Flip, SplitText, etc.) to this same call.
//
// MorphSVGPlugin (used by the cursor system's SVG-shape morphing, see
// components/cursor/global-cursor.tsx and lib/cursor/morph-strategy.ts)
// used to be a paid "Club GreenSock"-only plugin — as of GSAP's 2025
// acquisition by Webflow, every former Club plugin is free for commercial
// use and ships in the same `gsap` npm package already installed here, so
// this needed no new dependency and no license key (see the cursor
// architecture doc, claude/cursor-system-architecture.md, for sources).
gsap.registerPlugin(ScrollTrigger, MorphSVGPlugin, useGSAP);

export { gsap, ScrollTrigger, MorphSVGPlugin, useGSAP };
