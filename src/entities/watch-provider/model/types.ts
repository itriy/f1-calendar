export type WatchProvider = {
  name: string;
  url: string;
  kind: "official" | "platform";
  descriptionKey?: string;
};

export type WatchProvidersResponse = {
  countryCode: string;
  countryName: string;
  providers: WatchProvider[];
};
