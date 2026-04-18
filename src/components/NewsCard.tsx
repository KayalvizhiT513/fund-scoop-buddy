import { ExternalLink } from "lucide-react";

export interface Article {
  id: number;
  headline: string;
  summary: string;
  source: string;
  url: string;
  image: string;
  datetime: number;
  category: string;
}

function timeAgo(unix: number): string {
  const diff = Date.now() / 1000 - unix;
  if (diff < 3600) return `${Math.max(1, Math.floor(diff / 60))}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export const NewsCard = ({ article }: { article: Article }) => {
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block bg-card border border-border rounded-md overflow-hidden shadow-paper hover:shadow-lift transition-all duration-300 hover:-translate-y-0.5"
    >
      {article.image && (
        <div className="aspect-[16/9] overflow-hidden bg-muted">
          <img
            src={article.image}
            alt=""
            loading="lazy"
            onError={(e) => ((e.currentTarget.style.display = "none"))}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>
      )}
      <div className="p-5">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground mb-3">
          <span className="font-semibold text-accent">{article.source}</span>
          <span>·</span>
          <span>{timeAgo(article.datetime)}</span>
        </div>
        <h3 className="font-display text-xl leading-tight text-foreground mb-2 group-hover:text-accent transition-colors">
          {article.headline}
        </h3>
        {article.summary && (
          <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
            {article.summary}
          </p>
        )}
        <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-foreground/70 group-hover:text-accent transition-colors">
          Read story <ExternalLink className="h-3 w-3" />
        </div>
      </div>
    </a>
  );
};
