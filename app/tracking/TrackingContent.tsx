import { createElement, Fragment, type ReactNode } from "react";
import Link from "next/link";
import type { ContentNode } from "./catalog";

type Filter = { region?: string; scene?: string };

function containsRegion(nodes: ContentNode[], region: string): boolean {
  return nodes.some(node => typeof node !== "string" && (node.region === region || containsRegion(node.children, region)));
}

export function TrackingLink({ href, children, ...props }: React.ComponentProps<"a"> & { href: string }) {
  if (href.startsWith("/tracking")) return <Link {...props} href={href} prefetch={false}>{children}</Link>;
  const external = /^https?:\/\//.test(href);
  return <a {...props} href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined}>{children}</a>;
}

function renderNode(node: ContentNode, filter: Filter): ReactNode {
  if (typeof node === "string") return node;
  if (node.scene && filter.scene && node.scene !== filter.scene) return null;
  if (node.region && filter.region && filter.region !== "all" && node.region !== filter.region) return null;
  if (node.id === "timeline-section" && filter.region && filter.region !== "all" && !containsRegion(node.children, filter.region)) return null;

  const props = {
    className: node.style,
    id: node.id,
    title: node.title,
    scope: node.scope,
    dateTime: node.datetime,
    colSpan: node.colspan ? Number(node.colspan) : undefined,
    rowSpan: node.rowspan ? Number(node.rowspan) : undefined,
    "aria-label": node["aria-label"],
    "aria-labelledby": node["aria-labelledby"],
    "aria-current": node["aria-current"],
    "aria-hidden": node["aria-hidden"],
  };
  const children = renderNodes(node.children, filter);
  if (node.tag === "a" && node.href) return <TrackingLink {...props} href={node.href}>{children}</TrackingLink>;
  if (node.tag === "br") return <br />;
  if (node.tag === "table") {
    return <div className="tracking-scroll" role="region" aria-label={node.style?.includes("roadmap-matrix") ? "地区迁移时间表" : "技术数据表"} tabIndex={0}>
      <table {...props}>{children}</table>
    </div>;
  }
  return createElement(node.tag, props, children);
}

function renderNodes(nodes: ContentNode[], filter: Filter) {
  return nodes.map((node, index) => <Fragment key={index}>{renderNode(node, filter)}</Fragment>);
}

export default function TrackingContent({ nodes, region, scene }: { nodes: ContentNode[] } & Filter) {
  return <>{renderNodes(nodes, { region, scene })}</>;
}
