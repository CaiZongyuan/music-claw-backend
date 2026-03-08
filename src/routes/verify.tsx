import type { FC } from 'hono/jsx'
import type { Hono } from 'hono'

const DEFAULT_QQ_SHARE_URL = 'https://c6.y.qq.com/base/fcgi-bin/u?__=8HtpQwcTDPrR'
const PAGE_SIZE_OPTIONS = [20, 30, 50, 100] as const

const styles = `
  body {
    font-family: system-ui, sans-serif;
    margin: 0;
    padding: 24px;
    background: #111827;
    color: #f9fafb;
  }
  .panel {
    max-width: 1160px;
    margin: 0 auto;
    background: #1f2937;
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
  }
  h1, h2 {
    margin-top: 0;
  }
  .row {
    display: grid;
    gap: 12px;
    margin-top: 16px;
  }
  .controls {
    display: grid;
    gap: 12px;
    grid-template-columns: minmax(0, 1fr) repeat(2, 180px);
    align-items: end;
  }
  .pagination {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
  }
  .stats {
    display: grid;
    gap: 12px;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    margin-top: 16px;
  }
  .card {
    background: #111827;
    border: 1px solid #374151;
    border-radius: 12px;
    padding: 14px;
  }
  .label {
    display: block;
    color: #cbd5e1;
    font-size: 14px;
    margin-bottom: 6px;
  }
  .value {
    font-size: 18px;
    font-weight: 600;
  }
  input, button, select {
    width: 100%;
    box-sizing: border-box;
    border-radius: 10px;
    border: 1px solid #374151;
    padding: 12px;
    font: inherit;
  }
  input, select {
    background: #111827;
    color: #f9fafb;
  }
  button {
    background: #2563eb;
    color: white;
    cursor: pointer;
    border: none;
  }
  button:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
  .secondary {
    background: #334155;
  }
  .hint {
    color: #cbd5e1;
    font-size: 14px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 12px;
    background: #111827;
    border-radius: 12px;
    overflow: hidden;
  }
  th, td {
    text-align: left;
    padding: 12px;
    border-bottom: 1px solid #374151;
    vertical-align: top;
  }
  th {
    color: #93c5fd;
    font-weight: 600;
  }
  tr:last-child td {
    border-bottom: none;
  }
  pre {
    white-space: pre-wrap;
    word-break: break-word;
    background: #0f172a;
    border-radius: 12px;
    padding: 16px;
    min-height: 180px;
    margin-top: 16px;
  }
  .empty {
    color: #94a3b8;
    text-align: center;
    padding: 24px;
  }
`

const clientScript = `
  const state = {
    page: 1,
    pageSize: 20,
    parsedTracks: [],
    playlist: null,
    sourcePagination: null,
  }

  const elements = {
    currentPage: document.getElementById('currentPage'),
    logOutput: document.getElementById('logOutput'),
    matchButton: document.getElementById('matchButton'),
    nextButton: document.getElementById('nextButton'),
    pageInfo: document.getElementById('pageInfo'),
    pageSize: document.getElementById('pageSize'),
    pagesFetched: document.getElementById('pagesFetched'),
    parseButton: document.getElementById('parseButton'),
    parsedCount: document.getElementById('parsedCount'),
    playlistTitle: document.getElementById('playlistTitle'),
    prevButton: document.getElementById('prevButton'),
    shareUrl: document.getElementById('shareUrl'),
    tableBody: document.getElementById('trackTableBody'),
    totalCount: document.getElementById('totalCount'),
    totalPages: document.getElementById('totalPages'),
  }

  const formatDuration = (durationMs) => {
    if (!durationMs) {
      return '-'
    }

    const totalSeconds = Math.floor(durationMs / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = String(totalSeconds % 60).padStart(2, '0')
    return minutes + ':' + seconds
  }

  const log = (value) => {
    elements.logOutput.textContent = typeof value === 'string'
      ? value
      : JSON.stringify(value, null, 2)
  }

  const getTotalPages = () => {
    const totalItems = state.parsedTracks.length
    return totalItems === 0 ? 1 : Math.ceil(totalItems / state.pageSize)
  }

  const getCurrentPageItems = () => {
    const start = (state.page - 1) * state.pageSize
    return state.parsedTracks.slice(start, start + state.pageSize)
  }

  const renderTable = () => {
    const items = getCurrentPageItems()

    if (!items.length) {
      elements.tableBody.innerHTML = '<tr><td colspan="5" class="empty">暂无歌曲数据，请先解析 QQ 歌单。</td></tr>'
      return
    }

    const startIndex = (state.page - 1) * state.pageSize
    elements.tableBody.innerHTML = items.map((track, index) => {
      return [
        '<tr>',
        '<td>' + (startIndex + index + 1) + '</td>',
        '<td>' + (track.title || '-') + '</td>',
        '<td>' + ((track.artists || []).join(' / ') || '-') + '</td>',
        '<td>' + (track.album || '-') + '</td>',
        '<td>' + formatDuration(track.durationMs) + '</td>',
        '</tr>'
      ].join('')
    }).join('')
  }

  const renderSummary = () => {
    const totalPages = getTotalPages()
    const playlist = state.playlist

    elements.playlistTitle.textContent = playlist ? playlist.title : '-'
    elements.totalCount.textContent = playlist ? String(playlist.trackCount) : '0'
    elements.parsedCount.textContent = String(state.parsedTracks.length)
    elements.pagesFetched.textContent = state.sourcePagination
      ? String(state.sourcePagination.pagesFetched)
      : '0'
    elements.currentPage.textContent = String(state.page)
    elements.totalPages.textContent = String(totalPages)
    elements.pageInfo.textContent = '第 ' + state.page + ' / ' + totalPages + ' 页'
    elements.prevButton.disabled = state.page <= 1
    elements.nextButton.disabled = state.page >= totalPages
    elements.matchButton.disabled = state.parsedTracks.length === 0
  }

  const render = () => {
    const totalPages = getTotalPages()
    if (state.page > totalPages) {
      state.page = totalPages
    }

    renderSummary()
    renderTable()
  }

  elements.pageSize.addEventListener('change', () => {
    state.pageSize = Number(elements.pageSize.value)
    state.page = 1
    render()
  })

  elements.prevButton.addEventListener('click', () => {
    if (state.page <= 1) {
      return
    }

    state.page -= 1
    render()
  })

  elements.nextButton.addEventListener('click', () => {
    const totalPages = getTotalPages()

    if (state.page >= totalPages) {
      return
    }

    state.page += 1
    render()
  })

  elements.parseButton.addEventListener('click', async () => {
    log('正在解析 QQ 歌单...')

    const response = await fetch('/api/qq/parse', {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        shareUrl: elements.shareUrl.value,
        pageSize: 100
      })
    })

    const data = await response.json()

    if (!response.ok) {
      log(data)
      return
    }

    state.page = 1
    state.playlist = data.playlist || null
    state.parsedTracks = Array.isArray(data.tracks) ? data.tracks : []
    state.sourcePagination = data.pagination || null
    render()
    log({
      playlist: data.playlist,
      pagination: data.pagination,
      parsedCount: state.parsedTracks.length,
      sampleTracks: state.parsedTracks.slice(0, 5)
    })
  })

  elements.matchButton.addEventListener('click', async () => {
    if (!state.parsedTracks.length) {
      log('请先成功解析 QQ 歌单。')
      return
    }

    const currentTracks = getCurrentPageItems()
    log('正在匹配当前页的网易云候选...')

    const response = await fetch('/api/netease/match', {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        tracks: currentTracks,
        page: 1,
        pageSize: state.pageSize
      })
    })

    const data = await response.json()
    log(data)
  })

  render()
`

type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number]

const Layout: FC<{ children: unknown }> = (props) => {
  return (
    <html lang='zh-CN'>
      <head>
        <meta charSet='UTF-8' />
        <meta name='viewport' content='width=device-width, initial-scale=1.0' />
        <title>QQ 导入验证页</title>
        <style>{styles}</style>
      </head>
      <body>{props.children}</body>
    </html>
  )
}

const StatCard: FC<{ label: string; valueId: string; defaultValue: string }> = ({
  label,
  valueId,
  defaultValue,
}) => {
  return (
    <section class='card'>
      <span class='label'>{label}</span>
      <span class='value' id={valueId}>
        {defaultValue}
      </span>
    </section>
  )
}

const VerifyPage: FC<{ defaultShareUrl: string; pageSizes: readonly PageSizeOption[] }> = ({
  defaultShareUrl,
  pageSizes,
}) => {
  return (
    <Layout>
      <main class='panel'>
        <h1>QQ 歌单导入验证页</h1>
        <p class='hint'>
          这个页面现在会显示总歌曲数、已解析数量，并支持前端分页查看。默认使用你提供的 QQ
          分享短链做联调。
        </p>

        <section class='row'>
          <div class='controls'>
            <label>
              <span class='label'>QQ 分享链接</span>
              <input id='shareUrl' value={defaultShareUrl} />
            </label>
            <button id='parseButton'>解析 QQ 歌单</button>
            <button id='matchButton' disabled>
              匹配当前页候选
            </button>
          </div>
        </section>

        <section class='stats'>
          <StatCard label='歌单标题' valueId='playlistTitle' defaultValue='-' />
          <StatCard label='总歌曲数' valueId='totalCount' defaultValue='0' />
          <StatCard label='已解析数量' valueId='parsedCount' defaultValue='0' />
          <StatCard label='抓取页数' valueId='pagesFetched' defaultValue='0' />
        </section>

        <section class='row'>
          <div class='pagination'>
            <label>
              <span class='label'>每页显示</span>
              <select id='pageSize' defaultValue='20'>
                {pageSizes.map((size) => {
                  return (
                    <option value={String(size)} key={String(size)}>
                      {size}
                    </option>
                  )
                })}
              </select>
            </label>
            <button id='prevButton' class='secondary'>上一页</button>
            <button id='nextButton' class='secondary'>下一页</button>
            <div class='card'>
              <span class='label'>当前分页</span>
              <span class='value' id='pageInfo'>
                第 1 / 1 页
              </span>
            </div>
            <div class='card'>
              <span class='label'>页码状态</span>
              <span class='value'>
                <span id='currentPage'>1</span> / <span id='totalPages'>1</span>
              </span>
            </div>
          </div>
        </section>

        <section class='row'>
          <h2>歌曲列表</h2>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>歌曲名</th>
                <th>歌手</th>
                <th>专辑</th>
                <th>时长</th>
              </tr>
            </thead>
            <tbody id='trackTableBody'>
              <tr>
                <td colSpan={5} class='empty'>
                  暂无歌曲数据，请先解析 QQ 歌单。
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <pre id='logOutput'>点击“解析 QQ 歌单”开始验证。</pre>
      </main>
      <script dangerouslySetInnerHTML={{ __html: clientScript }} />
    </Layout>
  )
}

export const registerVerifyRoutes = (app: Hono) => {
  app.get('/verify', (c) => {
    return c.html(
      <VerifyPage
        defaultShareUrl={DEFAULT_QQ_SHARE_URL}
        pageSizes={PAGE_SIZE_OPTIONS}
      />
    )
  })
}
