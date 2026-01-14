import { Stack, Text, type TextProps } from "@mantine/core";
import { useEffect, useState } from "react";
import styles from "./BigNumber.module.css";
import NumberFlow from "@number-flow/react";

export function BigNumber({
  value,
  ...props
}: {
  value: number | string;
} & TextProps) {
  const [renderedValue, setRenderedValue] = useState<string | number>(
    typeof value === "number" ? 0 : value,
  );

  useEffect(() => {
    setTimeout(() => {
      setRenderedValue(value);
    }, 0);
  }, [value]);

  return (
    <Stack
      justify="center"
      align="center"
      h="100%"
      className={styles.overflowHidden}
    >
      <Text {...props}>
        {typeof renderedValue === "number" ? (
          <NumberFlow value={renderedValue} />
        ) : (
          renderedValue
        )}
      </Text>
    </Stack>
  );
}
