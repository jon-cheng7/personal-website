"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

// Registered once, here, so every component imports from this one file
// instead of registering the plugin redundantly in each place it's used.
// Add future GSAP plugins (Flip, SplitText, etc.) to this same call.
gsap.registerPlugin(ScrollTrigger, useGSAP);

export { gsap, ScrollTrigger, useGSAP };
