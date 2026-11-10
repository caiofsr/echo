import { Select as SelectPrimitive } from "@base-ui/react/select";

export type SelectOption = {
  value: string;
  label: string;
};

type SelectProps = {
  id: string;
  name?: string;
  value: string;
  options: readonly SelectOption[];
  onValueChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  invalid?: boolean;
  describedBy?: string;
};

export function Select({
  id,
  name,
  value,
  options,
  onValueChange,
  disabled,
  required,
  placeholder,
  invalid,
  describedBy,
}: SelectProps) {
  return (
    <SelectPrimitive.Root
      name={name}
      required={required}
      items={options}
      value={value}
      onValueChange={(next) => {
        if (typeof next === "string") onValueChange(next);
      }}
    >
      <SelectPrimitive.Trigger
        id={id}
        className="input select-trigger"
        disabled={disabled}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon className="select-icon">
          <img src="/icons/chevron-down.svg" alt="" width="20" height="20" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Positioner
          className="select-positioner"
          sideOffset={6}
          alignItemWithTrigger={false}
        >
          <SelectPrimitive.Popup className="select-popup">
            <SelectPrimitive.List>
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  value={option.value}
                  className="select-item"
                >
                  <SelectPrimitive.ItemText>
                    {option.label}
                  </SelectPrimitive.ItemText>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.List>
          </SelectPrimitive.Popup>
        </SelectPrimitive.Positioner>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
