import type { Metadata } from "next";
import PuffHouse from "./PuffHouse";

export const metadata: Metadata = {
  title: "星团小屋 · 量仔",
  description: "捏捏、喂食、陪玩，和一只爱收集星星的小动物攒亲密度，解锁它的小屋。",
};

export default function PetPage() {
  return <PuffHouse />;
}
