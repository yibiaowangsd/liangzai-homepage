import { redirect } from "next/navigation";
import { laboratoryTarget } from "../../site/lab-route";
export const dynamic = "force-dynamic";
export default async function Lab({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) { redirect(laboratoryTarget(await searchParams, true)); }
