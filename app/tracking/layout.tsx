import type { ReactNode } from "react";
import TrackingAnchor from "./TrackingAnchor";
import "./tracking.css";

export default function TrackingLayout({ children }: { children: ReactNode }) {
  return <>{children}<TrackingAnchor /></>;
}
