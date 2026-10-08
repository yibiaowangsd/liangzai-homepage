import Link from "next/link";
import type { ReactNode } from "react";
import "./engineering.css";

export function EngineeringPage({
  title,
  intro,
  eyebrow = "PQC 工程手册",
  children,
}: {
  title: string;
  intro: string;
  eyebrow?: string;
  children: ReactNode;
}) {
  return (
    <main id="main-content" className="engineering-page">
      <header className="engineering-heading">
        <p className="engineering-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{intro}</p>
      </header>
      <nav className="engineering-nav" aria-label="工程手册">
        <Link href="/protocols">协议</Link>
        <Link href="/projects">作品</Link>
        <Link href="/benchmarks">互通与性能</Link>
        <Link href="/gm-pqc">国密 × PQC</Link>
        <Link href="/migration">迁移</Link>
        <Link href="/notes">笔记</Link>
        <Link href="/tools">工具</Link>
      </nav>
      {children}
    </main>
  );
}
export function Section({
  title,
  children,
  id,
}: {
  title: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section className="engineering-section" id={id}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}
export function Table({
  caption,
  heads,
  rows,
}: {
  caption: string;
  heads: string[];
  rows: ReactNode[][];
}) {
  return (
    <div
      className="engineering-table"
      tabIndex={0}
      role="region"
      aria-label={caption}
    >
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr>
            {heads.map((h) => (
              <th scope="col" key={h}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) =>
                j === 0 ? (
                  <th scope="row" key={j}>
                    {cell}
                  </th>
                ) : (
                  <td key={j}>{cell}</td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function Sources({
  items,
}: {
  items: { label: string; href: string }[];
}) {
  return (
    <Section title="公开来源">
      <ul>
        {items.map((item) => (
          <li key={item.href}>
            <a href={item.href} target="_blank" rel="noreferrer">
              {item.label} ↗
            </a>
          </li>
        ))}
      </ul>
    </Section>
  );
}
