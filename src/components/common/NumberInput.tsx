import { useEffect, useState, type ComponentProps } from "react";
import { Input } from "@/components/ui/input";

type Props = Omit<ComponentProps<typeof Input>, "value" | "onChange" | "type"> & {
  value: number;
  onValueChange: (value: number) => void;
};

/**
 * Numeric input that lets users clear the field or type "1." without it snapping back,
 * while always reporting a finite number to the parent.
 */
const NumberInput = ({ value, onValueChange, ...props }: Props) => {
  const [text, setText] = useState(String(value));
  useEffect(() => {
    if (Number(text) !== value) setText(String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <Input
      {...props}
      type="number"
      inputMode="decimal"
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        const n = parseFloat(e.target.value);
        onValueChange(Number.isFinite(n) ? n : 0);
      }}
    />
  );
};

export default NumberInput;
