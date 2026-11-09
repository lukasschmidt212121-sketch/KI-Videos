import React from "react";
import { Composition } from "remotion";
import { BridgeShort, BRIDGE_FRAMES } from "./videos/bridge/Bridge";
import { BridgeShort as AntsShort, BRIDGE_FRAMES as ANTS_FRAMES } from "./videos/ants/Bridge";

export const Root: React.FC = () => (
  <>
    <Composition id="BridgeShort" component={BridgeShort} durationInFrames={BRIDGE_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="AntsShort" component={AntsShort} durationInFrames={ANTS_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
