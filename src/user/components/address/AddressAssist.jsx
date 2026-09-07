import { Check, LoaderCircle } from 'lucide-react'

export function AddressAutocompleteInput({
  assist,
  value,
  className,
  placeholder,
  required = false,
}) {
  return (
    <input
      required={required}
      value={value}
      onChange={(event) => assist.updateStreet(event.target.value)}
      placeholder={placeholder}
      autoComplete="street-address"
      className={className}
    />
  )
}

export function PincodeAutocompleteInput({
  assist,
  value,
  className,
  placeholder,
  required = false,
}) {
  return (
    <div className="relative min-w-0">
      <input
        required={required}
        inputMode="numeric"
        pattern="[1-8][0-9]{5}"
        value={value}
        onChange={(event) =>
          assist.updatePincode(
            event.target.value.replace(/\D/g, '').slice(0, 6),
          )
        }
        placeholder={placeholder}
        autoComplete="postal-code"
        aria-invalid={assist.pincodeLookup.invalid || undefined}
        className={`${className} pr-10`}
      />
      {assist.pincodeLookup.status === 'loading' && (
        <LoaderCircle
          size={14}
          aria-label="Verifying PIN code"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[#397a4a]"
        />
      )}
      {assist.isPincodeVerified && (
        <Check
          size={14}
          aria-label="PIN code verified"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600"
        />
      )}
    </div>
  )
}

export function StateSelectionInput({
  value,
  className,
  required = false,
}) {
  return (
    <input
      required={required}
      readOnly
      value={value}
      placeholder="Fetched from PIN code"
      aria-label="State fetched from PIN code"
      className={`${className} cursor-not-allowed opacity-75`}
    />
  )
}

export function CitySelectionInput({
  value,
  className,
  required = false,
}) {
  return (
    <input
      required={required}
      readOnly
      value={value}
      placeholder="Fetched from PIN code"
      aria-label="City fetched from PIN code"
      className={`${className} cursor-not-allowed opacity-75`}
    />
  )
}
