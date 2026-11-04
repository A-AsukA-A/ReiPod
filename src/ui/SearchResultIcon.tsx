/** Independently authored type markers; original Apple bitmap resources are not bundled. */
export function SearchResultIcon({ kind }: { kind: string }) {
  const paths: Record<string,string> = {
    search: "M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm0 3a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm6 10 6 6-2 2-6-6Z",
    song: "M9 4 22 1v15c0 5-8 7-8 2 0-3 5-4 6-3V6L11 8v11c0 5-8 7-8 2 0-3 5-4 6-3Z",
    artist: "M12 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10ZM3 23v-3c0-9 18-9 18 0v3Z",
    album: "M2 2h20v20H2Zm10 4a6 6 0 1 0 0 12 6 6 0 0 0 0-12Zm0 4a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z",
    playlist: "M2 3h3v3H2Zm6 0h14v3H8ZM2 10h3v3H2Zm6 0h14v3H8ZM2 17h3v3H2Zm6 0h14v3H8Z",
    podcast: "M12 8a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm-3 8h6l-1 8h-4ZM7 3a9 9 0 0 0-3 13l2-2A6 6 0 0 1 8 6Zm10 0-1 3a6 6 0 0 1 2 8l2 2a9 9 0 0 0-3-13Z",
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" fillRule="evenodd"><path d={paths[kind] ?? paths.song}/></svg>;
}
