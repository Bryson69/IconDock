import type { IconSearchItem } from "../lib/types";
import IconCard from "./IconCard";

export default function IconGrid(props: { icons: IconSearchItem[] }) {
  return (
    <div className="relative z-0 grid grid-cols-1 gap-5 overflow-visible sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {props.icons.map((icon) => (
        <IconCard key={icon.id} icon={icon} />
      ))}
    </div>
  );
}
