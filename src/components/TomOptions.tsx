import { TOM_MEMES } from "@/data/tomMemes";

export function TomOptions({ activeId }: { activeId?: string | null }) {
  return (
    <section className="mt-10">
      <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.28em] text-neutral-500">
        The Toms
      </p>
      <ul className="flex flex-wrap gap-3 pb-2">
        {TOM_MEMES.map((meme) => {
          const active = meme.id === activeId;
          return (
            <li
              key={meme.id}
              className={`w-[4.75rem] sm:w-24 ${active ? "" : "opacity-55"}`}
            >
              <div
                className={`overflow-hidden rounded-sm bg-[#111] ${
                  active ? "ring-2 ring-[#d8ff4a] ring-offset-2 ring-offset-[#f6f3ec]" : ""
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={meme.image}
                  alt={meme.label}
                  className="aspect-[4/5] h-auto w-full object-contain"
                />
              </div>
              <p className="mt-2 truncate text-[10px] uppercase tracking-[0.14em] text-neutral-500">
                {meme.label.replace(/ Tom$/, "")}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
