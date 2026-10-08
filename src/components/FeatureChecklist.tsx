import type { GroupScore } from "@/lib/featureGroups";

type Row = {
  id: string;
  label: string;
  passed: boolean | null;
};

export function FeatureChecklist({
  groups,
  gestureRow,
}: {
  groups: GroupScore[];
  gestureRow?: { label: string; passed: boolean | null } | null;
}) {
  const rows: Row[] =
    groups.length > 0
      ? groups.map((group) => ({
          id: group.id,
          label: group.label,
          passed: group.passed,
        }))
      : [
          { id: "eyes", label: "Eyes", passed: null },
          { id: "headTilt", label: "Head tilt", passed: null },
          { id: "mouth", label: "Mouth", passed: null },
          { id: "eyebrows", label: "Eyebrows", passed: null },
        ];

  const allRows = gestureRow
    ? [...rows, { id: "hands", label: gestureRow.label, passed: gestureRow.passed }]
    : rows;

  return (
    <ul className="mt-6 space-y-0 text-sm">
      {allRows.map((row) => (
        <li
          key={row.id}
          className="flex max-w-xs items-center justify-between border-b border-neutral-200 py-2"
        >
          <span>{row.label}</span>
          <span className="font-mono text-neutral-500">
            {row.passed == null ? "—" : row.passed ? "✓" : "✗"}
          </span>
        </li>
      ))}
    </ul>
  );
}
