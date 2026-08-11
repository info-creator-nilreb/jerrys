/** Port für dauerhaften Object Storage (ADR-0008). */

export type PublicObjectPutInput = {
  /** Store-Pfad ohne führenden Slash, z. B. `branding/logo-light/….png`. */
  pathname: string;
  body: Buffer | Blob | File | ArrayBuffer;
  contentType: string;
  /** Vorhandenes Objekt am gleichen Pfad überschreiben. */
  allowOverwrite?: boolean;
};

export type PublicObjectPutResult = {
  url: string;
  pathname: string;
  contentType: string;
};

export type ObjectStorage = {
  /** False wenn kein Token/Store konfiguriert — Uploads müssen fehlschlagen, Reads fallbacken. */
  isConfigured(): boolean;
  putPublic(input: PublicObjectPutInput): Promise<PublicObjectPutResult>;
  /** Best-effort delete; fehlende Objekte sind kein Fehler. */
  deleteByUrl(url: string): Promise<void>;
};

export class ObjectStorageNotConfiguredError extends Error {
  readonly code = "OBJECT_STORAGE_NOT_CONFIGURED" as const;

  constructor(message = "Object Storage ist nicht konfiguriert (BLOB_READ_WRITE_TOKEN).") {
    super(message);
    this.name = "ObjectStorageNotConfiguredError";
  }
}
