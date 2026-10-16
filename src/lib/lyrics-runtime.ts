import {configureLyricsAssets} from 'lyrio/canvas';
import {getStickerBlob,db} from '@/lib/database/db';
configureLyricsAssets({
  loadImage:getStickerBlob,
  loadAtlas:async id=>(await db.effectSpriteAssets.get(id))?.blob,
});
