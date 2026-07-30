import { clx } from "@modules/common/components/ui"

type FilterRadioGroupProps = {
  title: string
  items: {
    value: string
    label: string
  }[]
  value: string
  handleChange: (value: string) => void
  "data-testid"?: string
}

const FilterRadioGroup = ({
  title,
  items,
  value,
  handleChange,
  "data-testid": dataTestId,
}: FilterRadioGroupProps) => {
  return (
    <div className="flex flex-col gap-y-2">
      <span className="text-sm font-semibold text-black px-3">{title}</span>
      <div className="flex flex-col" data-testid={dataTestId}>
        {items?.map((i) => (
          <button
            key={i.value}
            type="button"
            onClick={() => handleChange(i.value)}
            className={clx(
              "text-left text-sm rounded-lg px-3 py-2 transition-colors hover:bg-black/[0.04]",
              {
                "font-semibold text-black": i.value === value,
                "text-black/60": i.value !== value,
              }
            )}
            data-testid="radio-label"
            data-active={i.value === value}
          >
            {i.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default FilterRadioGroup
