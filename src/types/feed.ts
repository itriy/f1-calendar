export type FeedNewsItem = {
  id: string;
  type: "news";
  publishedAt: string;
  title: string;
  summary: string | null;
  description: string | null;
  source: string;
  sourceUrl: string;
  language: string;
  imageUrl: string | null;
};

export type FeedEventItem = {
  id: string;
  type: "event";
  startsAt: string;
  session: string;
  raceName: string;
  round: string;
};

export type FeedItem = FeedNewsItem | FeedEventItem;
