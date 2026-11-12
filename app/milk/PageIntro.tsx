import type { ReactNode } from "react";

type Pose = { src: string; width: number; height: number; alt: string };

/**
 * The shared opening of every work page (news, topics, research, wo, lab…).
 * `latin` + `kicker` mirror the about/models intros; `time` reuses the home
 * page clock chip for pages that belong to an hour of the day.
 * Set `dynamicTitle` when the title comes from data: the display serif is a
 * subset, so such titles use the system sans instead of mixing fallbacks.
 */
export default function PageIntro({
  latin,
  kicker,
  time,
  title,
  titleId,
  dynamicTitle,
  back,
  children,
  meta,
  aside,
  naiwa,
}: {
  latin?: string;
  kicker: ReactNode;
  time?: string;
  title: ReactNode;
  titleId?: string;
  dynamicTitle?: boolean;
  back?: ReactNode;
  children?: ReactNode;
  meta?: ReactNode;
  aside?: ReactNode;
  naiwa?: Pose;
}) {
  return (
    <header className="milk-intro">
      <div>
        {back}
        {time ? (
          <p className="milk-time"><b>{time}</b>{kicker}</p>
        ) : (
          <p className="milk-intro-kicker">{latin && <i>{latin}</i>}{kicker}</p>
        )}
        <h1 id={titleId} data-source={dynamicTitle ? "dynamic" : undefined}>{title}</h1>
        {children && <div className="milk-intro-lede">{children}</div>}
        {meta && <div className="milk-intro-meta">{meta}</div>}
      </div>
      {aside}
      {naiwa && <img className="milk-intro-naiwa" src={naiwa.src} width={naiwa.width} height={naiwa.height} alt={naiwa.alt} decoding="async" />}
    </header>
  );
}
