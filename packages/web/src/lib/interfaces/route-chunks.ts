import type { ComponentType } from "react";

export type RouteComponentModule<RouteComponent extends ComponentType<object>> = {
  default: RouteComponent;
};

export type RouteChunkLoader = () => Promise<unknown>;
