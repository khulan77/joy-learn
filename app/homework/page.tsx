import { Shell } from "@/components/shell";
import { Homework } from "@/components/learning";
export default function Page() {
  return (
    <Shell active="homework">
      <Homework />
    </Shell>
  );
}
