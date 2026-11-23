import { describe, expect, test } from 'vite-plus/test'
import { href, switchHref } from './space'

describe('href', () => {
  test('keeps the library on the song and the version', () => {
    expect(href(null, { page: 'songs' })).toEqual({ to: '/' })
    expect(href(null, { page: 'song', songId: 's1' })).toEqual({
      to: '/songs/$songId',
      params: { songId: 's1' },
    })
    expect(
      href(null, { page: 'version', versionId: 'v1', leaf: 'play' }),
    ).toEqual({
      to: '/versions/$versionId/play',
      params: { versionId: 'v1' },
    })
  })

  test('keeps the workspace through play', () => {
    expect(href('acme', { page: 'song', songId: 's1' })).toEqual({
      to: '/$workspace/songs/$songId',
      params: { workspace: 'acme', songId: 's1' },
    })
    expect(
      href('acme', {
        page: 'version',
        versionId: 'v1',
        leaf: 'play',
        search: { setlist: 'set', index: 2 },
      }),
    ).toEqual({
      to: '/$workspace/versions/$versionId/play',
      params: { workspace: 'acme', versionId: 'v1' },
      search: { setlist: 'set', index: 2 },
    })
  })
})

describe('switchHref', () => {
  test('carries a song and drops a version', () => {
    expect(
      switchHref('/_authed/songs/$songId', { songId: 's1' }, 'acme'),
    ).toEqual(href('acme', { page: 'song', songId: 's1' }))
    expect(
      switchHref(
        '/_authed/versions/$versionId/edit',
        { versionId: 'v1' },
        'acme',
      ),
    ).toEqual(href('acme', { page: 'songs' }))
    expect(
      switchHref(
        '/_authed/$workspace/songs/$songId',
        { workspace: 'old', songId: 's1' },
        'new',
      ),
    ).toEqual(href('new', { page: 'song', songId: 's1' }))
    expect(
      switchHref(
        '/_authed/$workspace/setlists/$setlistId',
        { workspace: 'old', setlistId: 'list' },
        'new',
      ),
    ).toEqual(href('new', { page: 'setlists' }))
    expect(
      switchHref(
        '/_authed/$workspace/members',
        { workspace: 'old' },
        'personal',
      ),
    ).toEqual(href('personal', { page: 'songs' }))
    expect(switchHref('/_authed/', {}, 'acme')).toEqual(
      href('acme', { page: 'songs' }),
    )
    expect(switchHref('/_authed/jam/$code', { code: 'CODE' }, 'acme')).toEqual(
      href('acme', { page: 'jam' }),
    )
  })
})
