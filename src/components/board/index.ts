// Public surface for reuse (e.g. the hero): the thought-map point and the lens-view layout.
export { Board, type BoardSnapshot } from "./board";
export { Point, type PointMedia } from "./point";
export { LensGrid, ConnectionsLayer } from "./layers";
export { forceLayout } from "./force-layout";
export { lensPoint, plotBox, quadOf, threadPath } from "./board-utils";
export type { PlotBox, QuadKey, Edge, Cluster, HumanLink } from "./board-utils";
