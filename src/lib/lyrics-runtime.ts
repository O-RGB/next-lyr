import {configureLyricsAssets} from '@next-karaoke/lyrics/canvas';
import {getStickerBlob,db} from '@/lib/database/db';
configureLyricsAssets({
  loadImage:getStickerBlob,
  loadAtlas:async id=>(await db.effectSpriteAssets.get(id))?.blob,
});
