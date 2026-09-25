"use client";

import * as React from "react";
import { IMaskInput } from "react-imask";
import { cn } from "cn";

const INPUT_CLASSNAME =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40";

export interface DecimalInputProps {
  /** Max fractional digits accepted — matches the backend's
   * `@IsDecimalString({ maxDecimalPlaces })` for the field being edited
   * (2 for money amounts, 6 for quantities, 8 for exchange rates). */
  scale?: number;
  value: string;
  /** Always the plain unmasked decimal string (e.g. "12500.5", never
   * "12 500.5") — safe to submit directly, matching every existing
   * `isPositiveDecimalString`/`IsDecimalString` call site. */
  onValueChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  "aria-label"?: string;
}

/**
 * Thousands-separated decimal input for money/quantity/rate fields. Visual
 * value is grouped ("12 500,00"); `onValueChange` always receives the
 * plain unmasked decimal string the rest of the app already expects.
 */
export function DecimalInput({
  scale = 2,
  value,
  onValueChange,
  className,
  placeholder,
  id,
  disabled,
  "aria-label": ariaLabel,
}: DecimalInputProps) {
  return (
    <IMaskInput
      id={id}
      aria-label={ariaLabel}
      inputMode="decimal"
      disabled={disabled}
      mask={Number}
      scale={scale}
      thousandsSeparator=" "
      radix="."
      mapToRadix={[","]}
      padFractionalZeros={false}
      normalizeZeros={true}
      value={value}
      unmask={true}
      onAccept={(unmaskedValue: string) => onValueChange(unmaskedValue)}
      placeholder={placeholder}
      className={cn(INPUT_CLASSNAME, className)}
    />
  );
}

/** Uzbek phone number: +998 XX XXX XX XX. `onValueChange` receives the
 * masked display value (phone numbers are stored/sent as typed, unlike
 * decimal amounts — there's no "unmasked" form the backend expects). */
export function PhoneInput({
  value,
  onValueChange,
  className,
  placeholder = "+998 __ ___ __ __",
  id,
  disabled,
}: {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
}) {
  return (
    <IMaskInput
      id={id}
      type="tel"
      disabled={disabled}
      mask="+{998} 00 000 00 00"
      value={value}
      unmask={false}
      onAccept={(maskedValue: string) => onValueChange(maskedValue)}
      placeholder={placeholder}
      className={cn(INPUT_CLASSNAME, className)}
    />
  );
}

/** Uzbek taxpayer id (ИНН/СТИР): exactly nine digits. Unmasked, so
 * `onValueChange` receives the bare digits the API expects — and the mask
 * refuses anything that isn't a digit, so the field cannot reach the server
 * in a shape it would reject. */
export function TaxIdInput({
  value,
  onValueChange,
  className,
  placeholder = "123456789",
  id,
  disabled,
}: {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
}) {
  return (
    <IMaskInput
      id={id}
      type="text"
      inputMode="numeric"
      disabled={disabled}
      mask="000000000"
      value={value}
      unmask={true}
      onAccept={(_masked: string, mask: { unmaskedValue: string }) =>
        onValueChange(mask.unmaskedValue)
      }
      placeholder={placeholder}
      className={cn(INPUT_CLASSNAME, className)}
    />
  );
}
