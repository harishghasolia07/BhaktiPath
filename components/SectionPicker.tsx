import { Check } from "lucide-react";
import { CATEGORIES, CATEGORY_LABELS, type Category } from "@/lib/clip-schema";

/** Pick one or more sections for a clip: Bhajan, Kirtan, Katha. Sent as `categories` (one value per ticked box). */
export function SectionPicker({ value, error }: { value: Category[]; error?: string }) {
  return (
    <fieldset className="flex flex-col gap-1.5" aria-describedby="sections-hint">
      <legend className="mb-1.5 font-semibold text-sandal">
        Section <span className="font-normal text-mist">(one or more)</span>
      </legend>
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <label key={c} className="cursor-pointer">
            <input type="checkbox" name="categories" value={c} defaultChecked={value.includes(c)} className="peer sr-only" />
            <span className="flex h-11 items-center gap-1.5 rounded-full border border-gold/40 px-5 font-semibold text-sandal peer-checked:border-gold peer-checked:bg-gold peer-checked:text-shyam peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-marigold [&>svg]:hidden peer-checked:[&>svg]:block">
              <Check className="size-4" aria-hidden="true" />
              {CATEGORY_LABELS[c].en}
            </span>
          </label>
        ))}
      </div>
      <span id="sections-hint" className="text-[0.85rem] text-mist">
        A clip can be in more than one, e.g. a kirtan that is also a bhajan.
      </span>
      {error && <span className="text-[0.9rem] text-marigold">{error}</span>}
    </fieldset>
  );
}
