/** Saves a Blob fetched with our own auth header as a local file — plain
 * `<a href>` can't carry an Authorization header, so every authorized
 * download (attachments, XLSX reports) goes through this instead. */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
