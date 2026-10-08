"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
export default function DocumentLanguage(){const path=usePathname();useEffect(()=>{document.documentElement.lang=path.startsWith("/en")?"en":"zh-CN";},[path]);return null;}
