import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLatestShort, channelId } from './youtube-shorts.mjs';
const item = id => ({ richItemRenderer: { content: { shortsLockupViewModel: { onTap: { innertubeCommand: { reelWatchEndpoint: { videoId: id } } }, overlayMetadata: { primaryText: { content: 'A new Short' } } } } } });
const fixture = (channel = channelId, order = 'Latest') => `<script>var ytInitialData = ${JSON.stringify({ metadata: { channelMetadataRenderer: { externalId: channel } }, contents: { twoColumnBrowseResultsRenderer: { tabs: [{ tabRenderer: { selected: true, title: 'Shorts', content: { richGridRenderer: { header: { chipBarViewModel: { chips: [{ chipViewModel: { selected: true, text: order } }] } }, contents: [item('newShort123'), item('oldShort123')] } } } }] } } })};</script>`;
test('chooses newest Short rather than later entries', () => assert.equal(parseLatestShort(fixture()).id, 'newShort123'));
test('rejects an unrelated channel', () => assert.throws(() => parseLatestShort(fixture('wrong')), /channel/));
test('rejects popularity ordering', () => assert.throws(() => parseLatestShort(fixture(channelId, 'Popular')), /ordering/));
test('rejects consent/throttling pages', () => assert.throws(() => parseLatestShort('<html>Consent</html>'), /channel data/));
