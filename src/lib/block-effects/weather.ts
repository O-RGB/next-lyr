import type { BlockEffect, EffectAtlasRole } from "./types";
import { meteorEvent, stormEvent } from "./events";

export interface SkyActor {
  role: EffectAtlasRole; left: number; top: number; width: number; height: number;
  phase: number; opacity: number; flashing?: boolean; frameTime?: number;
}
export const STORM_CLOUD_CROP = .61;
const CLOUD_RISE = 1.55;

/** Shared, bounded composition: every sky object stays smaller than the lyric height. */
export function layoutSkyActors(effect: BlockEffect, span: number, height: number, time = 0, reduced = false, key = "") {
  const actors: SkyActor[] = [], width = Math.max(1, span), h = Math.max(1, height);
  const add = (role: EffectAtlasRole, center: number, w: number, hh: number, rise: number, limit: number, phase = 0, opacity = .65) => {
    const actorWidth = Math.min(h * w, width * limit), scale = actorWidth / (h * w);
    const actor: SkyActor = { role, left: Math.max(0, Math.min(width - actorWidth, width * center - actorWidth / 2)),
      top: -h * rise, width: actorWidth, height: h * hh * scale, phase, opacity };
    actors.push(actor); return actor;
  };
  const count = (maximum: number, spacing = 4) => Math.max(1, Math.min(maximum, Math.ceil(width / (h * spacing))));
  const scatter = (role: EffectAtlasRole, amount: number, w: number, hh: number, rise: number, opacity = .65) => {
    for (let index = 0; index < amount; index++) add(role, (index + .5) / amount, w, hh, rise, 1 / amount, index * 5, opacity);
  };
  const clouds = (amount: number) => scatter('cloud', amount, .85, .5, CLOUD_RISE, .55);
  const stars = (amount: number) => scatter('edge', amount, .45, .45, 1.6, .72);
  const meteor = () => {
    const event = meteorEvent(time, key, reduced);
    if (event.visible) { const actor = add('meteor', event.center, .85, .65, 1.6, .8, 0, .85); actor.frameTime = event.frameTime; }
  };

  if (effect.type === 'rain') {
    if (effect.variant === 'storm') {
      const amount = count(3), event = stormEvent(time, key, amount, width >= h * 12, reduced);
      for (let index = 0; index < amount; index++) {
        const actor = add('storm', (index + .5) / amount, .85, .9, CLOUD_RISE - .08, 1 / amount, index * 5, .7);
        actor.flashing = index === event.primary && event.active || index === event.secondary && event.secondaryActive;
        if (actor.flashing) actor.opacity = reduced ? .82 : .95;
      }
    } else if (effect.variant === 'clouds') clouds(count(3));
  } else if (effect.type === 'sunny' || effect.type === 'sunset') {
    if (effect.variant === 'birds') {
      add('edge', .16, .48, .48, 1.58, .3);
      add('cloud', .5, .85, .5, CLOUD_RISE, .48, 5, .55);
      add('birds', .85, .68, .4, 1.56, .34, 9, .6);
    } else if (effect.variant === 'clouds') {
      const amount = count(2, 5);
      add('edge', amount === 2 ? .15 : .24, .5, .5, 1.58, .35);
      for (let index = 0; index < amount; index++) add('cloud', amount === 2 ? .53 + index * .32 : .73, .85, .5, CLOUD_RISE, amount === 2 ? .4 : .58, index * 5 + 5, .55);
    } else add('edge', .5, .52, .52, 1.58, .8);
  } else if (effect.type === 'night') {
    add('edge', effect.variant ? .18 : .5, .58, .58, 1.62, effect.variant ? .36 : .8, 0, .75);
    if (effect.variant === 'clouds') {
      const amount = count(2, 5);
      for (let index = 0; index < amount; index++) add('cloud', amount === 2 ? .53 + index * .32 : .73, .85, .5, CLOUD_RISE, .4, index * 5, .5);
    } else if (effect.variant === 'stars' || effect.variant === 'meteors') {
      const amount = effect.variant === 'meteors' ? 1 : count(2, 5);
      for (let index = 0; index < amount; index++) add('stars', amount === 2 ? .53 + index * .32 : .73, .42, .42, 1.6, .35, index * 5, .75);
      if (effect.variant === 'meteors') meteor();
    }
  } else if (effect.type === 'stars') {
    stars(count(effect.variant === 'meteors' ? 2 : 3));
    if (effect.variant === 'meteors') meteor();
  } else if (effect.type === 'snow') {
    if (effect.variant === 'clouds') {
      add('cloud', .5, .85, .5, CLOUD_RISE, .8, 0, .55);
      add('edge', .2, .4, .65, 1.45, .4, 5, .72); add('edge', .8, .4, .65, 1.45, .4, 10, .72);
    } else if (effect.variant === 'moon') {
      add('moon', .2, .54, .54, 1.62, .38, 0, .72);
      add('edge', .58, .42, .68, 1.45, .35, 5, .7); add('edge', .86, .4, .65, 1.45, .3, 10, .7);
    } else scatter('edge', count(3), .42, .68, 1.45, .7);
  } else if (effect.type === 'petals' || effect.type === 'butterflies') {
    const wings = effect.type === 'butterflies', mixed = wings ? effect.variant === 'petals' : effect.variant === 'butterflies';
    if (mixed) {
      scatter('edge', count(2), wings ? .65 : .42, wings ? .5 : .6, 1.48, .7);
      add(wings ? 'petals' : 'butterflies', .72, wings ? .42 : .65, wings ? .6 : .5, 1.6, .5, 9, .7);
    } else scatter('edge', count(3), wings ? .65 : .42, wings ? .5 : .6, 1.48, .7);
  } else if (effect.type === 'autumn') {
    if (effect.variant === 'sun') {
      add('sun', .2, .5, .5, 1.6, .36);
      add('edge', .58, .5, .62, 1.45, .38, 5, .72); add('edge', .85, .48, .6, 1.45, .3, 10, .72);
    } else scatter('edge', count(3), .5, .62, 1.45, .72);
  } else if (effect.type === 'aurora') {
    scatter('edge', count(effect.variant === 'stars' ? 2 : 3), .9, .48, 1.55, .65);
    if (effect.variant === 'stars') add('stars', .7, .4, .4, 1.6, .3, 7, .75);
  }
  return actors;
}

/** Kept for old consumers; new storm cloud schedules are seeded per group. */
export function skyLightningVisible(time: number, reduced = false) { return stormEvent(time, '', 1, false, reduced).active; }
export function weatherHeadroomPadding(effect?: BlockEffect) {
  return effect && (effect.type === 'rain' ? !!effect.variant : !['fire','lightning','hearts','leaves'].includes(effect.type)) ? .35 : 0;
}
