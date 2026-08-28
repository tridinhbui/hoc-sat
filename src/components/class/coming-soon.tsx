import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Cu } from "@/components/mascot/cu";

/** Tab đã có chỗ trong điều hướng nhưng tính năng lên ở giai đoạn sau. */
export function ComingSoon({ title, phase }: { title: string; phase: string }) {
  return (
    <Card>
      <EmptyState
        mascot={<Cu pose="magnify" size={110} />}
        title={title}
        description={`Phần này lên ở giai đoạn ${phase}.`}
      />
    </Card>
  );
}
