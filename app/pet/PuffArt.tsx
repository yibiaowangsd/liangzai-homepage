import type { Action } from "./state";
import styles from "./pet.module.css";

export default function PuffArt({ mood }: { mood: Action | "idle" }) {
  return (
    <svg viewBox="0 0 460 335" className={styles.puff} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="puff-fur" x1="0" x2="0.75" y1="0" y2="1">
          <stop stopColor="#F9FFF0" /><stop offset=".55" stopColor="#B5DCCF" /><stop offset="1" stopColor="#7DB4B1" />
        </linearGradient>
        <linearGradient id="puff-belly" x2=".5" y2="1">
          <stop stopColor="#FFFBE5" /><stop offset="1" stopColor="#F4E0A8" />
        </linearGradient>
        <radialGradient id="puff-cheek"><stop stopColor="#FB9A82" /><stop offset="1" stopColor="#FDC4AE" stopOpacity=".15" /></radialGradient>
      </defs>
      <ellipse cx="228" cy="303" rx="127" ry="17" fill="#31435B" opacity=".14" />
      <g className={styles.body} data-mood={mood}>
        <path d="M197 73q-9-25 7-43 10 23 28 41M247 72q11-32 42-35-5 25-26 43" fill="#91BC9E" stroke="#344B4F" strokeWidth="3.5" strokeLinejoin="round" />
        <path d="M282 194c38-45 81-34 77-5-3 18-13 32-39 36" fill="#8FBDB2" stroke="#344B4F" strokeWidth="3.5" />
        <path d="M316 193q18-15 32-12" fill="none" stroke="#D5E9CD" strokeWidth="5" strokeLinecap="round" />
        <path d="M158 274c-18 26-48 18-44 1 2-9 12-19 23-22m166-3c31 1 46 27 29 37-13 7-33 5-45-12" fill="#A1CDBF" stroke="#344B4F" strokeWidth="3.5" />
        <path d="M113 187c-1-61 31-109 90-119 47-8 91 12 116 58 26 47 31 114-13 143-34 23-137 26-175-2-21-16-23-42-18-80Z" fill="url(#puff-fur)" stroke="#344B4F" strokeWidth="3.5" />
        <path d="M127 168c5-37 27-64 57-77m12-4 5-1" fill="none" stroke="#FFFDEB" strokeWidth="6" strokeLinecap="round" opacity=".7" />
        <ellipse cx="223" cy="233" rx="69" ry="45" fill="url(#puff-belly)" opacity=".9" />
        <path d="M223 211l6 13 14 2-10 10 2 14-12-6-13 6 3-14-10-10 14-2Z" fill="#F1AC5D" stroke="#B36C49" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M134 213q-29 1-29 24 1 16 23 11m188-37q31 2 30 25-1 16-24 11" fill="#A6D0BF" stroke="#344B4F" strokeWidth="3.5" strokeLinecap="round" />
        <ellipse cx="164" cy="174" rx="23" ry="13" fill="url(#puff-cheek)" />
        <ellipse cx="282" cy="174" rx="23" ry="13" fill="url(#puff-cheek)" />
        {mood === "pet" ? (
          <path d="M172 156q9-10 18 0m67 0q9-10 18 0" stroke="#344B4F" strokeWidth="4" strokeLinecap="round" fill="none" />
        ) : (
          <>
            <ellipse cx="182" cy="151" rx="7" ry="10" fill="#344B4F" />
            <ellipse cx="264" cy="151" rx="7" ry="10" fill="#344B4F" />
            <circle cx="180" cy="147" r="2.4" fill="white" /><circle cx="262" cy="147" r="2.4" fill="white" />
          </>
        )}
        {mood === "feed" ? (
          <ellipse cx="223" cy="170" rx="10" ry="11" fill="#9C5663" stroke="#344B4F" strokeWidth="2.5" />
        ) : (
          <path d="M211 165q6 9 12 2 7 7 13-2" stroke="#344B4F" strokeWidth="3" fill="none" strokeLinecap="round" />
        )}
        <circle cx="153" cy="125" r="4" fill="#D8E8A6" /><circle cx="287" cy="124" r="4" fill="#D8E8A6" />
      </g>
      {mood !== "idle" && <g className={styles.fx} fill={mood === "pet" ? "#F58691" : "#F4B255"} stroke="#774B59" strokeWidth="1.5">
        <path d="M81 124q4-15 12 0 13-6 12 4-3 9-16 15-11-12-8-19Z" />
        <path d="M340 93l7 12 14 1-10 10 3 14-12-7-12 6 2-14-11-9 14-2Z" />
        <path d="M382 202l4 6 7 1-5 5 2 8-7-4-6 3 1-7-6-5 7-1Z" />
      </g>}
    </svg>
  );
}
