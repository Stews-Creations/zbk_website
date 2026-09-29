export const channelId = 'UCgCAgFpzYuvAKJ0aaA4a2FQ';
export const shortsUrl = 'https://www.youtube.com/@MiniStew/shorts?view=0&sort=dd&flow=grid&hl=en';
export function parseLatestShort(html) {
  const match = html.match(/var ytInitialData = (.*?);<\/script>/s);
  if (!match) throw new Error('YouTube did not return channel data (possibly throttled).');
  const data = JSON.parse(match[1]);
  if (data.metadata?.channelMetadataRenderer?.externalId !== channelId) throw new Error('Unexpected YouTube channel.');
  const tab = data.contents?.twoColumnBrowseResultsRenderer?.tabs?.find(item => item.tabRenderer?.selected)?.tabRenderer;
  if (tab?.title !== 'Shorts') throw new Error('Shorts tab was not selected.');
  const grid = tab.content?.richGridRenderer;
  const sort = grid?.header?.chipBarViewModel?.chips?.find(item => item.chipViewModel?.selected)?.chipViewModel;
  if (sort?.text !== 'Latest') throw new Error('Cannot confirm newest-first ordering.');
  const item = grid.contents?.find(item => item.richItemRenderer?.content?.shortsLockupViewModel)?.richItemRenderer.content.shortsLockupViewModel;
  const id = item?.onTap?.innertubeCommand?.reelWatchEndpoint?.videoId;
  const title = item?.overlayMetadata?.primaryText?.content;
  if (!/^[A-Za-z0-9_-]{11}$/.test(id || '') || typeof title !== 'string' || !title.trim()) throw new Error('Latest Short is missing a valid ID/title.');
  return { channelId, channel: '@MiniStew', id, title, href: `https://www.youtube.com/shorts/${id}` };
}
