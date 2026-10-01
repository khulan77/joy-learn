import { Shell } from "@/components/shell";
import { Practice } from "@/components/practice";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ skill?: string }>;
}) {
  const { skill } = await searchParams;
  return (
    <Shell active="practice">
      <Practice initialSkill={typeof skill === "string" ? skill : undefined} />
    </Shell>
  );
}
