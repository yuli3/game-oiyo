import React, { useEffect, useState } from "react";

interface Props {
  value: number;
  format?: Intl.NumberFormatOptions;
  locales?: string | string[];
  prefix?: string;
  suffix?: string;
  className?: string;
}

type NumberFlowProps = Props & {
  isolate?: boolean;
  respectMotionPreference?: boolean;
};

/**
 * SSR-safe NumberFlow wrapper. The custom element is loaded only in the
 * browser; static HTML and unsupported clients keep an accessible number.
 */
export default function AnimatedNumber({
  value,
  format,
  locales,
  prefix = "",
  suffix = "",
  className,
}: Props) {
  const [NumberFlow, setNumberFlow] =
    useState<React.ComponentType<NumberFlowProps> | null>(null);

  useEffect(() => {
    let active = true;
    import("@number-flow/react").then((module) => {
      if (active)
        setNumberFlow(
          () => module.default as React.ComponentType<NumberFlowProps>,
        );
    });
    return () => {
      active = false;
    };
  }, []);

  if (!NumberFlow) {
    return (
      <span className={className}>
        {prefix}
        {new Intl.NumberFormat(locales, format).format(value)}
        {suffix}
      </span>
    );
  }

  return (
    <NumberFlow
      value={value}
      format={format}
      locales={locales}
      prefix={prefix}
      suffix={suffix}
      className={className}
      isolate
      respectMotionPreference
    />
  );
}
