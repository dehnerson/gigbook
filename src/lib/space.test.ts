import { describe, expect, test } from 'vite-plus/test'
import { path, switchPath, workspace } from './space'

describe('path', () => {
  test('keeps the library on the song and the version', () => {
    expect(path(null, { page: 'songs' })).toBe('/')
    expect(path(null, { page: 'song', songId: 's1' })).toBe('/songs/s1')
    expect(path(null, { page: 'version', versionId: 'v1', leaf: 'play' })).toBe(
      '/versions/v1/play',
    )
  })

  test('keeps the workspace through play', () => {
    const acme = workspace('acme')
    expect(path(acme, { page: 'song', songId: 's1' })).toBe('/acme/songs/s1')
    expect(
      path(acme, {
        page: 'version',
        versionId: 'v1',
        leaf: 'play',
        search: { setlist: 'set', index: 2 },
      }),
    ).toBe('/acme/versions/v1/play?setlist=set&index=2')
  })
})

describe('switchPath', () => {
  test('carries a song and drops a version', () => {
    expect(switchPath('/songs/s1', 'acme')).toBe('/acme/songs/s1')
    expect(switchPath('/versions/v1/edit', 'acme')).toBe('/acme/songs')
    expect(switchPath('/old/songs/s1', 'new')).toBe('/new/songs/s1')
    expect(switchPath('/old/setlists/list', 'new')).toBe('/new/setlists')
    expect(switchPath('/old/members', 'personal')).toBe('/personal/songs')
    expect(switchPath('/', 'acme')).toBe('/acme/songs')
    expect(switchPath('/jam/CODE', 'acme')).toBe('/acme/jam')
  })
})
