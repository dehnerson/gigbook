import { describe, expect, test } from 'vite-plus/test'
import { path, switchPath, workspaceTrail, libraryTrail } from './space'

describe('path', () => {
  test('keeps the library trail on the song and the version', () => {
    const trail = libraryTrail()
    expect(path(trail, { page: 'songs' })).toBe('/')
    expect(path(trail, { page: 'song', songId: 's1' })).toBe('/songs/s1')
    expect(path(trail, { page: 'version', versionId: 'v1', leaf: 'play' })).toBe(
      '/versions/v1/play',
    )
  })

  test('keeps the workspace trail through play', () => {
    const trail = workspaceTrail('acme')
    expect(path(trail, { page: 'song', songId: 's1' })).toBe('/w/acme/songs/s1')
    expect(
      path(trail, {
        page: 'version',
        versionId: 'v1',
        leaf: 'play',
        search: { setlist: 'set', index: 2 },
      }),
    ).toBe('/w/acme/versions/v1/play?setlist=set&index=2')
  })
})

describe('switchPath', () => {
  test('carries a song and drops a version', () => {
    expect(switchPath('/songs/s1', 'acme')).toBe('/w/acme/songs/s1')
    expect(switchPath('/versions/v1/edit', 'acme')).toBe('/w/acme/songs')
    expect(switchPath('/w/old/songs/s1', 'new')).toBe('/w/new/songs/s1')
    expect(switchPath('/w/old/setlists/list', 'new')).toBe('/w/new/setlists')
    expect(switchPath('/w/old/members', 'personal')).toBe('/w/personal/songs')
    expect(switchPath('/', 'acme')).toBe('/w/acme/songs')
  })
})
