const OSM_COPYRIGHT = "https://www.openstreetmap.org/copyright";

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
    </>
  );
}
