import { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

let mapsLoaded = false;
let mapsLoading = false;
let mapsFailed = false;
const pending: (() => void)[] = [];

function loadMaps(apiKey: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (mapsLoaded) { resolve(true); return; }
    if (mapsFailed) { resolve(false); return; }
    if (mapsLoading) { pending.push((ok) => resolve(ok)); return; }

    mapsLoading = true;
    pending.push((ok) => resolve(ok));

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.onload = () => {
      mapsLoaded = true;
      mapsLoading = false;
      pending.forEach((r) => r(true));
      pending.length = 0;
    };
    script.onerror = () => {
      mapsFailed = true;
      mapsLoading = false;
      pending.forEach((r) => r(false));
      pending.length = 0;
    };
    document.head.appendChild(script);
  });
}

export interface PlaceResult {
  lat: number;
  lng: number;
  formattedAddress: string;
}

interface Props {
  initialValue: string;
  onChange: (formattedAddress: string, place?: PlaceResult) => void;
  onBlur?: () => void;
  error?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
}

export function PlacesAutocomplete({
  initialValue,
  onChange,
  onBlur,
  error,
  placeholder,
  className,
  id,
  disabled,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onBlurRef = useRef(onBlur);
  onBlurRef.current = onBlur;

  const [ready, setReady] = useState(mapsLoaded);
  const [failed, setFailed] = useState(mapsFailed);
  const initRef = useRef(false);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

  useEffect(() => {
    if (!apiKey) return;
    loadMaps(apiKey).then((ok) => {
      if (ok) setReady(true);
      else setFailed(true);
    });
  }, [apiKey]);

  // Set initial value on mount (uncontrolled — won't fight with Google autocomplete)
  useEffect(() => {
    if (inputRef.current && !initRef.current) {
      inputRef.current.value = initialValue ?? "";
      initRef.current = true;
    }
  }, [initialValue]);

  // Attach Google Autocomplete widget once maps are loaded
  useEffect(() => {
    if (!ready || !inputRef.current || disabled) return;
    if (typeof google === "undefined" || !google.maps?.places) return;

    try {
      const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
        types: ["geocode"],
        componentRestrictions: { country: "in" },
        fields: ["formatted_address", "geometry"],
      });

      const placeListener = autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (place.formatted_address && place.geometry?.location) {
          onChangeRef.current(place.formatted_address, {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
            formattedAddress: place.formatted_address,
          });
        }
      });

      return () => {
        google.maps.event.removeListener(placeListener);
      };
    } catch {
      // Silently fail — input still works as plain text
    }
  }, [ready, disabled]);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChangeRef.current(e.target.value);
  }, []);

  const handleBlur = useCallback(() => {
    onBlurRef.current?.();
  }, []);

  return (
    <input
      ref={inputRef}
      id={id}
      type="text"
      defaultValue={initialValue}
      onChange={handleInput}
      onBlur={handleBlur}
      placeholder={failed ? "Maps unavailable — type location manually" : (placeholder ?? "Search for a location…")}
      disabled={disabled || (!apiKey && !failed)}
      autoComplete="off"
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        error && "border-destructive focus-visible:ring-destructive/20",
        className
      )}
    />
  );
}
