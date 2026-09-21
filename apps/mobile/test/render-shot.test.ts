import { beforeEach, describe, expect, it } from 'vitest';
import { clearRenderShot, putRenderShot, renderShot } from '../src/store/render-shot';

const photo = (id: string) => ({ base64: `bytes-${id}`, uri: `file:///photos/${id}.jpg` });

describe('the render shot', () => {
  beforeEach(clearRenderShot);

  it('starts empty, so a Try On with nothing behind it can ask for a photo', () => {
    expect(renderShot()).toBeNull();
  });

  it('holds the photo between the screen that took it and the one that sends it', () => {
    putRenderShot(photo('a'));
    expect(renderShot()).toEqual(photo('a'));
  });

  it('keeps the last one written, so a new photo replaces an old one', () => {
    putRenderShot(photo('a'));
    putRenderShot(photo('b'));
    expect(renderShot()).toEqual(photo('b'));
  });

  it('lets go once a render is saved, so a later Try On cannot pick up an earlier photo', () => {
    putRenderShot(photo('a'));
    clearRenderShot();
    expect(renderShot()).toBeNull();
  });
});
