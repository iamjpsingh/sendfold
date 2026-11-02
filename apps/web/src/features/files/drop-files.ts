export interface PickedFile {
  file: File;
  path: string;
}
async function walk(
  entry: FileSystemEntry,
  prefix = "",
): Promise<PickedFile[]> {
  if (entry.isFile) {
    const file = await new Promise<File>((resolve, reject) =>
      (entry as FileSystemFileEntry).file(resolve, reject),
    );
    return [{ file, path: prefix + file.name }];
  }
  if (!entry.isDirectory) return [];
  const reader = (entry as FileSystemDirectoryEntry).createReader(),
    entries: FileSystemEntry[] = [];
  while (true) {
    const batch = await new Promise<FileSystemEntry[]>((resolve, reject) =>
      reader.readEntries(resolve, reject),
    );
    if (!batch.length) break;
    entries.push(...batch);
  }
  const result: PickedFile[] = [];
  for (const child of entries)
    result.push(...(await walk(child, `${prefix}${entry.name}/`)));
  return result;
}
export async function droppedFiles(data: DataTransfer) {
  const entries = Array.from(data.items).map((item) => item.webkitGetAsEntry());
  if (entries.some(Boolean)) {
    const result: PickedFile[] = [];
    for (const entry of entries) if (entry) result.push(...(await walk(entry)));
    return result;
  }
  return Array.from(data.files).map((file) => ({ file, path: file.name }));
}
