export interface Branding {
  name: string;
  tagline: string;
  logoId: string | null;
  poweredByEnabled: boolean;
  poweredByName: string;
  poweredByUrl: string;
}
export const defaultBranding: Branding = {
  name: "Sendfold",
  tagline: "Share work. Reach agreement.",
  logoId: null,
  poweredByEnabled: false,
  poweredByName: "Imapro",
  poweredByUrl: "https://imapro.in",
};
