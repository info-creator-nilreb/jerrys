const OSM_COPYRIGHT = "https://www.openstreetmap.org/copyright";
const CARTO_ATTRIBUTION = "https://carto.com/attributions";

export function MapBasemapAttribution({
  prefix = "Kartenmaterial",
  linkClassName = "text-primary underline-offset-2 hover:underline",
}: {
  prefix?: string;
  linkClassName?: string;
}) {
  return (
    <>
      {prefix ? `${prefix} © ` : "© "}
      <a
        href={OSM_COPYRIGHT}
        className={linkClassName}
        target="_blank"
        rel="noopener noreferrer"
      >
        OpenStreetMap
      </a>
      {" · "}
      <a
        href={CARTO_ATTRIBUTION}
        className={linkClassName}
        target="_blank"
        rel="noopener noreferrer"
      >
        CARTO
      </a>
    </>
  );
}
