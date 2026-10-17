// Public surface for reuse (e.g. the hero): sticky notes and the lens-view scatter layout.
export { Board } from "./board";
export { Sticky, DraftSticky, type StickyTarget } from "./sticky";
export { LensGrid, ConnectionsLayer } from "./layers";
export { lensPoint, plotBox, quadOf, stickyColor, threadPath, STICKY_W, STICKY_H, LENS_SCALE } from "./board-utils";
export type { PlotBox, QuadKey, Edge, Cluster, HumanLink } from "./board-utils";
