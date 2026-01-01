export function ImageFromIdb({ imgKey, getUrlForKey, className, alt }) {
  const url = imgKey ? getUrlForKey(imgKey) : "";
  if (!imgKey) return null;
  if (!url) {
    return (
      <div className="flex items-center justify-center rounded-xl border bg-zinc-100 text-xs text-zinc-400">
        加载中…
      </div>
    );
  }
  return <img src={url} alt={alt} className={className} />;
}



