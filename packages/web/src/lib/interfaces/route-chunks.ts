import type { ComponentType } from "react";

export type RouteComponentModule<RouteComponent extends ComponentType<never>> = {
  default: RouteComponent;
};

export type RouteChunkLoader = () => Promise<unknown>;
