import { Shell } from "@/components/shell";
import { Tutor } from "@/components/learning";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const { session } = await searchParams;
  return (
    <Shell active="tutor">
      <Tutor initialId={typeof session === "string" ? session : undefined} />
    </Shell>
  );
}
